const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const CommunityMemberSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  communityId: { type: String, ref: 'Community', required: true },
  userId: { type: String, ref: 'User', required: true },
  role: { type: String, enum: ['admin', 'moderator', 'member'], default: 'member' },
  joinedAt: { type: Date, default: Date.now }
});

CommunityMemberSchema.index({ communityId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('CommunityMember', CommunityMemberSchema);
