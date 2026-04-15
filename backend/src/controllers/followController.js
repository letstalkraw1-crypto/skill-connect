const Follow = require('../models/Follow');
const { User } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// POST /api/follow/:userId — follow a user
const followUser = async (req, res) => {
  try {
    const followerId = req.user.userId;
    const followingId = req.params.userId;
    if (followerId === followingId) return res.status(400).json({ error: 'Cannot follow yourself' });

    const existing = await Follow.findOne({ followerId, followingId });
    if (existing) return res.status(409).json({ error: 'Already following' });

    await new Follow({ _id: uuidv4(), followerId, followingId }).save();
    res.status(201).json({ ok: true, following: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/follow/:userId — unfollow
const unfollowUser = async (req, res) => {
  try {
    await Follow.deleteOne({ followerId: req.user.userId, followingId: req.params.userId });
    res.json({ ok: true, following: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/follow/:userId/status — check if following
const getFollowStatus = async (req, res) => {
  try {
    const following = await Follow.exists({ followerId: req.user.userId, followingId: req.params.userId });
    const followerCount = await Follow.countDocuments({ followingId: req.params.userId });
    const followingCount = await Follow.countDocuments({ followerId: req.params.userId });
    res.json({ following: !!following, followerCount, followingCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/follow/following — get list of users I follow
const getFollowing = async (req, res) => {
  try {
    const follows = await Follow.find({ followerId: req.user.userId }).lean();
    const ids = follows.map(f => f.followingId);
    const users = await User.find({ _id: { $in: ids } }).select('_id name avatarUrl shortId').lean();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { followUser, unfollowUser, getFollowStatus, getFollowing };
