const { google } = require("googleapis");

const TIMEZONE = "Asia/Kolkata";

/**
 * Create an OAuth2 client for a specific user's refresh token.
 * This enables multi-user calendar access.
 */
function createOAuthClient(refreshToken) {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oAuth2Client.setCredentials({ refresh_token: refreshToken });
  return oAuth2Client;
}

function getCalendar(refreshToken) {
  const auth = createOAuthClient(refreshToken);
  return google.calendar({ version: "v3", auth });
}

/**
 * Creates a Google Calendar event at the specified time (no duration).
 * @param {{ title: string, date: string, time: string }} data
 * @param {string} refreshToken - User's Google Calendar refresh token
 * @returns {Promise<string>} - The created event's HTML link
 */
async function createEvent(data, refreshToken) {
  const calendar = getCalendar(refreshToken);
  const startDateTime = new Date(`${data.date}T${data.time}:00+05:30`);

  if (isNaN(startDateTime.getTime())) {
    throw new Error(`Invalid date/time: ${data.date} ${data.time}`);
  }

  // No duration: event at the exact time
  const endDateTime = startDateTime.getTime() // +30 min

  const event = {
    summary: data.title,
    start: {
      dateTime: startDateTime.toISOString(),
      timeZone: TIMEZONE,
    },
    end: {
      dateTime: endDateTime.toISOString(),
      timeZone: TIMEZONE,
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "popup", minutes: 30 },
        { method: "email", minutes: 60 },
      ],
    },
  };

  try {
    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: event,
    });

    console.log("✅ Calendar event created:", response.data.htmlLink);
    return response.data.htmlLink;
  } catch (err) {
    console.error("❌ Google Calendar error:", err.message);
    throw new Error(`Failed to create calendar event: ${err.message}`);
  }
}

function makeLocalDateTime(dateString, timeString) {
  const [year, month, day] = dateString.split("-").map(Number);
  const [hour, minute] = timeString.split(":").map(Number);
  return new Date(`${dateString}T${timeString}:00+05:30`);
}

async function listEvents(refreshToken, startDateTime, endDateTime) {
  const calendar = getCalendar(refreshToken);
  const response = await calendar.events.list({
    calendarId: "primary",
    timeMin: startDateTime.toISOString(),
    timeMax: endDateTime.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    timeZone: TIMEZONE,
    maxResults: 50,
  });

  return response.data.items || [];
}

function eventOverlapsTime(event, queryDateTime) {
  const start = event.start?.dateTime || event.start?.date;
  const end = event.end?.dateTime || event.end?.date;
  if (!start || !end) {
    return false;
  }

  const eventStart = new Date(start);
  const eventEnd = new Date(end);
  if (Number.isNaN(eventStart.getTime()) || Number.isNaN(eventEnd.getTime())) {
    return false;
  }

  return queryDateTime >= eventStart && queryDateTime < eventEnd;
}

async function getEventsForDay(refreshToken, dateString) {
  
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  return listEvents(refreshToken, dayStart, dayEnd);
}

async function getEventsAtTime(refreshToken, dateString, timeString) {
  const queryTime = makeLocalDateTime(dateString, timeString);
  const dayStart = new Date(dateString + "T00:00:00+05:30");
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const events = await listEvents(refreshToken, dayStart, dayEnd);
  return events.filter((event) => eventOverlapsTime(event, queryTime));
}

async function findEventsByDescription(refreshToken, description, dateString = null) {
  let startDate, endDate;

  if (dateString) {
    startDate = new Date(dateString + "T00:00:00+05:30");
    endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
  } else {
    // Search in the next 7 days if no date specified
    startDate = new Date();
    endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  }

  const events = await listEvents(refreshToken, startDate, endDate);
  const normalizedDesc = description.toLowerCase().trim();

  return events.filter((event) => {
    const eventTitle = (event.summary || "").toLowerCase();
    return (
      eventTitle.includes(normalizedDesc) ||
      normalizedDesc.split(" ").some((word) => eventTitle.includes(word))
    );
  });
}

async function deleteEvent(refreshToken, eventId) {
  const calendar = getCalendar(refreshToken);
  try {
    await calendar.events.delete({
      calendarId: "primary",
      eventId: eventId,
    });
    return true;
  } catch (err) {
    console.error("❌ Google Calendar delete error:", err.message);
    throw new Error(`Failed to delete calendar event: ${err.message}`);
  }
}

module.exports = {
  createEvent,
  getEventsForDay,
  getEventsAtTime,
  findEventsByDescription,
  deleteEvent,
};
