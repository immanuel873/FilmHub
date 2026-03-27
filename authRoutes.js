const express = require("express");
const router = express.Router();
const userController = require("../Controllers/userController");

// registration and login under auth namespace
router.post("/register", userController.register);
router.post("/login", userController.login);

// health check
router.get("/", (req, res) => {
    res.send("Auth route working");
});

module.exports = router;