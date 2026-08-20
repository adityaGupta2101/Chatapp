const express = require("express");

const router = express.Router();

const {
    sendMessage,
    getMessages,
    uploadFile
} = require("../controllers/messageController");

const authMiddleware =
    require("../middleware/authMiddleware");

const upload =
    require("../middleware/uploadMiddleware");


// =====================================================
// SEND TEXT MESSAGE
// =====================================================

router.post(
    "/",
    authMiddleware,
    sendMessage
);


// =====================================================
// GET CONVERSATION
// =====================================================

router.get(
    "/:userId",
    authMiddleware,
    getMessages
);


// =====================================================
// UPLOAD FILE / MEDIA
// =====================================================

router.post(
    "/upload",
    authMiddleware,
    upload.array("files", 10),
    uploadFile
);

module.exports = router;