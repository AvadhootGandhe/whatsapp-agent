# 📱 WhatsApp AI Calendar Agent — Complete Setup Guide

> Send a WhatsApp message like _"Meeting with Rahul tomorrow at 5 pm"_ and an event is automatically created in your Google Calendar.

---

## 🗂️ Table of Contents

1. [Project Overview](#1-project-overview)
2. [Prerequisites](#2-prerequisites)
3. [Project Installation](#3-project-installation)
4. [Google Cloud Setup (Calendar API)](#4-google-cloud-setup-calendar-api)
5. [Generate Google Refresh Token](#5-generate-google-refresh-token)
6. [Meta Developer Setup (WhatsApp API)](#6-meta-developer-setup-whatsapp-api)
7. [Gemini API Key](#7-gemini-api-key)
8. [Configure Environment Variables](#8-configure-environment-variables)
9. [Run the Server](#9-run-the-server)
10. [Expose with ngrok](#10-expose-with-ngrok)
11. [Register the Webhook with Meta](#11-register-the-webhook-with-meta)
12. [Test the Agent](#12-test-the-agent)
13. [Troubleshooting](#13-troubleshooting)
14. [Project File Structure](#14-project-file-structure)

---

## 1. Project Overview

```
User (WhatsApp)
      ↓  sends message: "Call with team Friday at 2pm"
WhatsApp Cloud API (Meta)
      ↓  HTTP POST to your webhook
Node.js + Express Server
      ↓  sends text to Gemini
Gemini AI
      ↓  returns { title, date, time }
Google Calendar API
      ↓  creates event
User gets a WhatsApp reply with confirmation ✅
```

---

## 2. Prerequisites

Make sure you have the following installed:

| Tool | Version | Check |
|------|---------|-------|
| Node.js | v18 or higher | `node -v` |
| npm | v8 or higher | `npm -v` |
| ngrok | Any | `ngrok -v` |
| Git | Any | `git -v` |

You also need accounts on:
- [Google Cloud Console](https://console.cloud.google.com)
- [Meta for Developers](https://developers.facebook.com)
- [Google AI Studio](https://aistudio.google.com)

---

## 3. Project Installation

### Step 3.1 — Clone or download the project

```bash
# If you have the zip, extract it. Or:
git clone <your-repo-url>
cd whatsapp-agent
```

### Step 3.2 — Install dependencies

```bash
npm install
```

This installs:
- `express` — web server
- `axios` — HTTP requests to Meta API
- `dotenv` — loads `.env` variables
- `googleapis` — Google Calendar API
- `@google/generative-ai` — Gemini AI SDK

### Step 3.3 — Create your `.env` file

```bash
cp .env.example .env
```

You'll fill in the values in the steps below. Leave it open.

---

## 4. Google Cloud Setup (Calendar API)

### Step 4.1 — Create a Google Cloud Project

1. Go to [https://console.cloud.google.com](https://console.cloud.google.com)
2. Click the project dropdown at the top → **New Project**
3. Name it something like `whatsapp-calendar-agent`
4. Click **Create**
5. Make sure the new project is selected in the dropdown

### Step 4.2 — Enable the Google Calendar API

1. In the left sidebar: **APIs & Services → Library**
2. Search for **Google Calendar API**
3. Click it → Click **Enable**

### Step 4.3 — Create OAuth 2.0 Credentials

1. Go to **APIs & Services → Credentials**
2. Click **+ Create Credentials → OAuth client ID**
3. If prompted to configure the **OAuth consent screen** first:
   - Click **Configure consent screen**
   - Select **External** → Click **Create**
   - Fill in:
     - App name: `WhatsApp Calendar Agent`
     - User support email: your email
     - Developer contact: your email
   - Click **Save and Continue** through all steps
   - On the **Test users** page, add your own Google account email
   - Click **Save and Continue → Back to Dashboard**
4. Back in **Credentials → Create Credentials → OAuth client ID**
5. Application type: **Web application**
6. Name: `WhatsApp Agent Client`
7. Under **Authorized redirect URIs**, click **+ Add URI**
   - Add: `http://localhost:3000/auth/callback`
8. Click **Create**
9. A popup shows your credentials. **Copy both values:**
   - `Client ID` → paste as `GOOGLE_CLIENT_ID` in `.env`
   - `Client Secret` → paste as `GOOGLE_CLIENT_SECRET` in `.env`
10. Also set in `.env`:
    ```
    GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback
    ```

---

## 5. Generate Google Refresh Token

This is a one-time step to authorize the app to access your Google Calendar.

### Step 5.1 — Make sure your `.env` has these 3 values filled in:
```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback
```

### Step 5.2 — Run the auth helper script

```bash
node auth.js
```

### Step 5.3 — Open the authorization URL

The script will print a long URL. **Copy and open it in your browser.**

### Step 5.4 — Authorize access

1. Choose your Google account
2. You may see a warning: _"Google hasn't verified this app"_ — click **Advanced → Go to WhatsApp Calendar Agent (unsafe)**
3. Click **Allow** on the permissions screen

### Step 5.5 — Copy the authorization code

After clicking Allow, your browser will redirect to a URL like:
```
http://localhost:3000/auth/callback?code=4/0Ab...xyz&scope=...
```

Copy the value of the `code` parameter (everything between `code=` and `&scope`).

### Step 5.6 — Paste the code in the terminal

Back in your terminal, paste the code and press Enter.

The script will print:
```
✅ Tokens received!

📝 Add this to your .env file:

GOOGLE_REFRESH_TOKEN=1//0gX...abc
```

Copy the refresh token value and paste it into your `.env` file:
```
GOOGLE_REFRESH_TOKEN=1//0gX...abc
```

---

## 6. Meta Developer Setup (WhatsApp API)

### Step 6.1 — Create a Meta Developer App

1. Go to [https://developers.facebook.com](https://developers.facebook.com)
2. Click **My Apps → Create App**
3. Select **Business** → Click **Next**
4. App name: `WhatsApp Calendar Agent`
5. Enter your email → Click **Create App**

### Step 6.2 — Add WhatsApp to your app

1. On the App Dashboard, scroll to find **WhatsApp** product
2. Click **Set up**
3. If asked to connect a Business Portfolio, either create one or skip for now

### Step 6.3 — Get your Phone Number ID

1. In the left sidebar: **WhatsApp → API Setup**
2. Under "From" section, you'll see a test phone number
3. Copy the **Phone Number ID** (a long number like `114534...`)
4. Paste it in `.env`:
   ```
   PHONE_NUMBER_ID=114534...
   ```

### Step 6.4 — Get your WhatsApp Access Token (Temporary)

1. On the same **API Setup** page
2. Scroll to **Access Token** section
3. Click **Generate Token** (temporary 24-hour token for testing)
4. Copy it and paste in `.env`:
   ```
   WHATSAPP_TOKEN=EAAxxxxxx...
   ```

> ⚠️ **For production:** Generate a permanent System User Token via Meta Business Manager. The temporary token expires in 24 hours.

### Step 6.5 — Add your phone number as a test recipient

1. Still on **API Setup** page
2. Under "To", click **Manage phone number list**
3. Add your WhatsApp phone number (with country code, e.g. +919876543210)
4. WhatsApp will send a verification code — enter it

### Step 6.6 — Set your VERIFY_TOKEN

Choose any secret string (like a password you make up):
```
VERIFY_TOKEN=my_secret_verify_token_2024
```
Add this to your `.env`. You'll use this same value when registering the webhook in Step 11.

---

## 7. Gemini API Key

### Step 7.1 — Get your Gemini API key

1. Go to [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Click **Create API Key**
3. Select your Google Cloud project (`whatsapp-calendar-agent`)
4. Copy the generated key
5. Paste it in `.env`:
   ```
   GEMINI_API_KEY=AIzaSy...
   ```

---

## 8. Configure Environment Variables

Your completed `.env` file should look like this:

```env
PORT=3000

GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXX

WHATSAPP_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VERIFY_TOKEN=my_secret_verify_token_2024
PHONE_NUMBER_ID=11453412345678

GOOGLE_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-XXXXXXXXXXXXXXXXXX
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback
GOOGLE_REFRESH_TOKEN=1//0gXXXXXXXXXXXXXXXXXXXXXXXXXX

TIMEZONE=Asia/Kolkata
```

> ✅ Double-check: All 10 values should be filled in. No empty values.

---

## 9. Run the Server

```bash
node server.js
```

You should see:
```
🚀 Server running on http://localhost:3000
📡 Webhook endpoint: http://localhost:3000/webhook
```

Test that it's working:
```bash
curl http://localhost:3000/
# Should return: {"status":"ok","message":"WhatsApp AI Calendar Agent is running 🚀"}
```

---

## 10. Expose with ngrok

Meta's servers need to reach your local server. ngrok creates a public HTTPS tunnel.

### Step 10.1 — Install ngrok

```bash
# macOS (Homebrew)
brew install ngrok

# Or download from https://ngrok.com/download
# Or use npx (no install needed):
npx ngrok http 3000
```

### Step 10.2 — Start the tunnel

In a **new terminal window** (keep server.js running in the first):

```bash
ngrok http 3000
```

You'll see output like:
```
Forwarding   https://abc123.ngrok-free.app -> http://localhost:3000
```

Copy that `https://abc123.ngrok-free.app` URL. You'll need it in the next step.

> ⚠️ **Important:** ngrok URL changes every time you restart it. You'll need to update the webhook in Meta each time, unless you have a paid ngrok account with a static domain.

---

## 11. Register the Webhook with Meta

### Step 11.1 — Open Webhook Settings

1. Go to your Meta App Dashboard
2. Left sidebar: **WhatsApp → Configuration**

### Step 11.2 — Add the webhook

1. Click **Edit** (or **Add Webhook**)
2. Fill in:
   - **Callback URL:** `https://abc123.ngrok-free.app/webhook`
     (use YOUR ngrok URL from Step 10)
   - **Verify Token:** `my_secret_verify_token_2024`
     (the exact same string you set as `VERIFY_TOKEN` in `.env`)
3. Click **Verify and Save**

If verification succeeds, you'll see a green checkmark. Your terminal will print:
```
✅ Webhook verified by Meta
```

### Step 11.3 — Subscribe to messages

1. After saving, find the **Webhook fields** section
2. Find **messages** and click **Subscribe**

---

## 12. Test the Agent

### Step 12.1 — Send a WhatsApp message

From your WhatsApp (the test number you added in Step 6.5), send a message to the test business number:

```
Meeting with Rahul tomorrow at 5 pm
```

### Step 12.2 — Watch the terminal

You should see:
```
📩 Message from 919876543210: "Meeting with Rahul tomorrow at 5 pm"
🧠 Calling Gemini...
🤖 Gemini raw response: {"title": "Meeting with Rahul", "date": "2025-04-07", "time": "17:00"}
📌 Extracted event: { title: 'Meeting with Rahul', date: '2025-04-07', time: '17:00' }
📅 Creating calendar event...
✅ Calendar event created: https://www.google.com/calendar/event?eid=...
✅ Reply sent to 919876543210
```

### Step 12.3 — Check your WhatsApp

You should receive:
```
✅ Done! I've added this to your Google Calendar:

📌 Meeting with Rahul
📅 Date: 2025-04-07
🕐 Time: 17:00

🔗 https://www.google.com/calendar/event?eid=...
```

### Step 12.4 — Check Google Calendar

Open [https://calendar.google.com](https://calendar.google.com) and verify the event was created.

### More example messages to try:

```
Doctor appointment next Monday at 10 am
Team standup every day at 9:30
Call with client on 15th at 3:30 pm
Lunch with mom this Friday at 1 pm
Project deadline tomorrow at 6 pm
```

---

## 13. Troubleshooting

### ❌ Webhook verification fails

- Make sure `VERIFY_TOKEN` in `.env` exactly matches what you typed in the Meta dashboard
- Make sure your server is running and ngrok is active
- Make sure you're using the ngrok `https://` URL (not `http://`)

### ❌ "No JSON object found in Gemini response"

- Check your `GEMINI_API_KEY` is valid
- The message might be too vague — try adding a date and time explicitly

### ❌ Google Calendar error: "invalid_grant"

- Your refresh token may have expired or been revoked
- Re-run `node auth.js` to generate a new refresh token

### ❌ WhatsApp error 131030 / "recipient phone number not in allowed list"

- For test mode, you can only send to numbers you added in Step 6.5
- Add your number via **WhatsApp → API Setup → Manage phone number list**

### ❌ Messages not arriving at webhook

- Check that you subscribed to **messages** field in Step 11.3
- Restart ngrok and update the webhook URL in Meta

### ❌ Server crashes on startup

- Run `npm install` again
- Make sure all `.env` values are set (no empty strings)

---

## 14. Project File Structure

```
whatsapp-agent/
│
├── server.js          ← Express server + WhatsApp webhook handler
├── gemini.js          ← Calls Gemini AI to extract event details
├── calendar.js        ← Creates events in Google Calendar
├── auth.js            ← One-time script to generate refresh token
│
├── package.json       ← Project dependencies
├── .env               ← Your secret keys (never commit this!)
├── .env.example       ← Template for .env
├── .gitignore         ← Excludes node_modules and .env from git
└── SETUP_README.md    ← This file
```

---

## 🚀 Going to Production

When you're ready to deploy for real use:

1. **Deploy to a server** (Railway, Render, EC2, DigitalOcean) instead of using ngrok
2. **Get a permanent WhatsApp System User Token** via Meta Business Manager
3. **Use a real WhatsApp Business number** (not the sandbox test number)
4. **Set `TIMEZONE`** to match your users' timezone
5. **Add a database** to track multiple users' events and preferences
6. **Enable HTTPS** on your production server (most platforms do this automatically)

---

*Built with Node.js · Express · Google Gemini AI · WhatsApp Cloud API · Google Calendar API*
