const express = require("express");
const router = express.Router();
const userController = require("../Controllers/userController");
const auth = require("../Middleware/authMiddleware");

router.post("/register", userController.register);
router.post("/login", userController.login);

// get logged-in user's profile
router.get("/profile", auth, (req, res) => {
  res.json({ user: req.user });
});

// get user's points + withdrawal settings
router.get("/points", auth, userController.getPoints);

// get user's referral stats
router.get("/referral-stats", auth, userController.getReferralStats);

module.exports = router;
