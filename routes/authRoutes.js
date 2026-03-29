const express = require("express");
const {
  signup,
  login,
  forgotPassword,
  resetPassword,
  getCurrentUser
} = require("../controllers/authController");
const { authenticateToken } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/signup", signup);
router.post("/register", signup);

router.post("/login", login);
router.post("/signin", login);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

router.get("/me", authenticateToken, getCurrentUser);

module.exports = router;