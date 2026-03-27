const db = require("../config/db");

let ensuredUsers = false;
let ensuredFilms = false;

function ensureUserSuspensionTable(cb) {
  if (ensuredUsers) return cb(null);
  const sql = `
    CREATE TABLE IF NOT EXISTS fh_suspended_users (
      user_id INT PRIMARY KEY,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  db.query(sql, (err) => {
    if (!err) ensuredUsers = true;
    cb(err || null);
  });
}

function ensureFilmSuspensionTable(cb) {
  if (ensuredFilms) return cb(null);
  const sql = `
    CREATE TABLE IF NOT EXISTS fh_suspended_films (
      film_id INT PRIMARY KEY,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  db.query(sql, (err) => {
    if (!err) ensuredFilms = true;
    cb(err || null);
  });
}

function ensureSuspensionTables(cb) {
  ensureUserSuspensionTable((userErr) => {
    if (userErr) return cb(userErr);
    ensureFilmSuspensionTable(cb);
  });
}

function isUserSuspended(userId, cb) {
  ensureUserSuspensionTable((err) => {
    if (err) return cb(err);
    db.query("SELECT 1 FROM fh_suspended_users WHERE user_id=? LIMIT 1", [userId], (qErr, rows) => {
      if (qErr) return cb(qErr);
      cb(null, !!(rows && rows.length));
    });
  });
}

function setUserSuspended(userId, suspended, cb) {
  ensureUserSuspensionTable((err) => {
    if (err) return cb(err);
    if (suspended) {
      const sql = "INSERT INTO fh_suspended_users (user_id) VALUES (?) ON DUPLICATE KEY UPDATE user_id=user_id";
      return db.query(sql, [userId], cb);
    }
    db.query("DELETE FROM fh_suspended_users WHERE user_id=?", [userId], cb);
  });
}

function isFilmSuspended(filmId, cb) {
  ensureFilmSuspensionTable((err) => {
    if (err) return cb(err);
    db.query("SELECT 1 FROM fh_suspended_films WHERE film_id=? LIMIT 1", [filmId], (qErr, rows) => {
      if (qErr) return cb(qErr);
      cb(null, !!(rows && rows.length));
    });
  });
}

function setFilmSuspended(filmId, suspended, cb) {
  ensureFilmSuspensionTable((err) => {
    if (err) return cb(err);
    if (suspended) {
      const sql = "INSERT INTO fh_suspended_films (film_id) VALUES (?) ON DUPLICATE KEY UPDATE film_id=film_id";
      return db.query(sql, [filmId], cb);
    }
    db.query("DELETE FROM fh_suspended_films WHERE film_id=?", [filmId], cb);
  });
}

module.exports = {
  ensureUserSuspensionTable,
  ensureFilmSuspensionTable,
  ensureSuspensionTables,
  isUserSuspended,
  setUserSuspended,
  isFilmSuspended,
  setFilmSuspended
};
