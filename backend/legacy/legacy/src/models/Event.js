const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  _id: { type: String, default: () => require('uuid').v4() },
  communityId: { type: String, ref: 'Community' },
  creatorId: { type: String, required: true, ref: 'User' },
  title: { type: String, required: true },
  datetime: { type: String, required: true },
  guidelines: String,
  routePoints: { type: [Object], default: [] },
  venueName: String,
  venueCoords: Object,
  shortCode: { type: String, unique: true, sparse: true }, // 5-digit uppercase alphanumeric
  status: { type: String, default: 'active', enum: ['active', 'cancelled', 'completed'] },
  createdAt: { type: Date, default: Date.now }
});

// Helper to generate a unique 5-digit uppercase alphanumeric code
async function generateShortCode(model) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let isUnique = false;
  let code = '';
  while (!isUnique) {
    code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const existing = await model.findOne({ shortCode: code });
    if (!existing) isUnique = true;
  }
  return code;
}

eventSchema.pre('save', async function (next) {
  if (!this.shortCode) {
    this.shortCode = await generateShortCode(this.constructor);
  }
  next();
});

module.exports = mongoose.model('Event', eventSchema);

