// controllers/messageController.js
const asyncHandler = require("express-async-handler");
const Message = require("../models/message");
const User = require("../models/User");
const cloudinary = require("../config/cloudinary");

// @desc    Send a message (with optional file attachments)
// @route   POST /api/messages/send
// @access  Private
exports.sendMessage = asyncHandler(async (req, res) => {
  const senderId = req.user._id;
  const { receiver_user_name, text } = req.body;

  try {
    // Validate input
    if (!receiver_user_name) {
      return res
        .status(400)
        .json({ message: "Receiver user_name is required" });
    }

    // Find receiver by user_name
    const receiver = await User.findOne({ user_name: receiver_user_name });
    if (!receiver) {
      return res.status(404).json({ message: "Receiver not found" });
    }

    // Prevent sending messages to oneself
    if (senderId.toString() === receiver._id.toString()) {
      return res
        .status(400)
        .json({ message: "You cannot send messages to yourself" });
    }

    // Check if sender and receiver are friends
    const sender = await User.findById(senderId).select("friends");
    if (!sender.friends.includes(receiver._id)) {
      return res
        .status(403)
        .json({ message: "You can only send messages to your friends" });
    }

    // Initialize files array
    let files = [];

    console.log("req.files", req.files);

    // If there are files uploaded, process them
    if (req.files && req.files.length > 0) {
      files = req.files.map((file) => ({
        url: file.path,
        public_id: file.filename,
        original_name: file.originalname,
        format: file.mimetype,
        size: file.size,
      }));
    }

    // Create the message
    const message = await Message.create({
      sender: senderId,
      receiver: receiver._id,
      text,
      files,
    });

    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "first_name last_name user_name photo -_id") // Select desired fields
      .populate("receiver", "first_name last_name user_name photo -_id"); // Select desired fields

    res.status(201).json({
      message: "Message sent successfully",
      data: {
        _id: message._id,
        sender: {
          first_name: populatedMessage.sender.first_name,
          last_name: populatedMessage.sender.last_name,
          user_name: populatedMessage.sender.user_name,
          photo: populatedMessage.sender.photo,
        },
        receiver: {
          first_name: populatedMessage.receiver.first_name,
          last_name: populatedMessage.receiver.last_name,
          user_name: populatedMessage.receiver.user_name,
          photo: populatedMessage.receiver.photo,
        },
        text: message.text,
        files: message.files,
        createdAt: message.createdAt,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
});

// @desc    Get messages between authenticated user and another user
// @route   GET /api/messages/:userName
// @access  Private
exports.getMessages = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { userName } = req.params;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  // Find the other user by user_name
  const otherUser = await User.findOne({ user_name: userName });
  if (!otherUser) {
    return res.status(404).json({ message: "User not found" });
  }

  // Check if they are friends
  const user = await User.findById(userId).select("friends");
  if (!user.friends.includes(otherUser._id)) {
    return res
      .status(403)
      .json({ message: "You can only view messages with your friends" });
  }

  // Fetch messages between the two users, sorted by creation time
  const messages = await Message.find({
    $or: [
      { sender: userId, receiver: otherUser._id },
      { sender: otherUser._id, receiver: userId },
    ],
  })
    .sort({ createdAt: 1 }) // Oldest first
    .skip(skip)
    .limit(limit)
    .select("-__v")
    .populate("sender", "user_name first_name last_name photo -_id")
    .populate("receiver", "user_name first_name last_name photo -_id");

  res.status(200).json({
    message: "Messages retrieved successfully",
    data: messages,
    pagination: {
      currentPage: page,
      pageSize: limit,
    },
  });
});

// @desc    Mark messages as read between authenticated user and another user
// @route   PATCH /api/messages/:userName/read
// @access  Private
exports.markMessagesAsRead = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { userName } = req.params;

  try {
    // Find the other user by user_name
    const otherUser = await User.findOne({ user_name: userName });
    if (!otherUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update messages where receiver is the authenticated user and sender is the other user
    const result = await Message.updateMany(
      { sender: otherUser._id, receiver: userId, read: false },
      { $set: { read: true } }
    );

    res.status(200).json({
      message: `${result.nModified} messages marked as read`,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
});

// @desc    Delete a message
// @route   DELETE /api/messages/:messageId
// @access  Private
exports.deleteMessage = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { messageId } = req.params;

  try {
    // Find the message
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Ensure the authenticated user is either the sender or receiver
    if (
      message.sender.toString() !== userId.toString()
      // && message.receiver.toString() !== userId.toString()
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this message" });
    }

    const filesDelete = message.files.map((file) => file.public_id);

    if (message.files && message.files.length > 0) {
      await cloudinary.api
        .delete_resources(filesDelete)
        .then((result) => console.log(result));
    }
    await Message.findByIdAndDelete(message._id);

    res.status(200).json({ message: "Message deleted successfully" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
});
