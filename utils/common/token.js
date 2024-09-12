const jwt = require("jsonwebtoken");

exports.generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "15m" });
};

exports.verifyToken = (token) => {
  const verified = jwt.verify(token, process.env.JWT_SECRET);
  if (verified) {
    return true;
  }
  return false;
};

// const token = jwt.sign(
//       {
//         id: req.user._id,
//         displayName: req.user.displayName,     // we can add more details here and easily use
//         email: req.user.email,
//       },
//       process.env.JWT_SECRET,
//       { expiresIn: "1h" }
//     );
