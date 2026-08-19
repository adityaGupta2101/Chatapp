const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
    {
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        receiver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        // Text message
        message: {
            type: String,
            default: ""
        },

        // text / image / video / file / audio / voice
        messageType: {
            type: String,
            enum: [
                "text",
                "image",
                "video",
                "file",
                "audio",
                "voice"
            ],
            default: "text"
        },

        // Uploaded file information
        fileUrl: {
            type: String,
            default: ""
        },

        fileName: {
            type: String,
            default: ""
        },

        fileSize: {
            type: Number,
            default: 0
        },

        mimeType: {
            type: String,
            default: ""
        },

        // Message status
        delivered: {
            type: Boolean,
            default: false
        },

        seen: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);


// Prevent OverwriteModelError
module.exports =
    mongoose.models.Message ||
    mongoose.model("Message", messageSchema);