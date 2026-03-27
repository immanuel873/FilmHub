const db = require("../config/db");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { ensureFilmSuspensionTable } = require("../utils/suspension");

const FFMPEG_BIN = process.env.FFMPEG_PATH || "ffmpeg";
const VIEW_POINTS_PER_VIEW = 10;

function getFilmColumns(cb) {
  db.query("SHOW COLUMNS FROM films", (err, rows) => {
    if (err) return cb(err);
    const cols = new Set(rows.map(r => r.Field));
    cb(null, cols);
  });
}

function pickColumn(columns, candidates) {
  for (const name of candidates) {
    if (columns.has(name)) return name;
  }
  return null;
}

const uploadsRoot = path.join(__dirname, "..", "uploads");

function transcodeToMp4(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const args = [
      "-y",
      "-i", inputPath,
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-crf", "23",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac",
      "-b:a", "128k",
      "-movflags", "+faststart",
      outputPath
    ];
    const ff = spawn(FFMPEG_BIN, args, { windowsHide: true });
    let stderr = "";
    ff.stderr.on("data", data => {
      stderr += data.toString();
    });
    ff.on("error", err => reject(err));
    ff.on("close", code => {
      if (code === 0) return resolve();
      reject(new Error(stderr || `ffmpeg exited with code ${code}`));
    });
  });
}

function safeResolveUpload(relPath, fallbackFolder) {
  if (!relPath) return null;
  let candidate = String(relPath).replace(/\\/g, "/");
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

/* GET ALL FILMS */

exports.getFilms = (req,res)=>{
  ensureFilmSuspensionTable((ensureErr) => {
    const sql = ensureErr
      ? "SELECT * FROM films"
      : `SELECT f.*
         FROM films f
         LEFT JOIN fh_suspended_films sf ON sf.film_id = f.id
         WHERE sf.film_id IS NULL`;
    db.query(sql,(err,result)=>{
      if(err){
        return res.status(500).json(err);
      }
      res.json(result);
    });
  });
};


/* WATCH FILM AND EARN POINTS */

exports.watchFilm = (req, res) => {
  const user_id = req.user && req.user.id;
  const film_id = req.body.film_id;
  const seconds = Number(req.body.seconds || 0);
  if (!user_id) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  if (!film_id) {
    return res.status(400).json({ message: "film_id required" });
  }
  if (!Number.isFinite(seconds) || seconds < 0) {
    return res.status(400).json({ message: "seconds must be a non-negative number" });
  }

  const respondOk = (payload) => {
    res.json({
      points_added: payload.viewer_points_added || 0,
      uploader_points_added: payload.uploader_points_added || 0,
      total_seconds: payload.total_seconds || 0,
      total_views: payload.total_views || null,
      warning: payload.warning || null
    });
  };

  const getProgressSql = "SELECT progress FROM watch_progress WHERE user_id=? AND film_id=?";
  db.query(getProgressSql, [user_id, film_id], (err, rows) => {
    if (err && err.code === "ER_NO_SUCH_TABLE") {
      return res.status(500).json({ message: "Database table watch_progress is missing. Run the SQL setup." });
    }
    if (err) return res.status(500).json({ message: err.message || "Database error" });

    const prevProgress = rows && rows[0] ? Number(rows[0].progress || 0) : 0;
    const safeSeconds = Math.max(prevProgress, seconds);
    const prevBuckets = Math.floor(prevProgress / 10);
    const newBuckets = Math.floor(safeSeconds / 10);
    const pointsToAdd = Math.max(0, newBuckets - prevBuckets);

    const upsertSql = `
      INSERT INTO watch_progress (user_id, film_id, progress)
      VALUES (?,?,?)
      ON DUPLICATE KEY UPDATE progress=?
    `;
    db.query(upsertSql, [user_id, film_id, safeSeconds, safeSeconds], (err2) => {
      if (err2 && err2.code === "ER_NO_SUCH_TABLE") {
        return res.status(500).json({ message: "Database table watch_progress is missing. Run the SQL setup." });
      }
      if (err2) return res.status(500).json({ message: err2.message || "Database error" });

      const applyViewerPoints = (cb) => {
        if (pointsToAdd > 0) {
          db.query("UPDATE users SET points = points + ? WHERE id=?", [pointsToAdd, user_id], (err3) => {
            if (err3) return cb(err3);
            cb(null);
          });
        } else {
          cb(null);
        }
      };

      applyViewerPoints((viewerErr) => {
        if (viewerErr) {
          return res.status(500).json({ message: viewerErr.message || "Database error" });
        }
        return respondOk({ viewer_points_added: pointsToAdd, total_seconds: safeSeconds });
      });
    });
  });
};

// record a single view (public)
exports.recordView = (req, res) => {
  const film_id = req.params.id;
  if (!film_id) {
    return res.status(400).json({ message: "film_id required" });
  }

  const statsSql = `
    INSERT INTO fh_video_view_stats (film_id, view_count, points_awarded)
    VALUES (?, 1, 0)
    ON DUPLICATE KEY UPDATE view_count = view_count + 1
  `;

  db.query(statsSql, [film_id], (statsErr) => {
    if (statsErr && statsErr.code === "ER_NO_SUCH_TABLE") {
      return res.json({
        total_views: null,
        warning: "fh_video_view_stats table missing. Run SQL setup to enable view counts."
      });
    }
    if (statsErr) {
      return res.status(500).json({ message: statsErr.message || "View stats update failed." });
    }

    db.query("SELECT view_count, points_awarded FROM fh_video_view_stats WHERE film_id=?", [film_id], (selErr, statRows) => {
      if (selErr) {
        return res.status(500).json({ message: selErr.message || "View stats read failed." });
      }

      const viewCount = statRows && statRows[0] ? Number(statRows[0].view_count || 0) : 0;
      const awarded = statRows && statRows[0] ? Number(statRows[0].points_awarded || 0) : 0;
      const totalUploaderPoints = viewCount * VIEW_POINTS_PER_VIEW;
      const addUploaderPoints = Math.max(0, totalUploaderPoints - awarded);

      if (addUploaderPoints <= 0) {
        return res.json({ total_views: viewCount, uploader_points_added: 0 });
      }

      getFilmColumns((colErr, columns) => {
        if (colErr) {
          return res.json({
            total_views: viewCount,
            uploader_points_added: 0,
            warning: colErr.message || "Could not load film columns."
          });
        }
        const uploaderCol = pickColumn(columns, ["uploader_id", "user_id"]);
        if (!uploaderCol) {
          return res.json({
            total_views: viewCount,
            uploader_points_added: 0,
            warning: "Films table missing uploader column."
          });
        }

        db.query(`SELECT \`${uploaderCol}\` AS uploader_id FROM films WHERE id=?`, [film_id], (uErr, uRows) => {
          if (uErr) {
            return res.json({
              total_views: viewCount,
              uploader_points_added: 0,
              warning: uErr.message || "Could not load uploader."
            });
          }
          const uploaderId = uRows && uRows[0] ? uRows[0].uploader_id : null;
          if (!uploaderId) {
            return res.json({ total_views: viewCount, uploader_points_added: 0 });
          }

          db.query("UPDATE users SET points = points + ? WHERE id=?", [addUploaderPoints, uploaderId], (pErr) => {
            if (pErr) {
              return res.json({
                total_views: viewCount,
                uploader_points_added: 0,
                warning: pErr.message || "Could not award uploader points."
              });
            }

            db.query("UPDATE fh_video_view_stats SET points_awarded = points_awarded + ? WHERE film_id=?", [addUploaderPoints, film_id], (awErr) => {
              if (awErr) {
                return res.json({
                  total_views: viewCount,
                  uploader_points_added: 0,
                  warning: awErr.message || "Could not update awarded points."
                });
              }
              return res.json({
                total_views: viewCount,
                uploader_points_added: addUploaderPoints
              });
            });
          });
        });
      });
    });
  });
};
// combine subscription check and handle both video+thumbnail
exports.uploadFilm = (req, res) => {
  const { title, description, category } = req.body;
  // uploader id should come from authenticated user
  const uploader_id = req.user && req.user.id;

  if (!uploader_id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // verify subscription
  const checkSubscription =
    "SELECT * FROM subscriptions WHERE uploader_id=? AND status='approved'";

  db.query(checkSubscription, [uploader_id], (err, result) => {
    if (err) {
      return res.status(500).json(err);
    }

    if (result.length === 0) {
      return res.status(403).json({
        message: "Upload blocked. Subscription not approved."
      });
    }

    if (!req.files || !req.files.video || !req.files.thumbnail) {
      return res.status(400).json({ message: "Missing files" });
    }

    const videoFile = req.files.video[0];
    const thumbFile = req.files.thumbnail[0];

    const minSize = 1 * 1024 * 1024;
    const maxSize = 1024 * 1024 * 1024;

    if (videoFile.size < minSize || videoFile.size > maxSize) {
      try {
        if (videoFile.path && fs.existsSync(videoFile.path)) fs.unlinkSync(videoFile.path);
        if (thumbFile.path && fs.existsSync(thumbFile.path)) fs.unlinkSync(thumbFile.path);
      } catch (e) {
        console.error("Failed to clean up files:", e);
      }
      return res.status(400).json({ message: "Video must be between 1MB and 1GB" });
    }

    const thumbnail = "thumbnails/" + thumbFile.filename;
    const inputPath = videoFile.path;
    const inputExt = path.extname(videoFile.filename || "").toLowerCase();
    const baseName = path.basename(videoFile.filename || "video", inputExt);
    const skipTranscode = process.env.SKIP_TRANSCODE === "1";

    const cleanupUploads = (extraPath) => {
      try {
        if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (extraPath && fs.existsSync(extraPath)) fs.unlinkSync(extraPath);
        if (thumbFile.path && fs.existsSync(thumbFile.path)) fs.unlinkSync(thumbFile.path);
      } catch (e) {
        console.error("Failed to clean up files:", e);
      }
    };

    const insertFilm = (videoRelPath) => {
      // Build insert using actual columns (handles older schemas like missing category)
      getFilmColumns((colErr, columns) => {
        if (colErr) return res.status(500).json({ message: colErr.message || "Database error" });

        const titleCol = pickColumn(columns, ["title", "name"]);
        const descCol = pickColumn(columns, ["description", "details"]);
        const categoryCol = pickColumn(columns, ["category", "genre"]);
        const videoCol = pickColumn(columns, ["video_url", "video", "video_path"]);
        const thumbCol = pickColumn(columns, ["thumbnail", "thumb", "thumbnail_url"]);
        const uploaderCol = pickColumn(columns, ["uploader_id", "user_id"]);

        if (!videoCol || !thumbCol) {
          return res.status(500).json({ message: "Films table missing video/thumbnail columns" });
        }

        const fields = [];
        const values = [];

        if (titleCol) { fields.push(titleCol); values.push(title); }
        if (descCol) { fields.push(descCol); values.push(description); }
        if (categoryCol) { fields.push(categoryCol); values.push(category); }
        fields.push(videoCol); values.push(videoRelPath);
        fields.push(thumbCol); values.push(thumbnail);
        if (uploaderCol) { fields.push(uploaderCol); values.push(uploader_id); }

        const insertSql = `INSERT INTO films (${fields.map(f => `\`${f}\``).join(", ")}) VALUES (${fields.map(() => "?").join(", ")})`;
        db.query(insertSql, values, (err) => {
          if (err) {
            return res.status(500).json({ message: err.message || err.sqlMessage || "Database error" });
          }
          res.json({ message: "Film uploaded successfully" });
        });
      });
    };

    const shouldTranscode = !skipTranscode;
    if (shouldTranscode) {
      const outputFilename = `${baseName}-h264.mp4`;
      const outputPath = path.join(path.dirname(inputPath), outputFilename);
      transcodeToMp4(inputPath, outputPath)
        .then(() => {
          try {
            if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
          } catch (e) {
            console.error("Failed to remove original video after transcode:", e);
          }
          insertFilm("videos/" + outputFilename);
        })
        .catch(err => {
          cleanupUploads(outputPath);
          if (err && err.code === "ENOENT") {
            return res.status(500).json({ message: "FFmpeg not found. Add ffmpeg to PATH or set FFMPEG_PATH, then retry upload." });
          }
          return res.status(500).json({ message: "FFmpeg transcoding failed: " + (err.message || err) });
        });
    } else {
      insertFilm("videos/" + videoFile.filename);
    }
  });
};
// (removed duplicate, combined above)

/* SAVE WATCH PROGRESS */

exports.saveProgress = (req,res)=>{
  const user_id = req.user && req.user.id;
  const { film_id, progress } = req.body;
  if (!user_id) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  if (!film_id || progress == null) {
    return res.status(400).json({ message: "film_id and progress required" });
  }

  const sql = `
INSERT INTO watch_progress (user_id,film_id,progress)
VALUES (?,?,?)
ON DUPLICATE KEY UPDATE progress=?
`;

  db.query(sql,[user_id,film_id,progress,progress],(err)=>{
    if(err){
      return res.status(500).json(err);
    }
    res.json({message:"Progress saved"});
  });
};
/* SEARCH FILMS */

exports.searchFilms = (req,res)=>{

const keyword = req.query.q;

  ensureFilmSuspensionTable((ensureErr) => {
    const sql = ensureErr
      ? "SELECT * FROM films WHERE title LIKE ?"
      : `SELECT f.*
         FROM films f
         LEFT JOIN fh_suspended_films sf ON sf.film_id = f.id
         WHERE sf.film_id IS NULL AND f.title LIKE ?`;
    db.query(sql,[`%${keyword}%`],(err,result)=>{
      if(err){
        return res.status(500).json(err);
      }
      res.json(result);
    });
  });
};
/* LATEST FILMS */

exports.getLatestFilms = (req,res)=>{

  ensureFilmSuspensionTable((ensureErr) => {
    const sql = ensureErr
      ? "SELECT * FROM films ORDER BY id DESC LIMIT 10"
      : `SELECT f.*
         FROM films f
         LEFT JOIN fh_suspended_films sf ON sf.film_id = f.id
         WHERE sf.film_id IS NULL
         ORDER BY f.id DESC
         LIMIT 10`;
    db.query(sql,(err,result)=>{
      if(err){
        return res.status(500).json(err);
      }
      res.json(result);
    });
  });
};
/* FILMS BY CREATOR */

exports.getFilmsByUploader = (req,res)=>{

const uploader_id = req.params.id;

  ensureFilmSuspensionTable((ensureErr) => {
    const sql = ensureErr
      ? "SELECT * FROM films WHERE uploader_id=?"
      : `SELECT f.*
         FROM films f
         LEFT JOIN fh_suspended_films sf ON sf.film_id = f.id
         WHERE sf.film_id IS NULL AND f.uploader_id=?`;
    db.query(sql,[uploader_id],(err,result)=>{
      if(err){
        return res.status(500).json(err);
      }
      res.json(result);
    });
  });
};

// list films for logged-in user
exports.getMyFilms = (req, res) => {
  const user_id = req.user && req.user.id;
  if (!user_id) return res.status(401).json({ message: "Unauthorized" });

  getFilmColumns((colErr, columns) => {
    if (colErr) return res.status(500).json({ message: colErr.message || "Database error" });
    const uploaderCol = pickColumn(columns, ["uploader_id", "user_id"]);
    if (!uploaderCol) return res.status(500).json({ message: "Films table missing uploader column" });

    const sql = `
      SELECT f.*, COALESCE(s.view_count, 0) AS view_count, COALESCE(s.points_awarded, 0) AS view_points
      FROM films f
      LEFT JOIN fh_video_view_stats s ON f.id = s.film_id
      WHERE f.\`${uploaderCol}\`=?
      ORDER BY f.id DESC
    `;
    db.query(sql, [user_id], (err, rows) => {
      if (err && err.code === "ER_NO_SUCH_TABLE") {
        const fallbackSql = `SELECT * FROM films WHERE \`${uploaderCol}\`=? ORDER BY id DESC`;
        return db.query(fallbackSql, [user_id], (err2, rows2) => {
          if (err2) return res.status(500).json({ message: err2.message || "Database error" });
          res.json(rows2 || []);
        });
      }
      if (err) return res.status(500).json({ message: err.message || "Database error" });
      res.json(rows || []);
    });
  });
};

// delete own film
exports.deleteMyFilm = (req, res) => {
  const user_id = req.user && req.user.id;
  const id = req.params.id;
  if (!user_id) return res.status(401).json({ message: "Unauthorized" });

  getFilmColumns((colErr, columns) => {
    if (colErr) return res.status(500).json({ message: colErr.message || "Database error" });
    const uploaderCol = pickColumn(columns, ["uploader_id", "user_id"]);
    const videoCol = pickColumn(columns, ["video_url", "video", "video_path"]);
    const thumbCol = pickColumn(columns, ["thumbnail", "thumb", "thumbnail_url"]);
    if (!uploaderCol || !videoCol || !thumbCol) {
      return res.status(500).json({ message: "Films table missing required columns" });
    }

    const selectSql = `SELECT id, \`${uploaderCol}\` as uploader_id, \`${videoCol}\` as video_url, \`${thumbCol}\` as thumbnail FROM films WHERE id=?`;
    db.query(selectSql, [id], (err, rows) => {
      if (err) return res.status(500).json({ message: err.message || "Database error" });
      if (!rows || rows.length === 0) return res.status(404).json({ message: "Film not found" });
      const film = rows[0];
      if (String(film.uploader_id) !== String(user_id)) {
        return res.status(403).json({ message: "Not allowed" });
      }

      db.query("DELETE FROM films WHERE id=?", [id], (err2) => {
        if (err2) return res.status(500).json({ message: err2.message || "Database error" });

        const videoPath = safeResolveUpload(film.video_url, "videos");
        const thumbPath = safeResolveUpload(film.thumbnail, "thumbnails");
        safeUnlink(videoPath);
        safeUnlink(thumbPath);

        res.json({ message: "Film deleted" });
      });
    });
  });
};

// engagement counts (public)
exports.getEngagement = (req, res) => {
  const film_id = req.params.id;
  const likesSql = "SELECT COUNT(*) AS likes FROM film_likes WHERE film_id=?";
  db.query(likesSql, [film_id], (err, likesRows) => {
    if (err && err.code === "ER_NO_SUCH_TABLE") {
      return res.json({ likes: 0, reactions: {}, comments: 0, feedbacks: 0 });
    }
    if (err) return res.status(500).json({ message: err.message || "Database error" });

    const reactionsSql = "SELECT reaction, COUNT(*) AS count FROM film_reactions WHERE film_id=? GROUP BY reaction";
    db.query(reactionsSql, [film_id], (err2, reactionRows) => {
      if (err2 && err2.code === "ER_NO_SUCH_TABLE") {
        reactionRows = [];
      } else if (err2) {
        return res.status(500).json({ message: err2.message || "Database error" });
      }

      const commentsSql = "SELECT COUNT(*) AS comments FROM film_comments WHERE film_id=?";
      db.query(commentsSql, [film_id], (err3, commentRows) => {
        if (err3 && err3.code === "ER_NO_SUCH_TABLE") {
          commentRows = [{ comments: 0 }];
        } else if (err3) {
          return res.status(500).json({ message: err3.message || "Database error" });
        }

        const feedbackSql = "SELECT COUNT(*) AS feedbacks FROM film_feedback WHERE film_id=?";
        db.query(feedbackSql, [film_id], (err4, feedbackRows) => {
          if (err4 && err4.code === "ER_NO_SUCH_TABLE") {
            feedbackRows = [{ feedbacks: 0 }];
          } else if (err4) {
            return res.status(500).json({ message: err4.message || "Database error" });
          }

          const reactions = {};
          (reactionRows || []).forEach(r => {
            reactions[r.reaction] = r.count;
          });

          const viewsSql = "SELECT view_count FROM fh_video_view_stats WHERE film_id=?";
          db.query(viewsSql, [film_id], (err5, viewRows) => {
            if (err5 && err5.code === "ER_NO_SUCH_TABLE") {
              viewRows = [{ view_count: 0 }];
            } else if (err5) {
              return res.status(500).json({ message: err5.message || "Database error" });
            }

            res.json({
              likes: (likesRows && likesRows[0] && likesRows[0].likes) || 0,
              reactions,
              comments: (commentRows && commentRows[0] && commentRows[0].comments) || 0,
              feedbacks: (feedbackRows && feedbackRows[0] && feedbackRows[0].feedbacks) || 0,
              views: (viewRows && viewRows[0] && viewRows[0].view_count) || 0
            });
          });
        });
      });
    });
  });
};

// logged-in user's engagement state
exports.getMyEngagement = (req, res) => {
  const user_id = req.user && req.user.id;
  const film_id = req.params.id;
  if (!user_id) return res.status(401).json({ message: "Unauthorized" });

  const likeSql = "SELECT 1 FROM film_likes WHERE user_id=? AND film_id=?";
  db.query(likeSql, [user_id, film_id], (err, likeRows) => {
    if (err && err.code === "ER_NO_SUCH_TABLE") {
      likeRows = [];
    } else if (err) {
      return res.status(500).json({ message: err.message || "Database error" });
    }

    const reactSql = "SELECT reaction FROM film_reactions WHERE user_id=? AND film_id=?";
    db.query(reactSql, [user_id, film_id], (err2, reactRows) => {
      if (err2 && err2.code === "ER_NO_SUCH_TABLE") {
        reactRows = [];
      } else if (err2) {
        return res.status(500).json({ message: err2.message || "Database error" });
      }
      res.json({
        liked: likeRows.length > 0,
        reaction: reactRows.length > 0 ? reactRows[0].reaction : null
      });
    });
  });
};

// toggle like
exports.toggleLike = (req, res) => {
  const user_id = req.user && req.user.id;
  const film_id = req.params.id;
  if (!user_id) return res.status(401).json({ message: "Unauthorized" });

  const checkSql = "SELECT 1 FROM film_likes WHERE user_id=? AND film_id=?";
  db.query(checkSql, [user_id, film_id], (err, rows) => {
    if (err && err.code === "ER_NO_SUCH_TABLE") {
      return res.status(500).json({ message: "Database table film_likes is missing. Run the SQL setup." });
    }
    if (err) return res.status(500).json({ message: err.message || "Database error" });
    if (rows.length > 0) {
      db.query("DELETE FROM film_likes WHERE user_id=? AND film_id=?", [user_id, film_id], (err2) => {
        if (err2 && err2.code === "ER_NO_SUCH_TABLE") {
          return res.status(500).json({ message: "Database table film_likes is missing. Run the SQL setup." });
        }
        if (err2) return res.status(500).json({ message: err2.message || "Database error" });
        res.json({ liked: false });
      });
    } else {
      db.query("INSERT INTO film_likes (user_id, film_id) VALUES (?,?)", [user_id, film_id], (err2) => {
        if (err2 && err2.code === "ER_NO_SUCH_TABLE") {
          return res.status(500).json({ message: "Database table film_likes is missing. Run the SQL setup." });
        }
        if (err2) return res.status(500).json({ message: err2.message || "Database error" });
        res.json({ liked: true });
      });
    }
  });
};

// set reaction
exports.setReaction = (req, res) => {
  const user_id = req.user && req.user.id;
  const film_id = req.params.id;
  const reaction = String(req.body.reaction || "").toLowerCase();
  const allowed = new Set(["like", "love", "wow", "funny", "sad", "fire"]);
  if (!user_id) return res.status(401).json({ message: "Unauthorized" });
  if (!allowed.has(reaction)) return res.status(400).json({ message: "Invalid reaction" });

  const checkSql = "SELECT 1 FROM film_reactions WHERE user_id=? AND film_id=?";
  db.query(checkSql, [user_id, film_id], (err, rows) => {
    if (err && err.code === "ER_NO_SUCH_TABLE") {
      return res.status(500).json({ message: "Database table film_reactions is missing. Run the SQL setup." });
    }
    if (err) return res.status(500).json({ message: err.message || "Database error" });
    if (rows.length > 0) {
      db.query("UPDATE film_reactions SET reaction=? WHERE user_id=? AND film_id=?", [reaction, user_id, film_id], (err2) => {
        if (err2 && err2.code === "ER_NO_SUCH_TABLE") {
          return res.status(500).json({ message: "Database table film_reactions is missing. Run the SQL setup." });
        }
        if (err2) return res.status(500).json({ message: err2.message || "Database error" });
        res.json({ reaction });
      });
    } else {
      db.query("INSERT INTO film_reactions (user_id, film_id, reaction) VALUES (?,?,?)", [user_id, film_id, reaction], (err2) => {
        if (err2 && err2.code === "ER_NO_SUCH_TABLE") {
          return res.status(500).json({ message: "Database table film_reactions is missing. Run the SQL setup." });
        }
        if (err2) return res.status(500).json({ message: err2.message || "Database error" });
        res.json({ reaction });
      });
    }
  });
};

// comments
exports.getComments = (req, res) => {
  const film_id = req.params.id;
  const sql = `
    SELECT c.id, c.comment_text, c.created_at, u.username
    FROM film_comments c
    LEFT JOIN users u ON c.user_id = u.id
    WHERE c.film_id=?
    ORDER BY c.id DESC
  `;
  db.query(sql, [film_id], (err, rows) => {
    if (err && err.code === "ER_NO_SUCH_TABLE") return res.json([]);
    if (err) return res.status(500).json({ message: err.message || "Database error" });
    res.json(rows || []);
  });
};

exports.addComment = (req, res) => {
  const user_id = req.user && req.user.id;
  const film_id = req.params.id;
  const text = String(req.body.comment || "").trim();
  if (!user_id) return res.status(401).json({ message: "Unauthorized" });
  if (!text) return res.status(400).json({ message: "Comment required" });

  const sql = "INSERT INTO film_comments (film_id, user_id, comment_text) VALUES (?,?,?)";
  db.query(sql, [film_id, user_id, text], (err) => {
    if (err && err.code === "ER_NO_SUCH_TABLE") {
      return res.status(500).json({ message: "Database table film_comments is missing. Run the SQL setup." });
    }
    if (err) return res.status(500).json({ message: err.message || "Database error" });
    res.json({ message: "Comment added" });
  });
};

// feedback
exports.getFeedback = (req, res) => {
  const film_id = req.params.id;
  const sql = `
    SELECT f.id, f.feedback_text, f.rating, f.created_at, u.username
    FROM film_feedback f
    LEFT JOIN users u ON f.user_id = u.id
    WHERE f.film_id=?
    ORDER BY f.id DESC
  `;
  db.query(sql, [film_id], (err, rows) => {
    if (err && err.code === "ER_NO_SUCH_TABLE") return res.json([]);
    if (err) return res.status(500).json({ message: err.message || "Database error" });
    res.json(rows || []);
  });
};

exports.addFeedback = (req, res) => {
  const user_id = req.user && req.user.id;
  const film_id = req.params.id;
  const text = String(req.body.feedback || "").trim();
  const ratingRaw = req.body.rating;
  const ratingValue = ratingRaw !== undefined && ratingRaw !== "" ? Number(ratingRaw) : null;
  const hasRating = Number.isFinite(ratingValue);
  if (!user_id) return res.status(401).json({ message: "Unauthorized" });
  if (!text && !hasRating) {
    return res.status(400).json({ message: "Rating or feedback required" });
  }
  if (hasRating && (ratingValue < 1 || ratingValue > 5)) {
    return res.status(400).json({ message: "Rating must be between 1 and 5" });
  }

  const sql = "INSERT INTO film_feedback (film_id, user_id, feedback_text, rating) VALUES (?,?,?,?)";
  db.query(sql, [film_id, user_id, text, hasRating ? ratingValue : null], (err) => {
    if (err && err.code === "ER_NO_SUCH_TABLE") {
      return res.status(500).json({ message: "Database table film_feedback is missing. Run the SQL setup." });
    }
    if (err) return res.status(500).json({ message: err.message || "Database error" });
    res.json({ message: "Feedback added" });
  });
};

