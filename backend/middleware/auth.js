const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: '❌ غير مصرح، يرجى تسجيل الدخول' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (error) {
    console.error('❌ خطأ في التحقق من التوكن:', error);
    return res.status(401).json({ message: '❌ توكن غير صالح' });
  }
};
