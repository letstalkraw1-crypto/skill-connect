const mongoose = require('mongoose');

const eventRsvpSchema = new mongoose.Schema({
  _id: { type: String, default: () => require('uuid').v4() },
  eventId: { type: String, required: true, ref: 'Event' },
  userId: { type: String, required: true, ref: 'User' },
  status: { type: String, required: true, enum: ['pending', 'accepted', 'rejected'] },
  rsvpName: { type: String },
  rsvpPhone: { type: String },
  paymentId: { type: String },   // Razorpay payment ID
  orderId: { type: String },     // Razorpay order ID
  createdAt: { type: Date, default: Date.now }
});

eventRsvpSchema.index({ eventId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('EventRsvp', eventRsvpSchema);
