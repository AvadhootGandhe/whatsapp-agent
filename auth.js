/**
 * auth.js — Run this ONCE to generate your Google OAuth refresh token.
 *
 * Usage:
 *   1. Fill in your CLIENT_ID, CLIENT_SECRET, and REDIRECT_URI below
 *      (or set them in .env and they'll be loaded automatically)
 *   2. Run: node auth.js
 *   3. Open the printed URL in your browser
 *   4. Authorize access, copy the "code" from the redirected URL
 *   5. Paste the code when prompted
 *   6. Copy the printed refresh_token into your .env file
 */

require("dotenv").config();
const { google } = require("googleapis");
const readline = require("readline");

const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const SCOPES = ["https://www.googleapis.com/auth/calendar"];

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: "offline",
  scope: SCOPES,
  prompt: "consent", // Force consent to always get refresh_token
});

console.log("\n🔗 Open this URL in your browser:\n");
console.log(authUrl);
console.log("\n");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("📋 Paste the authorization code here: ", async (code) => {
  rl.close();

  try {
    const { tokens } = await oAuth2Client.getToken(code.trim());
    console.log("\n✅ Tokens received!\n");
    console.log("📝 Add this to your .env file:\n");
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log("\n");
  } catch (err) {
    console.error("❌ Failed to get tokens:", err.message);
  }
});
