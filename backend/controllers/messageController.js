const Message = require("../models/message");
const { getIo, onlineUsers } = require("../socket/socket");

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

        if (!req.files || req.files.length === 0) {

            return res.status(400).json({
                message: "No files uploaded"
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


        const receiverSocketId = onlineUsers.get(String(receiverId));
        const io = getIo();
        
        const createdMessages = [];

        for (const file of req.files) {
            // =================================================
            // DETERMINE MESSAGE TYPE
            // =================================================
    
            let messageType = "file";
    
            if (file.mimetype.startsWith("image/")) {
                messageType = "image";
            } else if (file.mimetype.startsWith("video/")) {
                messageType = "video";
            } else if (file.mimetype.startsWith("audio/")) {
                messageType = "audio";
            }
    
            // =================================================
            // FILE URL
            // =================================================
    
            const fileUrl = `/uploads/${file.filename}`;
    
            // =================================================
            // SAVE MESSAGE
            // =================================================
    
            const newMessage = await Message.create({
                sender: senderId,
                receiver: receiverId,
                message: "",
                messageType,
                fileUrl,
                fileName: file.originalname,
                fileSize: file.size,
                mimeType: file.mimetype
            });
    
            // =================================================
            // EMIT SOCKET EVENT IF RECEIVER IS ONLINE
            // =================================================
    
            if (receiverSocketId) {
                newMessage.delivered = true;
                await newMessage.save();
    
                if (io) {
                    io.to(receiverSocketId).emit("message_received", newMessage);
                }
            }
            
            createdMessages.push(newMessage);
        }

        // =================================================
        // RESPONSE
        // =================================================

        return res.status(201).json({
            message: "Files uploaded successfully",
            data: createdMessages
        });


    } catch (error) {

        console.error(
            "Upload file error:",
            error
        );


        return res.status(500).json({
            message: "Server error while uploading files"
        });
    }
};

module.exports = {
    sendMessage,
    getMessages,
    uploadFile
};