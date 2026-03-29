const express = require("express");
const {
  signup,
  login,
  getCurrentUser
} = require("../controllers/authController");
const { authenticateToken } = require("../middleware/authMiddleware");

const router = express.Router();

// Signup/Register aliases
router.post("/signup", signup);
router.post("/register", signup);

// Login/Signin aliases
router.post("/login", login);
router.post("/signin", login);

// Current logged-in user
router.get("/me", authenticateToken, getCurrentUser);

module.exports = router;