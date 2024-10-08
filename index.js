const express = require("express");
require("dotenv").config();
const cors = require("cors");
const connectDB = require("./config/DBconnect");
const app = express();
const cookieParse = require("cookie-parser");
const passport = require("passport");
const session = require("express-session");
require("./utils/auth/passport_twitter");
const http = require("http");
// ---errors
const errorHandler = require("./middleware/error");

// ---
// const ourRoutes = require("./routes/our");
const userRoutes = require("./routes/user");
const friendRoutes = require("./routes/friends");
const postRoutes = require("./routes/post");
const messageRoutes = require("./routes/message");

const allowedOrigin = process.env.FRONTEND_URI; // Update this to your client’s origin

app.set("name", "Auth-Learning");

app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
  })
);

//it's required OAuth 1.0a so i just put it temporarily

app.use(
  session({
    secret: process.env.SESSION_SECRET || "secret", // You should use an environment variable for this secret
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }, // In production, set this to `true` if using HTTPS
  })
);

app.use(passport.initialize());
app.use(passport.session()); //it's required OAuth 1.0a so i just put it temporarily
app.use(express.json());
app.use(cookieParse());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

// app.use("/api", ourRoutes);
app.use("/api", userRoutes);
app.use("/api/friend", friendRoutes);
app.use("/api/post", postRoutes);
app.use("/api/message", messageRoutes);

// error middleware should after api routes
app.use(errorHandler);

// socket server

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const socket = require("./config/socket");
const io = socket.initSocket(server);

// console.log("io", io);

// DB first

const port = 8080;

const startApp = async () => {
  try {
    await connectDB();
    // app.listen(port, () => {
    //   console.log(`Example app listening on port ${port}`);
    // });
    server.listen(port, () => {
      console.log(`Example app listening on port ${port}`);
    });
  } catch (error) {
    console.log(error);
  }
};

startApp();
