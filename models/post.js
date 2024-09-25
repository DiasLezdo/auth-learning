const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Define the Comment schema
const CommentSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Define the Post schema
const PostSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true }, // The author of the post
    content: { type: String }, // Optional text content for the post
    mediaType: { type: String, enum: ["image", "video", null] }, // Type of media (image, video)
    mediaUrl: { type: String }, // URL to the uploaded image or video
    isPublic: { type: Boolean, default: true }, // Privacy setting: true for public, false for private
    likes: [{ type: Schema.Types.ObjectId, ref: "User" }], // Array of user IDs who liked the post
    comments: [CommentSchema], // Array of comments
  },
  { timestamps: true }
);

module.exports = mongoose.model("Post", PostSchema);
