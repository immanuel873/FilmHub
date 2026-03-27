const multer = require("multer");
const fs = require("fs");
const path = require("path");

// Ensure upload directories exist so multer doesn't throw ENOENT (which would surface as HTML)
const thumbDir = path.join(__dirname, "..", "uploads", "thumbnails");
const videoDir = path.join(__dirname, "..", "uploads", "videos");
[thumbDir, videoDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: function(req, file, cb){
    if(file.fieldname === "thumbnail"){
      cb(null, thumbDir);
    } else {
      cb(null, videoDir);
    }
  },
  filename: function(req, file, cb){
    const ext = path.extname(file.originalname || "").toLowerCase();
    const base = Date.now().toString() + "-" + Math.random().toString(36).slice(2, 8);
    cb(null, base + ext);
  }
});

const allowedVideoExt = new Set([".mp4", ".mkv"]);
const allowedVideoMime = new Set(["video/mp4", "video/x-matroska", "video/mkv"]);
const allowedImageExt = new Set([".jpg", ".jpeg"]);
const allowedImageMime = new Set(["image/jpeg", "image/jpg"]);

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname || "").toLowerCase();
  const mime = (file.mimetype || "").toLowerCase();

  if (file.fieldname === "video") {
    if (allowedVideoExt.has(ext) || allowedVideoMime.has(mime)) {
      return cb(null, true);
    }
    const err = new Error("Only .mp4 or .mkv videos are allowed");
    err.status = 400;
    return cb(err);
  }

  if (file.fieldname === "thumbnail") {
    if (allowedImageExt.has(ext) || allowedImageMime.has(mime)) {
      return cb(null, true);
    }
    const err = new Error("Only .jpg or .jpeg thumbnails are allowed");
    err.status = 400;
    return cb(err);
  }

  const err = new Error("Unexpected upload field");
  err.status = 400;
  return cb(err);
}

const upload = multer({
  storage: storage,
  fileFilter,
  limits: { fileSize: 1024 * 1024 * 1024 }
});

module.exports = upload;
