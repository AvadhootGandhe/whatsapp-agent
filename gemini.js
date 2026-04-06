const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Extracts event details (title, date, time) from a natural language message.
 * @param {string} text - The WhatsApp message text
 * @returns {Promise<{title: string, date: string, time: string}>}
 */
async function extractEvent(text) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const today = new Date().toISOString().split("T")[0]; // e.g. 2025-04-06

  const prompt = `
You are a calendar assistant that extracts event details from natural language messages.

Today's date is: ${today}

Rules:
- Convert ALL relative dates to exact YYYY-MM-DD format (e.g. "tomorrow", "next Monday", "this Friday")
- Time must be in 24-hour HH:MM format (e.g. "5 pm" → "17:00", "9:30 am" → "09:30")
- If no time is mentioned, default to "09:00"
- If no date is mentioned, assume today: ${today}
- Return ONLY valid JSON — no markdown, no explanation, no extra text

Required JSON format:
{
  "title": "event title here",
  "date": "YYYY-MM-DD",
  "time": "HH:MM"
}

Message: "${text}"
`;

  let rawResponse = "";

  try {
    const result = await model.generateContent(prompt);
    rawResponse = result.response.text();

    console.log("🤖 Gemini raw response:", rawResponse);

    // Strip markdown code fences if present
    const cleaned = rawResponse
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    // Extract JSON object
    const jsonStart = cleaned.indexOf("{");
    const jsonEnd = cleaned.lastIndexOf("}") + 1;

    if (jsonStart === -1 || jsonEnd === 0) {
      throw new Error("No JSON object found in Gemini response");
    }

    const jsonString = cleaned.substring(jsonStart, jsonEnd);
    const parsed = JSON.parse(jsonString);

    // Basic validation
    if (!parsed.title || !parsed.date || !parsed.time) {
      throw new Error("Missing required fields in extracted event");
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(parsed.date)) {
      throw new Error(`Invalid date format: ${parsed.date}`);
    }

    // Validate time format
    if (!/^\d{2}:\d{2}$/.test(parsed.time)) {
      throw new Error(`Invalid time format: ${parsed.time}`);
    }

    return parsed;
  } catch (err) {
    console.error("❌ Gemini extraction failed:", err.message);
    console.error("Raw response was:", rawResponse);
    throw new Error(`Failed to extract event details: ${err.message}`);
  }
}

module.exports = extractEvent;
