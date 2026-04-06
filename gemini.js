const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Classifies a WhatsApp message into a structured calendar intent.
 *
 * Returns one of these shapes:
 *
 *   { intent: "create",       title, date, time }
 *   { intent: "cancel_one",   description, date }   // cancel a specific event
 *   { intent: "cancel_all",   date }                // "clear my schedule" / "cancel all"
 *   { intent: "read",         date }                // schedule summary for a day
 *   { intent: "availability", date, time }          // "am I free at 4pm?"
 *   { intent: "unknown",      reply }               // greeting / insult / gibberish
 *
 * @param {string} text
 * @returns {Promise<object>}
 */
async function classifyMessage(text) {
  const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

  const today = new Date();
  const todayStr = formatDate(today);
  const tomorrowStr = formatDate(new Date(today.getTime() + 86400000));

  const prompt = `
You are a calendar assistant for a WhatsApp bot. Classify the user's message into exactly one intent and extract the relevant parameters.

Today's date: ${todayStr}
Tomorrow's date: ${tomorrowStr}

INTENTS:
1. "create"       — User wants to schedule/add/book a new event.
2. "cancel_one"   — User wants to cancel/delete/remove a SPECIFIC named event.
3. "cancel_all"   — User wants to clear/cancel ALL events on a day ("clear my schedule", "cancel all events tomorrow").
4. "read"         — User wants to see their schedule/agenda for a day.
5. "availability" — User wants to know if they are free at a specific time.
6. "unknown"      — Greeting, insult, complaint, nonsense, or anything unrelated to calendar management.

RULES:
- Relative dates ("today", "tomorrow", "next Monday", "this Friday") must be converted to YYYY-MM-DD.
- Times must be 24-hour HH:MM format ("5 pm" → "17:00", "9:30 am" → "09:30"). Default time for create if unspecified: "07:30".
- Default date for create if unspecified: today (${todayStr}).
- For "cancel_one", extract the event title/description the user mentioned (strip the cancel verb itself).
- For "cancel_all" and "read", if no date mentioned, default to today.
- For "unknown", write a short, friendly reply in "reply" field (1–2 sentences). If it's a greeting, invite them to schedule something. If it's an insult/complaint, stay calm and redirect.

Respond ONLY with a valid JSON object, no markdown, no extra text.

Examples:
  "Meeting with Raj tomorrow at 3pm"  → {"intent":"create","title":"Meeting with Raj","date":"${tomorrowStr}","time":"15:00"}
  "Cancel meet with avadhoot"         → {"intent":"cancel_one","description":"meet with avadhoot","date":"${todayStr}"}
  "Cancel all events tomorrow"        → {"intent":"cancel_all","date":"${tomorrowStr}"}
  "Clear my schedule for tomorrow"    → {"intent":"cancel_all","date":"${tomorrowStr}"}
  "What's my schedule tomorrow"       → {"intent":"read","date":"${tomorrowStr}"}
  "Am I free at 4pm today?"          → {"intent":"availability","date":"${todayStr}","time":"16:00"}
  "Heyy"                              → {"intent":"unknown","reply":"Hey! 👋 I schedule calendar events for you. Try something like: _Meeting with Raj tomorrow at 3 pm_ ⏰"}
  "I don't like you"                  → {"intent":"unknown","reply":"No worries! 😅 I'm just here to help with your calendar. Want to schedule something?"}

Message: "${text.replace(/"/g, '\\"')}"
`;

  let rawResponse = "";

  try {
    const result = await model.generateContent(prompt);
    rawResponse = result.response.text();

    console.log("🤖 Gemini raw response:", rawResponse);

    const cleaned = rawResponse
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    const jsonStart = cleaned.indexOf("{");
    const jsonEnd = cleaned.lastIndexOf("}") + 1;

    if (jsonStart === -1 || jsonEnd === 0) {
      throw new Error("No JSON object found in Gemini response");
    }

    const parsed = JSON.parse(cleaned.substring(jsonStart, jsonEnd));

    if (!parsed.intent) {
      throw new Error("Missing intent field in Gemini response");
    }

    // Validate create fields
    if (parsed.intent === "create") {
      if (!parsed.title || !parsed.date || !parsed.time) {
        throw new Error("Create intent missing title/date/time");
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(parsed.date)) {
        throw new Error(`Invalid date format: ${parsed.date}`);
      }
      if (!/^\d{2}:\d{2}$/.test(parsed.time)) {
        throw new Error(`Invalid time format: ${parsed.time}`);
      }
    }

    return parsed;

  } catch (err) {
    console.error("❌ Gemini classification failed:", err.message);
    console.error("Raw response was:", rawResponse);
    // Safe fallback — treat as unknown so we don't crash
    return {
      intent: "unknown",
      reply: "⚠️ I had trouble understanding that. Try something like: _Meeting with John tomorrow at 3 pm_ ⏰",
    };
  }
}

// ── tiny date helper (no external deps) ──────────────────────────────────────
function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

module.exports = classifyMessage;