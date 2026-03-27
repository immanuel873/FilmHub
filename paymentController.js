const db = require("../config/db");
const rewards = require("../config/rewards");

exports.requestWithdrawal = (req,res)=>{
  const user_id = req.user && req.user.id;
  const { points, user_number } = req.body;

  if(!user_id){
    return res.status(401).json({ message: "Unauthorized" });
  }
  const pointsNum = Number(points);
  if(!pointsNum || pointsNum <= 0 || !user_number){
    return res.status(400).json({ message: "Missing or invalid fields" });
  }
  if (pointsNum < rewards.MIN_WITHDRAW_POINTS) {
    return res.status(400).json({ message: `Minimum withdrawal is ${rewards.MIN_WITHDRAW_POINTS} points` });
  }

  const userSql = "SELECT points, referral_points FROM users WHERE id = ?";
  db.query(userSql, [user_id], (err, rows) => {
    if (err && err.code === "ER_BAD_FIELD_ERROR") {
      return db.query("SELECT points FROM users WHERE id = ?", [user_id], (err2, rows2) => {
        if (err2 || rows2.length === 0) {
          return res.status(500).json({ message: (err2 && err2.message) || "Database error" });
        }
        const pointsOnly = Number(rows2[0].points || 0);
        if (pointsOnly < rewards.MIN_WITHDRAW_POINTS || pointsNum > pointsOnly) {
          return res.status(400).json({ message: "Insufficient points for withdrawal" });
        }
        const insertSql = "INSERT INTO withdrawals (user_id,points_used,user_number) VALUES (?,?,?)";
        db.query(insertSql, [user_id, pointsNum, user_number], (err3) => {
          if (err3) return res.status(500).json({ message: err3.message || "Database error" });
          const updateSql = "UPDATE users SET points = points - ? WHERE id = ?";
          db.query(updateSql, [pointsNum, user_id], (err4) => {
            if (err4) return res.status(500).json({ message: err4.message || "Database error" });
            res.json({ message: "Withdrawal request submitted" });
          });
        });
      });
    }

    if (err) return res.status(500).json({ message: err.message || "Database error" });
    if (!rows || rows.length === 0) return res.status(404).json({ message: "User not found" });

    const pointsBalance = Number(rows[0].points || 0);
    const referralBalance = Number(rows[0].referral_points || 0);
    const totalPoints = pointsBalance + referralBalance;

    if (totalPoints < rewards.MIN_WITHDRAW_POINTS || pointsNum > totalPoints) {
      return res.status(400).json({ message: "Insufficient points for withdrawal" });
    }

    const insertSql = "INSERT INTO withdrawals (user_id,points_used,user_number) VALUES (?,?,?)";
    db.query(insertSql, [user_id, pointsNum, user_number], (err2) => {
      if (err2) return res.status(500).json({ message: err2.message || "Database error" });

      // Deduct from points first, then referral_points if needed
      let remaining = pointsNum;
      const newPoints = Math.max(pointsBalance - remaining, 0);
      remaining = Math.max(remaining - pointsBalance, 0);
      const newReferral = Math.max(referralBalance - remaining, 0);

      const updateSql = "UPDATE users SET points = ?, referral_points = ? WHERE id = ?";
      db.query(updateSql, [newPoints, newReferral, user_id], (err3) => {
        if (err3) return res.status(500).json({ message: err3.message || "Database error" });
        res.json({ message: "Withdrawal request submitted" });
      });
    });
  });
};

exports.getMyWithdrawals = (req, res) => {
  const user_id = req.user && req.user.id;
  if (!user_id) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const sql = "SELECT * FROM withdrawals WHERE user_id = ? ORDER BY id DESC";
  db.query(sql, [user_id], (err, rows) => {
    if (err && err.code === "ER_NO_SUCH_TABLE") {
      return res.json([]);
    }
    if (err) return res.status(500).json({ message: err.message || "Database error" });
    res.json(rows || []);
  });
};

exports.getAllWithdrawals = (req, res) => {
  const sql = `
    SELECT w.*, u.username, u.email
    FROM withdrawals w
    LEFT JOIN users u ON w.user_id = u.id
    ORDER BY w.status, w.id DESC
  `;
  db.query(sql, (err, rows) => {
    if (err && err.code === "ER_NO_SUCH_TABLE") {
      return res.json([]);
    }
    if (err) return res.status(500).json({ message: err.message || "Database error" });
    res.json(rows || []);
  });
};

exports.updateWithdrawalStatus = (req, res) => {
  const id = req.params.id;
  const status = String(req.body.status || "").toLowerCase();
  const allowed = new Set(["pending", "paid", "rejected"]);
  if (!allowed.has(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  const sql = "UPDATE withdrawals SET status=? WHERE id=?";
  db.query(sql, [status, id], (err, result) => {
    if (err) return res.status(500).json({ message: err.message || "Database error" });
    res.json({ message: "Withdrawal updated" });
  });
};
