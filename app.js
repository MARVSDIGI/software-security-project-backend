const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/authRoutes");
const taskRoutes = require("./routes/taskRoutes");
const fileRoutes = require("./routes/fileRoutes");
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

// Security middleware
app.use(helmet());

// JSON parser
app.use(express.json());

// Logging
app.use(morgan("dev"));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: "Too many requests, please try again later"
  }
});
app.use(limiter);

// Test route
app.get("/api/test", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend working"
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);

// File upload error handling
app.use((err, req, res, next) => {
  if (err && err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      message: "File too large. Maximum size is 5MB."
    });
  }

  if (err && err.message === "Invalid file type") {
    return res.status(400).json({
      success: false,
      message: "Invalid file type. Only PDF, JPG, PNG, and TXT are allowed."
    });
  }

  if (err) {
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }

  next();
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

module.exports = app;