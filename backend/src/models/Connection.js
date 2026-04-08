const mongoose = require('mongoose');

const connectionSchema = new mongoose.Schema({
  _id: { type: String, default: () => require('uuid').v4() },
  requesterId: { type: String, required: true, ref: 'User' },
  addresseeId: { type: String, required: true, ref: 'User' },
  status: { type: String, default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

connectionSchema.index({ requesterId: 1, addresseeId: 1 }, { unique: true });
connectionSchema.index({ addresseeId: 1, status: 1 }); // for pending requests lookup
connectionSchema.index({ requesterId: 1, status: 1 });

module.exports = mongoose.model('Connection', connectionSchema);
