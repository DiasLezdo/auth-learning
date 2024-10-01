const Post = require("../models/post");
const User = require("../models/User");
const cloudinary = require("../config/cloudinary"); // Import Cloudinary config
const { getResizedImageUrl, extractPublicId } = require("../utils/common/imageOptimize");


// Get Posts
exports.getPosts = async (req, res) => {
  try {
    const { user_name } = req.params;
    const { isPublic, page = 1, limit = 10 } = req.query;
    const currentUserId = req.user._id; // Get current user's ID from middleware

    let query = {};

    // If a specific user is requested by user_name
    if (user_name) {
      const user = await User.findOne({ user_name });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // based conditions try to avoid get private posts from other users
      if (
        isPublic !== "true" &&
        currentUserId.toString() !== user._id.toString()
      ) {
        return res.status(403).json({ message: "Unauthorized access" });
      }
      query.user = user._id; // Fetch posts by this user
    }

    // If public posts are requested
    if (isPublic === "true") {
      query.isPublic = true;
    }

    // Get total number of posts for pagination
    const totalPosts = await Post.countDocuments(query);

    // Fetch posts with pagination, sorting, and exclude __v
    const posts = await Post.find(query)
      .select("-__v -comments") // Exclude __v
      .populate({
        path: "user",
        select: "first_name last_name user_name photo -_id", // Exclude _id from user fields
      })
      .populate({
        path: "likes",
        // select: "first_name last_name user_name photo -_id", // Exclude _id from comment user fields
        select: "first_name last_name user_name photo", // Exclude _id from comment user fields
      })
      // .populate({
      //   path: "comments.user",
      //   select: "first_name last_name user_name photo -_id", // Exclude _id from comment user fields
      // })
      .sort({ createdAt: -1 }) // Sort by most recent
      .skip((page - 1) * limit) // Skip for pagination
      .limit(parseInt(limit)); // Limit per page

    // Add isLiked field to each post
    const postsWithIsLiked = posts.map((post) => {
      const isLiked = post.likes.some(
        (like) => like._id.toString() === currentUserId.toString()
      ); // Check if current user has liked the post
      return {
        ...post.toObject(), // Convert Mongoose document to plain JS object
        isLiked, // Add isLiked field
        likes: post.likes.map(
          ({ first_name, last_name, user_name, photo }) => ({
            first_name,
            last_name,
            user_name,
            photo,
          })
        ),
        user: {
          first_name: post.user.first_name,
          last_name: post.user.last_name,
          user_name: post.user.user_name,
          photo: getResizedImageUrl(extractPublicId(post.user.photo)),
        },
      };
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalPosts / limit);

    // Return posts with pagination info
    res.status(200).json({
      data: postsWithIsLiked,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalPosts,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Add a new post (authenticated user only)
exports.addPost = async (req, res) => {
  try {
    const { content, isPublic } = req.body;
    const userId = req.user._id; // Accessing user ID from middleware

    // If media is uploaded, get media type and URL from Cloudinary
    let mediaType = null;
    let mediaUrl = null;

    // if (req.file) {
    //   mediaUrl = req.file.path;
    //   const mimeType = req.file.mimetype.toLowerCase();
    //   if (mimeType.includes("image")) {
    //     mediaType = "image";
    //   } else if (mimeType.includes("video")) {
    //     mediaType = "video";
    //   } else {
    //     return res.status(400).json({ error: "Invalid file type" });
    //   }
    // }

    if (req.file) {
      mediaUrl = req.file.path;
      const mimeType = req.file.mimetype.toLowerCase();

      if (mimeType.startsWith("image/")) {
        mediaType = "image";
      } else if (
        mimeType === "video/mp4" ||
        mimeType === "video/quicktime" || // for .mov files
        mimeType === "video/x-msvideo" // for .avi files
      ) {
        mediaType = "video";
      } else {
        return res.status(400).json({ error: "Invalid file type" });
      }
    }

    const newPost = new Post({
      user: userId,
      content,
      mediaType,
      mediaUrl,
      isPublic: isPublic == "isPublic" ? true : false,
    });
    await newPost.save();
    res
      .status(200)
      .json({ message: "Post created successfully", post: newPost });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Edit an existing post (only if user is post owner)
exports.editPost = async (req, res) => {
  try {
    const postId = req.params.postId;
    const { content, isPublic } = req.body;
    const userId = req.user._id; // Accessing user ID from middleware

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    // Check if the authenticated user is the owner of the post
    if (post.user.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "You are not authorized to edit this post" });
    }

    // Update post content
    post.content = content;
    post.isPublic = isPublic == "isPublic" ? true : false;

    // If a new media file is uploaded, replace the old one
    if (req.file) {
      post.mediaUrl = req.file.path;
      const mimeType = req.file.mimetype.toLowerCase();
      if (mimeType.includes("image")) {
        post.mediaType = "image";
      } else if (mimeType.includes("video")) {
        post.mediaType = "video";
      }
    }

    await post.save();
    res.status(200).json({ message: "Post updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete a post (only if user is post owner)
exports.deletePost = async (req, res) => {
  try {
    const postId = req.params.postId;
    const userId = req.user._id; // Accessing user ID from middleware

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    // Check if the authenticated user is the owner of the post
    if (post.user.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "You are not authorized to delete this post" });
    }

    // If the post has a media URL, delete the media file from Cloudinary
    if (post.mediaUrl) {
      // Extract the public ID from the Cloudinary URL
      // const publicId = post.mediaUrl.split("/").pop().split(".")[0]; // This assumes a standard Cloudinary URL format

      const publicId = extractPublicId(post.mediaUrl);

      if (!publicId) {
        return res.status(400).json({ message: "Invalid media URL" });
      }

      await cloudinary.uploader.destroy(publicId, (error, result) => {
        if (error) {
          console.error("Error deleting media from Cloudinary:", error);
          return res
            .status(500)
            .json({ message: "Failed to delete media from Cloudinary" });
        }
      });
    }

    // Delete the post from the database
    // await post.remove();
    await Post.deleteOne({ _id: postId });
    res.status(200).json({ message: "Post and media deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Add a comment to a post (authenticated user only)
exports.addComment = async (req, res) => {
  try {
    const postId = req.params.postId;
    const userId = req.user._id; // Accessing user ID from middleware
    const { text } = req.body;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    post.comments.push({ user: userId, text });
    await post.save();

    const populatedPost = await Post.findById(postId).populate({
      path: "comments.user",
      select: "first_name last_name user_name photo -_id", // Adjust fields as needed
    });
    // Sort comments by createdAt in descending order
    populatedPost.comments.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    res
      .status(200)
      .json({ message: "Comment added successfully", post: populatedPost });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete a comment from a post (post owner or comment owner only)
exports.deleteComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.user._id; // Accessing user ID from middleware

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    // Find the comment in the post's comments
    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    // Check if the user is the post owner or the comment owner
    const isPostOwner = post.user.toString() === userId.toString();
    const isCommentOwner = comment.user.toString() === userId.toString();

    if (isPostOwner || isCommentOwner) {
      // Either post owner or comment owner can delete the comment
      post.comments = post.comments.filter(
        (c) => c._id.toString() !== commentId
      );
      await post.save();
      return res.status(200).json({ message: "Comment deleted successfully" });
    } else {
      // Neither post owner nor comment owner
      return res
        .status(403)
        .json({ message: "You are not authorized to delete this comment" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get comments of a post (public access)
exports.getComments = async (req, res) => {
  try {
    const postId = req.params.postId;

    const post = await Post.findById(postId).populate(
      "comments.user",
      "first_name photo user_name last_name -_id"
    );
    if (!post) return res.status(404).json({ message: "Post not found" });

    const sortedComments = post.comments.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.status(200).json({
      comments: sortedComments.map((comment) => {
        return {
          ...comment.toObject(),
          user: {
            first_name: comment.user.first_name,
            last_name: comment.user.last_name,
            user_name: comment.user.user_name,
            photo: getResizedImageUrl(extractPublicId(comment.user.photo)),
          },
        };
      }),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.likePost = async (req, res) => {
  try {
    const postId = req.params.postId;
    const userId = req.user._id; // Assuming you have user ID in req.user

    // Find the post
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    // Check if the user has already liked the post
    if (post.likes.includes(userId)) {
      return res.status(400).json({ message: "Post already liked" });
    }

    // Add user ID to the likes array
    post.likes.push(userId);
    await post.save();

    res.status(200).json({ message: "Post liked successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.unlikePost = async (req, res) => {
  try {
    const postId = req.params.postId;
    const userId = req.user._id; // Assuming you have user ID in req.user

    // Find the post
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    // Check if the user has not liked the post
    if (!post.likes.includes(userId)) {
      return res.status(400).json({ message: "Post not liked yet" });
    }

    // Remove user ID from the likes array
    post.likes = post.likes.filter((id) => id.toString() !== userId.toString());
    await post.save();

    res.status(200).json({ message: "Post unliked successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// get post
exports.getPost = async (req, res) => {
  try {
    const postId = req.params.postId;
    const userId = req.user._id;

    // Find the post and populate user information and comments
    const post = await Post.findById(postId)
      .select("-__v -comments")
      .populate("user", "first_name last_name user_name photo -_id") // Populate author info
      .populate({
        path: "likes",
        // select: "first_name last_name user_name photo -_id", // Exclude _id from comment user fields
        select: "first_name last_name user_name photo", // Exclude _id from comment user fields
      });
    // .populate({
    //   path: "comments.user", // Populate user info for comments
    //   select: "first_name last_name user_name photo -_id",
    // });

    // Check if the post exists
    if (!post) return res.status(404).json({ message: "Post not found" });

    // Check if the post is private
    if (!post.isPublic && !post.user.equals(userId)) {
      return res
        .status(403)
        .json({ message: "You do not have permission to view this post" });
    }

    // const isLiked = post.likes.includes(userId);

    // // Create a response object with isLiked field
    // const response = {
    //   ...post.toObject(), // Convert Mongoose document to a plain object
    //   isLiked, // Add isLiked field
    // };
    // Check if the current user has liked the post
    const isLiked = post.likes.some(
      (like) => like._id.toString() === userId.toString()
    );

    // Format the response object
    const response = {
      ...post.toObject(), // Convert Mongoose document to a plain object
      isLiked, // Add isLiked field
      likes: post.likes.map(({ first_name, last_name, user_name, photo }) => ({
        first_name,
        last_name,
        user_name,
        photo,
      })), // Format likes to exclude _id
    };

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
