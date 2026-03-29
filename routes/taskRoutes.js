const express = require("express");
const router = express.Router();

const {
    createTask,
    getTasks,
    updateTask,
    deleteTask
} = require("../controllers/taskController");

const { authenticateToken } = require("../middleware/authMiddleware");
const { authorizeAdmin } = require("../middleware/adminMiddleware");

router.post("/", authenticateToken, createTask);
router.get("/", authenticateToken, getTasks);
router.put("/:id", authenticateToken, updateTask);
router.delete("/:id", authenticateToken, authorizeAdmin, deleteTask);

module.exports = router;