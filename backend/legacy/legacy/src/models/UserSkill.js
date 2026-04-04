const mongoose = require('mongoose');

const userSkillSchema = new mongoose.Schema({
  _id: { type: String, default: () => require('uuid').v4() },
  userId: { type: String, required: true, ref: 'User' },
  skillId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Skill' },
  subSkill: { type: String, default: null }, // e.g. "Marathon / Endurance"
  level: String,
  yearsExp: Number,
  proficiencyId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProficiencyLevel' },
  createdAt: { type: Date, default: Date.now }
}, { unique: false });

userSkillSchema.index({ userId: 1, skillId: 1, subSkill: 1 }, { unique: true });

module.exports = mongoose.model('UserSkill', userSkillSchema);
