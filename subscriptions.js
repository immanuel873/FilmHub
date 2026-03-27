const express = require("express");
const router = express.Router();
const db = require("../config/db");
const auth = require("../Middleware/authMiddleware");
const { ensureUserSuspensionTable, setUserSuspended } = require("../utils/suspension");

// submit a subscription payment (uploader id comes from token)
router.post("/submit", auth, (req, res) => {
  const { transaction_id, amount } = req.body;
  const uploader_id = req.user.id;

  if (!transaction_id || !amount) {
    return res.status(400).json({ message: "Transaction ID and amount required" });
  }

  // Always require admin approval
  const status = 'pending';

  const sql = "INSERT INTO subscriptions (uploader_id, transaction_id, amount, status) VALUES (?, ?, ?, ?)";

  db.query(sql, [uploader_id, transaction_id, amount, status], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Database error: " + (err.message || "Unknown error") });
    }
    
    const message = "Payment submitted. Waiting for admin approval.";


    
    res.json({ message: message, status: status });
  });
});

// get all subscriptions with user info (admin only)
router.get("/all", auth, (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  const sql = `SELECT s.*, u.username, u.email FROM subscriptions s 
               LEFT JOIN users u ON s.uploader_id = u.id 
               ORDER BY s.status, s.id DESC`;
  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error: " + (err.message || "Unknown error") });
    }
    res.json(results || []);
  });
});

// get current user's subscriptions
router.get("/mine", auth, (req, res) => {
  const uploader_id = req.user.id;
  const sql = "SELECT * FROM subscriptions WHERE uploader_id=? ORDER BY id DESC";
  db.query(sql, [uploader_id], (err, results) => {
    if (err) return res.status(500).json({ message: "Error fetching subscriptions" });
    res.json(results || []);
  });
});

// approve subscription (admin only)
router.put("/approve/:id", auth, (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  const id = req.params.id;
  const sql = "UPDATE subscriptions SET status='approved' WHERE id=?";
  db.query(sql, [id], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Failed to approve payment" });
    }
    res.json({ message: "Payment approved successfully" });
  });
});

// admin get all users
router.get("/users", auth, (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  ensureUserSuspensionTable((ensureErr) => {
    const sql = ensureErr
      ? "SELECT id, username, email, role FROM users"
      : `SELECT u.id, u.username, u.email, u.role,
            CASE WHEN su.user_id IS NULL THEN 0 ELSE 1 END AS is_suspended
         FROM users u
         LEFT JOIN fh_suspended_users su ON su.user_id = u.id
         ORDER BY u.id DESC`;
    db.query(sql, (err, results) => {
      if (err) return res.status(500).json(err);
      res.json(results);
    });
  });
});

// admin update user role
router.put("/users/:id/role", auth, (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  const { role } = req.body;
  const id = req.params.id;
  const sql = "UPDATE users SET role=? WHERE id=?";
  db.query(sql, [role, id], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Role updated" });
  });
});

// admin delete user
router.delete("/users/:id", auth, (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  const id = req.params.id;
  if (String(req.user.id) === String(id)) {
    return res.status(400).json({ message: "Cannot delete yourself" });
  }
  const sql = "DELETE FROM users WHERE id=?";
  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "User removed" });
  });
});

// admin suspend/unsuspend user
router.put("/users/:id/suspend", auth, (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  const id = req.params.id;
  if (String(req.user.id) === String(id)) {
    return res.status(400).json({ message: "Cannot suspend yourself" });
  }
  const suspended = !!req.body.suspended;
  setUserSuspended(id, suspended, (err) => {
    if (err) return res.status(500).json({ message: err.message || "Failed to update suspension" });
    res.json({ message: suspended ? "User suspended" : "User unsuspended", suspended });
  });
});

module.exports = router;
