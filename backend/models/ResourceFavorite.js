const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const resourceFavoriteSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  userId: { type: String, required: true, ref: 'User' },
  resourceId: { type: String, required: true, ref: 'Resource' },
  createdAt: { type: Date, default: Date.now }
});

resourceFavoriteSchema.index({ userId: 1, resourceId: 1 }, { unique: true });

module.exports = mongoose.model('ResourceFavorite', resourceFavoriteSchema);
