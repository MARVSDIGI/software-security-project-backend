const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const validator = require("validator");
const crypto = require("crypto");
const pool = require("../config/db");
const { logEvent } = require("../utils/auditLogger");

// ================= HELPERS =================

const sanitizeText = (value) => {
  if (typeof value !== "string") return "";
  return validator.escape(value.trim());
};

const getPasswordStrength = (password) => {
  if (password.length < 8) return "WEAK";
  if (password.length <= 10) return "MEDIUM";
  return "STRONG";
};

const isStrongPassword = (password) => {
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  return (
    password.length >= 8 &&
    hasUpper &&
    hasLower &&
    hasNumber &&
    hasSpecial
  );
};

const buildUserResponse = (user) => ({
  id: user.id,
  firstName: user.first_name,
  lastName: user.last_name,
  email: user.email,
  role: user.role
});

// ================= SIGNUP =================

const signup = async (req, res) => {
  try {
    let { firstName, lastName, email, password } = req.body;

    firstName = sanitizeText(firstName);
    lastName = sanitizeText(lastName);
    email = email?.toLowerCase().trim();
    password = password?.trim();

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email"
      });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        success: false,
        message: "Weak password"
      });
    }

    const [existing] = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Email already exists"
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const strength = getPasswordStrength(password);

    const [result] = await pool.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, password_strength, role)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [firstName, lastName, email, passwordHash, strength, "user"]
    );

    await logEvent(req, result.insertId, "USER_SIGNUP");

    return res.status(201).json({
      success: true,
      message: "Signup successful"
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ================= LOGIN =================

const login = async (req, res) => {
  try {
    let { email, password } = req.body;

    email = email?.toLowerCase().trim();
    password = password?.trim();

    const [users] = await pool.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (users.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    const user = users[0];

    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      await logEvent(req, user.id, "LOGIN_FAILED");

      return res.status(400).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1h" }
    );

    await logEvent(req, user.id, "LOGIN_SUCCESS");

    res.json({
      success: true,
      token,
      user: buildUserResponse(user)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ================= FORGOT PASSWORD =================

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const [users] = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (users.length === 0) {
      return res.json({
        success: true,
        message: "If email exists, reset token sent"
      });
    }

    const user = users[0];

    const token = crypto.randomBytes(32).toString("hex");

    const hashed = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await pool.query(
      `UPDATE users
       SET reset_password_token_hash = ?, reset_password_expires_at = ?
       WHERE id = ?`,
      [hashed, expires, user.id]
    );

    await logEvent(req, user.id, "PASSWORD_RESET_REQUESTED");

    res.json({
      success: true,
      resetToken: token,
      expires
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};

// ================= RESET PASSWORD =================

const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const hashed = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const [users] = await pool.query(
      `SELECT id FROM users
       WHERE reset_password_token_hash = ?
       AND reset_password_expires_at > NOW()`,
      [hashed]
    );

    if (users.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired token"
      });
    }

    const user = users[0];

    const newHash = await bcrypt.hash(newPassword, 10);

    await pool.query(
      `UPDATE users
       SET password_hash = ?, reset_password_token_hash = NULL,
       reset_password_expires_at = NULL
       WHERE id = ?`,
      [newHash, user.id]
    );

    await logEvent(req, user.id, "PASSWORD_RESET_SUCCESS");

    res.json({
      success: true,
      message: "Password reset successful"
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};

// ================= CURRENT USER =================

const getCurrentUser = async (req, res) => {
  try {
    const [users] = await pool.query(
      "SELECT id, first_name, last_name, email FROM users WHERE id = ?",
      [req.user.id]
    );

    res.json({
      success: true,
      user: users[0]
    });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};

// ================= EXPORT =================

module.exports = {
  signup,
  login,
  forgotPassword,
  resetPassword,
  getCurrentUser
};