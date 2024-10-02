const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../../config/cloudinary");
const multer = require("multer");

// Multer Storage Configuration
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  // params: {
  //   folder: "o-auth-project/message", // Folder in Cloudinary
  //   // allowed_formats: ["jpeg", "png", "gif", "pdf", "docx", "txt"], // Allowed formats
  //   // transformation: [{ width: 500, height: 500, crop: "limit" }],
  // },
  params: (req, file) => {
    // No need to handle unsupported formats here, it's already handled in fileFilter
    return {
      folder: "o-auth-project/message",
      // public_id: `${Date.now()}-${file.originalname.split(".")[0]}`, // Ensure unique filenames
      resource_type: file.mimetype.startsWith("video")
        ? "video"
        : file.mimetype.startsWith("image")
        ? "image"
        : "text", // Dynamically set resource type
    };
  },
});

const uploadMessageMedia = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "video/mp4",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain", // For .avi
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      return cb(
        new Error("Invalid file type. Only images and videos are allowed.")
      );
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // Set file size limit to 5MB
});

module.exports = uploadMessageMedia;
