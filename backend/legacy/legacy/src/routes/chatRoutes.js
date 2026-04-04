const express = require('express');
const chatController = require('../controllers/chatController');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', verifyToken, chatController.listConversations);
router.post('/', verifyToken, chatController.createConversation);
router.get('/:conversationId/messages', verifyToken, chatController.getMessages);
router.delete('/:conversationId/messages/:messageId', verifyToken, chatController.deleteMessage);
router.put('/:conversationId/wallpaper', verifyToken, chatController.updateWallpaper);

module.exports = router;
