const fs = require("fs");

// redirect console output to server.log for debugging
const logStream = fs.createWriteStream("server.log", { flags: "a" });
const originalLog = console.log;
const originalError = console.error;
console.log = (...args) => { logStream.write(args.join(" ") + "\n"); originalLog.apply(console, args); };
console.error = (...args) => { logStream.write(args.join(" ") + "\n"); originalError.apply(console, args); };

const express = require("express");
const cors = require("cors");
const path = require("path");


require("./config/db");
const { ensureSuspensionTables } = require("./utils/suspension");

const authRoutes = require("./routes/authRoutes");
const filmRoutes = require("./routes/filmRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const subscriptionRoutes = require("./routes/subscriptions");
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");

ensureSuspensionTables((err) => {
  if (err) {
    console.error("Failed to ensure suspension tables:", err.message || err);
  } else {
    console.log("Suspension tables ready");
  }
});

// temporary crash to force restart
typeof process === 'object' && console.log('starting server');
const app = express();

// version header to detect restart
app.use((req,res,next)=>{
  res.setHeader('X-Server-Version','v1.0.1');
  next();
});
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads"), {
  setHeaders: (res, filePath) => {
    if (filePath.toLowerCase().endsWith(".mkv")) {
      res.setHeader("Content-Type", "video/x-matroska");
    }
  }
}));

// serve frontend static files first
const frontendPath = path.join(__dirname, "..", "Frontend");
console.log("Serving static files from", frontendPath);
app.use(express.static(frontendPath));

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/films", filmRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);

// simple health check
app.get("/api/health", (req, res) => {
    res.send("OK");
});

// debug: show computed frontend directory path
app.get("/api/frontend-path", (req, res) => {
    res.json({ frontendPath });
});

// centralized error handler to ensure JSON responses (especially for multer/file errors)
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  if (res.headersSent) return next(err);
  const status = err.status || (err.name === "MulterError" ? 400 : 500);
  res.status(status).json({
    message: err.message || "Internal server error"
  });
});

// fallback for any other GET (SPA support)
app.get("*", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// catch-all for unsupported methods or routes (non-GET)
app.use((req, res) => {
    res.status(404).json({ message: "Endpoint not found" });
});

const PORT = process.env.PORT || 5100;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
