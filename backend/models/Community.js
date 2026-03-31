const mongoose = require('mongoose');

const CommunitySchema = new mongoose.Schema({
  _id: String,
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  type: {
    type: String,
    enum: ['community', 'group', 'forum'],
    default: 'community'
  },
  maxMembers: {
    type: Number,
    default: 100
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Community', CommunitySchema);
