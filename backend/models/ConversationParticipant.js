const mongoose = require('mongoose');

const ConversationParticipantSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
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
