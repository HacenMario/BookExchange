const express = require('express');
const auth = require('../middleware/auth');
const Message = require('../models/Message');
const TradeRequest = require('../models/TradeRequest');
const Notification = require('../models/Notification');
const router = express.Router();

// ============================================================
// إرسال رسالة
// ============================================================
router.post('/', auth, async (req, res) => {
  try {
    const { tradeId, content } = req.body;
    const trade = await TradeRequest.findById(tradeId);
    if (!trade) return res.status(404).json({ message: '❌ غير موجود' });
    if (trade.requester.toString() !== req.userId && trade.owner.toString() !== req.userId) {
      return res.status(403).json({ message: '❌ غير مصرح' });
    }
    const receiver = trade.requester.toString() === req.userId ? trade.owner : trade.requester;
    const message = new Message({ tradeId, sender: req.userId, receiver, content });
    await message.save();
    const notification = new Notification({
      userId: receiver,
      title: '💬 رسالة جديدة',
      message: `رسالة من ${req.userId} في طلب التبادل`,
      type: 'message',
      link: `/trades/${tradeId}`
    });
    await notification.save();
    const io = req.app.get('io');
    io.to(`trade-${tradeId}`).emit('new-message', {
      tradeId,
      senderId: req.userId,
      content,
      timestamp: message.createdAt,
    });
    io.to(`user-${receiver}`).emit('trade-notification', {
      title: '💬 رسالة جديدة',
      message: `رسالة من ${req.userId}`,
      tradeId,
    });
    res.status(201).json({ message: '✅ تم الإرسال', message });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================================
// جلب رسائل محادثة
// ============================================================
router.get('/:tradeId', auth, async (req, res) => {
  try {
    const trade = await TradeRequest.findById(req.params.tradeId);
    if (!trade) return res.status(404).json({ message: '❌ غير موجود' });
    if (trade.requester.toString() !== req.userId && trade.owner.toString() !== req.userId) {
      return res.status(403).json({ message: '❌ غير مصرح' });
    }
    const messages = await Message.find({ tradeId: req.params.tradeId })
      .populate('sender', 'name')
      .sort({ createdAt: 1 });
    await Message.updateMany({ tradeId: req.params.tradeId, receiver: req.userId, isRead: false }, { isRead: true });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;