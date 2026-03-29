const pool = require("../config/db");

const logEvent = async (req, userId, action) => {
  try {
    const ip =
      req.ip ||
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      null;

    const userAgent = req.headers["user-agent"] || null;

    await pool.query(
      `
      INSERT INTO audit_logs (user_id, action, ip_address, user_agent)
      VALUES (?, ?, ?, ?)
      `,
      [userId || null, action, ip, userAgent]
    );
  } catch (error) {
    console.error("Audit log error:", error);
  }
};

module.exports = { logEvent };