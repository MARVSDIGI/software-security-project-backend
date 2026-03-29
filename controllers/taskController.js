const validator = require("validator");
const pool = require("../config/db");

const sanitizeText = (value) => {
    if (typeof value !== "string") return "";
    return validator.escape(value.trim());
};

const allowedPriorities = ["Low", "Medium", "High"];
const allowedStatuses = ["To-Do", "In-Progress", "Completed"];

const formatTask = (row) => ({
    id: row.id,
    taskName: row.taskName,
    description: row.description,
    assignee: row.assigneeId,
    assignedTo: row.assignedToId,
    assigneeId: row.assigneeId,
    assigneeName: row.assigneeName,
    assignedToId: row.assignedToId,
    assignedToName: row.assignedToName,
    priority: row.priority,
    status: row.status,
    startDateTime: row.startDateTime,
    endDateTime: row.endDateTime,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
});

const createTask = async (req, res) => {
    try {
        let {
            taskName,
            description,
            assignee,
            assignedTo,
            priority,
            status,
            startDateTime,
            endDateTime
        } = req.body;

        taskName = sanitizeText(taskName);
        description = sanitizeText(description);
        priority = typeof priority === "string" ? priority.trim() : "Medium";
        status = typeof status === "string" ? status.trim() : "To-Do";

        const assigneeId = Number(assignee);
        const assignedToId = Number(assignedTo);
        const createdByUserId = req.user.id;

        if (!taskName) {
            return res.status(400).json({ message: "taskName is required" });
        }

        if (Number.isNaN(assigneeId) || Number.isNaN(assignedToId)) {
            return res.status(400).json({ message: "Invalid assignee or assignedTo" });
        }

        if (!allowedPriorities.includes(priority)) {
            return res.status(400).json({ message: "Invalid priority value" });
        }

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ message: "Invalid status value" });
        }

        const parsedStart =
            startDateTime && validator.isISO8601(String(startDateTime))
                ? new Date(startDateTime)
                : null;

        const parsedEnd =
            endDateTime && validator.isISO8601(String(endDateTime))
                ? new Date(endDateTime)
                : null;

        if (startDateTime && !parsedStart) {
            return res.status(400).json({ message: "Invalid startDateTime" });
        }

        if (endDateTime && !parsedEnd) {
            return res.status(400).json({ message: "Invalid endDateTime" });
        }

        if (parsedStart && parsedEnd && parsedEnd <= parsedStart) {
            return res.status(400).json({
                message: "End date must be greater than start date"
            });
        }

        const [users] = await pool.query(
            "SELECT id, first_name, last_name FROM users WHERE id IN (?, ?)",
            [assigneeId, assignedToId]
        );

        if (users.length < 2 && assigneeId !== assignedToId) {
            return res.status(404).json({ message: "Selected user not found" });
        }

        if (users.length < 1 && assigneeId === assignedToId) {
            return res.status(404).json({ message: "Selected user not found" });
        }

        const [result] = await pool.query(
            `INSERT INTO tasks
            (task_name, description, priority, status, start_datetime, end_datetime, assignee_id, assigned_to_id, created_by_user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                taskName,
                description,
                priority,
                status,
                parsedStart,
                parsedEnd,
                assigneeId,
                assignedToId,
                createdByUserId
            ]
        );

        const [rows] = await pool.query(
            `SELECT
                t.id,
                t.task_name AS taskName,
                t.description,
                t.priority,
                t.status,
                t.start_datetime AS startDateTime,
                t.end_datetime AS endDateTime,
                t.assignee_id AS assigneeId,
                CONCAT(a.first_name, ' ', a.last_name) AS assigneeName,
                t.assigned_to_id AS assignedToId,
                CONCAT(at.first_name, ' ', at.last_name) AS assignedToName,
                t.created_by_user_id AS createdByUserId,
                t.created_at AS createdAt,
                t.updated_at AS updatedAt
             FROM tasks t
             JOIN users a ON t.assignee_id = a.id
             JOIN users at ON t.assigned_to_id = at.id
             WHERE t.id = ?`,
            [result.insertId]
        );

        return res.status(201).json({
            message: "Task created successfully",
            task: formatTask(rows[0])
        });
    } catch (error) {
        console.error("Create task error:", error);
        return res.status(500).json({ message: "Server error while creating task" });
    }
};

const getTasks = async (req, res) => {
    try {
        const userId = req.user.id;

        const [rows] = await pool.query(
            `SELECT
                t.id,
                t.task_name AS taskName,
                t.description,
                t.priority,
                t.status,
                t.start_datetime AS startDateTime,
                t.end_datetime AS endDateTime,
                t.assignee_id AS assigneeId,
                CONCAT(a.first_name, ' ', a.last_name) AS assigneeName,
                t.assigned_to_id AS assignedToId,
                CONCAT(at.first_name, ' ', at.last_name) AS assignedToName,
                t.created_by_user_id AS createdByUserId,
                t.created_at AS createdAt,
                t.updated_at AS updatedAt
             FROM tasks t
             JOIN users a ON t.assignee_id = a.id
             JOIN users at ON t.assigned_to_id = at.id
             WHERE t.assignee_id = ? OR t.assigned_to_id = ? OR t.created_by_user_id = ?
             ORDER BY t.created_at DESC`,
            [userId, userId, userId]
        );

        return res.status(200).json({
            message: "Tasks fetched successfully",
            tasks: rows.map(formatTask)
        });
    } catch (error) {
        console.error("Get tasks error:", error);
        return res.status(500).json({ message: "Server error while fetching tasks" });
    }
};

const updateTask = async (req, res) => {
    try {
        const taskId = Number(req.params.id);

        if (Number.isNaN(taskId)) {
            return res.status(400).json({ message: "Invalid task ID" });
        }

        const [existingRows] = await pool.query("SELECT * FROM tasks WHERE id = ?", [taskId]);

        if (existingRows.length === 0) {
            return res.status(404).json({ message: "Task not found" });
        }

        const existing = existingRows[0];

        if (
            req.user.role !== "admin" &&
            req.user.id !== existing.assignee_id &&
            req.user.id !== existing.assigned_to_id &&
            req.user.id !== existing.created_by_user_id
        ) {
            return res.status(403).json({ message: "Not authorized to update this task" });
        }

        let {
            taskName,
            description,
            assignee,
            assignedTo,
            priority,
            status,
            startDateTime,
            endDateTime
        } = req.body;

        taskName = taskName !== undefined ? sanitizeText(taskName) : existing.task_name;
        description = description !== undefined ? sanitizeText(description) : existing.description;
        priority = priority !== undefined ? String(priority).trim() : existing.priority;
        status = status !== undefined ? String(status).trim() : existing.status;

        const assigneeId =
            assignee !== undefined ? Number(assignee) : existing.assignee_id;
        const assignedToId =
            assignedTo !== undefined ? Number(assignedTo) : existing.assigned_to_id;

        if (!taskName) {
            return res.status(400).json({ message: "taskName is required" });
        }

        if (Number.isNaN(assigneeId) || Number.isNaN(assignedToId)) {
            return res.status(400).json({ message: "Invalid assignee or assignedTo" });
        }

        if (!allowedPriorities.includes(priority)) {
            return res.status(400).json({ message: "Invalid priority value" });
        }

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ message: "Invalid status value" });
        }

        let parsedStart;
        if (startDateTime === undefined) parsedStart = existing.start_datetime;
        else if (!startDateTime) parsedStart = null;
        else if (validator.isISO8601(String(startDateTime))) parsedStart = new Date(startDateTime);
        else return res.status(400).json({ message: "Invalid startDateTime" });

        let parsedEnd;
        if (endDateTime === undefined) parsedEnd = existing.end_datetime;
        else if (!endDateTime) parsedEnd = null;
        else if (validator.isISO8601(String(endDateTime))) parsedEnd = new Date(endDateTime);
        else return res.status(400).json({ message: "Invalid endDateTime" });

        if (parsedStart && parsedEnd && parsedEnd <= parsedStart) {
            return res.status(400).json({
                message: "End date must be greater than start date"
            });
        }

        await pool.query(
            `UPDATE tasks
             SET task_name = ?, description = ?, priority = ?, status = ?,
                 start_datetime = ?, end_datetime = ?, assignee_id = ?, assigned_to_id = ?
             WHERE id = ?`,
            [
                taskName,
                description,
                priority,
                status,
                parsedStart,
                parsedEnd,
                assigneeId,
                assignedToId,
                taskId
            ]
        );

        const [rows] = await pool.query(
            `SELECT
                t.id,
                t.task_name AS taskName,
                t.description,
                t.priority,
                t.status,
                t.start_datetime AS startDateTime,
                t.end_datetime AS endDateTime,
                t.assignee_id AS assigneeId,
                CONCAT(a.first_name, ' ', a.last_name) AS assigneeName,
                t.assigned_to_id AS assignedToId,
                CONCAT(at.first_name, ' ', at.last_name) AS assignedToName,
                t.created_by_user_id AS createdByUserId,
                t.created_at AS createdAt,
                t.updated_at AS updatedAt
             FROM tasks t
             JOIN users a ON t.assignee_id = a.id
             JOIN users at ON t.assigned_to_id = at.id
             WHERE t.id = ?`,
            [taskId]
        );

        return res.status(200).json({
            message: "Task updated successfully",
            task: formatTask(rows[0])
        });
    } catch (error) {
        console.error("Update task error:", error);
        return res.status(500).json({ message: "Server error while updating task" });
    }
};

const deleteTask = async (req, res) => {
    try {
        const taskId = Number(req.params.id);

        if (Number.isNaN(taskId)) {
            return res.status(400).json({ message: "Invalid task ID" });
        }

        const [existingRows] = await pool.query("SELECT * FROM tasks WHERE id = ?", [taskId]);

        if (existingRows.length === 0) {
            return res.status(404).json({ message: "Task not found" });
        }

        const existing = existingRows[0];

        if (req.user.role !== "admin" && req.user.id !== existing.created_by_user_id) {
            return res.status(403).json({ message: "Not authorized to delete this task" });
        }

        await pool.query("DELETE FROM tasks WHERE id = ?", [taskId]);

        return res.status(200).json({
            message: "Task deleted successfully",
            taskId
        });
    } catch (error) {
        console.error("Delete task error:", error);
        return res.status(500).json({ message: "Server error while deleting task" });
    }
};

module.exports = {
    createTask,
    getTasks,
    updateTask,
    deleteTask
};