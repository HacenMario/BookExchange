const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Point = require('../models/Point');
const router = express.Router();

// ============================================================
// جلب نقاط المستخدم
// ============================================================
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: '❌ غير موجود' });
    const points = await Point.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(20);
    res.json({ total: user.points, history: points });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============================================================
// جلب إنجازات المستخدم
// ============================================================
router.get('/achievements', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: '❌ غير موجود' });
    res.json({ achievements: user.achievements || [] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;