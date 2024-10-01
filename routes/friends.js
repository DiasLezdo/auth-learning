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
  removeFriend,
} = require("../controller/friends");

// Apply the auth middleware to all friend-related routes
router.use(protect);

router.get("/all", getRandomUsers);
router.get("/requestes", getRequestedUsers);
router.get("/myfriends", getFriends);
router.post("/remove-friend", removeFriend);
router.post("/friend-request-sent", sendFriendRequest);
router.post("/friend-request-accept", acceptFriendRequest);
router.post("/friend-request-declined", declineFriendRequest);

// router.get("/all", protect, getRandomUsers);
// router.get("/requestes", protect, getRequestedUsers);
// router.get("/myfriends", protect, getFriends);
// router.post("/remove-friend", protect, removeFriend);
// router.post("/friend-request-sent", protect, sendFriendRequest);
// router.post("/friend-request-accept", protect, acceptFriendRequest);
// router.post("/friend-request-declined", protect, declineFriendRequest);

module.exports = router;
