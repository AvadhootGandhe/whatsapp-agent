require("dotenv").config();
const express = require("express");
const axios = require("axios");

const classifyMessage = require("./gemini");
const {
  createEvent,
  getEventsForDay,
  getEventsAtTime,
  findEventsByDescription,
  deleteEvent,
} = require("./calendar");

// ── Env validation ────────────────────────────────────────────────────────────
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

const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
if (missingVars.length > 0) {
  console.error("❌ Missing required environment variables:");
  missingVars.forEach((v) => console.error(`   - ${v}`));
  process.exit(1);
}

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Simple in-memory store for pending cancellations (use a DB in production)
const pendingCancellations = new Map();

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "WhatsApp AI Calendar Agent is running 🚀" });
});

// ── Webhook verification (GET) ────────────────────────────────────────────────
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

// ── Webhook message handler (POST) ───────────────────────────────────────────
app.post("/webhook", async (req, res) => {
  // Acknowledge immediately so Meta doesn't retry
  res.sendStatus(200);

  try {
    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0]?.value;
    const messageObj = change?.messages?.[0];

    // Ignore non-text messages (images, voice, reactions, etc.)
    if (!messageObj || messageObj.type !== "text") return;

    const from = messageObj.from;
    const messageText = messageObj.text.body.trim();

    console.log(`\n📩 Message from ${from}: "${messageText}"`);

    // ── Handle pending cancellation reply (user picks a number) ──────────────
    const pendingCancel = pendingCancellations.get(from);

    // Clean up expired pending cancellations (older than 5 min) first
    if (pendingCancel && Date.now() - pendingCancel.timestamp > 5 * 60 * 1000) {
      pendingCancellations.delete(from);
    } else if (pendingCancel && /^\d+$/.test(messageText.trim())) {
      const choice = parseInt(messageText.trim(), 10) - 1;

      if (choice >= 0 && choice < pendingCancel.events.length) {
        const event = pendingCancel.events[choice];
        const eventTitle = event.summary || "Untitled event";
        const eventTime = formatEventTime(event);

        try {
          await deleteEvent(event.id);
          await sendWhatsAppMessage(from, `✅ Cancelled: "${eventTitle}" at ${eventTime} 🚫`);
        } catch {
          await sendWhatsAppMessage(from, `❌ Sorry, I couldn't cancel "${eventTitle}" 😔. Please try again.`);
        }
      } else {
        await sendWhatsAppMessage(
          from,
          `Invalid choice 😕. Please reply with a number between 1 and ${pendingCancel.events.length}. 🔢`
        );
      }

      pendingCancellations.delete(from);
      return;
    }

    // ── Single Gemini classification call — handles ALL intents ───────────────
    console.log("🧠 Classifying message with Gemini...");
    const classified = await classifyMessage(messageText);
    console.log("🎯 Intent:", classified.intent, classified);

    switch (classified.intent) {

      // ── CREATE ──────────────────────────────────────────────────────────────
      case "create": {
        console.log("📅 Creating calendar event...");
        const eventLink = await createEvent({
          title: classified.title,
          date: classified.date,
          time: classified.time,
        });

        await sendWhatsAppMessage(
          from,
          `✅ Done! Added to your Google Calendar 📅:\n\n` +
          `📌 *${classified.title}*\n` +
          `📅 Date: ${classified.date}\n` +
          `🕐 Time: ${classified.time}\n\n`
        );
        break;
      }

      // ── CANCEL ONE specific event ────────────────────────────────────────────
      case "cancel_one": {
        const matchingEvents = await findEventsByDescription(
          classified.description,
          classified.date
        );

        if (!matchingEvents.length) {
          await sendWhatsAppMessage(
            from,
            `Couldn't find any events matching "${classified.description}" 😕. Check your spelling or try a different description. 🔍`
          );
          break;
        }

        if (matchingEvents.length === 1) {
          const event = matchingEvents[0];
          const eventTitle = event.summary || "Untitled event";
          const eventTime = formatEventTime(event);

          try {
            await deleteEvent(event.id);
            await sendWhatsAppMessage(from, `✅ Cancelled: "${eventTitle}" at ${eventTime} 🚫`);
          } catch {
            await sendWhatsAppMessage(from, `❌ Sorry, I couldn't cancel "${eventTitle}" 😔. Please try again.`);
          }
          break;
        }

        // Multiple matches — ask user to pick
        const eventList = matchingEvents
          .slice(0, 5)
          .map((ev, i) => `${i + 1}. ${formatEventSummary(ev)}`)
          .join("\n");

        pendingCancellations.set(from, { events: matchingEvents, timestamp: Date.now() });

        await sendWhatsAppMessage(
          from,
          `I found multiple events matching "${classified.description}" 🤷‍♂️. Which one do you want to cancel?\n\n${eventList}\n\nReply with the number (1-${matchingEvents.length}) 🔢`
        );
        break;
      }

      // ── CANCEL ALL events on a day ───────────────────────────────────────────
      case "cancel_all": {
        const events = await getEventsForDay(classified.date);

        if (!events.length) {
          await sendWhatsAppMessage(
            from,
            `No events found on ${prettyDate(classified.date)} 😌. Nothing to cancel!`
          );
          break;
        }

        // Delete them all
        const results = await Promise.allSettled(events.map((ev) => deleteEvent(ev.id)));
        const deleted = results.filter((r) => r.status === "fulfilled").length;
        const failed = results.length - deleted;

        let reply = `✅ Cleared ${deleted} event${deleted !== 1 ? "s" : ""} from ${prettyDate(classified.date)} 🗑️.`;
        if (failed > 0) reply += ` ⚠️ ${failed} event${failed !== 1 ? "s" : ""} couldn't be removed — try again.`;

        await sendWhatsAppMessage(from, reply);
        break;
      }

      // ── READ schedule for a day ──────────────────────────────────────────────
      case "read": {
        const events = await getEventsForDay(classified.date);

        if (!events.length) {
          await sendWhatsAppMessage(
            from,
            `Nice, ${prettyDate(classified.date)} looks clear 😌. You don't have any events scheduled.`
          );
          break;
        }

        const summary = events.map(formatEventSummary).join("\n");
        await sendWhatsAppMessage(
          from,
          `Alright, here's what you've got ${prettyDate(classified.date)} 📋:\n${summary}`
        );
        break;
      }

      // ── AVAILABILITY check ───────────────────────────────────────────────────
      case "availability": {
        if (!classified.time) {
          await sendWhatsAppMessage(
            from,
            "Tell me the time you want to check ⏰, for example: _Do I have something at 4pm today?_ 🤔"
          );
          break;
        }

        const events = await getEventsAtTime(classified.date, classified.time);

        if (!events.length) {
          await sendWhatsAppMessage(
            from,
            `You're free at ${classified.time} ${prettyDate(classified.date)} — no events found in your calendar 😎.`
          );
          break;
        }

        const summary = events.map(formatEventSummary).join("\n");
        await sendWhatsAppMessage(
          from,
          `Yep, you're booked at ${classified.time} ${prettyDate(classified.date)} 📅:\n${summary}`
        );
        break;
      }

      // ── UNKNOWN (greeting, insult, gibberish) ────────────────────────────────
      case "unknown":
      default: {
        await sendWhatsAppMessage(from, classified.reply || "I'm not sure what you mean 🤔. Try: _Meeting with John tomorrow at 3 pm_ ⏰");
        break;
      }
    }

  } catch (err) {
    console.error("❌ Error processing message:", err.message);

    try {
      const from = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from;
      if (from) {
        await sendWhatsAppMessage(
          from,
          "⚠️ Something went wrong 😔. Please try again with a clearer message.\n\nExample: _Meeting with John tomorrow at 3 pm_ ⏰"
        );
      }
    } catch {
      // Silently ignore secondary error
    }
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function sendWhatsAppMessage(to, body) {
  await axios.post(
    `https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`,
    { messaging_product: "whatsapp", to, text: { body } },
    {
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function prettyDate(dateString) {
  const today = formatDate(new Date());
  const tomorrow = formatDate(new Date(Date.now() + 86400000));
  if (dateString === today) return "today";
  if (dateString === tomorrow) return "tomorrow";
  return dateString;
}

function formatEventTime(event) {
  const start = event.start?.dateTime || event.start?.date;
  if (!start) return "Unknown time";
  if (event.start.date) return "All day";
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

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Webhook endpoint: http://localhost:${PORT}/webhook\n`);
});