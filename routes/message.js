const express = require("express");
const protect = require("../middleware/auth");
const uploadMessageMedia = require("../middleware/multer/messageMedia");
const {
  sendMessage,
  getMessages,
  markMessagesAsRead,
  deleteMessage,
} = require("../controller/message");
const router = express.Router();

// Apply authentication and rate limiting middleware
router.use(protect);
// router.use(userRateLimiter);

// Route to send a message with optional file attachments
// 'files' is the field name for uploaded files, allowing up to 5 files per message
router.post("/send", uploadMessageMedia.array("files", 5), sendMessage);

// Route to get messages between authenticated user and another user
router.get("/:userName", getMessages);

// Route to mark messages as read
router.patch("/:userName/read", markMessagesAsRead);

// Route to delete a message
router.delete("/:messageId", deleteMessage);

module.exports = router;
