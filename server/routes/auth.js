const express = require("express");
const jwt = require("jsonwebtoken");
const { google } = require("googleapis");
const User = require("../models/User");

const router = express.Router();

// Scopes for login only (profile + email)
const LOGIN_SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/userinfo.email",
];

function createOAuth2Client() {
  const redirectUri =
    process.env.GOOGLE_AUTH_REDIRECT_URI ||
    `${process.env.BACKEND_URL}/api/auth/google/callback`;

  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
}

// ── GET /api/auth/google → Redirect to Google OAuth consent ──────────────────
router.get("/google", (req, res) => {
  const client = createOAuth2Client();
  const url = client.generateAuthUrl({
    access_type: "offline",
    scope: LOGIN_SCOPES,
    prompt: "consent",
  });
  res.redirect(url);
});

// ── GET /api/auth/google/callback → Exchange code, create user, issue JWT ────
router.get("/google/callback", async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.redirect(`${process.env.FRONTEND_URL}/login?error=no_code`);
  }

  try {
    const client = createOAuth2Client();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    // Get user profile
    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const { data: profile } = await oauth2.userinfo.get();

    // Create or update user in DB
    let user = await User.findOne({ googleId: profile.id });

    if (!user) {
      user = await User.create({
        googleId: profile.id,
        email: profile.email,
        name: profile.name,
        picture: profile.picture || "",
      });
      console.log(`👤 New user created: ${profile.email}`);
    } else {
      user.name = profile.name;
      user.picture = profile.picture || "";
      await user.save();
    }

    // Issue JWT
    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: true, // Required for sameSite: "none"
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.redirect(`${process.env.FRONTEND_URL}/services`);
  } catch (err) {
    console.error("❌ Google auth callback error:", err.message);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
  }
});

// ── GET /api/auth/me → Return current user from JWT ─────────────────────────
router.get("/me", async (req, res) => {
  const token =
    req.cookies?.token ||
    (req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : null);

  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-__v");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      picture: user.picture,
      phone: user.phone,
      activeServices: user.activeServices,
      hasCalendarAccess: !!user.googleCalendarRefreshToken,
    });
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
});

// ── POST /api/auth/logout → Clear JWT cookie ────────────────────────────────
router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out" });
});

module.exports = router;
