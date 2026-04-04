const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema({
  _id: { type: String, default: () => require('uuid').v4() },
  title: { type: String, required: true },
  description: String,
  skillId: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill' },
  difficulty: String,
  startDate: Date,
  endDate: Date,
  points: { type: Number, default: 10 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Challenge', challengeSchema);
