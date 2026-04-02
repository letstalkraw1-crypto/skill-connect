const express = require('express');
const { verifyToken } = require('../services/auth');
const { createConversation, listConversations, getMessages, deleteMessage, updateWallpaper } = require('../services/messaging');

const router = express.Router();

// GET / — list conversations for current user
router.get('/', verifyToken, async (req, res) => {
  try {
    const occupations = await listConversations(req.user.userId);
    return res.status(200).json(occupations);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

// POST / — create new conversation
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
    const result = await getMessages(req.params.conversationId, req.user.userId);
    // Always return { messages, wallpaper } for consistency
    const data = Array.isArray(result) ? { messages: result, wallpaper: null } : result;
    return res.status(200).json(data);
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
    const result = await updateWallpaper(req.params.conversationId, wallpaper);
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
