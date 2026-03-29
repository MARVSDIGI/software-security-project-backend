const pool = require("../config/db");

const getUsers = async (req, res) => {
    try {
        const [users] = await pool.query(
            `SELECT 
                id,
                first_name AS firstName,
                last_name AS lastName,
                email,
                role
             FROM users
             ORDER BY first_name, last_name`
        );

        return res.status(200).json({
            message: "Users fetched successfully",
            users
        });
    } catch (error) {
        console.error("Get users error:", error);
        return res.status(500).json({
            message: "Server error while fetching users"
        });
    }
};

module.exports = { getUsers };