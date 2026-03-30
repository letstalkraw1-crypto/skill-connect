const express = require('express');
const { verifyToken } = require('../services/auth');
const { createConversation, listConversations, getMessages, deleteMessage } = require('../services/messaging');

const router = express.Router();

// POST /conversations — create new conversation
router.post('/', verifyToken, async (req, res) => {
  try {
    const conversation = await createConversation(req.user.userId, req.body.participantIds);
    return res.status(201).json(conversation);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /conversations/:conversationId/messages — MUST be before /:userId
router.get('/:conversationId/messages', verifyToken, async (req, res) => {
  try {
    const messages = await getMessages(req.params.conversationId, req.user.userId);
    return res.status(200).json(messages);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

router.delete('/:conversationId/messages/:messageId', verifyToken, async (req, res) => {
  try {
    const scope = req.query.scope || 'self';
    const result = await deleteMessage(req.params.conversationId, req.params.messageId, req.user.userId, scope);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

// PUT /conversations/:conversationId/wallpaper
router.put('/:conversationId/wallpaper', verifyToken, async (req, res) => {
  try {
    const { wallpaper } = req.body;
    // We already have 'updateWallpaper' imported. Wait, I didn't import it in this file yet! I need to ensure it's destructured.
    const result = await require('../services/messaging').updateWallpaper(req.params.conversationId, wallpaper);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /conversations/:userId — list conversations
router.get('/:userId', verifyToken, async (req, res) => {
  try {
    const conversations = await listConversations(req.params.userId);
    return res.status(200).json(conversations);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
