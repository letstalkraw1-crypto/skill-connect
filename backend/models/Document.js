const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  _id: { type: String, default: () => require('uuid').v4() },
  skillId: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill' },
  title: { type: String, required: true },
  content: { type: String, required: true },
  version: { type: Number, default: 1 },
  authorId: { type: String, required: true, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Document', documentSchema);
