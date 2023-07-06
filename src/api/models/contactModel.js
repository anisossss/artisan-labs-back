const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema({
  email: {
    type: String,
    default: "",
  },
  subject: {
    type: String,
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("contact", contactSchema);
