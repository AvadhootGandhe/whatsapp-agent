const axios = require("axios");

const WHATSAPP_API_URL = "https://graph.facebook.com/v18.0";

/**
 * Send text message via WhatsApp Cloud API.
 */
async function sendWhatsAppMessage(to, body) {
  await axios.post(
    `${WHATSAPP_API_URL}/${process.env.PHONE_NUMBER_ID}/messages`,
    { messaging_product: "whatsapp", to, text: { body } },
    {
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
}

/**
 * Send activation greeting when user sets up Calendar Buddy.
 */
async function sendActivationMessage(phone) {
  const msg =
    `Hi! 👋 *Calendar Buddy* is now active on your WhatsApp! 🎉\n\n` +
    `I can help you manage your Google Calendar right from here.\n\n` +
    `Try saying things like:\n` +
    `• _Meeting with Raj tomorrow at 3pm_\n` +
    `• _What's my schedule today?_\n` +
    `• _Cancel my 5pm meeting_\n` +
    `• _Am I free at 2pm tomorrow?_\n\n` +
    `Let's get started! 🚀`;

  await sendWhatsAppMessage(phone, msg);
}

module.exports = { sendWhatsAppMessage, sendActivationMessage };
