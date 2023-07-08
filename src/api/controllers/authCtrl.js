const Users = require("../models/userModel");
const Token = require("../models/tokenModel");
const crypto = require("crypto");
const ejs = require("ejs");
const axios = require("axios");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
var CryptoJS = require("crypto-js");
const generateToken = require("../services/generateToken.js");

const { google } = require("googleapis");
const { OAuth2 } = google.auth;

const client = new OAuth2(process.env.CLIENT_ID);
const { emailSend } = require("../services/mailer.js");

const authCtrl = {
  register: async (req, res, next) => {
    try {
      const { name, email, password, confirmPassword } = req.body;
      if ((!name, !email || !password || !confirmPassword))
        return res.status(403).json({
          success: false,
          message: "Not all fields have been entered",
        });

      if (!validateEmail(email))
        return res.status(401).json({
          success: false,
          message: "Invalid email.",
        });
      const user_email = await Users.findOne({ email });
      if (user_email) {
        return res.status(400).json({
          success: false,
          message: "This email is already registered",
        });
      }
      if (password.length < 6) {
        return res.status(402).json({
          success: false,
          message: "Password must be at least 8 characters long",
        });
      }
      if (password !== confirmPassword)
        return res.status(405).json({
          success: false,
          message: "Password must be identical",
        });
      const passwordHash = await bcrypt.hash(password, 12);
      const newUser = new Users({
        name,
        email,
        password: passwordHash,
      });
      const access_token = generateToken.createAccessToken({ id: newUser._id });
      const refresh_token = generateToken.createRefreshToken({
        id: newUser._id,
      });
      const user = await newUser.save();
      let token = await Token.findOne({ userId: user._id });
      if (!token) {
        token = await new Token({
          userId: user._id,
          token: crypto.randomBytes(32).toString("hex"),
        }).save();
      }
      async (err, data) => {
        if (err) {
          console.log(err);
        } else {
          const emailData = {
            from: "noreply@node-react.com",
            to: email,
            subject: "Email Activation",
            html: data,
          };
          emailSend(emailData);
        }
      };

      return res.status(200).json({
        success: true,
        message:
          "Registered Successfully! \n Check your inbox to confirm your email.",
        access_token,
        refresh_token,
        user: {
          emailVerified: newUser.emailVerified,
          _id: newUser._id,
        },
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },

  resendEmail: async (req, res, next) => {
    try {
      const regex = /\ /gi;
      const lastdata = req.query.scheme.replace(regex, "+");

      var bytes = CryptoJS.AES.decrypt(lastdata, "secret key 1234567890");
      var decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

      const user = await Users.findById(decryptedData[0].userId);
      const email = user.email;

      if (user.emailVerified) {
        return res.status(403).json({
          success: false,
          message: "User is already verified",
        });
      }
      let token = await Token.findOne({ userId: decryptedData[0].userId });
      if (!token) {
        token = await new Token({
          userId: decryptedData[0].userId,
          token: crypto.randomBytes(32).toString("hex"),
        }).save();
      }
      var data = [{ userId: user._id }, { token: token.token }];

      var ciphertext = CryptoJS.AES.encrypt(
        JSON.stringify(data),
        "secret key 1234567890"
      )
        .toString()
        .replace(/\+/gi, "%2B");

      ejs.renderFile(
        "./src/api/controllers/views/confirm.ejs",
        { ciphertext: ciphertext },
        (err, data) => {
          if (err) {
            console.log(err);
          } else {
            const emailData = {
              from: "noreply@node-react.com",
              to: email,
              subject: "Email Activation",
              html: data,
            };

            emailSend(emailData);
          }
        }
      );

      return res.status(200).json({
        success: true,
        message: "Resend activation link successfully",
        code: "1x0003",
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },
  verifyEmail: async (req, res, next) => {
    try {
      const regex = /\%2B/gi;
      const data = req.query.scheme.replace(regex, "+");
      var bytes = CryptoJS.AES.decrypt(data, "secret key 1234567890");
      var decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

      const user = await Users.findById(decryptedData[0].userId);

      if (!user) {
        res.statusCode = 403;
        res.setHeader("Content-Type", "text/html");
        res.sendFile(__dirname + "/views/error.ejs");
      }

      if (user.emailVerified) {
        res.statusCode = 402;
        res.sendFile(__dirname + "/views/verified.ejs");
        res.setHeader("Content-Type", "text/html");
      }
      const token = await Token.findOne({
        userId: decryptedData[0].userId,
        token: decryptedData[1].token,
      });
      if (!token) {
        res.statusCode = 401;
        res.sendFile(__dirname + "/views/error.ejs");
      }
      const verifiedUser = await Users.findOneAndUpdate(
        { _id: decryptedData[0].userId },
        { emailVerified: true },
        { returnOriginal: false }
      );
      if (token) {
        await token.delete();
      }

      if (verifiedUser) {
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/html");
        res.sendFile(__dirname + "/views/success.ejs");
      }
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password)
        return res.status(403).json({
          success: false,
          message: "Not all fields have been entered",
        });
      if (!validateEmail(email))
        return res.status(400).json({
          success: false,
          message: "Invalid email",
          code: "0x0002",
        });
      const user = await Users.findOne({ email }).populate("-password");
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not registred",
        });
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(402).json({
          success: false,
          message: "Password is incorrect",
        });
      }
      if (!user.emailVerified) {
        return res.status(401).json({
          success: false,
          message: "Your Email has not been verified.",
        });
      }
      const access_token = generateToken.createAccessToken({ id: user._id });
      const refresh_token = generateToken.createRefreshToken({ id: user._id });
      console.log(access_token);
      console.log(refresh_token);
      user.online = true;
      user.save();
      return res.status(200).json({
        success: true,
        message: "LoggedIn successfully!",
        access_token,
        refresh_token,
        user: {
          emailVerified: user.emailVerified,
          _id: user._id,
        },
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },

  generateAccessToken: async (req, res) => {
    const refreshToken = req.body.refreshToken;
    const accessToken = req.headers["authorization"];

    try {
      const decodedAccessToken = jwt.decode(accessToken);

      const decodedRefreshToken = jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET
      );

      console.log("refresh", decodedRefreshToken);
      console.log("access", decodedAccessToken);

      if (decodedRefreshToken.id === decodedAccessToken.id) {
        const newAccessToken = jwt.sign(
          { id: decodedRefreshToken.id },
          process.env.ACCESS_TOKEN_SECRET,
          {
            expiresIn: "1h",
          }
        );
        return res.status(200).json({
          message: "Token generated successfully",
          accessToken: newAccessToken,
        });
      } else {
        return res.status(401).json({ message: "Unauthorized" });
      }
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },

  logout: async (req, res) => {
    try {
      const user = await Users.findOne({ _id: req.user._id });
      if ((user.online = false)) {
        return res.status(400).json({
          success: false,
          message: "Already logged out",
          user,
          code: "0x0020",
        });
      } else {
        user.online = false;
        user.save();
        console.log("logged out successfully", user);
        return res.status(200).json({
          success: true,
          message: "Logged out Successfully.",
          user,
          code: "1x0008",
        });
      }
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message,
        code: "0x0006",
      });
    }
  },

  forgotPasswordEmail: async (req, res) => {
    try {
      const { email } = req.body;
      if (!email)
        return res.status(400).json({
          success: false,
          message: "No Email in request",
          code: "0x0021",
        });
      console.log("Forgot password finding user with given email", email);
      const user = await Users.findOne({ email });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User with given email doesn't exist",
          code: "0x0022",
        });
      }

      let token = await Token.findOne({ userId: user._id });
      if (!token) {
        token = await new Token({
          userId: user._id,
          token: crypto.randomBytes(32).toString("hex"),
        }).save();
      }
      var data = [{ userId: user._id }, { token: token.token }];

      var ciphertext = CryptoJS.AES.encrypt(
        JSON.stringify(data),
        "secret key 1234567890"
      )
        .toString()
        .replace(/\+/gi, "%2B");

      ejs.renderFile(
        "./src/api/controllers/views/passwordRecover.ejs",
        { ciphertext: ciphertext },
        (err, data) => {
          if (err) {
            console.log(err);
          } else {
            const emailData = {
              from: "noreply@node-react.com",
              to: email,
              subject: "Password Reset Instructions",
              html: data,
            };

            emailSend(emailData);
          }
        }
      );

      return res.status(200).json({
        success: true,
        message: "Password reset link sent to your email account",
        code: "0x0023",
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message,
        code: "0x0006",
      });
    }
  },
  resetPasswordEmail: async (req, res) => {
    try {
      const { newPassword } = req.body;
      if (!newPassword)
        return res.status(403).json({
          success: false,
          message: "You must enter a password",
          code: "0x0024",
        });
      if (newPassword.length < 6) {
        return res.status(402).json({
          success: false,
          message: "Password must be at least 6 characters long",
          code: "0x0004",
        });
      }
      const user = await Users.findById(req.params.userId);
      const passwordHash = await bcrypt.hash(newPassword, 12);

      if (!user)
        return res.status(400).json({
          success: false,
          message: "Invalid link or expired",
          code: "0x0025",
        });

      const token = await Token.findOne({
        userId: user._id,
        token: req.params.token,
      });
      if (!token)
        return res.status(403).json({
          success: false,
          message: "Invalid link or expired",
          code: "0x0025",
        });
      user.password = passwordHash;
      await user.save();
      await token.delete();
      res.status(200).json({
        success: true,
        message: "Password reset sucessfully.",
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },
  googleAuth: async (req, res) => {
    try {
      const { tokenId } = req.body;
      console.log(tokenId);
      const verify = await client.verifyIdToken({
        idToken: tokenId,
      });
      const { email, name } = verify.payload;
      const user = await Users.findOne({ email });
      console.log(email, name);
      if (!user) {
        const newUser = new Users({
          name,
          email,
          googleAuth: true,
        });

        const access_token = generateToken.createAccessToken({
          id: newUser._id,
        });
        const refresh_token = generateToken.createRefreshToken({
          id: newUser._id,
        });
        await newUser.save();
        return res.status(200).json({
          success: true,
          message: "Registered Successfully, redirecting..",
          access_token,
          refresh_token,
        });
      } else {
        const access_token = generateToken.createAccessToken({ id: user._id });
        const refresh_token = generateToken.createRefreshToken({
          id: user._id,
        });

        return res.status(200).json({
          success: true,
          message: "Logged in Successfully",
          access_token,
          refresh_token,
          user,
        });
      }
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  },
};

function validateEmail(email) {
  const re =
    /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email);
}

module.exports = authCtrl;
