const mongoose = require('mongoose');

const CommunitySchema = new mongoose.Schema({
  _id: { type: String, default: () => require('uuid').v4() },
  creatorId: { type: String, ref: 'User', required: true },
  name: { type: String, required: true },
  description: String,
  type: { type: String, enum: ['community', 'group', 'forum'], default: 'community' },
  maxMembers: { type: Number, default: 100 },
  shortCode: { type: String, unique: true, sparse: true },
  conversationId: { type: String, ref: 'Conversation' },
  messagingPolicy: { type: String, enum: ['everyone', 'admins_only'], default: 'everyone' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

async function generateShortCode(model) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '', isUnique = false;
  while (!isUnique) {
    code = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const existing = await model.findOne({ shortCode: code });
    if (!existing) isUnique = true;
  }
  return code;
}

CommunitySchema.pre('save', async function (next) {
  if (!this.shortCode) {
    this.shortCode = await generateShortCode(this.constructor);
  }
  next();
});

module.exports = mongoose.model('Community', CommunitySchema);
