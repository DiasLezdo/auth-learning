const express = require("express");
const router = express.Router();
const protect = require("../middleware/auth");
const {
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  getRandomUsers,
  getRequestedUsers,
  getFriends,
} = require("../controller/friends");

router.get("/all", protect, getRandomUsers);
router.get("/requestes", protect, getRequestedUsers);
router.get("/myfriends", protect, getFriends);
router.post("/friend-request-sent", protect, sendFriendRequest);
router.post("/friend-request-accept", protect, acceptFriendRequest);
router.post("/friend-request-declined", protect, declineFriendRequest);

module.exports = router;
