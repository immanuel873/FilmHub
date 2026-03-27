const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
const rewards = require("../config/rewards");
const { isUserSuspended } = require("../utils/suspension");

const JWT_SECRET = process.env.JWT_SECRET || "filmhub_secret";

// Generate unique referral code
function generateRefCode() {
  return Math.random().toString(36).substring(2, 12).toUpperCase();
}

function getUserColumns(cb) {
  db.query("SHOW COLUMNS FROM users", (err, rows) => {
    if (err) return cb(err);
    const cols = new Map();
    rows.forEach(r => {
      cols.set(r.Field, { type: r.Type || "", default: r.Default, nullable: r.Null === "YES" });
    });
    cb(null, cols);
  });
}

function getFilmColumns(cb) {
  db.query("SHOW COLUMNS FROM films", (err, rows) => {
    if (err) return cb(err);
    const cols = new Set(rows.map(r => r.Field));
    cb(null, cols);
  });
}

function pickFilmColumn(columns, candidates) {
  for (const name of candidates) {
    if (columns.has(name)) return name;
  }
  return null;
}

function getUploaderViewStats(userId, cb) {
  getFilmColumns((colErr, columns) => {
    if (colErr) return cb(null, { view_count_total: 0, view_points_total: 0 });
    const uploaderCol = pickFilmColumn(columns, ["uploader_id", "user_id"]);
    if (!uploaderCol) return cb(null, { view_count_total: 0, view_points_total: 0 });
    const sql = `
      SELECT
        COALESCE(SUM(s.view_count), 0) AS view_count_total,
        COALESCE(SUM(s.points_awarded), 0) AS view_points_total
      FROM films f
      LEFT JOIN fh_video_view_stats s ON f.id = s.film_id
      WHERE f.\`${uploaderCol}\`=?
    `;
    db.query(sql, [userId], (err, rows) => {
      if (err && err.code === "ER_NO_SUCH_TABLE") {
        return cb(null, { view_count_total: 0, view_points_total: 0 });
      }
      if (err) return cb(null, { view_count_total: 0, view_points_total: 0 });
      const row = rows && rows[0] ? rows[0] : {};
      cb(null, {
        view_count_total: Number(row.view_count_total || 0),
        view_points_total: Number(row.view_points_total || 0)
      });
    });
  });
}

function parseEnumValues(type) {
  const match = /^enum\((.*)\)$/i.exec(type || "");
  if (!match) return [];
  return match[1]
    .split(/,(?=(?:[^']*'[^']*')*[^']*$)/)
    .map(v => v.trim().replace(/^'(.*)'$/, "$1"));
}

function buildUserInsert(columns, data) {
  const fields = [];
  const values = [];

  if (columns.has("username")) {
    fields.push("username");
    values.push(data.username);
  }
  if (columns.has("email")) {
    fields.push("email");
    values.push(data.email);
  }
  if (columns.has("password")) {
    fields.push("password");
    values.push(data.hashedPassword);
  }

  if (columns.has("role")) {
    const roleMeta = columns.get("role");
    const roleType = String(roleMeta.type || "").toLowerCase();
    const enumValues = parseEnumValues(roleMeta.type);
    let roleValue = null;

    // Prefer DB default if it exists
    if (roleMeta.default != null && roleMeta.default !== "") {
      roleValue = null;
    } else if (enumValues.length > 0) {
      const userValue = enumValues.find(v => v.toLowerCase() === "user");
      roleValue = userValue || enumValues[0];
    } else {
      const lenMatch = /(char|varchar)\((\d+)\)/.exec(roleType);
      const maxLen = lenMatch ? parseInt(lenMatch[2], 10) : null;
      if (maxLen && maxLen < 4) {
        roleValue = "u";
      } else {
        roleValue = "user";
      }
    }

    if (roleValue) {
      fields.push("role");
      values.push(roleValue);
    }
  }

  if (columns.has("ref_code")) {
    fields.push("ref_code");
    values.push(data.refCode);
  }
  if (columns.has("referred_by_email")) {
    fields.push("referred_by_email");
    values.push(data.referredByEmail);
  }

  if (fields.length < 3) {
    return { error: "Users table is missing required columns" };
  }

  const sql = `INSERT INTO users (${fields.map(f => `\`${f}\``).join(", ")}) VALUES (${fields.map(() => "?").join(", ")})`;
  return { sql, values };
}

exports.register = (req, res) => {
  const { username, email, password, referral_code } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // check whether email already exists
  const checkSql = "SELECT id FROM users WHERE email = ?";
  db.query(checkSql, [email], (err, rows) => {
    if (err) return res.status(500).json({ message: err.message || "Database error" });
    if (rows.length > 0) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const refCode = generateRefCode();
    const referredByEmail = referral_code ? decodeURIComponent(referral_code.trim()) : null;

    const handlePostInsert = (newUserId) => {
      if (!referredByEmail) {
        return res.json({ message: "User registered" });
      }

      const referrerSql = "SELECT id FROM users WHERE email = ?";
      db.query(referrerSql, [referredByEmail], (err, referrerRows) => {
        if (err) {
          console.error("Error finding referrer:", err);
          return res.json({ message: "User registered (referral processing failed)" });
        }

        if (referrerRows.length === 0) {
          return res.json({ message: "User registered (referrer not found)" });
        }

        const referrerId = referrerRows[0].id;
        const REFERRAL_POINTS = 10;

        const referralSql = `
          INSERT INTO referrals (referrer_id, referred_user_id, points_awarded)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE created_at = CURRENT_TIMESTAMP
        `;
        
        db.query(referralSql, [referrerId, newUserId, REFERRAL_POINTS], (err) => {
          if (err) {
            console.error("Error creating referral record:", err);
            return res.json({ message: "User registered (referral record failed)" });
          }

          const updatePointsSql = "UPDATE users SET referral_points = referral_points + ? WHERE id = ?";
          db.query(updatePointsSql, [REFERRAL_POINTS, referrerId], (err) => {
            if (err) {
              console.error("Error updating referral points:", err);
            }
            res.json({ message: "User registered and referral recorded" });
          });
        });
      });
    };

    // Insert only columns that exist, and pick a valid role value for enum columns
    getUserColumns((colErr, columns) => {
      if (colErr) return res.status(500).json({ message: colErr.message || "Database error" });
      const built = buildUserInsert(columns, { username, email, hashedPassword, refCode, referredByEmail });
      if (built.error) return res.status(500).json({ message: built.error });

      db.query(built.sql, built.values, (err, result) => {
        if (err) return res.status(500).json({ message: err.message || "Database error" });
        handlePostInsert(result.insertId);
      });
    });
  });
};

exports.login = (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }

  const sql = "SELECT * FROM users WHERE email = ?";
  db.query(sql, [email], (err, result) => {
    if (err) return res.status(500).json({ message: err.message || "Database error" });
    if (result.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = result[0];
    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: "Wrong password" });
    }

    isUserSuspended(user.id, (sErr, suspended) => {
      if (sErr) {
        return res.status(500).json({ message: sErr.message || "Suspension check failed" });
      }
      if (suspended) {
        return res.status(403).json({ message: "Account suspended" });
      }
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, referral_points: user.referral_points },
        JWT_SECRET,
        { expiresIn: "24h" }
      );
      res.json({
        message: "Login successful",
        token: token
      });
    });
  });
};

// Get user's points and withdrawal settings
exports.getPoints = (req, res) => {
  const userId = req.user && req.user.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const baseSql = "SELECT points, referral_points FROM users WHERE id = ?";
  db.query(baseSql, [userId], (err, rows) => {
    if (!err && rows.length > 0) {
      const points = Number(rows[0].points || 0);
      const referralPoints = Number(rows[0].referral_points || 0);
      const totalPoints = points + referralPoints;
      return getUploaderViewStats(userId, (_e, viewStats) => {
        return res.json({
          points,
          referral_points: referralPoints,
          total_points: totalPoints,
          view_count_total: viewStats.view_count_total || 0,
          view_points_total: viewStats.view_points_total || 0,
          min_withdraw_points: rewards.MIN_WITHDRAW_POINTS,
          points_per_currency: rewards.POINTS_PER_CURRENCY,
          currency_symbol: rewards.CURRENCY_SYMBOL
        });
      });
    }

    if (err && err.code === "ER_BAD_FIELD_ERROR") {
      // Retry with points-only if referral_points column doesn't exist
      return db.query("SELECT points FROM users WHERE id = ?", [userId], (err2, rows2) => {
        if (err2 || rows2.length === 0) {
          return res.status(500).json({ message: (err2 && err2.message) || "Database error" });
        }
        const points = Number(rows2[0].points || 0);
        return getUploaderViewStats(userId, (_e, viewStats) => {
          return res.json({
            points,
            referral_points: 0,
            total_points: points,
            view_count_total: viewStats.view_count_total || 0,
            view_points_total: viewStats.view_points_total || 0,
            min_withdraw_points: rewards.MIN_WITHDRAW_POINTS,
            points_per_currency: rewards.POINTS_PER_CURRENCY,
            currency_symbol: rewards.CURRENCY_SYMBOL
          });
        });
      });
    }

    return res.status(500).json({ message: (err && err.message) || "Database error" });
  });
};

// Get user's referral stats
exports.getReferralStats = (req, res) => {
  const userId = req.user.id;

  const userSql = "SELECT ref_code, referral_points FROM users WHERE id = ?";
  db.query(userSql, [userId], (err, userResult) => {
    if (err && err.code === "ER_BAD_FIELD_ERROR") {
      return res.json({
        ref_code: null,
        referral_points: 0,
        referral_count: 0,
        referrals: []
      });
    }
    if (err) return res.status(500).json({ message: err.message || "Database error" });
    if (userResult.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = userResult[0];

    // Get referral count
    const referralCountSql = "SELECT COUNT(*) as referral_count FROM referrals WHERE referrer_id = ?";
    db.query(referralCountSql, [userId], (err, countResult) => {
      if (err && err.code === "ER_NO_SUCH_TABLE") {
        return res.json({
          ref_code: user.ref_code,
          referral_points: user.referral_points || 0,
          referral_count: 0,
          referrals: []
        });
      }
      if (err) return res.status(500).json({ message: err.message || "Database error" });

      // Get referral list with details
      const referralListSql = `
        SELECT 
          u.username as referred_username,
          u.email as referred_email,
          r.points_awarded,
          r.created_at as referral_date
        FROM referrals r
        JOIN users u ON r.referred_user_id = u.id
        WHERE r.referrer_id = ?
        ORDER BY r.created_at DESC
      `;
      
      db.query(referralListSql, [userId], (err, referralList) => {
        if (err && err.code === "ER_NO_SUCH_TABLE") {
          return res.json({
            ref_code: user.ref_code,
            referral_points: user.referral_points || 0,
            referral_count: 0,
            referrals: []
          });
        }
        if (err) return res.status(500).json({ message: err.message || "Database error" });

        res.json({
          ref_code: user.ref_code,
          referral_points: user.referral_points || 0,
          referral_count: countResult[0].referral_count,
          referrals: referralList || []
        });
      });
    });
  });
};
