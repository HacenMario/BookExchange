const mongoose = require('mongoose');

const PointSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  amount: { type: Number, required: true },
  type: {
    type: String,
    enum: ['earned', 'spent', 'bonus', 'trade', 'review', 'achievement'],
    default: 'earned',
  },
  description: { type: String, default: '' },
  sourceId: { type: mongoose.Schema.Types.ObjectId },
  sourceType: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Point', PointSchema);