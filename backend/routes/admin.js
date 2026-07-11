const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Book = require('../models/Book');
const TradeRequest = require('../models/TradeRequest');
const Notification = require('../models/Notification');
const router = express.Router();

// وسيط المصادقة للمدير
const adminAuth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'غير مصرح' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_ADMIN_SECRET);
    req.adminId = decoded.id;
    next();
  } catch {
    res.status(401).json({ message: 'توكن غير صالح' });
  }
};

// ============================================================
// الإحصائيات العامة
// ============================================================
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ isActive: true });
    const totalBooks = await Book.countDocuments({ isAvailable: true });
    const totalTrades = await TradeRequest.countDocuments();
    const completedTrades = await TradeRequest.countDocuments({ status: 'completed' });
    const pendingTrades = await TradeRequest.countDocuments({ status: 'pending' });
    const totalPoints = await User.aggregate([{ $group: { _id: null, total: { $sum: '$points' } } }]);
    res.json({
      totalUsers,
      totalBooks,
      totalTrades,
      completedTrades,
      pendingTrades,
      totalPoints: totalPoints[0]?.total || 0,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================================
// إدارة المستخدمين
// ============================================================
router.get('/users', adminAuth, async (req, res) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 });
  res.json(users);
});

router.put('/users/:id/toggle', adminAuth, async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'غير موجود' });
  user.isActive = !user.isActive;
  await user.save();
  res.json({ message: `✅ تم ${user.isActive ? 'تفعيل' : 'تعطيل'} المستخدم` });
});

router.delete('/users/:id', adminAuth, async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'غير موجود' });
  await Book.deleteMany({ owner: user._id });
  await TradeRequest.deleteMany({ $or: [{ requester: user._id }, { owner: user._id }] });
  await Notification.deleteMany({ userId: user._id });
  await user.deleteOne();
  res.json({ message: '✅ تم حذف المستخدم' });
});

// ============================================================
// إدارة الكتب
// ============================================================
router.get('/books', adminAuth, async (req, res) => {
  const books = await Book.find().populate('owner', 'name').sort({ createdAt: -1 });
  res.json(books);
});

router.delete('/books/:id', adminAuth, async (req, res) => {
  const book = await Book.findById(req.params.id);
  if (!book) return res.status(404).json({ message: 'غير موجود' });
  await book.deleteOne();
  res.json({ message: '✅ تم حذف الكتاب' });
});

// ============================================================
// إدارة التبادلات
// ============================================================
router.get('/trades', adminAuth, async (req, res) => {
  const trades = await TradeRequest.find()
    .populate('requestedBook offeredBook', 'title')
    .populate('requester owner', 'name')
    .sort({ createdAt: -1 });
  res.json(trades);
});

router.put('/trades/:id/resolve', adminAuth, async (req, res) => {
  const { status } = req.body;
  const trade = await TradeRequest.findById(req.params.id);
  if (!trade) return res.status(404).json({ message: 'غير موجود' });
  if (!['completed', 'cancelled'].includes(status)) {
    return res.status(400).json({ message: 'حالة غير صالحة' });
  }
  trade.status = status;
  if (status === 'completed') trade.completedAt = new Date();
  await trade.save();
  res.json({ message: `✅ تم ${status === 'completed' ? 'إكمال' : 'إلغاء'} التبادل` });
});

// ============================================================
// توليد توكن مدير (لتسجيل الدخول)
// ============================================================
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  // مدير افتراضي – يمكنك تغييره
  if (email === 'admin@bookexchange.dz' && password === 'Admin1234') {
    const token = jwt.sign({ id: 'admin' }, process.env.JWT_ADMIN_SECRET, { expiresIn: '30d' });
    res.json({ token, name: 'مدير النظام' });
  } else {
    res.status(401).json({ message: 'بيانات غير صحيحة' });
  }
});

module.exports = router;
