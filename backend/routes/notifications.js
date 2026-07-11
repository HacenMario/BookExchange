const express = require('express');
const auth = require('../middleware/auth');
const Notification = require('../models/Notification');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(50);
    const unreadCount = await Notification.countDocuments({ userId: req.userId, read: false });
    res.json({ notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOne({ _id: req.params.id, userId: req.userId });
    if (!notification) return res.status(404).json({ message: 'غير موجود' });
    notification.read = true;
    await notification.save();
    res.json({ message: 'تم التحديث' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.userId, read: false }, { read: true });
    res.json({ message: 'تم تحديد الكل كمقروء' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;