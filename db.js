const mysql = require("mysql2");

function parseMysqlUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    return {
      host: u.hostname || null,
      user: u.username ? decodeURIComponent(u.username) : null,
      password: u.password ? decodeURIComponent(u.password) : null,
      database: u.pathname ? u.pathname.replace(/^\//, "") : null,
      port: u.port ? Number(u.port) : null
    };
  } catch (_e) {
    return null;
  }
}

const env = process.env;
const fromUrl = parseMysqlUrl(env.MYSQL_URL);

const db = mysql.createPool({
  host: env.MYSQLHOST || (fromUrl && fromUrl.host) || "localhost",
  user: env.MYSQLUSER || (fromUrl && fromUrl.user) || "root",
  password: env.MYSQLPASSWORD || (fromUrl && fromUrl.password) || "",
  database: env.MYSQLDATABASE || (fromUrl && fromUrl.database) || "filmhub",
  port: env.MYSQLPORT ? Number(env.MYSQLPORT) : (fromUrl && fromUrl.port) || 3306,
  waitForConnections: true,
  connectionLimit: env.DB_POOL_LIMIT ? Number(env.DB_POOL_LIMIT) : 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Verify connectivity at startup and log the status.
db.getConnection((err, connection) => {
  if (err) {
    console.error("Database connection failed:", err);
    return;
  }
  console.log("Connected to MySQL database");
  connection.release();
});

// Log connection-level errors to aid debugging (pool replaces bad connections).
db.on("connection", (connection) => {
  connection.on("error", (err) => {
    console.error("MySQL connection error:", err);
  });
});

module.exports = db;
