const express = require('express');
const communityController = require('../controllers/communityController');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', verifyToken, communityController.listCommunities);
router.get('/:id', verifyToken, communityController.getCommunity);
router.post('/', verifyToken, communityController.createCommunity);
router.post('/:id/join', verifyToken, communityController.joinCommunity);
router.delete('/:communityId/members/:userId', verifyToken, communityController.removeMember);
router.put('/:communityId/members/:userId/admin', verifyToken, communityController.makeAdmin);
router.put('/:communityId/privacy', verifyToken, communityController.updatePrivacy);

module.exports = router;
