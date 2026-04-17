const express = require("express");
const { google } = require("googleapis");
const User = require("../models/User");
const requireAuth = require("../middleware/auth");
const { sendActivationMessage } = require("../services/whatsapp");

const router = express.Router();

// Calendar scope for service-specific OAuth
const CALENDAR_SCOPES = ["https://www.googleapis.com/auth/calendar"];

function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.BACKEND_URL}/api/services/calendar-buddy/callback`
  );
}

// ── GET /api/services → List available services ─────────────────────────────
router.get("/", requireAuth, (req, res) => {
  res.json([
    {
      id: "calendar-buddy",
      name: "Calendar Buddy",
      description:
        "Manage your Google Calendar via WhatsApp. Create, read, cancel events with natural language messages.",
      icon: "📅",
    },
  ]);
});

// ── POST /api/services/calendar-buddy/authorize → Redirect to calendar OAuth ─
router.get("/calendar-buddy/authorize", requireAuth, (req, res) => {
  const client = createOAuth2Client();

  const url = client.generateAuthUrl({
    access_type: "offline",
    scope: CALENDAR_SCOPES,
    prompt: "consent",
    state: req.user.userId, // Pass userId in state for callback
  });

  res.redirect(url);
});

// ── GET /api/services/calendar-buddy/callback → Store calendar refresh token ─
router.get("/calendar-buddy/callback", async (req, res) => {
  const { code, state: userId } = req.query;

  if (!code || !userId) {
    return res.redirect(`${process.env.FRONTEND_URL}/services?error=no_code`);
  }

  try {
    const client = createOAuth2Client();
    const { tokens } = await client.getToken(code);

    if (!tokens.refresh_token) {
      console.error("❌ No refresh token received from Google");
      return res.redirect(
        `${process.env.FRONTEND_URL}/setup/calendar-buddy?error=no_refresh_token`
      );
    }

    // Store calendar refresh token for this user
    await User.findByIdAndUpdate(userId, {
      googleCalendarRefreshToken: tokens.refresh_token,
    });

    console.log(`📅 Calendar access granted for user ${userId}`);
    res.redirect(
      `${process.env.FRONTEND_URL}/setup/calendar-buddy?calendar=authorized`
    );
  } catch (err) {
    console.error("❌ Calendar OAuth callback error:", err.message);
    res.redirect(
      `${process.env.FRONTEND_URL}/setup/calendar-buddy?error=auth_failed`
    );
  }
});

// ── POST /api/services/calendar-buddy/activate → Set phone, send WhatsApp hi ─
router.post("/calendar-buddy/activate", requireAuth, async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ error: "Phone number is required" });
  }

  // Strip non-digits and validate
  const cleanPhone = phone.replace(/\D/g, "");
  if (cleanPhone.length < 10 || cleanPhone.length > 15) {
    return res.status(400).json({ error: "Invalid phone number" });
  }

  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.googleCalendarRefreshToken) {
      return res
        .status(400)
        .json({ error: "Calendar access not granted yet" });
    }

    // Check if phone already in use by another user
    const existingUser = await User.findOne({
      phone: cleanPhone,
      _id: { $ne: user._id },
    });
    if (existingUser) {
      return res.status(409).json({
        error: "This phone number is already registered to another account",
      });
    }

    // Update user
    user.phone = cleanPhone;
    if (!user.activeServices.includes("calendar-buddy")) {
      user.activeServices.push("calendar-buddy");
    }
    await user.save();

    // Send activation message on WhatsApp
    await sendActivationMessage(cleanPhone);

    console.log(`🚀 Calendar Buddy activated for ${user.email} (${cleanPhone})`);

    res.json({
      message: "Calendar Buddy activated!",
      phone: cleanPhone,
      activeServices: user.activeServices,
    });
  } catch (err) {
    console.error("❌ Activation error:", err.message);
    res.status(500).json({ error: "Failed to activate service" });
  }
});

// ── GET /api/services/calendar-buddy/status → Check service status ──────────
router.get("/calendar-buddy/status", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      active: user.activeServices.includes("calendar-buddy"),
      hasCalendarAccess: !!user.googleCalendarRefreshToken,
      phone: user.phone,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to get status" });
  }
});

module.exports = router;
