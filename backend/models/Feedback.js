const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  _id: { type: String, default: () => require('uuid').v4() },
  fromUserId: { type: String, required: true, ref: 'User' },
  toUserId: { type: String, required: true, ref: 'User' },
  type: { type: String, required: true },
  referenceId: String,
  rating: { type: Number, min: 1, max: 5 },
  comment: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Feedback', feedbackSchema);
