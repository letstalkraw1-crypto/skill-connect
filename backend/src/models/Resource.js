const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
  _id: { type: String, default: () => require('uuid').v4() },
  userId: { type: String, required: true, ref: 'User' },
  title: { type: String, required: true },
  description: String,
  type: { type: String, required: true },
  url: String,
  category: String,
  skillId: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill' },
  price: { type: Number, default: 0 }, // 0 = free
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Resource', resourceSchema);
