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
  twitterRegister,
  twitterCallback,
  twitterPassportCallback,
  mfaUpdate,
  mfa2fGenerator,
  mfa2fConfirm,
  mfa2fVerify,
  verifyEmailPasswordRequest,
  changePasswordViaForgot,
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

// twitter auth

// without email and package
// router.get("/auth/twitter", twitterRegister);
// router.get("/twitter/callback", twitterCallback);

// with email and package
router.get(
  "/auth/twitter",
  passport.authenticate("twitter", { session: false })
);

// Twitter OAuth callback route (stateless)
router.get(
  "/twitter/callback",
  passport.authenticate("twitter", {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URI}`,
  }),
  twitterPassportCallback // Call controller for further processing
);

// MFA Update
router.post("/mfaUpdate", protect, mfaUpdate);
router.get("/mfaUpdate/2fa/generate", protect, mfa2fGenerator);
router.post("/mfaUpdate/2fa/confirm", protect, mfa2fConfirm);
router.post("/mfaUpdate/2fa/verify", mfa2fVerify);

// forgot password
router.post("/forgotPassword", forgotPassword);
router.post("/forgotPassword/verify/:userId", verifyEmailPasswordRequest);
router.post("/forgotPassword/change/:userId", changePasswordViaForgot);

// ----------------------------------------------------------------
router.get("/getuser", protect, getUser);
router.get("/loggedin", loginStatus);
router.patch("/updateuser", protect, updateUser);
router.patch("/changepassword", protect, changePassword);
router.put("/resetPassword/:resetToken", resetPassword);

module.exports = router;
