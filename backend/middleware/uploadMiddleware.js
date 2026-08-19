const multer = require("multer");
const path = require("path");


// =====================================================
// STORAGE
// =====================================================

const storage = multer.diskStorage({

    destination: (req, file, cb) => {

        cb(null, "uploads/");
    },


    filename: (req, file, cb) => {

        const uniqueName =
            Date.now() +
            "-" +
            Math.round(Math.random() * 1E9) +
            path.extname(file.originalname);

        cb(null, uniqueName);
    }

});


// =====================================================
// FILE FILTER
// =====================================================

const fileFilter = (req, file, cb) => {

    const allowedTypes = [

        // Images
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",

        // Videos
        "video/mp4",
        "video/webm",
        "video/mpeg",

        // Documents
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

        // Text
        "text/plain",

        // ZIP
        "application/zip",
        "application/x-zip-compressed"
    ];


    if (allowedTypes.includes(file.mimetype)) {

        cb(null, true);

    } else {

        cb(
            new Error(
                "This file type is not supported"
            ),
            false
        );
    }
};


// =====================================================
// MULTER
// =====================================================

const upload = multer({

    storage,

    fileFilter,

    limits: {

        // Maximum 20 MB
        fileSize: 20 * 1024 * 1024
    }

});
module.exports = upload;