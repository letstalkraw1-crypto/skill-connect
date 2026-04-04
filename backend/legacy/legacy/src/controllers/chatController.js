const chatService = require('../services/messaging');

const listConversations = async (req, res) => {
  try {
    const conversations = await chatService.listConversations(req.user.userId);
    res.status(200).json(conversations);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

const createConversation = async (req, res) => {
  try {
    const conversation = await chatService.createConversation(req.user.userId, req.body.participantIds);
    res.status(201).json(conversation);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

const getMessages = async (req, res) => {
  try {
    const result = await chatService.getMessages(req.params.conversationId, req.user.userId);
    res.status(200).json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const scope = req.query.scope || 'self';
    const result = await chatService.deleteMessage(req.params.conversationId, req.params.messageId, req.user.userId, scope);
    res.status(200).json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

const updateWallpaper = async (req, res) => {
  try {
    const result = await chatService.updateWallpaper(req.params.conversationId, req.body.wallpaper);
    res.status(200).json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

module.exports = { listConversations, createConversation, getMessages, deleteMessage, updateWallpaper };
