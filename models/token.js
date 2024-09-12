const mongoose = require("mongoose");

// const { ObjectId } = mongoose.Schema;

const tokenSchema = mongoose.Schema({
  // Db colob [relationship]
  userId: {
    // objectId from user unique user id [in DB]
    //
    type: mongoose.Schema.Types.ObjectId,
    // type:ObjectId,
    ref: "User",
    required: true,
  },
  token: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    required: true,
    
  },
  expiresAt: {
    type: Date,
    required: true,
  },
});

tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 60 });

module.exports = mongoose.model("Token", tokenSchema);
