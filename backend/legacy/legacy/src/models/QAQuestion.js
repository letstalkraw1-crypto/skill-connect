const mongoose = require('mongoose');

const qaQuestionSchema = new mongoose.Schema({
  _id: { type: String, default: () => require('uuid').v4() },
  roomId: { type: String, required: true, ref: 'QARoom' },
  userId: { type: String, required: true, ref: 'User' },
  question: { type: String, required: true },
  answer: String,
  answeredAt: Date,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('QAQuestion', qaQuestionSchema);
