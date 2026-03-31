const mongoose = require('mongoose');

const postInteractionSchema = new mongoose.Schema({
  _id: { type: String, default: () => require('uuid').v4() },
  userId: { type: String, required: true, ref: 'User' },
  postId: { type: String, required: true, ref: 'Post' },
  interactionType: { type: String, required: true, enum: ['hide', 'not_interested', 'interested'] },
  createdAt: { type: Date, default: Date.now }
});

postInteractionSchema.index({ userId: 1, postId: 1 });

module.exports = mongoose.model('PostInteraction', postInteractionSchema);
