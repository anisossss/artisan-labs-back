const jwt = require("jsonwebtoken");
const generateToken = {
  createAccessToken: (payload) => {
    return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: "30d",
    });
  },
  createRefreshToken: (payload) => {
    return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
      expiresIn: "1y",
    });
  },
};
module.exports = generateToken;
