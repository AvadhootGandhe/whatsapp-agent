# 🚀 Services Platform — Complete Setup Guide

> Transform your WhatsApp Calendar Buddy from a testing app into a production-level multi-user platform.

---

## 📋 Table of Contents

**Section 1: Local Setup (Testing)**
1. [Prerequisites](#1-prerequisites)
2. [Install Dependencies](#2-install-dependencies)
3. [MongoDB Setup (Local)](#3-mongodb-setup-local)
4. [Google Cloud Console Setup](#4-google-cloud-console-setup)
5. [Meta Developer Setup (WhatsApp API)](#5-meta-developer-setup-whatsapp-api)
6. [Gemini API Key](#6-gemini-api-key)
7. [Configure Environment Variables](#7-configure-environment-variables)
8. [Run Locally](#8-run-locally)
9. [ngrok Tunnel for WhatsApp Webhook](#9-ngrok-tunnel-for-whatsapp-webhook)
10. [Register Webhook in Meta Dashboard](#10-register-webhook-in-meta-dashboard)
11. [Test Full Flow](#11-test-full-flow)

**Section 2: Production Setup**
1. [MongoDB Atlas (Cloud Database)](#p1-mongodb-atlas-cloud-database)
2. [Google Cloud Production Changes](#p2-google-cloud-production-changes)
3. [Deploy Backend (Render)](#p3-deploy-backend-render)
4. [Deploy Frontend (Vercel)](#p4-deploy-frontend-vercel)
5. [Meta WhatsApp Production Changes](#p5-meta-whatsapp-production-changes)
6. [Gemini API Production](#p6-gemini-api-production)
7. [Security Checklist](#p7-security-checklist)
8. [Post-Deployment Verification](#p8-post-deployment-verification)

---

# Section 1: Local Setup (Testing)

---

## 1. Prerequisites

| Tool | Version | Check Command |
|------|---------|---------------|
| Node.js | v18+ | `node -v` |
| npm | v8+ | `npm -v` |
| ngrok | Any | `ngrok -v` |
| Git | Any | `git --version` |
| MongoDB | v7+ (local) OR use Atlas free tier | `mongod --version` |

**Accounts needed:**
- [Google Cloud Console](https://console.cloud.google.com)
- [Meta for Developers](https://developers.facebook.com)
- [Google AI Studio](https://aistudio.google.com) (for Gemini API key)

---

## 2. Install Dependencies

```bash
# From project root
cd server
npm install

cd ../client
npm install
```

---

## 3. MongoDB Setup (Local)

### Option A: Local MongoDB

1. **Install MongoDB Community Edition:**
   - Windows: Download from [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
   - macOS: `brew install mongodb-community@7.0`
   - Ubuntu: Follow [official docs](https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-ubuntu/)

2. **Start MongoDB:**
   ```bash
   # Windows (run as service — should auto-start after install)
   net start MongoDB

   # macOS
   brew services start mongodb-community@7.0

   # Linux
   sudo systemctl start mongod
   ```

3. **Connection string for `.env`:**
   ```
   MONGODB_URI=mongodb://localhost:27017/services-platform
   ```

### Option B: MongoDB Atlas Free Tier (Recommended for simplicity)

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) → Create free account
2. Create a **free cluster** (M0 Sandbox)
3. Create a database user (username + password)
4. Under **Network Access** → Add `0.0.0.0/0` (allow from anywhere, for development)
5. Under **Database** → Click **Connect** → Choose **Drivers** → Copy the connection string
6. Replace `<password>` with your database user's password
7. Use as `MONGODB_URI` in `.env`

---

## 4. Google Cloud Console Setup

### 4.1 — Create/Select Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project: `services-platform` (or use existing)
3. Make sure it's selected in the top dropdown

### 4.2 — Enable APIs

1. Go to **APIs & Services → Library**
2. Search and **Enable** these APIs:
   - ✅ **Google Calendar API**
   - ✅ **Google People API** (for user profile during login)

### 4.3 — Configure OAuth Consent Screen

1. Go to **APIs & Services → OAuth consent screen**
2. Select **External** → Click **Create**
3. Fill in:
   - App name: `Services Platform`
   - User support email: your email
   - Developer contact: your email
4. **Scopes** — add these:
   - `openid`
   - `../auth/userinfo.email`
   - `../auth/userinfo.profile`
   - `../auth/calendar`
5. **Test users** — add your Google email
6. Click **Save and Continue** through all steps

### 4.4 — Create OAuth 2.0 Credentials

1. Go to **APIs & Services → Credentials**
2. Click **+ Create Credentials → OAuth client ID**
3. Application type: **Web application**
4. Name: `Services Platform Client`
5. **Authorized redirect URIs** — add ALL of these:
   ```
   http://localhost:3001/api/auth/google/callback
   http://localhost:3001/api/services/calendar-buddy/callback
   ```
6. Click **Create**
7. Copy **Client ID** and **Client Secret** → save for `.env`

> ⚠️ **Important:** You need TWO redirect URIs — one for login, one for calendar authorization. They're different OAuth flows.

---

## 5. Meta Developer Setup (WhatsApp API)

### 5.1 — Create a Meta App

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Click **My Apps → Create App**
3. Select use case: **Other** → App type: **Business**
4. App name: `Services Platform`
5. Click **Create App**

### 5.2 — Add WhatsApp Product

1. On App Dashboard → scroll to **WhatsApp** → Click **Set up**
2. Connect or create a Business Portfolio if prompted

### 5.3 — Get Phone Number ID

1. Left sidebar: **WhatsApp → API Setup**
2. Copy **Phone Number ID** (under "From" section)
3. Save for `.env` as `PHONE_NUMBER_ID`

### 5.4 — Get Temporary Access Token

1. On same **API Setup** page
2. Click **Generate Token** (temporary, 24h expiry)
3. Copy token → save as `WHATSAPP_TOKEN` in `.env`

> ⚠️ This token expires every 24 hours. For production, you'll create a permanent System User Token (see Section 2).

### 5.5 — Add Test Phone Numbers

1. Under **API Setup → "To" section**
2. Click **Manage phone number list**
3. Add your WhatsApp number (with country code, e.g., `+919876543210`)
4. Enter the verification code sent to WhatsApp

### 5.6 — Choose a VERIFY_TOKEN

Pick any secret string (like a password):
```
VERIFY_TOKEN=my_services_verify_token_2024
```
You'll use this when registering the webhook.

---

## 6. Gemini API Key

1. Go to [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Click **Create API Key**
3. Select your Google Cloud project
4. Copy the key → save as `GEMINI_API_KEY` in `.env`

---

## 7. Configure Environment Variables

### Server `.env` (create in `server/` directory)

```bash
cd server
cp .env.example .env
```

Fill in all values:

```env
PORT=3001

# MongoDB
MONGODB_URI=mongodb://localhost:27017/services-platform

# JWT Secret — generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=paste_generated_secret_here

# Google OAuth
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxx

# Gemini AI
GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxxxxxx

# WhatsApp Cloud API
WHATSAPP_TOKEN=EAAxxxxxxxxxxxxxxxxx
PHONE_NUMBER_ID=114534xxxxxxxxx
VERIFY_TOKEN=my_services_verify_token_2024

# URLs (local dev)
BACKEND_URL=http://localhost:3001
FRONTEND_URL=http://localhost:5173

# Timezone
TIMEZONE=Asia/Kolkata
```

### Client `.env` (create in `client/` directory)

```bash
cd client
cp .env.example .env
```

```env
VITE_API_URL=http://localhost:3001
```

### Generate JWT Secret

Run this command to generate a secure random JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output → paste as `JWT_SECRET` in `.env`.

---

## 8. Run Locally

You need **two terminal windows**:

### Terminal 1 — Backend Server

```bash
cd server
npm run dev
```

Expected output:
```
✅ MongoDB connected: localhost
🚀 Server running on http://localhost:3001
📡 Webhook endpoint: http://localhost:3001/webhook
🌐 Frontend URL: http://localhost:5173
```

### Terminal 2 — Frontend Dev Server

```bash
cd client
npm run dev
```

Expected output:
```
  VITE v6.x.x  ready in xxx ms
  ➜  Local:   http://localhost:5173/
```

### Verify

1. Open `http://localhost:3001/api/health` → should return `{"status":"ok"}`
2. Open `http://localhost:5173/login` → should see the login page

---

## 9. ngrok Tunnel for WhatsApp Webhook

Meta needs a public HTTPS URL to send webhook events.

### Terminal 3 — ngrok

```bash
ngrok http 3001
```

You'll see:
```
Forwarding   https://abc123.ngrok-free.app -> http://localhost:3001
```

Copy the `https://abc123.ngrok-free.app` URL.

### Update Server `.env`

Update `BACKEND_URL` with your ngrok URL:

```env
BACKEND_URL=https://abc123.ngrok-free.app
```

**Restart the server** after changing this.

> ⚠️ ngrok URL changes every restart (unless you have a paid account). Update `.env` + webhook in Meta each time.

---

## 10. Register Webhook in Meta Dashboard

1. Go to your Meta App → **WhatsApp → Configuration**
2. Under **Webhook**, click **Edit** (or **Add Webhook**)
3. Fill in:
   - **Callback URL:** `https://abc123.ngrok-free.app/webhook`
   - **Verify Token:** `my_services_verify_token_2024` (same as VERIFY_TOKEN in `.env`)
4. Click **Verify and Save**
5. After success, find **Webhook fields** → Subscribe to **messages**

Your server terminal should print:
```
✅ Webhook verified by Meta
```

---

## 11. Test Full Flow

### Step-by-step:

1. **Open** `http://localhost:5173/login`
2. **Click** "Sign in with Google" → authorize with your Google account
3. **You'll be redirected** to `/services` → see "Calendar Buddy" card
4. **Click** the Calendar Buddy card → enter setup flow
5. **Click** "Grant Calendar Access" → authorize Google Calendar permission
6. **Enter** your WhatsApp phone number (with country code)
7. **Click** "Activate Calendar Buddy"
8. **Check WhatsApp** — you should receive the welcome message
9. **Send a test message** from WhatsApp: `Meeting with Raj tomorrow at 3pm`
10. **Check** that the event was created in your Google Calendar

### Verify in MongoDB

```bash
# If using local MongoDB, open mongo shell:
mongosh

# Check user was created:
use services-platform
db.users.find().pretty()
```

You should see your user document with `googleCalendarRefreshToken`, `phone`, and `activeServices: ["calendar-buddy"]`.

---

# Section 2: Production Setup

---

## P1. MongoDB Atlas (Cloud Database)

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a new **dedicated cluster** (M10+ for production, or M0 free tier for small scale)
3. **Database user:** Create a strong username + password
4. **Network Access:**
   - For Render deployment: add Render's outbound IPs (see Render docs)
   - Or use `0.0.0.0/0` (less secure but simpler)
5. **Get connection string:**
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/services-platform?retryWrites=true&w=majority
   ```
6. **Enable backups** (M10+ plans support automated backups)

---

## P2. Google Cloud Production Changes

### 2.1 — Update Redirect URIs

Go to **APIs & Services → Credentials → Your OAuth client** → Add production redirect URIs:

```
https://your-backend-domain.com/api/auth/google/callback
https://your-backend-domain.com/api/services/calendar-buddy/callback
```

Keep the localhost URIs for development.

### 2.2 — Publish OAuth Consent Screen

1. Go to **OAuth consent screen**
2. Click **Publish App** → changes from "Testing" to "In production"
3. If requesting sensitive scopes (like calendar), Google will require **verification:**
   - Submit verification request
   - Provide homepage URL, privacy policy URL, terms of service URL
   - Google review takes 4-6 weeks for sensitive scopes
   - Until verified, only test users (up to 100) can use the app

> ⚠️ **Until Google approves verification**, only test users you manually add can log in. This is fine for initial launch. Add users via OAuth consent screen → Test users.

### 2.3 — Enable Production APIs

Make sure these APIs are enabled in your production project:
- Google Calendar API
- Google People API

---

## P3. Deploy Backend (Render)

### 3.1 — Create Render Account

1. Go to [render.com](https://render.com) → Sign up
2. Connect your GitHub repository

### 3.2 — Create Web Service

1. Click **New → Web Service**
2. Connect your GitHub repo
3. Configure:
   - **Name:** `services-backend`
   - **Region:** Choose closest to your users
   - **Branch:** `main`
   - **Root Directory:** `server`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Instance Type:** Starter ($7/mo) or Free (has cold starts)

### 3.3 — Set Environment Variables

In Render dashboard → **Environment** tab, add ALL these:

| Variable | Value |
|----------|-------|
| `PORT` | `3001` (Render may override this, that's fine) |
| `NODE_ENV` | `production` |
| `MONGODB_URI` | Your Atlas connection string |
| `JWT_SECRET` | Strong random secret |
| `GOOGLE_CLIENT_ID` | From Google Cloud |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud |
| `GEMINI_API_KEY` | From Google AI Studio |
| `WHATSAPP_TOKEN` | Permanent System User Token (see P5) |
| `PHONE_NUMBER_ID` | From Meta |
| `VERIFY_TOKEN` | Your webhook verify token |
| `BACKEND_URL` | `https://services-backend.onrender.com` (your Render URL) |
| `FRONTEND_URL` | `https://your-frontend-domain.vercel.app` |
| `TIMEZONE` | `Asia/Kolkata` |

### 3.4 — Deploy

- Push to `main` branch → Render auto-deploys
- Or click **Manual Deploy** in Render dashboard
- Wait for build to complete, check logs

### 3.5 — Custom Domain (Optional)

1. In Render → **Settings → Custom Domains**
2. Add your domain (e.g., `api.services.yourdomain.com`)
3. Update DNS records as instructed
4. Update `BACKEND_URL` env var to new domain

---

## P4. Deploy Frontend (Vercel)

### 4.1 — Create Vercel Account

1. Go to [vercel.com](https://vercel.com) → Sign up with GitHub

### 4.2 — Import Project

1. Click **New Project**
2. Import your GitHub repo
3. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `client`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

### 4.3 — Set Environment Variables

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://services-backend.onrender.com` (your Render backend URL) |

### 4.4 — Deploy

- Push to `main` → Vercel auto-deploys
- Note your Vercel URL (e.g., `https://services-xyz.vercel.app`)

### 4.5 — Update Backend FRONTEND_URL

Go back to Render and update `FRONTEND_URL` to match your Vercel URL.

### 4.6 — Custom Domain (Optional)

1. In Vercel → **Settings → Domains**
2. Add your domain (e.g., `services.yourdomain.com`)
3. Update DNS records

---

## P5. Meta WhatsApp Production Changes

### 5.1 — Business Verification

> ⚠️ **This is required for production WhatsApp API access and can take 1-2 weeks.**

1. Go to [business.facebook.com](https://business.facebook.com)
2. Navigate to **Settings → Business Info → Business Verification**
3. Submit required documents:
   - Business registration certificate / GST / incorporation docs
   - Business website URL
   - Business phone number
4. Wait for Meta to approve (typically 2-7 business days)

### 5.2 — Generate Permanent System User Token

The temporary token from testing expires every 24 hours. For production:

1. Go to [business.facebook.com](https://business.facebook.com)
2. Navigate to **Settings → Users → System Users**
3. Click **Add** → Create a system user:
   - Name: `services-api`
   - Role: **Admin**
4. Click **Generate Token**:
   - Select your WhatsApp app
   - Select permissions: `whatsapp_business_management`, `whatsapp_business_messaging`
5. Copy the token — **this token never expires**
6. Update `WHATSAPP_TOKEN` in your production environment

### 5.3 — Register Production Webhook

1. Go to your Meta App → **WhatsApp → Configuration**
2. Update webhook URL to your production backend:
   - **Callback URL:** `https://your-backend-domain.com/webhook`
   - **Verify Token:** same as before
3. Click **Verify and Save**
4. Subscribe to **messages** field

### 5.4 — Add a Business Phone Number

1. In Meta App → **WhatsApp → Phone Numbers**
2. Click **Add Phone Number**
3. Enter a real business phone number (not the test sandbox number)
4. Verify via SMS or voice call
5. Update `PHONE_NUMBER_ID` in production env vars

### 5.5 — Message Template (Required for starting conversations)

WhatsApp requires approved templates to initiate conversations (the "hi" activation message):

1. Go to **WhatsApp → Message Templates**
2. Create a new template:
   - Name: `welcome_calendar_buddy`
   - Category: **Utility**
   - Language: English
   - Body:
     ```
     Hi! 👋 Calendar Buddy is now active on your WhatsApp! 🎉

     I can help you manage your Google Calendar right from here.

     Try saying things like:
     • Meeting with Raj tomorrow at 3pm
     • What's my schedule today?
     • Cancel my 5pm meeting

     Let's get started! 🚀
     ```
3. Submit for review (usually approved within minutes for utility templates)
4. Update `server/services/whatsapp.js` to use template API for activation message

> **Note:** After the user replies to your template message, you have a 24-hour conversation window to send free-form messages. The webhook-based replies (Calendar Buddy responses) fall within this window.

---

## P6. Gemini API Production

1. Go to [Google Cloud Console → Billing](https://console.cloud.google.com/billing)
2. Ensure billing is enabled on your project
3. Gemini API has generous free tiers:
   - Gemini Flash: 15 RPM free, then $0.075/1M input tokens
4. Set up budget alerts: **Billing → Budgets & Alerts**

---

## P7. Security Checklist

### ✅ Already implemented in the code:

- [x] **Helmet** — security headers (XSS, content-type sniffing, etc.)
- [x] **CORS** — locked to FRONTEND_URL origin
- [x] **Rate limiting** — 100 requests per 15 min on /api/ routes
- [x] **JWT auth** — httpOnly cookies, secure in production
- [x] **Input validation** — phone number sanitization
- [x] **Environment variables** — no secrets in code

### 🔲 Additional production hardening:

- [ ] **Encrypt refresh tokens** in database (use AES-256 or similar)
  ```javascript
  // In User model, encrypt googleCalendarRefreshToken before save
  const crypto = require('crypto');
  const algorithm = 'aes-256-cbc';
  // Implement encrypt/decrypt utility
  ```

- [ ] **JWT secret rotation** — set up a rotation schedule
- [ ] **MongoDB authentication** — ensure strong passwords, enable authentication
- [ ] **HTTPS everywhere** — Render and Vercel provide this automatically
- [ ] **Dependency audit** — run `npm audit` regularly
- [ ] **Error reporting** — integrate Sentry or similar
  ```bash
  cd server
  npm install @sentry/node
  ```

- [ ] **Monitoring** — set up UptimeRobot or BetterUptime for health checks
- [ ] **Logging** — integrate Winston or Pino for structured logging

---

## P8. Post-Deployment Verification

### Backend Health Check
```bash
curl https://your-backend-domain.com/api/health
# Expected: {"status":"ok","message":"Services Platform API is running 🚀"}
```

### Frontend
1. Open `https://your-frontend-domain.com`
2. Click "Sign in with Google"
3. Complete the full setup flow
4. Verify WhatsApp message received

### WhatsApp Webhook
1. Send a message from WhatsApp
2. Check Render logs for incoming webhook data
3. Verify calendar event created

### Database
1. Log into MongoDB Atlas
2. Check `users` collection for new user documents
3. Verify tokens and phone numbers stored correctly

### Checklist Before Going Live

- [ ] Backend health check returns OK
- [ ] Google OAuth login works
- [ ] Calendar authorization flow works
- [ ] Phone number submission works
- [ ] WhatsApp activation message received
- [ ] Calendar event creation via WhatsApp works
- [ ] Calendar event reading via WhatsApp works
- [ ] Event cancellation via WhatsApp works
- [ ] Error handling works (send gibberish, check graceful response)
- [ ] CORS blocks unauthorized origins
- [ ] Rate limiting active (rapid requests get 429)
- [ ] MongoDB data persists across deploys

---

## 📁 Final Project Structure

```
whatsapp-agent/
├── client/                         ← React frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx + .css
│   │   │   ├── ServiceCard.jsx + .css
│   │   │   └── PhoneInput.jsx + .css
│   │   ├── pages/
│   │   │   ├── Login.jsx + .css
│   │   │   ├── Services.jsx + .css
│   │   │   ├── Setup.jsx + .css
│   │   │   └── Dashboard.jsx + .css
│   │   ├── lib/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   ├── .env.example
│   └── package.json
│
├── server/                         ← Express backend
│   ├── config/
│   │   └── db.js
│   ├── models/
│   │   └── User.js
│   ├── middleware/
│   │   └── auth.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── services.js
│   │   └── webhook.js
│   ├── services/
│   │   ├── calendar.js
│   │   ├── gemini.js
│   │   └── whatsapp.js
│   ├── server.js
│   ├── .env.example
│   └── package.json
│
├── steps.md                        ← This file
├── .gitignore
└── README.md
```

---

*Built with React · Vite · Express · MongoDB · Google OAuth · WhatsApp Cloud API · Gemini AI · Google Calendar API*
