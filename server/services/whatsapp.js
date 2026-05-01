const axios = require("axios");

const WHATSAPP_API_URL = "https://graph.facebook.com/v18.0";

/**
 * Send a WhatsApp text message via WhatsApp Cloud API.
 */
async function sendWhatsAppMessage(to, body) {
  const payload = {
    messaging_product: "whatsapp",
    to,
    text: { body },
  };

  try {
    return await axios.post(
      `${WHATSAPP_API_URL}/${process.env.PHONE_NUMBER_ID}/messages`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err) {
    const info = err.response?.data || err.message;
    console.error("❌ WhatsApp text send failed:", info);
    throw err;
  }
}

/**
 * Send a WhatsApp template message via WhatsApp Cloud API.
 */
async function sendWhatsAppTemplateMessage(to, templateName) {
  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: "en" },
    },
  };

  try {
    return await axios.post(
      `${WHATSAPP_API_URL}/${process.env.PHONE_NUMBER_ID}/messages`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err) {
    const info = err.response?.data || err.message;
    console.error("❌ WhatsApp template send failed:", info);
    throw err;
  }
}

/**
 * Send activation greeting when user sets up Calendar Buddy.
 */
async function sendActivationMessage(phone) {
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME;

  if (templateName) {
    try {
      return await sendWhatsAppTemplateMessage(phone, templateName);
    } catch (err) {
      if (err.response?.status === 404) {
        console.warn(
          `⚠️ Template '${templateName}' not found or not approved. Falling back to text message.`
        );
      } else {
        throw err;
      }
    }
  }

  const msg =
    `Hi! 👋 *Calendar Buddy* is now active on your WhatsApp! 🎉\n\n` +
    `I can help you manage your Google Calendar right from here.\n\n` +
    `Try saying things like:\n` +
    `• _Meeting with Raj tomorrow at 3pm_\n` +
    `• _What's my schedule today?_\n` +
    `• _Cancel my 5pm meeting_\n` +
    `• _Am I free at 2pm tomorrow?_\n\n` +
    `Let's get started! 🚀`;

  return sendWhatsAppMessage(phone, msg);
}

module.exports = { sendWhatsAppMessage, sendActivationMessage };
