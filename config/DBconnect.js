const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const connect = await mongoose.connect(process.env.MONGO_URI);

    // console.log("mongoDB connected!!" + connect.connection.host);
    console.log("mongoDB connected!!");
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

module.exports = connectDB;

// const startApp = async () => {
//   try {
//     await connectDB();
//     app.listen(PORT, () => {
//       console.log("port running in " + PORT + " port");
//     });
//   } catch (error) {
//     console.log(error);
//   }
// };

// startApp();
