const pool = require("../config/db");
const fs = require("fs");

const uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                message: "No file uploaded"
            });
        }

        const { taskId } = req.body;

        if (!taskId) {
            return res.status(400).json({
                message: "taskId is required"
            });
        }

        const userId = req.user.id;

        const [tasks] = await pool.query(
            "SELECT id FROM tasks WHERE id = ?",
            [taskId]
        );

        if (tasks.length === 0) {
            return res.status(404).json({
                message: "Task not found"
            });
        }

        const [result] = await pool.query(
            `INSERT INTO uploaded_files
            (task_id, uploaded_by, original_name, stored_name, mime_type, file_size, file_path)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                taskId,
                userId,
                req.file.originalname,
                req.file.filename,
                req.file.mimetype,
                req.file.size,
                req.file.path
            ]
        );

        return res.status(201).json({
            message: "File uploaded successfully",
            file: {
                id: result.insertId,
                taskId: Number(taskId),
                originalName: req.file.originalname,
                storedName: req.file.filename,
                mimeType: req.file.mimetype,
                fileSize: req.file.size,
                filePath: req.file.path
            }
        });
    } catch (error) {
        console.error("Upload error:", error);
        return res.status(500).json({
            message: "Upload failed"
        });
    }
};

const getFile = async (req, res) => {
    try {
        const fileId = req.params.id;

        const [files] = await pool.query(
            "SELECT * FROM uploaded_files WHERE id = ?",
            [fileId]
        );

        if (files.length === 0) {
            return res.status(404).json({
                message: "File not found"
            });
        }

        const file = files[0];

        if (!fs.existsSync(file.file_path)) {
            return res.status(404).json({
                message: "File missing on server"
            });
        }

        return res.download(file.file_path, file.original_name);
    } catch (error) {
        console.error("Get file error:", error);
        return res.status(500).json({
            message: "Error retrieving file"
        });
    }
};

module.exports = { uploadFile, getFile };