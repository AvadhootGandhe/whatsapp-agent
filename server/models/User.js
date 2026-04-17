const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    googleId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    picture: {
      type: String,
      default: "",
    },
    // Google Calendar OAuth refresh token (per-user)
    googleCalendarRefreshToken: {
      type: String,
      default: null,
    },
    // User's WhatsApp phone number (with country code, e.g. "919876543210")
    phone: {
      type: String,
      default: null,
      index: true,
    },
    // List of active service IDs
    activeServices: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);
