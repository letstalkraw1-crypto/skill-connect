const mongoose = require('mongoose');

const dailyChallengeSchema = new mongoose.Schema({
  _id: { type: String, default: () => require('uuid').v4() },
  date: { type: String, required: true, unique: true }, // YYYY-MM-DD
  topic: { type: String, required: true },
  description: { type: String },
  tips: { type: [String], default: [] },
  dueTime: { type: String, default: '23:59' }, // HH:MM — deadline to submit
  createdBy: { type: String, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});

dailyChallengeSchema.index({ date: -1 });

module.exports = mongoose.model('DailyChallenge', dailyChallengeSchema);
