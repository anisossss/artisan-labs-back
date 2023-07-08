const router = require("express").Router();
const userCtrl = require("../controllers/userCtrl");
const auth = require("../middleware/auth");

router.get("/infor-by-id", auth, userCtrl.userInfo);

module.exports = router;
