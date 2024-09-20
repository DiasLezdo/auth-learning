const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../../config/cloudinary");

// Multer Storage Configuration
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "o-auth-project/profiles", // Folder in Cloudinary
    allowed_formats: ["png", "jpg", "jpeg", "webp"], // Allowed formats
  },
});

const uploadProfile = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Check file type
    const fileTypes = /jpeg|jpg|png|webp/;
    const extname = fileTypes.test(file.mimetype.toLowerCase());

    if (extname) {
      return cb(null, true);
    } else {
      //   const error = new Error("Only Video Type Allowed!!");
      //     error.statusCode = 401; // Set a custom status code for later handling
      //     cb(error, false);
      cb(new Error("Only .png, .jpg, and .webp formats are allowed!", 400));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // Optional: File size limit 5MB
});

module.exports = uploadProfile;
