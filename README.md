# WhatsApp Agent / Services Platform

A WhatsApp AI Calendar assistant built with Google Gemini, Google Calendar, and the WhatsApp Cloud API.

This repository contains two related implementations:

- `server/` — full multi-user services platform with React frontend, Google OAuth login, service activation, MongoDB user storage, and WhatsApp Calendar Buddy activation.
- Root-level files — a simpler prototype backend using a single Express webhook server (`server.js`) and direct Google Calendar API integration.

> For the complete product experience, use the `server/` backend + `client/` frontend.

## What it does

- Receives WhatsApp messages via the WhatsApp Cloud API webhook
- Uses Google Gemini to classify natural language calendar commands
- Creates, reads, cancels, and checks availability for Google Calendar events
- Supports user login, calendar authorization, and WhatsApp activation
- Sends WhatsApp replies over the Cloud API

## Key features

- Natural language WhatsApp calendar assistant
- Google Calendar event creation and cancellation
- Schedule summary and availability checks
- User management via Google OAuth and JWT
- Service activation with WhatsApp phone linking
- MongoDB storage for users and refresh tokens
- React/Vite frontend for login, service setup, and dashboard navigation

## Tech stack

- Backend: Node.js, Express, MongoDB, Mongoose
- AI: Google Gemini via `@google/generative-ai`
- Google APIs: `googleapis` for OAuth and Calendar
- WhatsApp: WhatsApp Cloud API via Axios
- Frontend: React, Vite, React Router
- Security: JWT auth, Helmet, rate limiting, CORS

## Project structure

- `client/` — React frontend
- `server/` — full Express backend
- `server/config/` — DB connection
- `server/middleware/` — auth middleware
- `server/models/` — Mongoose user model
- `server/routes/` — auth, services, webhook routes
- `server/services/` — WhatsApp, Gemini, and Google Calendar helpers
- `steps.md` — detailed setup flow and deployment notes
- `SETUP_README.md` — additional setup instructions

## Prerequisites

- Node.js 18+
- npm
- MongoDB (local or Atlas)
- Google Cloud project with:
  - Calendar API enabled
  - OAuth 2.0 credentials
- Google Gemini API key
- Meta Developers app with WhatsApp product and phone number
- ngrok or another public tunnel for webhook testing

## Setup

### 1. Install backend and frontend dependencies

```bash
cd server
npm install

cd ../client
npm install
```

### 2. Configure environment variables

#### Backend environment (`server/.env`)

Create `server/.env` with:

```env
MONGODB_URI=<your_mongodb_connection_string>
JWT_SECRET=<your_jwt_secret>
GEMINI_API_KEY=<your_gemini_api_key>
GOOGLE_CLIENT_ID=<your_google_client_id>
GOOGLE_CLIENT_SECRET=<your_google_client_secret>
WHATSAPP_TOKEN=<your_whatsapp_cloud_token>
PHONE_NUMBER_ID=<your_whatsapp_phone_number_id>
VERIFY_TOKEN=<your_webhook_verify_token>
BACKEND_URL=<https://your-backend-url-or-ngrok>
FRONTEND_URL=<https://your-frontend-url-or-localhost>
```

Optional backend vars:

```env
GOOGLE_AUTH_REDIRECT_URI=<backend_url>/api/auth/google/callback
GOOGLE_CALENDAR_REDIRECT_URI=<backend_url>/api/services/calendar-buddy/callback
TIMEZONE=Asia/Kolkata
WHATSAPP_TEMPLATE_NAME=<approved_whatsapp_template_name>
```

#### Frontend environment (root or `client/.env`)

Create `.env` at the repo root or in `client/` with:

```env
VITE_API_URL=http://localhost:3001
```

Change the URL to the backend address if using ngrok or deployed URLs.

### 3. Run locally

Start the backend:

```bash
cd server
npm run dev
```

Start the frontend:

```bash
cd ../client
npm run dev
```

### 4. Use the app

1. Open the frontend URL shown by Vite
2. Log in with Google
3. Authorize `Calendar Buddy` to access Google Calendar
4. Enter your WhatsApp phone number and activate the service
5. Send WhatsApp messages like:
   - `Meeting with Raj tomorrow at 3pm`
   - `What's my schedule today?`
   - `Cancel my 5pm meeting`
   - `Am I free at 4pm tomorrow?`

## WhatsApp webhook setup

1. Run backend locally
2. Expose it with ngrok:

```bash
ngrok http 3001
```

3. Configure your WhatsApp Cloud webhook URL to:

```text
https://<your-ngrok-id>.ngrok-free.dev/webhook
```

4. Use the same webhook verify token in `server/.env`

## Notes

- The full multi-user backend is in `server/`.
- The root-level `server.js` and root `package.json` appear to be an earlier prototype implementation.
- For the broadest supported feature set, use the `server/` folder backend with the React frontend.

## Troubleshooting

- `Missing required environment variables` — verify `server/.env`
- `Invalid or expired token` — clear cookies and retry login
- WhatsApp messages not delivered — verify `PHONE_NUMBER_ID` and `WHATSAPP_TOKEN`
- Google OAuth issues — ensure redirect URIs match exactly in Google Cloud

## Useful commands

- Backend development: `cd server && npm run dev`
- Frontend development: `cd client && npm run dev`
- Build frontend: `cd client && npm run build`
- Preview frontend build: `cd client && npm run preview`

## Additional setup guides

- See `steps.md` for an extended install and deployment walkthrough
- See `SETUP_README.md` for more deployment-oriented setup notes
