const User = require("../models/user");

const getUsers = async (req, res) => {
    try {
        const currentUserId = req.user.userId;

        const users = await User.find({
            _id: { $ne: currentUserId }
        }).select("-password");

        res.status(200).json({
            users
        });

    } catch (error) {
        console.error("Get users error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
};

module.exports = {
    getUsers
};