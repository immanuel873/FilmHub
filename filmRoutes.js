const express = require("express");
const router = express.Router();


const filmController = require("../Controllers/filmController");
const upload = require("../config/upload");
const auth = require("../Middleware/authMiddleware");

// test route
router.get("/", (req, res) => {
  res.send("Film route working");
});

// list all films (public)
router.get("/films", filmController.getFilms);

// list current user's films
router.get("/mine", auth, filmController.getMyFilms);

// watch film (requires login)
router.post("/watch", auth, filmController.watchFilm);

// upload film (requires login + files)
router.post(
  "/upload",
  auth,
  upload.fields([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 }
  ]),
  filmController.uploadFilm
);

// save progress (requires login)
router.post("/progress", auth, filmController.saveProgress);

// search and listing (public)
router.get("/search", filmController.searchFilms);
router.get("/latest", filmController.getLatestFilms);

// films by a creator (public)
router.get("/creator/:id", filmController.getFilmsByUploader);

// engagement (public counts)
router.get("/:id/engagement", filmController.getEngagement);
router.get("/:id/comments", filmController.getComments);
router.get("/:id/feedback", filmController.getFeedback);
router.post("/:id/view", filmController.recordView);

// engagement (auth required)
router.get("/:id/my-engagement", auth, filmController.getMyEngagement);
router.post("/:id/like", auth, filmController.toggleLike);
router.post("/:id/react", auth, filmController.setReaction);
router.post("/:id/comments", auth, filmController.addComment);
router.post("/:id/feedback", auth, filmController.addFeedback);

// delete own film
router.delete("/:id", auth, filmController.deleteMyFilm);

module.exports = router;
