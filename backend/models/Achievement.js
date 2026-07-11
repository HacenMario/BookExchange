const mongoose = require('mongoose');

const AchievementSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  icon: { type: String, default: '🏆' },
  points: { type: Number, default: 10 },
  condition: { type: String, required: true }, // trade_count, review_count, etc.
  threshold: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Achievement', AchievementSchema);
