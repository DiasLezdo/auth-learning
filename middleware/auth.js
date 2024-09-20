const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { generateToken } = require("../utils/common/token");

// ------------------------- Cookies ----------------------------------------

const protect = asyncHandler(async (req, res, next) => {
  const token = req.cookies.token;

  // If no token is provided, deny access
  if (!token) {
    return res
      .status(401)
      .send({ message: "Access denied. No token provided." });
  }

  // Verify the JWT token
  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ message: "Invalid token. Please Login Again and continue." });
    }

    // If token is valid, proceed to check user existence and verification status
    try {
      const user = await User.findById(decoded.id).select("-password");

      if (!user || !user.verified) {
        return res
          .status(401)
          .send({ message: "User not found or not verified." });
      }

      // Generate a new access token
      const newAccessToken = await generateToken(user._id);

      // Set the new access token in the response cookies
      res.cookie("token", newAccessToken, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // simplify secure option
        sameSite: process.env.NODE_ENV === "production" ? "Strict" : "Lax", // Add sameSite for better security
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      // Attach the user to the request object
      req.user = user;
      next();
    } catch (error) {
      console.log("error", error);
      res.status(500).send({ message: "Internal server error." });
    }
  });
});

// ----------------------- Headers -----------------------------------------

// const protect = asyncHandler(async (req, res, next) => {
// const authHeader = req.headers["authorization"];
// const token = authHeader && authHeader.split(" ")[1];

// if (!token)
//   return res
//     .status(401)
//     .send({ message: "Access denied. No token provided." });

// jwt.verify(token, ACCESS_TOKEN_SECRET, (err, user) => {
//   if (err) return res.status(403).send({ message: "Invalid token." });

//   // If token is valid, generate a new token and attach it to the response headers
//   const newAccessToken = generateAccessToken({ username: user.username });
//   res.setHeader("Authorization", `Bearer ${newAccessToken}`);
//   req.user = user;
//   next();
// });
// });

module.exports = protect;
