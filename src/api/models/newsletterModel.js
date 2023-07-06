const mongoose = require("mongoose");
const { Schema } = mongoose;
const newsletterSchema = new Schema(
  {
    email: {
      type: String,
    }
  },
    {
    timestamps: true,
}
);


module.exports = mongoose.model("newsletter", newsletterSchema);
