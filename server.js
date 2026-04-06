require("dotenv").config();
const express = require("express");
const axios = require("axios");

const extractEvent = require("./gemini");
const { createEvent, getEventsForDay, getEventsAtTime, findEventsByDescription, deleteEvent } = require("./calendar");

// Validate required environment variables
const requiredEnvVars = [
  "GEMINI_API_KEY",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REDIRECT_URI",
  "GOOGLE_REFRESH_TOKEN",
  "WHATSAPP_TOKEN",
  "PHONE_NUMBER_ID",
  "VERIFY_TOKEN",
];

const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);
if (missingVars.length > 0) {
  console.error("❌ Missing required environment variables:");
  missingVars.forEach((varName) => console.error(`   - ${varName}`));
  console.error("\nPlease set these variables in your .env file or Render dashboard.");
  process.exit(1);
}

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Simple in-memory store for pending cancellations (in production, use a database)
const pendingCancellations = new Map();

const greetingPattern = /^hi\b|^hello\b|^hey\b|^good (morning|afternoon|evening)\b|^what'?s up\b|^yo\b|^sup\b|^bye\b|^see you\b|^later\b|^thanks?\b|^thank you\b|^ok\b|^okay\b/;
const profanityPattern = /\b(bitch|fuck|damn|shit|asshole|stupid)\b/;
const eventKeywords = /\b(meeting|appointment|schedule|call|conference|lunch|dinner|breakfast|coffee|interview|webinar|party|reminder|birthday|anniversary|visit|session|presentation|deadline|follow[- ]?up|plan|planning|book|meet|meetup|review|check[- ]?in|study|class|training|appointment)\b/i;
const dateKeywords = /\b(today|tomorrow|tonight|this morning|this afternoon|this evening|next\s+\w+|monday|tuesday|wednesday|thursday|friday|saturday|sunday|jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?|\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*|\bnext\s+week\b|\bnext\s+month\b)\b/i;
const timeKeywords = /\b(\d{1,2}:\d{2}|\d{1,2}\s*(?:am|pm)|noon|midnight|at\s*\d{1,2}(?::\d{2})?|in\s+\d+\s+(?:minutes?|hours?|days?|weeks?|months?))\b/i;
const schedulePhrase = new RegExp(`${dateKeywords.source}|${timeKeywords.source}`, "gi");

function isLikelyCalendarRequest(message) {
  const normalized = message.trim().toLowerCase();
  const hasEventIntent = eventKeywords.test(message);
  const hasScheduleInfo = dateKeywords.test(message) || timeKeywords.test(message);

  if (greetingPattern.test(normalized)) {
    return false;
  }

  if (profanityPattern.test(normalized) && !hasEventIntent && !hasScheduleInfo) {
    return false;
  }

  if (hasEventIntent || hasScheduleInfo) {
    return true;
  }

  if (message.split(" ").length <= 3) {
    return false;
  }

  return true;
}

function hasDate(message) {
  return dateKeywords.test(message);
}

function hasTime(message) {
  return timeKeywords.test(message);
}

function hasEventDescription(message) {
  const stripped = message.replace(schedulePhrase, "").replace(/\b(with|for|on|in|at|by|this|next|the|a|an|and|to|from|my|me|us|our)\b/gi, "").replace(/[^a-z\s]/gi, "").trim();
  return stripped.split(" ").filter(Boolean).length >= 1;
}

function needsMoreDetails(message) {
  const eventIntent = eventKeywords.test(message);
  const dateFound = hasDate(message);
  const timeFound = hasTime(message);

  if (!eventIntent && (dateFound || timeFound)) {
    return {
      needed: true,
      reason: "title",
    };
  }

  if (eventIntent && !dateFound && !timeFound) {
    return {
      needed: true,
      reason: "date_time",
    };
  }

  if (eventIntent && !dateFound) {
    return {
      needed: true,
      reason: "date",
    };
  }

  if (eventIntent && !timeFound) {
    return {
      needed: true,
      reason: "time",
    };
  }

  return { needed: false };
}

function buildGreetingReply() {
  return (
    "Hey buddy! 💯 What are you planning? 🤔 " +
    "I only create calendar events, so hit me with something like:\n" +
    "_Meeting with Avadhoot tomorrow at 4 pm_ ⏰"
  );
}

function buildNeedMoreDetailsReply(reason) {
  if (reason === "title") {
    return (
      "⚠️ I see a date or time, but I need to know what to schedule 😅. " +
      "Drop the subject like:\n" +
      "_Meeting with Avadhoot tomorrow at 4 pm_ ⏰"
    );
  }

  if (reason === "date") {
    return (
      "⚠️ I can help schedule it, but I need the date 📅. " +
      "Tell me when it should happen, for example:\n" +
      "_Meeting with Avadhoot tomorrow at 4 pm_ ⏰"
    );
  }

  if (reason === "time") {
    return (
      "⚠️ I can help schedule it, but I need the time 🕐. " +
      "Tell me when it should happen, for example:\n" +
      "_Meeting with Avadhoot tomorrow at 4 pm_ ⏰"
    );
  }

  return (
    "⚠️ I can schedule events, but I need a clear date and time to do it 😬. " +
    "Send me something like:\n" +
    "_Meeting with Avadhoot tomorrow at 4 pm_ ⏰"
  );
}

function getScheduleQueryIntent(message) {
  const normalized = message.toLowerCase();
  const availabilityPattern = /\b(do i have|am i free|anything at|something at|busy at|free at|free now|have anything)\b/i;
  const summaryPattern = /\b(summary|summaries|summarize|show me today's events|show me todays events|what do i have|what's on|todays events|today's events|today's schedule|events today|schedule today|my schedule|agenda|what am i doing|what is my schedule)\b/i;
  const cancelPattern = /\b(cancel|delete|remove|cancelled|delete the|remove the)\b/i;

  if (cancelPattern.test(normalized)) {
    return "cancel";
  }

  if (availabilityPattern.test(normalized)) {
    return "availability";
  }

  if (summaryPattern.test(normalized)) {
    return "summary";
  }

  return null;
}

function parseQueryDate(message) {
  const normalized = message.toLowerCase();
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (/\btoday\b|\btonight\b/i.test(normalized)) {
    return formatDate(today);
  }

  if (/\btomorrow\b/i.test(normalized)) {
    return formatDate(tomorrow);
  }

  const weekDays = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];

  for (const [index, day] of weekDays.entries()) {
    if (new RegExp(`\\b${day}\\b`, "i").test(normalized)) {
      return formatDate(getNextWeekday(today, index));
    }
  }

  const explicitDateMatch = normalized.match(/\b(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)\b/);
  if (explicitDateMatch) {
    const explicitDate = parseExplicitDate(explicitDateMatch[1]);
    if (explicitDate) {
      return formatDate(explicitDate);
    }
  }

  const monthNameMatch = normalized.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?(?:,\s*\d{4})?\b/i);
  if (monthNameMatch) {
    const explicitDate = new Date(monthNameMatch[0]);
    if (!Number.isNaN(explicitDate.getTime())) {
      return formatDate(explicitDate);
    }
  }

  return formatDate(today);
}

function parseQueryTime(message) {
  const normalized = message.toLowerCase();
  const timeMatch = normalized.match(/\b(\d{1,2}:\d{2}|\d{1,2}\s*(?:am|pm)|noon|midnight|at\s*\d{1,2}(?::\d{2})?)\b/);
  if (!timeMatch) {
    return null;
  }

  return normalizeTime(timeMatch[1]);
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getNextWeekday(fromDate, weekdayIndex) {
  const date = new Date(fromDate);
  const delta = (weekdayIndex + 7 - date.getDay()) % 7 || 7;
  date.setDate(date.getDate() + delta);
  return date;
}

function parseExplicitDate(dateString) {
  const normalized = dateString.replace(/-/g, "/");
  const parts = normalized.split("/").map(Number);
  if (parts.length === 2) {
    const [month, day] = parts;
    const year = new Date().getFullYear();
    return new Date(year, month - 1, day);
  }

  if (parts.length === 3) {
    let [month, day, year] = parts;
    if (year < 100) {
      year += 2000;
    }
    return new Date(year, month - 1, day);
  }

  return null;
}

function normalizeTime(timeString) {
  let cleaned = timeString.toLowerCase().replace(/at\s*/i, "").trim();
  if (cleaned === "noon") {
    return "12:00";
  }
  if (cleaned === "midnight") {
    return "00:00";
  }

  const hhmmMatch = cleaned.match(/^(\d{1,2}):(\d{2})$/);
  if (hhmmMatch) {
    const hour = Number(hhmmMatch[1]);
    const minute = Number(hhmmMatch[2]);
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  const ampmMatch = cleaned.match(/^(\d{1,2})\s*(am|pm)$/);
  if (ampmMatch) {
    let hour = Number(ampmMatch[1]);
    const period = ampmMatch[2];
    if (period === "pm" && hour < 12) hour += 12;
    if (period === "am" && hour === 12) hour = 0;
    return `${String(hour).padStart(2, "0")}:00`;
  }

  const hourMatch = cleaned.match(/^(\d{1,2})$/);
  if (hourMatch) {
    let hour = Number(hourMatch[1]);
    if (hour >= 0 && hour < 24) {
      return `${String(hour).padStart(2, "0")}:00`;
    }
  }

  return null;
}

function prettyDate(dateString) {
  const today = formatDate(new Date());
  const tomorrow = formatDate(new Date(Date.now() + 24 * 60 * 60 * 1000));
  if (dateString === today) {
    return "today";
  }
  if (dateString === tomorrow) {
    return "tomorrow";
  }
  return dateString;
}

function formatEventTime(event) {
  const start = event.start?.dateTime || event.start?.date;
  if (!start) {
    return "Unknown time";
  }
  if (event.start.date) {
    return "All day";
  }
  const dateObj = new Date(start);
  const hours = String(dateObj.getHours()).padStart(2, "0");
  const minutes = String(dateObj.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatEventSummary(event) {
  const time = formatEventTime(event);
  const title = event.summary || "Untitled event";
  return `• ${time} — ${title} 📅`;
}

async function handleScheduleQuery(from, messageText, intent) {
  const date = parseQueryDate(messageText);
  const time = parseQueryTime(messageText);

  if (intent === "cancel") {
    // Extract event description from cancel message
    const cancelPattern = /\b(cancel|delete|remove|cancelled|delete the|remove the)\b/i;
    const eventDescription = messageText.replace(cancelPattern, "").trim();

    if (!eventDescription) {
      await sendWhatsAppMessage(
        from,
        "What event do you want to cancel? 🤔 For example: _Cancel meeting with Avadhoot_ ❌"
      );
      return;
    }

    // Try to find events matching the description
    const matchingEvents = await findEventsByDescription(eventDescription, date);

    if (!matchingEvents.length) {
      await sendWhatsAppMessage(
        from,
        `Couldn't find any events matching "${eventDescription}" 😕. Check your spelling or try a different description. 🔍`
      );
      return;
    }

    if (matchingEvents.length === 1) {
      // Only one matching event, delete it
      const event = matchingEvents[0];
      const eventTitle = event.summary || "Untitled event";
      const eventTime = formatEventTime(event);

      try {
        await deleteEvent(event.id);
        await sendWhatsAppMessage(
          from,
          `✅ Cancelled: "${eventTitle}" at ${eventTime} 🚫`
        );
      } catch (err) {
        await sendWhatsAppMessage(
          from,
          `❌ Sorry, I couldn't cancel "${eventTitle}" 😔. Please try again.`
        );
      }
      return;
    }

    // Multiple matching events, ask for clarification
    const eventList = matchingEvents.slice(0, 5).map((event, index) =>
      `${index + 1}. ${formatEventSummary(event)}`
    ).join("\n");

    // Store pending cancellation for this user
    pendingCancellations.set(from, {
      events: matchingEvents,
      timestamp: Date.now()
    });

    await sendWhatsAppMessage(
      from,
      `I found multiple events matching "${eventDescription}" 🤷‍♂️. Which one do you want to cancel?\n\n${eventList}\n\nReply with the number (1-${matchingEvents.length}) 🔢`
    );
    return;
  }

  if (intent === "availability") {
    if (!time) {
      await sendWhatsAppMessage(
        from,
        "Tell me the time you want to check ⏰, for example: _Do I have something at 4pm today?_ 🤔"
      );
      return;
    }

    const events = await getEventsAtTime(date, time);
    if (!events.length) {
      await sendWhatsAppMessage(
        from,
        `You're free at ${time} ${prettyDate(date)} — no events found in your calendar 😎.`
      );
      return;
    }

    const summary = events.map(formatEventSummary).join("\n");
    await sendWhatsAppMessage(
      from,
      `Yep, you're booked at ${time} ${prettyDate(date)} 📅:\n${summary}`
    );
    return;
  }

  const events = await getEventsForDay(date);
  if (!events.length) {
    await sendWhatsAppMessage(
      from,
      `Nice, ${prettyDate(date)} looks clear 😌. You don't have any events scheduled.`
    );
    return;
  }

  const summary = events.map(formatEventSummary).join("\n");
  await sendWhatsAppMessage(
    from,
    `Alright, here's what you've got ${prettyDate(date)} 📋:\n${summary}`
  );
}

// ──────────────────────────────────────────
// Health check
// ──────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "WhatsApp AI Calendar Agent is running 🚀" });
});

// ──────────────────────────────────────────
// WhatsApp Webhook Verification (GET)
// Meta calls this once when you register the webhook
// ──────────────────────────────────────────
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
    console.log("✅ Webhook verified by Meta");
    return res.status(200).send(challenge);
  }

  console.warn("⚠️ Webhook verification failed — token mismatch");
  res.sendStatus(403);
});

// ──────────────────────────────────────────
// WhatsApp Webhook Message Handler (POST)
// ──────────────────────────────────────────
app.post("/webhook", async (req, res) => {
  // Acknowledge immediately so Meta doesn't retry
  res.sendStatus(200);

  try {
    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0]?.value;
    const messageObj = change?.messages?.[0];

    // Ignore non-text messages (images, voice, reactions, etc.)
    if (!messageObj || messageObj.type !== "text") {
      return;
    }

    const from = messageObj.from;           // Sender's phone number
    const messageText = messageObj.text.body.trim();

    console.log(`\n📩 Message from ${from}: "${messageText}"`);

    // Check if this is a response to a pending cancellation
    const pendingCancel = pendingCancellations.get(from);
    if (pendingCancel && /^\d+$/.test(messageText.trim())) {
      const choice = parseInt(messageText.trim()) - 1;
      if (choice >= 0 && choice < pendingCancel.events.length) {
        const event = pendingCancel.events[choice];
        const eventTitle = event.summary || "Untitled event";
        const eventTime = formatEventTime(event);

        try {
          await deleteEvent(event.id);
          await sendWhatsAppMessage(
            from,
            `✅ Cancelled: "${eventTitle}" at ${eventTime}`
          );
        } catch (err) {
          await sendWhatsAppMessage(
            from,
            `❌ Sorry, I couldn't cancel "${eventTitle}". Please try again.`
          );
        }
      } else {
        await sendWhatsAppMessage(
          from,
          `Invalid choice 😕. Please reply with a number between 1 and ${pendingCancel.events.length}. 🔢`
        );
      }

      // Clear the pending cancellation
      pendingCancellations.delete(from);
      return;
    }

    // Clean up expired pending cancellations (older than 5 minutes)
    if (pendingCancel && Date.now() - pendingCancel.timestamp > 5 * 60 * 1000) {
      pendingCancellations.delete(from);
    }

    const scheduleIntent = getScheduleQueryIntent(messageText);
    if (scheduleIntent) {
      console.log(`🔎 Schedule query detected: ${scheduleIntent}`);
      await handleScheduleQuery(from, messageText, scheduleIntent);
      return;
    }

    if (!isLikelyCalendarRequest(messageText)) {
      console.log("ℹ️ Message does not look like a calendar request, skipping event creation.");
      const normalized = messageText.trim().toLowerCase();
      const reply = greetingPattern.test(normalized)
        ? buildGreetingReply()
        : buildNeedMoreDetailsReply();
      await sendWhatsAppMessage(from, reply);
      return;
    }

    const detailsCheck = needsMoreDetails(messageText);
    if (detailsCheck.needed) {
      console.log(`ℹ️ Message needs more details: ${detailsCheck.reason}`);
      await sendWhatsAppMessage(from, buildNeedMoreDetailsReply(detailsCheck.reason));
      return;
    }

    if (!hasEventDescription(messageText) && (hasDate(messageText) || hasTime(messageText))) {
      console.log("ℹ️ Message contains schedule info but no event subject.");
      await sendWhatsAppMessage(from, buildNeedMoreDetailsReply("title"));
      return;
    }

    // Step 1: Extract event details using Gemini
    console.log("🧠 Calling Gemini...");
    const eventData = await extractEvent(messageText);
    console.log("📌 Extracted event:", eventData);

    // Step 2: Create Google Calendar event
    console.log("📅 Creating calendar event...");
    const eventLink = await createEvent(eventData);

    // Step 3: Reply to the user on WhatsApp
    const replyText =
      `✅ Done! I've added this to your Google Calendar 📅:\n\n` +
      `📌 *${eventData.title}*\n` +
      `📅 Date: ${eventData.date}\n` +
      `🕐 Time: ${eventData.time}\n\n` +
      `🔗 ${eventLink} ✨`;

    await sendWhatsAppMessage(from, replyText);
    console.log(`✅ Reply sent to ${from}`);
  } catch (err) {
    console.error("❌ Error processing message:", err.message);

    // Try to extract sender for error reply (best effort)
    try {
      const from = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from;
      if (from) {
        await sendWhatsAppMessage(
          from,
          "⚠️ Sorry, I couldn't create the event 😔. Please try again with a clearer message.\n\nExample: _Meeting with John tomorrow at 3 pm_ ⏰"
        );
      }
    } catch (_) {
      // Silently ignore secondary error
    }
  }
});

// ──────────────────────────────────────────
// Helper: Send a WhatsApp text message
// ──────────────────────────────────────────
async function sendWhatsAppMessage(to, body) {
  await axios.post(
    `https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: "whatsapp",
      to,
      text: { body },
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
}

// ──────────────────────────────────────────
// Start server
// ──────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Webhook endpoint: http://localhost:${PORT}/webhook\n`);
});
