const express = require("express");
const router = express.Router();
const protect = require("../middleware/auth");
const postController = require("../controller/post");
const uploadPost = require("../middleware/multer/postMedia");
const multer = require("multer");

// Get all public posts or posts by a specific user
router.get("/all", protect, postController.getPosts); // To fetch public posts
router.get("/all/user/:userId", protect, postController.getPosts); // To fetch posts by a specific user

// Routes for posts
router.post(
  "/add",

  (req, res, next) => {
    // Handle the file upload
    uploadPost.single("media")(req, res, (err) => {
      console.log("req", req.file);
      if (err instanceof multer.MulterError) {
        // A Multer error occurred during the file upload
        if (err.code === "LIMIT_FILE_SIZE") {
          return res
            .status(400)
            .json({ error: "File too large. Max size is 25MB." });
        }
        return res.status(400).json({ error: "rr" + err.message });
      } else if (err) {
        // An unknown error occurred during the file upload
        return res.status(400).json({ error: "rr" + err.message });
      }
      // If no errors, proceed to the next middleware/controller
      next();
    });
  },
  protect,
  postController.addPost
);

router.put(
  "/edit/:postId",
  protect,
  uploadPost.single("media"),
  postController.editPost
);
router.delete("/delete/:postId", protect, postController.deletePost);

// Routes for comments
router.post("/comment/:postId", protect, postController.addComment);
router.delete(
  "/comment/:postId/:commentId",
  protect,
  postController.deleteComment
);
router.get("/comments/:postId", protect, postController.getComments);

module.exports = router;
