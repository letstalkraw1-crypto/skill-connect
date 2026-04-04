const mongoose = require('mongoose');

const ConversationParticipantSchema = new mongoose.Schema({
  conversationId: {
    type: String,
    ref: 'Conversation',
    required: true
  },
  userId: {
    type: String,
    ref: 'User',
    required: true
  },
  joinedAt: {
    type: Date,
    default: Date.now
  }
});

ConversationParticipantSchema.index({ conversationId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('ConversationParticipant', ConversationParticipantSchema);
