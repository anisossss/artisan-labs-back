const Users = require("../models/userModel");
const jwt = require("jsonwebtoken");

const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization");

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "You are not authorized. Login !",
      });
    }

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    console.log(decoded);

    if (!decoded) {
      return res.status(400).json({
        success: false,
        message: "You are not authorized. Login !",
      });
    }

    const user = await Users.findOne({ _id: decoded.id });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User does not exist",
        decoded: decoded.id,
      });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = auth;
