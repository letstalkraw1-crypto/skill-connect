const mongoose = require('mongoose');

const skillEndorsementSchema = new mongoose.Schema({
  _id: { type: String, default: () => require('uuid').v4() },
  endorserId: { type: String, required: true, ref: 'User' },
  endorseeId: { type: String, required: true, ref: 'User' },
  skillId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Skill' },
  comment: String,
  createdAt: { type: Date, default: Date.now }
});

skillEndorsementSchema.index({ endorserId: 1, endorseeId: 1, skillId: 1 }, { unique: true });

module.exports = mongoose.model('SkillEndorsement', skillEndorsementSchema);
