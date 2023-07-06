const mongoose = require("mongoose");
const { Schema } = mongoose;
const orderSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "user",
    },
    status: {
      type: String,
    },
    plan: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);
module.exports = mongoose.model("order", orderSchema);
