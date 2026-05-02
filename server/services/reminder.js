const User = require("../models/User");
const { listEvents } = require("./calendar");
const { sendWhatsAppMessage } = require("./whatsapp");

// Track sent reminders so we don't spam — key: `userId:eventId`
const sentReminders = new Set();

// Clean up old reminders every 6 hours to prevent memory bloat
const CLEANUP_INTERVAL = 6 * 60 * 60 * 1000;
// Check for upcoming events every 2 minutes
const POLL_INTERVAL = 2 * 60 * 1000;
// Remind 30 minutes before
const REMINDER_WINDOW_MS = 30 * 60 * 1000;

/**
 * Format a date/time for display in WhatsApp message.
 */
function formatEventTime(dateTimeStr) {
  const dt = new Date(dateTimeStr);
  return dt.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
}

/**
 * Check a single user's calendar for events starting in ~30 minutes
 * and send WhatsApp reminders.
 */
async function checkUserReminders(user) {
  try {
    const now = new Date();
    // Window: from now to 32 minutes from now (small buffer)
    const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_MS + 2 * 60 * 1000);

    const events = await listEvents(user.googleCalendarRefreshToken, now, windowEnd);

    for (const event of events) {
      const eventStart = event.start?.dateTime || event.start?.date;
      if (!eventStart) continue;

      const startTime = new Date(eventStart);
      const minutesUntil = Math.round((startTime.getTime() - now.getTime()) / 60000);

      // Only remind if event is 28-32 minutes away (30 min ± 2 min buffer)
      if (minutesUntil < 28 || minutesUntil > 32) continue;

      const reminderKey = `${user._id}:${event.id}`;
      if (sentReminders.has(reminderKey)) continue;

      // Mark as sent immediately to prevent duplicates
      sentReminders.add(reminderKey);

      const eventTitle = event.summary || "Untitled Event";
      const eventTime = formatEventTime(eventStart);
      const location = event.location ? `\n📍 *Location:* ${event.location}` : "";

      const msg =
        `⏰ *Reminder!* Your event is coming up in 30 minutes!\n\n` +
        `📌 *${eventTitle}*\n` +
        `🕐 *Time:* ${eventTime}${location}\n\n`

      try {
        await sendWhatsAppMessage(user.phone, msg);
        console.log(`🔔 Reminder sent to ${user.email} for "${eventTitle}" at ${eventTime}`);
      } catch (err) {
        console.error(`❌ Failed to send reminder to ${user.email}:`, err.message);
        // Remove from set so we can retry next poll
        sentReminders.delete(reminderKey);
      }
    }
  } catch (err) {
    // Don't crash the scheduler if one user fails (e.g. token expired)
    console.error(`⚠️ Reminder check failed for ${user.email}:`, err.message);
  }
}

/**
 * Main polling loop — checks all active Calendar Buddy users.
 */
async function pollReminders() {
  try {
    const activeUsers = await User.find({
      activeServices: "calendar-buddy",
      phone: { $ne: null },
      googleCalendarRefreshToken: { $ne: null },
    });

    if (activeUsers.length === 0) return;

    // Check all users in parallel (with a concurrency limit for safety)
    const BATCH_SIZE = 10;
    for (let i = 0; i < activeUsers.length; i += BATCH_SIZE) {
      const batch = activeUsers.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(batch.map((user) => checkUserReminders(user)));
    }
  } catch (err) {
    console.error("❌ Reminder polling error:", err.message);
  }
}

/**
 * Periodically clean up old reminder keys to prevent memory growth.
 */
function cleanupOldReminders() {
  sentReminders.clear();
  console.log("🧹 Cleared reminder cache");
}

/**
 * Start the reminder scheduler. Call this once when the server boots.
 */
function startReminderScheduler() {
  console.log("🔔 Event reminder scheduler started (every 2 min, 30 min before events)");

  // Run immediately on startup, then every 2 minutes
  pollReminders();
  setInterval(pollReminders, POLL_INTERVAL);

  // Clean up reminder cache every 6 hours
  setInterval(cleanupOldReminders, CLEANUP_INTERVAL);
}

module.exports = { startReminderScheduler };
