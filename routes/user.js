const express = require("express");
const router = express.Router();
const passport = require("passport");

const {
  registerUser,
  loginUser,
  logoutUser,
  getUser,
  loginStatus,
  updateUser,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyUser,
  resendOtp,
  withoutPackage,
  withoutPackage2,
  githubRegister,
  githubCallback,
} = require("../controller/user");
const protect = require("../middleware/auth");

// for api order is an important in express
router.post("/register", registerUser);
router.post("/verify/resent", resendOtp);
router.post("/verify/:userId", verifyUser);
router.post("/login", loginUser);
router.get("/logout", logoutUser);

// google auth

router.get("/auth/google", withoutPackage);
router.get("/google/callback", withoutPackage2);

// github auth

router.get("/auth/github", githubRegister);
router.get("/github/callback", githubCallback);

// ----------------------------------------------------------------
router.get("/getuser", protect, getUser);
router.get("/loggedin", loginStatus);
router.patch("/updateuser", protect, updateUser);
router.patch("/changepassword", protect, changePassword);
router.post("/forgotPassword", forgotPassword);
router.put("/resetPassword/:resetToken", resetPassword);

module.exports = router;
