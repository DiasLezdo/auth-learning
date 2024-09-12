const express = require("express");
require("dotenv").config();
const cors = require("cors");
const connectDB = require("./config/DBconnect");
const app = express();
const cookieParse = require("cookie-parser");

// ---errors
const errorHandler = require("./middleware/error");

// ---
const ourRoutes = require("./routes/our");
const userRoutes = require("./routes/user");

const allowedOrigin = process.env.FRONTEND_URI; // Update this to your client’s origin

app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParse());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.use("/api", ourRoutes);
app.use("/api", userRoutes);

// error middleware should after api routes
app.use(errorHandler);

// DB first

const port = 8080;

const startApp = async () => {
  try {
    await connectDB();
    app.listen(port, () => {
      console.log(`Example app listening on port ${port}`);
    });
  } catch (error) {
    console.log(error);
  }
};

startApp();
