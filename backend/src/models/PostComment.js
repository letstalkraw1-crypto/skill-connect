const mongoose = require('mongoose');

const postCommentSchema = new mongoose.Schema({
  _id: { type: String, default: () => require('uuid').v4() },
  postId: { type: String, required: true, ref: 'Post' },
  userId: { type: String, required: true, ref: 'User' },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PostComment', postCommentSchema);
