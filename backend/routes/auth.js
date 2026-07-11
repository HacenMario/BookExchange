const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, city, address } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: '❌ البريد مستخدم' });
    const user = new User({ name, email, password, phone, city, address });
    await user.save();
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, phone: user.phone, city: user.city, points: user.points }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: '❌ بيانات غير صحيحة' });
    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(400).json({ message: '❌ بيانات غير صحيحة' });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, phone: user.phone, city: user.city, points: user.points }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/change-password', auth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: '❌ غير موجود' });
    const isMatch = await user.matchPassword(oldPassword);
    if (!isMatch) return res.status(400).json({ message: '❌ كلمة المرور الحالية غير صحيحة' });
    user.password = newPassword;
    await user.save();
    res.json({ message: '✅ تم تغيير كلمة المرور' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;