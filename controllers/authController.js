const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const validator = require("validator");
const pool = require("../config/db");

const sanitizeText = (value) => {
    if (typeof value !== "string") return "";
    return validator.escape(value.trim());
};

const getPasswordStrength = (password) => {
    if (password.length < 8) return "WEAK";
    if (password.length === 8 || password.length === 9) return "MEDIUM";
    return "STRONG";
};

const isStrongPassword = (password) => {
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    const forbiddenPatterns = [
        "123",
        "password",
        "qwerty",
        "abc",
        "111",
        "000"
    ];

    const containsForbidden = forbiddenPatterns.some((pattern) =>
        password.toLowerCase().includes(pattern)
    );

    const hasRepeating = /(.)\1{2,}/.test(password);

    return (
        password.length >= 8 &&
        hasUpper &&
        hasLower &&
        hasNumber &&
        hasSpecial &&
        !containsForbidden &&
        !hasRepeating
    );
};

const signup = async (req, res) => {
    try {
        let { firstName, lastName, email, password } = req.body;

        firstName = sanitizeText(firstName);
        lastName = sanitizeText(lastName);
        email = typeof email === "string" ? email.trim().toLowerCase() : "";
        password = typeof password === "string" ? password.trim() : "";

        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({
                message: "Invalid email format"
            });
        }

        if (!isStrongPassword(password)) {
            return res.status(400).json({
                message: "Password must be at least 8 characters, include uppercase, lowercase, number, special character, and must not contain weak patterns."
            });
        }

        const passwordStrength = getPasswordStrength(password);

        const [existingUsers] = await pool.query(
            "SELECT id FROM users WHERE email = ?",
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({
                message: "Email already exists"
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const [result] = await pool.query(
            `INSERT INTO users
            (first_name, last_name, email, password_hash, password_strength, role)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [firstName, lastName, email, passwordHash, passwordStrength, "user"]
        );

        return res.status(201).json({
            message: "Signup successful",
            user: {
                id: result.insertId,
                firstName,
                lastName,
                email,
                role: "user",
                passwordStrength
            }
        });
    } catch (error) {
        console.error("Signup error:", error);
        return res.status(500).json({
            message: "Server error during signup"
        });
    }
};

const login = async (req, res) => {
    try {
        let { email, password } = req.body;

        email = typeof email === "string" ? email.trim().toLowerCase() : "";
        password = typeof password === "string" ? password.trim() : "";

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({
                message: "Invalid email format"
            });
        }

        const [users] = await pool.query(
            `SELECT id, first_name, last_name, email, password_hash, role,
                    failed_attempts, last_failed_attempt_at, lock_until,
                    consecutive_failed_attempts, first_failed_attempt_at, lock_level
             FROM users
             WHERE email = ?`,
            [email]
        );

        if (users.length === 0) {
            return res.status(400).json({
                message: "Invalid email or password"
            });
        }

        const user = users[0];
        const now = new Date();

        if (user.lock_until && new Date(user.lock_until) > now) {
            return res.status(403).json({
                message: "Account locked. Try again later."
            });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            let failedAttempts = user.failed_attempts || 0;
            let lastFailed = user.last_failed_attempt_at;
            let consecutiveFails = user.consecutive_failed_attempts || 0;
            let firstFailed = user.first_failed_attempt_at;
            let lockLevel = user.lock_level || 0;

            if (lastFailed) {
                const diffMinutes = (now - new Date(lastFailed)) / (1000 * 60);
                if (diffMinutes > 60) {
                    failedAttempts = 0;
                }
            }

            if (firstFailed) {
                const diffHours = (now - new Date(firstFailed)) / (1000 * 60 * 60);
                if (diffHours > 24) {
                    consecutiveFails = 0;
                    firstFailed = now;
                }
            } else {
                firstFailed = now;
            }

            failedAttempts += 1;
            consecutiveFails += 1;

            let lockUntil = null;

            if (consecutiveFails >= 8) {
                lockUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            }

            if (failedAttempts >= 3) {
                if (lockLevel === 0) {
                    lockUntil = new Date(now.getTime() + 1 * 60 * 60 * 1000);
                    lockLevel = 1;
                } else if (lockLevel === 1) {
                    lockUntil = new Date(now.getTime() + 2 * 60 * 60 * 1000);
                    lockLevel = 2;
                } else {
                    lockUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000);
                    lockLevel = 3;
                }

                failedAttempts = 0;
            }

            await pool.query(
                `UPDATE users
                 SET failed_attempts = ?, last_failed_attempt_at = ?,
                     consecutive_failed_attempts = ?, first_failed_attempt_at = ?,
                     lock_until = ?, lock_level = ?
                 WHERE id = ?`,
                [
                    failedAttempts,
                    now,
                    consecutiveFails,
                    firstFailed,
                    lockUntil,
                    lockLevel,
                    user.id
                ]
            );

            return res.status(400).json({
                message: "Invalid email or password"
            });
        }

        await pool.query(
            `UPDATE users
             SET failed_attempts = 0,
                 last_failed_attempt_at = NULL,
                 consecutive_failed_attempts = 0,
                 first_failed_attempt_at = NULL,
                 lock_until = NULL
             WHERE id = ?`,
            [user.id]
        );

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
        );

        return res.status(200).json({
            message: "Login successful",
            token,
            user: {
                id: user.id,
                firstName: user.first_name,
                lastName: user.last_name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({
            message: "Server error during login"
        });
    }
};

module.exports = {
    signup,
    login
};