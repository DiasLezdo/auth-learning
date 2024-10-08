const cloudinary = require("../../config/cloudinary");
const path = require("path");

/**
 * Generates a URL for a resized image.
 *
 * @param {string} publicId - The public ID of the image.
 * @param {number} width - Desired width in pixels.
 * @param {number} height - Desired height in pixels.
 * @returns {string} - The transformed image URL.
 */
exports.getResizedImageUrl = (publicId, width = 300, height = 300) => {
  return cloudinary.url(publicId, {
    width: width,
    height: height,
    // crop: "scale", // Maintains aspect ratio
    crop: "fill", // if you want make it dynamic tooo there are so many options available
  });
};

// **Usage Example**
// const publicId = "folder_name/my_image"; // Replace with your image's public ID
// const resizedUrl = getResizedImageUrl(publicId, 300, 200);
// console.log("Resized Image URL:", resizedUrl);

/**
 * Extracts the public ID from a Cloudinary URL.
 *
 * @param {string} cloudinaryUrl - The URL of the Cloudinary resource.
 * @returns {string|null} - The extracted public ID or null if extraction fails.
 */
exports.extractPublicId = (cloudinaryUrl) => {
  try {
    const parsedUrl = new URL(cloudinaryUrl);
    const pathname = parsedUrl.pathname; // e.g., /demo/image/upload/v1623456789/folder_name/my_image.jpg

    // Split the pathname to isolate the part after '/upload/'
    const uploadIndex = pathname.indexOf("/upload/");
    if (uploadIndex === -1) {
      // console.error("Invalid Cloudinary URL: Missing /upload/ segment.");
      return null;
    }

    // Extract the segment after '/upload/'
    let publicIdWithVersion = pathname.substring(
      uploadIndex + "/upload/".length
    ); // e.g., v1623456789/folder_name/my_image.jpg

    // Remove versioning if present (e.g., v1623456789/)
    if (publicIdWithVersion.startsWith("v")) {
      const firstSlash = publicIdWithVersion.indexOf("/");
      if (firstSlash !== -1) {
        publicIdWithVersion = publicIdWithVersion.substring(firstSlash + 1); // e.g., folder_name/my_image.jpg
      }
    }

    // Remove the file extension
    const publicId = publicIdWithVersion.replace(
      path.extname(publicIdWithVersion),
      ""
    ); // e.g., folder_name/my_image

    return publicId;
  } catch (error) {
    console.error("Error parsing URL:", error);
    return null;
  }
};
