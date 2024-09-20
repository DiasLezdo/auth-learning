const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const bcrypt = require("bcrypt");
const Token = require("../models/token");
const crypto = require("crypto");
const sendMail = require("../utils/Mail/SendMail");
const { generateToken, verifyToken } = require("../utils/common/token");
const passport = require("passport");
const { default: axios } = require("axios");
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");

const generateOtp = async (
  req,
  res,
  user,
  responseMessage = "Check your email and Verifiy your Account.",
  mailSubject = "Password Reset OTP",
  status = 201
) => {
  const otpDigit = Math.floor(100000 + Math.random() * 900000);

  await new Token({
    userId: user._id,
    token: otpDigit,
    createdAt: Date.now(),
    expiresAt: Date.now() + 1 * (60 * 1000),
  }).save();

  // Reset Email message we send too url (above link)
  const message = `
       <h2>Hello ${user?.first_name}</h2>
       <p>Here is your OTP</p>  
       <p>This OTP is valid for only a minute.</p>
       <h1 style="color:red;">${otpDigit}</h1>
       <p>Regards...</p>
       <img src="https://i.ibb.co/4pDNDk1/avatar.png" alt="odu />
       <p>Odu Bibin Team</p>
     `;
  const subject = mailSubject;
  const send_to = user.email;
  const sent_from = process.env.EMAIL_USER;

  try {
    await sendMail(subject, message, send_to, sent_from);
    // res.status(200).json({ success: true, message: "Reset Email Sent" });
    const { _id, first_name, email, phone, photo, bio, last_name } = user;
    return res.status(status).json({
      data: {
        _id,
        first_name,
        last_name,
        email,
      },
      message: responseMessage,
    });
  } catch (error) {
    res.status(500);
    console.log("error", error);
    throw new Error("Email not sent, please try again");
  }
};

const userResponseChanger = async (value) => {
  const userResponse = value.toObject();
  delete userResponse.password;
  delete userResponse.role;
  delete userResponse.createdAt;
  delete userResponse.updatedAt;
  delete userResponse.__v;
  delete userResponse.mfa_secret;

  return userResponse;
};

// Register User

// Normal Way

exports.registerUser = asyncHandler(async (req, res, next) => {
  const { first_name, email, password, last_name } = req.body;

  // Validation
  if (!first_name || !email || !password) {
    res.status(400);
    throw new Error("Please fill in all required fields");
  }
  if (password.length < 6) {
    res.status(400);
    throw new Error("Password must be up to 6 characters");
  }

  // Check if user email already exists
  const userExists = await User.findOne({ email });

  console.log("userExists", userExists);

  // userExists but Not Veriified
  if (userExists) {
    if (userExists.verified) {
      res.status(400);
      return next(
        new Error("User has been already registered.Please login your account")
      );
    } else {
      return generateOtp(
        req,
        res,
        userExists,
        "Account Already Created,Check your email and Verifiy your Account.",
        "Account Verified OTP",
        307
      );
    }
  }

  try {
    // Create new user
    const user = await User.create({
      // name:name ==> name from db and name from req.body
      first_name,
      last_name,
      email,
      password,
    });

    if (user) {
      return generateOtp(
        req,
        res,
        user,
        "Check your email and Verifiy your Account.",
        "Account Verified OTP",
        201
      );
    } else {
      res.status(400);
      throw new Error("User Data doesn't Added");
    }
  } catch (error) {
    res.status(400);
    throw new Error("User Not Created");
  }

  // const token = generateToken(user._id);

  // // Send token in HTTP-only cookie
  // res.cookie("token", token, {
  //   path: "/",
  //   httpsOnly: true,
  //   expires: new Date(Date.now() + 1000 * 86400), // 1 day
  //   // sameSite: "none",
  //   secure: process.env.NODE_ENV === "development" ? false : true,
  //   // secure: true
  // });
});

exports.verifyUser = asyncHandler(async (req, res) => {
  try {
    const { otp } = req.body;
    const { userId } = req.params;

    // Check if both userId and otp are provided
    if (!userId || !otp) {
      return res.status(400).json({ message: "User ID and OTP are required." });
    }

    // Find the token in the database
    const token = await Token.findOne({ userId, token: otp });

    if (!token) {
      // If the token is not found, send a response indicating the failure
      return res
        .status(404)
        .json({ message: "Token not found or invalid OTP." });
    }

    // If the token is valid, update the user's 'varified' field to true
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { verified: true },
      { new: true }
    );
    if (!updatedUser) {
      // Handle case where the user is not found
      return res.status(404).json({ message: "User not found." });
    }

    const userResponse = await userResponseChanger(updatedUser);

    const jwtToken = generateToken(userResponse._id);

    // Send token in HTTP-only cookie
    res.cookie("token", jwtToken, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // simplify secure option
      sameSite: process.env.NODE_ENV === "production" ? "Strict" : "Lax", // Add sameSite for better security
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    // Respond with the updated user information

    res
      .status(200)
      .json({ message: "User verified successfully.", user: userResponse });
  } catch (error) {
    res.status(400);
    throw new Error("Verifying User Error: " + error.message);
  }
});

exports.resendOtp = asyncHandler(async (req, res) => {
  const { id } = req.body;

  // Validation
  if (!id) {
    res.status(400);
    throw new Error("User does not exist");
  }

  try {
    const userExists = await User.findOne({ _id: id });

    // userExists but Not Veriified
    if (userExists) {
      return generateOtp(
        req,
        res,
        userExists,
        "Otp re-sent,Check your email and Verifiy your Account.",
        "Resent OTP",
        201
      );
    }
  } catch (error) {
    res.status(400);
    throw new Error("User Not Created");
  }
});

// Google Way

exports.withoutPackage = asyncHandler(async (req, res) => {
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${process.env.BACKEND_URI}/api/google/callback&response_type=code&scope=profile email`;
  res.redirect(url);
});

exports.withoutPackage2 = asyncHandler(async (req, res) => {
  const { code } = req.query;

  try {
    // Exchange authorization code for access token
    const { data } = await axios.post("https://oauth2.googleapis.com/token", {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      code,
      redirect_uri: `${process.env.BACKEND_URI}/api/google/callback`,
      grant_type: "authorization_code",
    });

    const { access_token, id_token } = data;

    // Fetch user profile
    const { data: profile } = await axios.get(
      "https://www.googleapis.com/oauth2/v1/userinfo",
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );

    if (profile) {
      const { id, email, given_name, family_name } = profile;
      const existingUser = await User.findOne({ email });

      let userResponse;
      if (existingUser) {
        const updatedUser = await User.findByIdAndUpdate(
          existingUser._id,
          { verified: true },
          { new: true }
        );
        if (!updatedUser) {
          return res.status(404).json({ message: "User not found." });
        }

        userResponse = await userResponseChanger(updatedUser);
      } else {
        const user = await User.create({
          first_name: given_name,
          last_name: family_name,
          email,
          oauthId: id,
          verified: true,
        });

        userResponse = await userResponseChanger(user);
      }

      const jwtToken = generateToken(userResponse._id);

      // Store the token in an HTTP-only cookie
      res.cookie("token", jwtToken, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "Strict" : "Lax",
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      // Redirect with user info in the query string
      return res.redirect(
        `${process.env.FRONTEND_URI}/auth-callback?user=${encodeURIComponent(
          JSON.stringify(userResponse)
        )}&token=${jwtToken}`
      );
    }
  } catch (error) {
    console.error("Error:", error);
    return res.redirect("/");
  }
});

// ----------------------------------------------

// TWITTER

// without Email just user details

exports.twitterRegister = asyncHandler(async (req, res) => {
  const twitterAuthUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${
    process.env.TWITTER_CLIENT_ID
  }&redirect_uri=${encodeURIComponent(
    process.env.BACKEND_URI
  )}/api/twitter/callback&scope=tweet.read%20users.read%20offline.access&state=state123&code_challenge=challenge&code_challenge_method=plain`;

  res.redirect(twitterAuthUrl);
});

exports.twitterCallback = asyncHandler(async (req, res) => {
  const { code } = req.query;

  try {
    // Exchange the authorization code for an access token
    const tokenResponse = await axios.post(
      "https://api.twitter.com/2/oauth2/token",
      {
        code,
        grant_type: "authorization_code",
        client_id: process.env.TWITTER_CLIENT_ID,
        redirect_uri: `${process.env.BACKEND_URI}/api/twitter/callback`,
        code_verifier: "challenge", // This should be the same as in the /auth/twitter request
      },
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(
            `${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`
          ).toString("base64")}`,
        },
      }
    );

    const accessToken = tokenResponse.data.access_token;

    // Step 3: Use the access token to get user info from Twitter
    const userInfoResponse = await axios.get(
      // "https://api.twitter.com/2/users/me",
      //     "https://api.twitter.com/2/users/me?user.fields=profile_image_url,created_at,description,location,public_metrics",
      //     {
      // "data": {
      //   "id": "1836001870713688064",
      //   "name": "Diaz Lezdo",
      //   "username": "DLezdo",
      //   "profile_image_url": "https://pbs.twimg.com/profile_images/...",
      //   "created_at": "2024-09-19T14:17:03.000Z",
      //   "description": "Tech enthusiast and lawyer",
      //   "location": "Alpharetta, GA",
      //   "public_metrics": {
      //     "followers_count": 1000,
      //     "following_count": 200,
      //     "tweet_count": 300
      //   },
      //   "verified": false
      // }
      // }
      "https://api.twitter.com/2/users/me?user.fields=profile_image_url,description",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const userProfile = userInfoResponse.data;

    console.log("userPro", userProfile);

    // Process user profile and either update or create a new user in your database
    // const { id_str, email, name, profile_image_url_https } = userProfile;
    // let userResponse;

    // const existingUser = await User.findOne({ email });
    // if (existingUser) {
    //   const updatedUser = await User.findByIdAndUpdate(
    //     existingUser._id,
    //     { verified: true },
    //     { new: true }
    //   );
    //   userResponse = updatedUser ? updatedUser.toObject() : null;
    // } else {
    //   const newUser = await User.create({
    //     first_name: name,
    //     photo: profile_image_url_https,
    //     email,
    //     oauthId: id_str,
    //     verified: true,
    //   });
    //   userResponse = newUser.toObject();
    // }

    // if (!userResponse) {
    //   return res.status(404).json({ message: "User not found." });
    // }

    // // Clean the response object by removing sensitive fields
    // delete userResponse.password;
    // delete userResponse.role;
    // delete userResponse.createdAt;
    // delete userResponse.updatedAt;
    // delete userResponse.__v;

    // // Generate JWT token
    // const jwtToken = generateToken(userResponse._id);

    // // Set the token in an HTTP-only cookie
    // res.cookie("token", jwtToken, {
    //   path: "/",
    //   httpOnly: true,
    //   secure: process.env.NODE_ENV === "production",
    //   sameSite: process.env.NODE_ENV === "production" ? "Strict" : "Lax",
    //   maxAge: 15 * 60 * 1000, // 15 minutes
    // });

    // // Redirect the user to your frontend with their info and token in the query string
    // res.redirect(
    //   `${process.env.FRONTEND_URI}/auth-callback?user=${encodeURIComponent(
    //     JSON.stringify(userResponse)
    //   )}&token=${jwtToken}`
    // );
  } catch (error) {
    console.error("Error during OAuth callback:", error);
    res.status(500).send("Authentication failed.");
  }
});

// with email and details whole package
exports.twitterPassportCallback = asyncHandler(async (req, res) => {
  try {
    const userProfile = req.user;

    console.log("userPro", userProfile);

    // Process user profile and either update or create a new user in your database
    const { id, email, displayName, profile } = userProfile;
    let userResponse;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const updatedUser = await User.findByIdAndUpdate(
        existingUser._id,
        { verified: true },
        { new: true }
      );
      userResponse = updatedUser
        ? await userResponseChanger(updatedUser)
        : null;
    } else {
      const newUser = await User.create({
        first_name: displayName,
        photo: profile,
        email,
        oauthId: id,
        verified: true,
      });

      userResponse = await userResponseChanger(newUser);
    }

    if (!userResponse) {
      return res.status(404).json({ message: "User not found." });
    }

    // Generate JWT token
    const jwtToken = generateToken(userResponse._id);

    // Set the token in an HTTP-only cookie
    res.cookie("token", jwtToken, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "Strict" : "Lax",
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    // Redirect the user to your frontend with their info and token in the query string
    res.redirect(
      `${process.env.FRONTEND_URI}/auth-callback?user=${encodeURIComponent(
        JSON.stringify(userResponse)
      )}&token=${jwtToken}`
    );
  } catch (error) {
    res
      .status(500)
      .json({ message: "Authentication failed", error: error.message });
  }
});

// ------------------------------------------------------

// GITHUB

exports.githubRegister = asyncHandler(async (req, res) => {
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${process.env.BACKEND_URI}/api/github/callback`;
  res.redirect(githubAuthUrl);
});

exports.githubCallback = asyncHandler(async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send("Code not provided.");
  }

  try {
    // Step 3: Exchange the authorization code for an access token
    const tokenResponse = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code: code,
        redirect_uri: `${process.env.BACKEND_URI}/api/github/callback`,
      },
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    const accessToken = tokenResponse.data.access_token;

    if (!accessToken) {
      return res.status(400).send("Access token not received.");
    }

    // Step 4: Use the access token to get the user's profile information from GitHub
    const userProfileResponse = await axios.get("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const userData = userProfileResponse.data;

    console.log("userData", userData);

    if (userData) {
      const { id, email, name, avatar_url } = userData;
      const existingUser = await User.findOne({ email });

      let userResponse;
      if (existingUser) {
        const updatedUser = await User.findByIdAndUpdate(
          existingUser._id,
          { verified: true },
          { new: true }
        );
        if (!updatedUser) {
          return res.status(404).json({ message: "User not found." });
        }

        userResponse = await userResponseChanger(updatedUser);
      } else {
        const user = await User.create({
          first_name: name,
          // last_name: family_name,
          photo: avatar_url,
          email,
          oauthId: id,
          verified: true,
        });
        userResponse = await userResponseChanger(user);
      }

      const jwtToken = generateToken(userResponse._id);

      // Store the token in an HTTP-only cookie
      res.cookie("token", jwtToken, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "Strict" : "Lax",
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      // Redirect with user info in the query string
      return res.redirect(
        `${process.env.FRONTEND_URI}/auth-callback?user=${encodeURIComponent(
          JSON.stringify(userResponse)
        )}&token=${jwtToken}`
      );
    }
  } catch (error) {
    console.error("Error fetching access token or user data:", error);
    res.status(500).send("Authentication failed.");
  }
});

// --------------- * * * * * * * * -------------------------

// login user

exports.loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  try {
    // validate request
    if (!email || !password) {
      res.status(400);
      throw new Error("Please Add email & password");
    }

    // check if user exist

    const user = await User.findOne({ email });

    if (!user) {
      res.status(400);
      throw new Error(" User doesn't exist .Please register");
    } else if (!user.verified) {
      return generateOtp(
        req,
        res,
        user,
        "Account Already Created,Check your email and Verifiy your Account.",
        "Account Verified OTP",
        307
      );
    }

    // check password

    // password from body user.password from db {user come from above code}
    const passwordIsCrt = await bcrypt.compare(password, user.password);

    if (!passwordIsCrt) {
      res.status(400);
      throw new Error(" Invalid password");
    }

    if (user.mfa == 1) {
      const otpDigit = Math.floor(100000 + Math.random() * 900000);

      await new Token({
        userId: user._id,
        token: otpDigit,
        createdAt: Date.now(),
        expiresAt: Date.now() + 1 * (60 * 1000),
      }).save();

      // Reset Email message we send too url (above link)
      const message = `
       <h2>Hello ${user.first_name}</h2>
       <p>Here is your OTP</p>  
       <p>This OTP is valid for only a minute.</p>
       <h1 style="color:red;">${otpDigit}</h1>
       <p>Regards...</p>
       <img src="https://i.ibb.co/4pDNDk1/avatar.png" alt="odu />
       <p>Odu Bibin Team</p>
     `;
      const subject = "2F Security";
      const send_to = user.email;
      const sent_from = process.env.EMAIL_USER;

      try {
        await sendMail(subject, message, send_to, sent_from);
        // res.status(200).json({ success: true, message: "Reset Email Sent" });
        const { _id, first_name, email, phone, photo, bio, last_name, mfa } =
          user;
        return res.status(202).json({
          message: "2FAuthorized to login (Check your email)",
          data: {
            mfa,
            id: _id,
          },
        });
      } catch (error) {
        res.status(500);
        console.log("error", error);
        throw new Error("Email not sent, please try again");
      }
    } else if (user.mfa == 2) {
      return res.status(202).json({
        message: "2FAuthorized to login(Check your auth app)",
        data: {
          id: user._id,
          mfa: user.mfa,
        },
      });
    }

    const userResponse = await userResponseChanger(user);

    const jwtToken = generateToken(user._id);

    // Send token in HTTP-only cookie
    res.cookie("token", jwtToken, {
      path: "/",
      httpOnly: true, //only accessible for backend can't access on frontend //IMPORTANT
      secure: process.env.NODE_ENV === "production", // simplify secure option
      sameSite: process.env.NODE_ENV === "production" ? "Strict" : "Lax", // Add sameSite for better security
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    if (user && passwordIsCrt) {
      res
        .status(200)
        .json({ message: "User verified successfully.", user: userResponse });
    } else {
      res.status(400);
      throw new Error("Invalid email or password");
    }
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

// logout user
exports.logoutUser = asyncHandler(async (req, res) => {
  // in this time we not remove or delete cookie we just expire that

  try {
    res.cookie("token", "", {
      path: "/", // Path must match where the cookie was set
      httpOnly: true, // Keep it httpOnly
      secure: process.env.NODE_ENV === "production", // Secure in production
      sameSite: process.env.NODE_ENV === "production" ? "Strict" : "Lax",
      expires: new Date(0), // Set expiry to the past to delete the cookie
    });

    return res.status(200).json({ message: "Successfully Logged Out" });
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

// -------------- * * * * * * * * --------------------------------------

// change user MFA Enable or disable

exports.mfaUpdate = asyncHandler(async (req, res) => {
  try {
    const { mfa } = req.body;

    const user = req.user;

    console.log("user", user, mfa);

    // Check if both userId and otp are provided
    if (mfa == undefined || mfa == null) {
      return res.status(400).json({ message: "MFA null" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { mfa: mfa },
      { new: true }
    );

    if (!updatedUser) {
      // Handle case where the user is not found
      return res.status(404).json({ message: "User not found." });
    }

    const userResponse = await userResponseChanger(updatedUser);

    res.status(200).json({
      message: "MFA updated",
      data: {
        user: userResponse,
      },
    });
  } catch (error) {
    res.status(400);
    throw new Error("Verifying User Error: " + error.message);
  }
});

exports.mfa2fGenerator = asyncHandler(async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      // Handle case where the user is not found
      return res.status(404).json({ message: "User not found." });
    }

    const secret = speakeasy.generateSecret({
      // name: "YourAppName (YourEmailOrUser)",
      name: `Learning-auth (${user.email})`,
    });

    // Generate a QR code for Google Authenticator
    qrcode.toDataURL(secret.otpauth_url, (err, data_url) => {
      if (err) {
        res.status(400);
        throw new Error("QR code not generated: " + err.message);
      }
      res.status(200).json({
        message: "MFA QR Generated",
        qrCode: data_url,
        secret: secret.base32,
      });
    });
  } catch (error) {
    res.status(400);
    throw new Error("Verifying User Error: " + error.message);
  }
});

exports.mfa2fConfirm = asyncHandler(async (req, res) => {
  const { secret, mfa } = req.body;

  try {
    const user = req.user;

    // Save the secret temporarily (in practice, store it in the user DB)
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { mfa_secret: secret, mfa: mfa },
      { new: true }
    );

    const userResponse = await userResponseChanger(updatedUser);
    res.status(200).json({
      message: "MFA updated",
      user: userResponse,
    });
  } catch (error) {
    res.status(400);
    throw new Error("Verifying User Error: " + error.message);
  }
});

exports.mfa2fVerify = asyncHandler(async (req, res) => {
  try {
    const { token, id } = req.body;

    const user = await User.findById(id);

    if (!user) {
      res.status(400);
      throw new Error(" User doesn't exist .Please register");
    } else {
      const verified = speakeasy.totp.verify({
        secret: user.mfa_secret, // Retrieve this from the database
        encoding: "base32",
        token: token,
        window: 5,
      });

      console.log("verified", verified);

      if (verified) {
        const userResponse = await userResponseChanger(user);

        const jwtToken = generateToken(userResponse._id);

        // Send token in HTTP-only cookie
        res.cookie("token", jwtToken, {
          path: "/",
          httpOnly: true,
          secure: process.env.NODE_ENV === "production", // simplify secure option
          sameSite: process.env.NODE_ENV === "production" ? "Strict" : "Lax", // Add sameSite for better security
          maxAge: 15 * 60 * 1000, // 15 minutes
        });

        res.status(200).json({
          message: "MFA Verified!!",
          user: userResponse,
        });
      } else {
        return res.status(400).json({ message: "Invalid token" });
      }
    }
  } catch (error) {
    res.status(400);
    throw new Error("Verifying User Error: " + error.message);
  }
});

// -------------------------------* * * * * * * --------------------------------------

// Forgot Password

exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    res.status(404);
    throw new Error("User does not exist");
  }

  try {
    return generateOtp(
      req,
      res,
      user,
      "Check your email And Verify",
      "Password Change OTP",
      200
    );
  } catch (error) {
    res.status(400);
    throw new Error("Unknow Error" + error.message);
  }
});

exports.verifyEmailPasswordRequest = asyncHandler(async (req, res) => {
  try {
    const { otp, email } = req.body;
    const { userId } = req.params;

    // Check if both userId and otp are provided
    if (!userId || !otp) {
      return res.status(400).json({ message: "User ID and OTP are required." });
    }

    // Find the token in the database
    const token = await Token.findOne({ userId, token: otp });

    if (!token) {
      // If the token is not found, send a response indicating the failure
      return res
        .status(404)
        .json({ message: "Token not found or invalid OTP." });
    }

    return res.status(200).json({
      message: "Email verified successfully.",
      user: {
        email,
        _id: userId,
      },
    });
  } catch (error) {
    res.status(400);
    throw new Error("Verifying User Error: " + error.message);
  }
});

exports.changePasswordViaForgot = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findById(userId);
  const { newpassword } = req.body;

  if (!user) {
    res.status(400);
    throw new Error("User not found, please signup");
  }

  // Save new password
  if (user && newpassword) {
    try {
      user.password = newpassword;
      await user.save();
      res.status(200).json({ message: "Password change successful" });
    } catch (error) {
      res.status(400);
      throw new Error("Password Not Stored in User Data!!");
    }
    // password save to db
  } else {
    res.status(400);
    throw new Error("Password Not Saved");
  }
});

// ----------------------------------- * * * * * * * --------------------------------

// getUser profile or data

exports.getUser = asyncHandler(async (req, res) => {
  // inthis case req.user._id ==> req.user from request of middleware and thats's a exact user(db) so
  const user = await User.findById(req.user._id);

  if (user) {
    const { _id, name, email, photo, phone, bio } = user;
    res.status(200).json({
      _id,
      name,
      email,
      photo,
      phone,
      bio,
    });
  } else {
    res.status(400);
    throw new Error("User Not Found");
  }
});

// get user status (like if user loggedIn or not )

exports.loginStatus = asyncHandler(async (req, res) => {
  // you already learn from protect middleware below
  const token = req.cookies.token;
  if (!token) {
    return res.json(false);
  }
  // Verify Token
  const verified = verifyToken(token);
  if (verified) {
    return res.json(true);
  }
  return res.json(false);
});

// Update User
exports.updateUser = asyncHandler(async (req, res) => {
  // req.user._id from middleware request
  const user = await User.findById(req.user._id);

  if (user) {
    const { name, email, photo, phone, bio } = user;
    user.email = email;
    // user sometimes upadte only one or 2,3 or non so that
    user.name = req.body.name || name;
    user.phone = req.body.phone || phone;
    user.bio = req.body.bio || bio;
    user.photo = req.body.photo || photo;

    const updatedUser = await user.save();
    res.status(200).json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      photo: updatedUser.photo,
      phone: updatedUser.phone,
      bio: updatedUser.bio,
    });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

// change password

// dont forgot when you develop front end ==> newpassword => not password

exports.changePassword = asyncHandler(async (req, res) => {
  // req.user._id come from middleware
  const user = await User.findById(req.user._id);
  const { oldPassword, newpassword } = req.body;

  if (!user) {
    res.status(400);
    throw new Error("User not found, please signup");
  }
  //Validate
  if (!oldPassword || !newpassword) {
    res.status(400);
    throw new Error("Please add old and new password");
  }

  // check if old password matches password in DB
  const passwordIsCorrect = await bcrypt.compare(oldPassword, user.password);

  // Save new password
  if (user && passwordIsCorrect) {
    // password save to db
    user.password = newpassword;
    await user.save();
    res.status(200).send("Password change successful");
  } else {
    res.status(400);
    throw new Error("Old password is incorrect");
  }
});

// reset Password

exports.resetPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const { resetToken } = req.params;

  // Hash token, then compare to Token in DB {params is not hashed token..}so we need to validation
  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // fIND tOKEN in DB
  const userToken = await Token.findOne({
    token: hashedToken,
    expiresAt: { $gt: Date.now() },
  });

  if (!userToken) {
    res.status(404);
    throw new Error("Invalid or Expired Token");
  }

  // Find user
  // _id from user model(collection) db and userToken.userId from token model DB
  const user = await User.findOne({ _id: userToken.userId });
  user.password = password;
  await user.save();
  res.status(200).json({
    message: "Password Reset Successful, Please Login",
  });
});
