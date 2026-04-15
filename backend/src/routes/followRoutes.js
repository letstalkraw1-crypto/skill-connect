const express = require('express');
const { followUser, unfollowUser, getFollowStatus, getFollowing } = require('../controllers/followController');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/:userId', verifyToken, followUser);
router.delete('/:userId', verifyToken, unfollowUser);
router.get('/:userId/status', verifyToken, getFollowStatus);
router.get('/', verifyToken, getFollowing);

module.exports = router;
