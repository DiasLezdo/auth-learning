const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const {
  getResizedImageUrl,
  extractPublicId,
} = require("../utils/common/imageOptimize");

// Get Random User
exports.getRandomUsers = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select("friends friendRequests");

    if (!user) {
      return res.status(400).json({ message: "User Not Found" });
    }

    const friendIds = user.friends;
    const pendingRequestIds = user.friendRequests;

    // Combine both friend and friend request IDs into one array
    const excludedIds = [...friendIds, ...pendingRequestIds, userId]; // Exclude the current user as well

    // Pagination parameters: page number and limit
    const page = parseInt(req.query.page, 10) || 1; // Default to page 1 if not provided
    const limit = parseInt(req.query.limit, 10) || 10; // Default to limit 10 if not provided
    const skip = (page - 1) * limit;

    // Search parameter: searchTerm
    const searchTerm = req.query.search || ""; // Optional search term from query

    // Build the search query if a search term is provided
    const searchQuery = searchTerm
      ? {
          $or: [
            { user_name: { $regex: searchTerm, $options: "i" } }, // Case-insensitive search by username
            { first_name: { $regex: searchTerm, $options: "i" } }, // Case-insensitive search by first name
            { last_name: { $regex: searchTerm, $options: "i" } }, // Case-insensitive search by last name
          ],
        }
      : {};

    // Find all users who are not in the excluded list and match the search query
    const availableUsers = await User.aggregate([
      { $match: { _id: { $nin: excludedIds }, ...searchQuery } }, // Exclude userId, friends, and pending friend requests and apply search query
      { $sort: { createdAt: -1 } },
      { $skip: skip }, // Skip the first `skip` number of users
      { $limit: limit }, // Limit the result to the `limit` number of users
      {
        $project: {
          _id: 0, // Exclude _id field
          user_name: 1, // Include user_name field
          photo: 1, // Include photo (assuming photo refers to the user's profile picture or similar field)
          first_name: 1, // Include first_name
          last_name: 1, // Include last_name
        },
      },
    ]);

    // Count the total number of users excluding the excluded ones and matching the search query
    const totalUsers = await User.countDocuments({
      _id: { $nin: excludedIds },
      ...searchQuery,
    });

    // Calculate total pages
    const totalPages = Math.ceil(totalUsers / limit);

    return res.status(200).json({
      message: "Add your Friends",
      data: availableUsers,
      pagination: {
        totalUsers,
        totalPages,
        currentPage: page,
        pageSize: limit,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
});

// Get Requestes User
exports.getRequestedUsers = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select("friendRequests");

    if (!user) {
      return res.status(400).json({ message: "User Not Found" });
    }

    const pendingRequestIds = user.friendRequests;

    const pendingUsers = await User.find({
      _id: { $in: pendingRequestIds },
    }).select("user_name first_name last_name photo");

    // Map the response to the desired format
    const formattedResponse = pendingUsers.map((user) => ({
      user_name: user.user_name,
      first_name: user.first_name,
      last_name: user.last_name,
      photo: getResizedImageUrl(extractPublicId(user.photo)),
    }));

    // Return the response in the required format
    res.status(200).json({
      message: "Requested Users",
      data: formattedResponse,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
});

// Get Friends
exports.getFriends = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select("friends");

    if (!user) {
      return res.status(400).json({ message: "User Not Found" });
    }

    const friends = user.friends;

    const pendingUsers = await User.find({
      _id: { $in: friends },
    }).select("user_name first_name last_name photo");

    // Map the response to the desired format
    const formattedResponse = pendingUsers.map((user) => ({
      user_name: user.user_name,
      first_name: user.first_name,
      last_name: user.last_name,
      photo: getResizedImageUrl(extractPublicId(user.photo)),
    }));

    // Return the response in the required format
    res.status(200).json({
      message: "Friends",
      data: formattedResponse,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
});

// sending a request
exports.sendFriendRequest = asyncHandler(async (req, res) => {
  //   const { friend_user_name } = req.body;

  //   const user = req.user;

  try {
    const { friend_user_name } = req.body;
    const userId = req.user._id;

    const friend = await User.findOne({ user_name: friend_user_name });
    if (!friend) {
      return res.status(404).json({ message: "User not found" });
    }

    if (userId === friend._id) {
      return res
        .status(400)
        .json({ message: "You cannot send a friend request to yourself" });
    }

    const user = await User.findById(userId);

    // Check if the request has already been sent or they are already friends
    if (user.friends.includes(friend._id)) {
      return res
        .status(400)
        .json({ message: "This user is already your friend" });
    }

    // const requestExists = friend.friendRequests.find(
    //   (request) =>
    //     request.from.toString() === userId && request.status === "pending"
    //   );

    const requestExists = friend.friendRequests.includes(userId);

    if (requestExists) {
      return res.status(400).json({ message: "Friend request already sent" });
    }

    // Send the friend request
    friend.friendRequests.push(userId);
    await friend.save();

    return res
      .status(200)
      .json({ message: "Friend request sent successfully" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
});

// Accept the friend request
exports.acceptFriendRequest = async (req, res) => {
  try {
    const { friend_user_name } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);
    const friend = await User.findOne({ user_name: friend_user_name });

    if (!friend) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the friend request exists in the user's friendRequests array
    const friendRequestIndex = user.friendRequests.findIndex(
      (request) => request.toString() === friend._id.toString()
    );

    if (friendRequestIndex === -1) {
      return res
        .status(404)
        .json({ message: "Friend request not found or already handled" });
    }

    // Add the friend to the user's friends list
    user.friends.push(friend._id);

    // Remove the friend request from the user's friendRequests array
    user.friendRequests.splice(friendRequestIndex, 1); // Removes the request from the array

    await user.save();

    // Add the user to the friend's friends list
    friend.friends.push(userId);
    await friend.save();

    return res.status(200).json({ message: "Friend request accepted" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

// Decline a friend request
exports.declineFriendRequest = async (req, res) => {
  try {
    const { friend_user_name } = req.body;
    const userId = req.user._id;

    // Find the current user and the friend user by their username
    const user = await User.findById(userId);
    const friend = await User.findOne({ user_name: friend_user_name });

    // If the friend is not found, return an error
    if (!friend) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the friend request exists in the user's friendRequests array
    const friendRequestIndex = user.friendRequests.findIndex(
      (request) => request.toString() === friend._id.toString()
    );

    // If the friend request does not exist, return an error
    if (friendRequestIndex === -1) {
      return res
        .status(404)
        .json({ message: "Friend request not found or already handled" });
    }

    // Remove the friend request from the user's friendRequests array
    user.friendRequests.splice(friendRequestIndex, 1);

    // Save the updated user object
    await user.save();

    return res.status(200).json({
      message: "Friend request declined",
    });
  } catch (error) {
    // Handle any server errors
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

// Remove Friend
exports.removeFriend = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    const { friend_user_name } = req.body;

    // Validate the input
    if (!friend_user_name) {
      return res.status(400).json({ message: "Friend user_name is required" });
    }

    // Find the friend by user_name
    const friend = await User.findOne({ user_name: friend_user_name });
    if (!friend) {
      return res.status(404).json({ message: "Friend user not found" });
    }

    // Prevent users from removing themselves
    if (userId.toString() === friend._id.toString()) {
      return res.status(400).json({ message: "You cannot remove yourself" });
    }

    // Fetch the current user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Current user not found" });
    }

    // Check if the specified user is actually a friend
    const isFriend = user.friends.includes(friend._id);
    if (!isFriend) {
      return res.status(400).json({ message: "The specified user is not your friend" });
    }

    // Remove the friend from the current user's friends list
    user.friends = user.friends.filter(
      (friendId) => friendId.toString() !== friend._id.toString()
    );
    await user.save();

    // Remove the current user from the friend's friends list
    friend.friends = friend.friends.filter(
      (friendId) => friendId.toString() !== userId.toString()
    );
    await friend.save();

    return res.status(200).json({ message: "Friend removed successfully" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
});
