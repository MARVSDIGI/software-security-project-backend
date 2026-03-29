const express = require("express");
const router = express.Router();

const { authenticateToken } = require("../middleware/authMiddleware");
const { authorizeAdmin } = require("../middleware/adminMiddleware");

router.get("/dashboard", authenticateToken, authorizeAdmin, (req, res) => {
    res.status(200).json({
        message: "Welcome Admin",
        user: req.user
    });
});

module.exports = router;