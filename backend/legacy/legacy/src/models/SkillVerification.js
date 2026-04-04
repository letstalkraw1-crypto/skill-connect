const mongoose = require('mongoose');

const skillVerificationSchema = new mongoose.Schema({
  _id: { type: String, default: () => require('uuid').v4() },
  userId: { type: String, required: true, ref: 'User' },
  skillId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Skill' },
  verificationType: { type: String, required: true },
  url: String,
  status: { type: String, default: 'pending' },
  verifiedAt: Date,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SkillVerification', skillVerificationSchema);
