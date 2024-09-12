const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const {
    uploadFiles,
    gooleAuth,
    authVerification,
} = require("../controller/our");

// Configure Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    try {
      console.log("__dirname", __dirname);
      const uploadPath = path.join(__dirname, "..", "uploads");
      console.log("uploadPath", uploadPath);
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    } catch (error) {
      console.error("Error in destination function:", error);
      cb(new Error("Failed to set upload destination"));
    }
  },
  filename: function (req, file, cb) {
    try {
      const filename = Date.now() + "-" + file.originalname;
      cb(null, filename);
    } catch (error) {
      console.error("Error in filename function:", error);
      cb(new Error("Failed to set file name"));
    }
  },
});

const upload = multer({ storage });

router.get("/google", gooleAuth);
router.post("/google/callback", authVerification);

router.post("/upload", upload.single("file"), uploadFiles);

module.exports = router;
