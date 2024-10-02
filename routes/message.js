const express = require("express");
const protect = require("../middleware/auth");
const uploadMessageMedia = require("../middleware/multer/messageMedia");
const {
  sendMessage,
  getMessages,
  markMessagesAsRead,
  deleteMessage,
} = require("../controller/message");
const multer = require("multer");
const router = express.Router();

// Apply authentication and rate limiting middleware
router.use(protect);
// router.use(userRateLimiter);

// Route to send a message with optional file attachments
// 'files' is the field name for uploaded files, allowing up to 5 files per message
// router.post("/send", uploadMessageMedia.array("files", 5), sendMessage);
router.post("/send", (req, res, next) => {
  uploadMessageMedia.array("files", 5)(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      // A Multer error occurred when uploading.
      let errorMessage;

      switch (err.code) {
        case "LIMIT_FILE_SIZE":
          errorMessage = "File size is too large. Maximum limit is 5MB.";
          break;
        case "LIMIT_FILE_COUNT":
          errorMessage = "Too many files uploaded. Maximum 5 files allowed.";
          break;
        case "LIMIT_UNEXPECTED_FILE":
          errorMessage = "Invalid file type.";
          break;
        default:
          errorMessage = err.message;
      }

      return res.status(400).json({ error: errorMessage });
    } else if (err) {
      // An unknown error occurred when uploading.
      console.log('err.message', err.message)
      return res
        .status(500)
        .json({ error: "An unknown error occurred during file upload."});
    }

    // Everything went fine.
    sendMessage(req, res);
  });
});

// Route to get messages between authenticated user and another user
router.get("/:userName", getMessages);

// Route to mark messages as read
router.patch("/:userName/read", markMessagesAsRead);

// Route to delete a message
router.delete("/:messageId", deleteMessage);

module.exports = router;
