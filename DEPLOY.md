# 🚀 Deploy to Render — WhatsApp AI Calendar Agent

This guide walks you through deploying the WhatsApp AI Calendar Agent to **Render**, a cloud platform with built-in GitHub integration, automatic deployments, and zero configuration needed.

---

## 📋 Prerequisites

Before deploying, ensure you have:

- ✅ A **GitHub account** (Render integrates seamlessly with GitHub)
- ✅ Your **WhatsApp Business Account** (with API credentials)
- ✅ **Google Calendar API credentials** (OAuth2 refresh token)
- ✅ **Gemini API key** from Google
- ✅ A **Render account** (free tier available at [render.com](https://render.com))

---

## 🔧 Step 1: Set Up GitHub Repository

### 1.1 Create a GitHub Repository

1. Go to [github.com/new](https://github.com/new)
2. Name it `whatsapp-calendar-agent`
3. Choose **Private** (keep your API keys safe)
4. Click **Create repository**

### 1.2 Push Your Code to GitHub

From your project directory, run:

```bash
git init
git add .
git commit -m "Initial commit: WhatsApp Calendar Agent"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/whatsapp-calendar-agent.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

---

## 🌐 Step 2: Create a Render Service

### 2.1 Create a New Web Service

1. Go to [dashboard.render.com](https://dashboard.render.com)
2. Click **+ New** → **Web Service**
3. Select **Deploy an existing repository**
4. Choose your `whatsapp-calendar-agent` repository
   - If not listed, click **Connect account** and authorize GitHub
5. Fill in the settings:
   - **Name**: `whatsapp-calendar-agent`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`

### 2.2 Select Plan

- Select **Free** tier (or paid if you need more resources)
- Click **Create Web Service**

The service will start deploying. Once the status shows `Live`, you'll have a URL like:
```
https://whatsapp-calendar-agent.onrender.com
```

---

## 🔐 Step 3: Add Environment Variables to Render

### 3.1 In the Render Dashboard

1. Click on your service: `whatsapp-calendar-agent`
2. Go to **Environment** tab
3. Click **Add Environment Variable** for each variable

Add the following variables (copy from your `.env` file):

| Variable | Value |
|----------|-------|
| `GEMINI_API_KEY` | Your Gemini API key |
| `GOOGLE_CLIENT_ID` | Your Google OAuth2 Client ID |
| `GOOGLE_CLIENT_SECRET` | Your Google OAuth2 Client Secret |
| `GOOGLE_REDIRECT_URI` | `https://whatsapp-calendar-agent.onrender.com/auth/callback` |
| `GOOGLE_REFRESH_TOKEN` | Your Google refresh token |
| `WHATSAPP_TOKEN` | Your WhatsApp Business API token |
| `PHONE_NUMBER_ID` | Your WhatsApp phone number ID |
| `VERIFY_TOKEN` | Your webhook verification token (create any random string) |
| `TIMEZONE` | `Asia/Kolkata` (or your timezone) |

### 3.2 Deploy with Variables

After adding all variables, click **Deploy latest commit**. The service will redeploy with the new environment variables.

---

## 📱 Step 4: Configure WhatsApp Webhook on Meta

### 4.1 Update Webhook URL in Meta Developer Dashboard

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Select your app → **Whatsapp** → **Configuration**
3. Under **Webhook**, set:
   - **Callback URL**: `https://whatsapp-calendar-agent.onrender.com/webhook`
   - **Verify Token**: The `VERIFY_TOKEN` you set in Render

4. Click **Verify and Save**

### 4.2 Re-subscribe to Message Webhooks

1. In the same **Webhook** section, click **Manage**
2. Under **Webhook fields**, ensure `messages` is checked
3. Click **Done**

---

## ✅ Step 5: Test the Deployment

### Test 1: Health Check

Open in your browser:
```
https://whatsapp-calendar-agent.onrender.com/
```

You should see:
```json
{
  "status": "ok",
  "message": "WhatsApp AI Calendar Agent is running 🚀"
}
```

### Test 2: Send a WhatsApp Message

From your phone, send a message to your WhatsApp Business number:
```
Meeting with Avadhoot tomorrow at 4 pm
```

Within seconds, the agent should:
1. Extract the event details
2. Create the Google Calendar event
3. Reply with a confirmation message

---

## 🔄 Step 6: Set Up Automatic Deployments

Render will automatically redeploy whenever you push to `main` branch:

```bash
# Make a change to your code
# Then commit and push:
git add .
git commit -m "Update message templates"
git push origin main

# Render will automatically redeploy
```

You can check deployment status in the **Logs** tab of your Render service.

---

## 📊 Monitoring & Logs

### View Live Logs

1. Go to your service dashboard
2. Click **Logs** tab
3. Live logs show all incoming messages and errors

### Common Issues

| Issue | Solution |
|-------|----------|
| `❌ Missing required environment variables` | Check that all variables in Step 3 are set in Render |
| `ℹ️ Webhook verification failed` | Verify `VERIFY_TOKEN` matches Meta dashboard setting |
| `❌ Google Calendar error` | Check `GOOGLE_REFRESH_TOKEN` is valid and not expired |
| `❌ Gemini extraction failed` | Verify `GEMINI_API_KEY` is correct and not expired |

---

## 🎯 Optional Enhancements for Production

### Add Custom Domain

1. In Render service settings, scroll to **Custom Domain**
2. Enter your domain (e.g., `calendar-agent.yourdomain.com`)
3. Follow DNS instructions provided

### Enable Automatic Backups

Store sensitive data in a `.env.local` file locally and never commit it:

```bash
echo ".env.local" >> .gitignore
git add .gitignore
git commit -m "Exclude local env from git"
git push
```

### Monitor Uptime

Render's **Free** tier may exceed monthly limits. Upgrade to **Paid** for:
- Unlimited traffic
- Automatic restarts
- 24/7 uptime guarantee

---

## 🛠️ Deployment Checklist

- [ ] GitHub repository created and code pushed
- [ ] Render account set up
- [ ] Web service created on Render
- [ ] All environment variables added to Render
- [ ] Webhook URL updated in Meta dashboard
- [ ] Health check endpoint working
- [ ] Test message sent and received confirmation
- [ ] Automatic deployments working (optional)

---

## 🆘 Troubleshooting

### Service keeps crashing

Check logs for error messages:
```
❌ Missing required environment variables:
   - GEMINI_API_KEY
```

**Solution**: Add the missing variable in Render's **Environment** tab.

### Webhook not receiving messages

1. Verify webhook URL in Meta: `https://whatsapp-calendar-agent.onrender.com/webhook`
2. Check `VERIFY_TOKEN` matches Meta setting
3. Ensure `messages` webhook is subscribed in Meta dashboard

### Google Calendar events not creating

1. Test `GOOGLE_REFRESH_TOKEN` validity:
   - Get a new token from Google OAuth2 flow if expired
   - Update in Render Environment tab

2. Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct

### Slow response times

- Upgrade to **Paid** plan (Free tier has CPU limits)
- Check Render logs for timeout errors

---

## 📞 Support

For issues with:

- **Render**: Visit [render.com/docs](https://render.com/docs)
- **Meta WhatsApp API**: Check [developers.facebook.com/docs](https://developers.facebook.com/docs)
- **Google Calendar API**: See [developers.google.com/calendar](https://developers.google.com/calendar)

---

## 🎉 You're Live!

Your WhatsApp AI Calendar Agent is now deployed and running 24/7 on Render. Every message sent to your WhatsApp Business number will automatically create calendar events!

Send a message like:
```
Lunch with team tomorrow at 12 pm
```

And watch the magic happen! ✨

