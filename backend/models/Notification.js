const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false, index: true },
  type: {
    type: String,
    enum: ['trade', 'message', 'system', 'achievement', 'point'],
    default: 'system',
  },
  link: { type: String, default: '' },
  icon: { type: String, default: '📚' },
}, { timestamps: true });

module.exports = mongoose.model('Notification', NotificationSchema);