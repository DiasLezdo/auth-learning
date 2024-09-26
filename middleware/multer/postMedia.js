const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../../config/cloudinary");

// Multer Storage Configuration
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  // params: {
  //   folder: "o-auth-project/posts", // Folder in Cloudinary
  //   allowed_formats: ["png", "jpg", "jpeg", "webp", "mp4", "mov", "avi"], // Allowed formats
  // },
  params: (req, file) => {
    // No need to handle unsupported formats here, it's already handled in fileFilter
    return {
      folder: "o-auth-project/posts",
      public_id: `${Date.now()}-${file.originalname.split(".")[0]}`, // Ensure unique filenames
      resource_type: file.mimetype.startsWith("video") ? "video" : "image", // Dynamically set resource type
    };
  },
});

const uploadPost = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "video/mp4",
      "video/quicktime", // For .mov
      "video/x-msvideo", // For .avi
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only images and videos are allowed."));
    }
  },
  limits: { fileSize: 25 * 1024 * 1024 }, // Set file size limit to 25MB
});

module.exports = uploadPost;
