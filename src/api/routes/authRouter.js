const router = require("express").Router();
const authCtrl = require("../controllers/authCtrl");
const auth = require("../middleware/auth");

router.post("/register", authCtrl.register);
router.get("/email-verification", authCtrl.verifyEmail);

router.post("/google-auth", authCtrl.googleAuth);

router.post("/login", authCtrl.login);

router.post("/forgot-password-email", authCtrl.forgotPasswordEmail);
router.post(
  "/reset-password-email/:userId/:token",
  authCtrl.resetPasswordEmail
);

router.post("/logout", auth, authCtrl.logout);
router.post("/refresh-token", authCtrl.generateAccessToken);

module.exports = router;
