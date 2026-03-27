const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const db = require("../config/db");
const auth = require("../Middleware/authMiddleware");
const { ensureFilmSuspensionTable, setFilmSuspended } = require("../utils/suspension");

function requireAdmin(req, res, next) {
  if (req.user && req.user.role === "admin") return next();
  return res.status(403).json({ message: "Admin access required" });
}

const uploadsRoot = path.join(__dirname, "..", "uploads");

function safeResolveUpload(relPath, fallbackFolder) {
  if (!relPath) return null;
  const normalized = String(relPath).replace(/\\/g, "/");
  let candidate = normalized;
  if (candidate.startsWith("uploads/")) {
    candidate = candidate.slice("uploads/".length);
  }
  if (!candidate.includes("/")) {
    candidate = `${fallbackFolder}/${candidate}`;
  }
  const full = path.normalize(path.join(uploadsRoot, candidate));
  if (!full.startsWith(uploadsRoot)) return null;
  return full;
}

function safeUnlink(filePath) {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (err) {
    console.error("Failed to delete file:", filePath, err.message || err);
  }
}

// admin: list films
router.get("/films", auth, requireAdmin, (req, res) => {
  ensureFilmSuspensionTable((ensureErr) => {
    const baseSql = `
      SELECT f.*, u.username, u.email
      FROM films f
      LEFT JOIN users u ON f.uploader_id = u.id
      ORDER BY f.id DESC
    `;
    const suspendedSql = `
      SELECT f.*, u.username, u.email,
        CASE WHEN sf.film_id IS NULL THEN 0 ELSE 1 END AS is_suspended
      FROM films f
      LEFT JOIN users u ON f.uploader_id = u.id
      LEFT JOIN fh_suspended_films sf ON sf.film_id = f.id
      ORDER BY f.id DESC
    `;
    const sql = ensureErr ? baseSql : suspendedSql;
    db.query(sql, (err, rows) => {
      if (!err) return res.json(rows || []);
      if (err.code === "ER_BAD_FIELD_ERROR") {
        const fallbackSql = ensureErr
          ? "SELECT * FROM films ORDER BY id DESC"
          : `SELECT f.*,
               CASE WHEN sf.film_id IS NULL THEN 0 ELSE 1 END AS is_suspended
             FROM films f
             LEFT JOIN fh_suspended_films sf ON sf.film_id = f.id
             ORDER BY f.id DESC`;
        return db.query(fallbackSql, (err2, rows2) => {
          if (err2) return res.status(500).json({ message: err2.message || "Database error" });
          res.json(rows2 || []);
        });
      }
      res.status(500).json({ message: err.message || "Database error" });
    });
  });
});

// admin: delete a film and its files
router.delete("/films/:id", auth, requireAdmin, (req, res) => {
  const id = req.params.id;
  const selectSql = "SELECT id, video_url, thumbnail FROM films WHERE id = ?";
  db.query(selectSql, [id], (err, rows) => {
    if (err) return res.status(500).json({ message: err.message || "Database error" });
    if (!rows || rows.length === 0) return res.status(404).json({ message: "Film not found" });

    const film = rows[0];
    const deleteSql = "DELETE FROM films WHERE id = ?";
    db.query(deleteSql, [id], (err2) => {
      if (err2) return res.status(500).json({ message: err2.message || "Database error" });

      const videoPath = safeResolveUpload(film.video_url, "videos");
      const thumbPath = safeResolveUpload(film.thumbnail, "thumbnails");
      safeUnlink(videoPath);
      safeUnlink(thumbPath);

      res.json({ message: "Film removed" });
    });
  });
});

// admin suspend/unsuspend a film
router.put("/films/:id/suspend", auth, requireAdmin, (req, res) => {
  const id = req.params.id;
  const suspended = !!req.body.suspended;
  db.query("SELECT id FROM films WHERE id = ?", [id], (err, rows) => {
    if (err) return res.status(500).json({ message: err.message || "Database error" });
    if (!rows || rows.length === 0) return res.status(404).json({ message: "Film not found" });
    setFilmSuspended(id, suspended, (sErr) => {
      if (sErr) return res.status(500).json({ message: sErr.message || "Failed to update suspension" });
      res.json({ message: suspended ? "Film suspended" : "Film unsuspended", suspended });
    });
  });
});

module.exports = router;
