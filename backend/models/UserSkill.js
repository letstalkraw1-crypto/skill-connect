const mongoose = require('mongoose');

const userSkillSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  userId: { type: String, required: true, ref: 'User' },
  skillId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Skill' },
  level: String,
  yearsExp: Number,
  proficiencyId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProficiencyLevel' }
}, { unique: false });

userSkillSchema.index({ userId: 1, skillId: 1 }, { unique: true });

module.exports = mongoose.model('UserSkill', userSkillSchema);
