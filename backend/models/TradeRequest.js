const mongoose = require('mongoose');

const TradeRequestSchema = new mongoose.Schema({
  requestedBook: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  offeredBook: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'completed', 'cancelled'],
    default: 'pending',
    index: true,
  },
  message: { type: String, maxlength: 500, default: '' },
  completedAt: { type: Date },
  reviewGiven: { type: Boolean, default: false },
  requesterRating: { type: Number, min: 1, max: 5 },
  ownerRating: { type: Number, min: 1, max: 5 },
  requesterReview: { type: String, default: '' },
  ownerReview: { type: String, default: '' },
  meetingLocation: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('TradeRequest', TradeRequestSchema);