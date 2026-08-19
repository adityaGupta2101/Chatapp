const Message = require("../models/message");

// Send a message
const sendMessage = async (req, res) => {
    try {
        const { receiverId, message } = req.body;

        const senderId = req.user.userId;

        if (!receiverId || !message) {
            return res.status(400).json({
                message: "Receiver and message are required"
            });
        }

        const newMessage = await Message.create({
            sender: senderId,
            receiver: receiverId,
            message
        });

        res.status(201).json({
            message: "Message sent successfully",
            data: newMessage
        });

    } catch (error) {
        console.error("Send message error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
};


// Get conversation
const getMessages = async (req, res) => {
    try {
        const { userId } = req.params;

        const currentUserId = req.user.userId;

        const messages = await Message.find({
            $or: [
                {
                    sender: currentUserId,
                    receiver: userId
                },
                {
                    sender: userId,
                    receiver: currentUserId
                }
            ]
        }).sort({ createdAt: 1 });

        res.status(200).json({
            messages
        });

    } catch (error) {
        console.error("Get messages error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
};
// =====================================================
// UPLOAD MEDIA / FILE
// =====================================================

const uploadFile = async (req, res) => {

    try {

        const senderId = req.user.userId;

        if (!req.file) {

            return res.status(400).json({
                message: "No file uploaded"
            });

        }

        const {
            receiverId
        } = req.body;


        if (!receiverId) {

            return res.status(400).json({
                message: "Receiver is required"
            });
        }


        // =================================================
        // DETERMINE MESSAGE TYPE
        // =================================================

        let messageType = "file";


        if (
            req.file.mimetype.startsWith(
                "image/"
            )
        ) {

            messageType = "image";

        } else if (
            req.file.mimetype.startsWith(
                "video/"
            )
        ) {

            messageType = "video";

        } else if (
            req.file.mimetype.startsWith(
                "audio/"
            )
        ) {

            messageType = "audio";
        }


        // =================================================
        // FILE URL
        // =================================================

        const fileUrl =
            `/uploads/${req.file.filename}`;


        // =================================================
        // SAVE MESSAGE
        // =================================================

        const newMessage =
            await Message.create({

                sender: senderId,

                receiver: receiverId,

                message: "",

                messageType,

                fileUrl,

                fileName:
                    req.file.originalname,

                fileSize:
                    req.file.size,

                mimeType:
                    req.file.mimetype
            });


        // =================================================
        // RESPONSE
        // =================================================

        return res.status(201).json({

            message:
                "File uploaded successfully",

            data:
                newMessage
        });


    } catch (error) {

        console.error(
            "Upload file error:",
            error
        );


        return res.status(500).json({

            message:
                "Server error while uploading file"
        });
    }
};

module.exports = {
    sendMessage,
    getMessages,
    uploadFile
};