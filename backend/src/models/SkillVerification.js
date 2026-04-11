const mongoose = require('mongoose');

const skillVerificationSchema = new mongoose.Schema({
  _id: { type: String, default: () => require('uuid').v4() },
  userId: { type: String, required: true, ref: 'User' },
  userSkillId: { type: String, ref: 'UserSkill' }, // link to specific user skill
  skillId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Skill' },
  skillName: { type: String }, // denormalized for admin panel
  verificationType: {
    type: String,
    required: true,
    enum: ['strava', 'github', 'leetcode', 'hackerrank', 'portfolio', 'certificate', 'link', 'gaming']
  },
  url: String,
  certificateUrl: String,
  // Gaming-specific fields
  gamingDetails: {
    game: String,        // BGMI, Free Fire, Valorant, etc.
    customGame: String,  // if user typed their own game
    playerId: String,    // in-game UID
    role: String,        // Fragger, Sniper, Support, IGL
  },
  status: { type: String, default: 'pending', enum: ['pending', 'verified', 'rejected'] },
  adminNote: String,     // admin can add a note when rejecting
  verifiedAt: Date,
  createdAt: { type: Date, default: Date.now }
});

skillVerificationSchema.index({ userId: 1, skillId: 1 });

module.exports = mongoose.model('SkillVerification', skillVerificationSchema);
