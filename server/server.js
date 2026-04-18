require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
const connectDB = require("./config/db");

// ── Env validation ────────────────────────────────────────────────────────────
const requiredEnvVars = [
  "MONGODB_URI",
  "JWT_SECRET",
  "GEMINI_API_KEY",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "WHATSAPP_TOKEN",
  "PHONE_NUMBER_ID",
  "VERIFY_TOKEN",
  "BACKEND_URL",
  "FRONTEND_URL",
];

const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
if (missingVars.length > 0) {
  console.error("❌ Missing required environment variables:");
  missingVars.forEach((v) => console.error(`   - ${v}`));
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3001;

const googleAuthRedirectUri =
  process.env.GOOGLE_AUTH_REDIRECT_URI ||
  `${process.env.BACKEND_URL}/api/auth/google/callback`;
const googleCalendarRedirectUri =
  process.env.GOOGLE_CALENDAR_REDIRECT_URI ||
  `${process.env.BACKEND_URL}/api/services/calendar-buddy/callback`;

// When running behind ngrok or other proxies, trust the proxy headers for rate limiting.
app.set("trust proxy", 1);

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", apiLimiter);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth", require("./routes/auth"));
app.use("/api/services", require("./routes/services"));
app.use("/webhook", require("./routes/webhook"));

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", message: "Services Platform API is running 🚀" });
});

// ── Serve React build in production ───────────────────────────────────────────
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../client/dist")));
  app.get("*", (req, res) => {
    if (!req.path.startsWith("/api") && !req.path.startsWith("/webhook")) {
      res.sendFile(path.join(__dirname, "../client/dist/index.html"));
    }
  });
}

// ── Start ─────────────────────────────────────────────────────────────────────
async function start() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 Webhook endpoint: ${process.env.BACKEND_URL}/webhook`);
    console.log(`🔐 Google auth callback URI: ${googleAuthRedirectUri}`);
    console.log(`📅 Google calendar callback URI: ${googleCalendarRedirectUri}`);
    console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL}\n`);
  });
}

start();
