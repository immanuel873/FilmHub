const express = require("express");
const router = express.Router();
const paymentController = require("../Controllers/paymentController");
const auth = require("../Middleware/authMiddleware");

function requireAdmin(req, res, next) {
  if (req.user && req.user.role === "admin") return next();
  return res.status(403).json({ message: "Admin access required" });
}

// health check
router.get("/", (req, res) => {
    res.send("Payment route working");
});

// withdrawal request (requires authentication)
router.post("/withdraw", auth, paymentController.requestWithdrawal);

// get current user's withdrawals
router.get("/mine", auth, paymentController.getMyWithdrawals);

// admin: get all withdrawals
router.get("/all", auth, requireAdmin, paymentController.getAllWithdrawals);

// admin: update withdrawal status
router.put("/withdrawals/:id/status", auth, requireAdmin, paymentController.updateWithdrawalStatus);

module.exports = router;
