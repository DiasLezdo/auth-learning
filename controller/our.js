const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");
const OAuth2Data = require("../credentials.json");

const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

const oAuth2Client = new google.auth.OAuth2(
  OAuth2Data.web.client_id,
  OAuth2Data.web.client_secret,
  OAuth2Data.web.redirect_uris[0]
);

let authed = false;

exports.gooleAuth = async (req, res) => {
  if (!authed) {
    const url = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
    });
    res.redirect(url);
  } else {
    res.status(400).json({ message: "Already authenticated" });
  }
};

exports.authVerification = async (req, res) => {
  const code = req.body.code;
  if (code) {
    oAuth2Client.getToken(code, (err, tokens) => {
      if (err) {
        return res.status(400).json(err);
      }
      oAuth2Client.setCredentials(tokens);
      authed = true;
      console.log("tokens", tokens);
      // res.send("Authentication successful! You can now upload files.");
      res.status(200).json({
        message: "Authentication successful! You can now upload files.",
      });
    });
  }
};



exports.uploadFiles = async (req, res) => {
  const authed = true; // Replace with your actual authentication check

  if (!authed) {
    return res.status(401).send("Please authenticate first");
  }

  const filePath = req.file.path; // Use the full path directly from multer
  console.log("filePath", filePath);

  // Process the file as needed
  // For example, you can convert the file, analyze it, etc.

  // After processing, save the file to Google Drive
  saveFileToDrive(filePath, req.file.originalname, (err, fileId) => {
      if (err) {
        console.log('err', err)
      return res.status(400).json(err);
    }
    fs.unlinkSync(filePath); // Remove the file from the server after uploading
    res.status(200).json({
      message: `File processed and uploaded successfully, Google Drive file ID: ${fileId}`,
    });
  });
};

function saveFileToDrive(filePath, fileName, callback) {
    const drive = google.drive({ version: "v3", auth: oAuth2Client });

  const fileMetadata = {
    name: fileName,
  };
  const media = {
    mimeType: "application/octet-stream",
    body: fs.createReadStream(filePath),
  };

  drive.files.create(
    {
      resource: fileMetadata,
      media: media,
      fields: "id",
    },
    (err, file) => {
      if (err) {
        return callback(err);
      }
      callback(null, file.data.id);
    }
  );
}
