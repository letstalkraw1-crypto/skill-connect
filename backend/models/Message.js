const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  _id: { type: String, default: () => require('uuid').v4() },
  conversationId: { type: String, required: true, ref: 'Conversation' },
  senderId: { type: String, required: true, ref: 'User' },
  text: { type: String, required: true },
  replyToMessageId: { type: String, ref: 'Message' },
  sentAt: { type: Date, default: Date.now },
  readAt: Date
});

module.exports = mongoose.model('Message', messageSchema);
