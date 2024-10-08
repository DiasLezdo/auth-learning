// socket.js
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URI, // Replace with your frontend URL
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Middleware for authenticating Socket.IO connections
  io.use(async (socket, next) => {
    try {
      const cookie = socket.handshake.headers.cookie;
      if (!cookie) {
        return next(new Error("Authentication error: No cookie provided"));
      }
      const token = cookie
        .split("; ")
        .find((row) => row.startsWith("token="))
        ?.split("=")[1];

      console.log("cookie", token);

      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("-password");

      if (!user || !user.verified) {
        return next(
          new Error("Authentication error: User not found or not verified")
        );
      }

      socket.user = user; // Attach user to socket object
      next();
    } catch (error) {
      console.error("Socket.IO authentication error:", error);
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.user.user_name}`);

    // Join the user to their own room based on user ID
    socket.join(socket.user._id.toString());

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.user.user_name}`);
      // Handle any cleanup if necessary
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

module.exports = {
  initSocket,
  getIO,
};
