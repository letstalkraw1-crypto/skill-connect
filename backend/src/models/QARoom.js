const mongoose = require('mongoose');

const qaRoomSchema = new mongoose.Schema({
  _id: { type: String, default: () => require('uuid').v4() },
  hostId: { type: String, required: true, ref: 'User' },
  skillId: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill' },
  title: { type: String, required: true },
  scheduledAt: Date,
  status: { type: String, default: 'scheduled' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('QARoom', qaRoomSchema);
