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

module.exports = mongoose.model('Event', eventSchema);
