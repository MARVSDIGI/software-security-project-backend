const express = require("express");
const router = express.Router();

const { authenticateToken } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const { uploadFile, getFile } = require("../controllers/fileController");

router.post("/upload", authenticateToken, upload.single("file"), uploadFile);
router.get("/:id", authenticateToken, getFile);

module.exports = router;