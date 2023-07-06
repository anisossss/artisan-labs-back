require("dotenv").config();
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    mongoose.connect(process.env.connString, {
      useCreateIndex: true,
      useFindAndModify: false,
      useUnifiedTopology: true,
      useNewUrlParser: true,
    });

    console.log("Mongodb connection SUCCESS ✅ ");
  } catch (error) {
    console.log("Mongodb connection FAIL ⚠️ ");
    console.log(error);
    process.exit(1);
  }
};

module.exports = connectDB;
