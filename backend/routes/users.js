const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Book = require('../models/Book');
const TradeRequest = require('../models/TradeRequest');
const Notification = require('../models/Notification');
const router = express.Router();

// ============================================================
// 📌 المسارات الثابتة (يجب أن تكون قبل المسارات الديناميكية)
// ============================================================

// جلب عدد المستخدمين
router.get('/count', async (req, res) => {
    try {
        const count = await User.countDocuments();
        res.json({ count });
    } catch (error) {
        console.error('❌ خطأ في جلب عدد المستخدمين:', error);
        res.status(500).json({ message: error.message });
    }
});

// البحث عن القراء القريبين (حسب الموقع)
router.get('/nearby', async (req, res) => {
    try {
        const { lat, lng, radius = 30 } = req.query;
        const token = req.headers.authorization?.split(' ')[1];
        let userId = null;
        
        // محاولة استخراج userId من التوكن إذا كان موجوداً
        if (token) {
            try {
                const jwt = require('jsonwebtoken');
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
                userId = decoded.userId || decoded.id;
            } catch (e) {}
        }

        // بناء استعلام البحث
        const query = {};
        if (userId) {
            query._id = { $ne: userId };
        }

        // إذا لم يتم إرسال إحداثيات، نعيد جميع المستخدمين بترتيب عشوائي
        if (!lat || !lng) {
            const users = await User.find(query)
                .select('_id name email phone city address rating profileImage booksCount lat lng')
                .limit(50);
            
            // إضافة مسافة عشوائية للتصنيف
            const result = users.map(u => ({
                ...u._doc,
                distance: parseFloat((Math.random() * 50 + 1).toFixed(1))
            }));
            // ترتيب عشوائي
            result.sort(() => Math.random() - 0.5);
            return res.json(result);
        }

        // البحث عن المستخدمين الذين لديهم إحداثيات (إذا كان النموذج يدعمها)
        // وإلا نعيد جميع المستخدمين مع مسافة عشوائية
        const users = await User.find(query)
            .select('_id name email phone city address rating profileImage booksCount lat lng')
            .limit(50);

        // حساب مسافة تقريبية (إذا كانت الإحداثيات موجودة)
        const usersWithDistance = users.map(u => {
            let distance = 0;
            if (u.lat && u.lng) {
                // حساب المسافة باستخدام صيغة هافرسين (تقريبية)
                const R = 6371; // نصف قطر الأرض بالكيلومتر
                const dLat = (parseFloat(u.lat) - parseFloat(lat)) * Math.PI / 180;
                const dLng = (parseFloat(u.lng) - parseFloat(lng)) * Math.PI / 180;
                const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                          Math.cos(parseFloat(lat) * Math.PI / 180) * Math.cos(parseFloat(u.lat) * Math.PI / 180) *
                          Math.sin(dLng/2) * Math.sin(dLng/2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                distance = R * c;
            } else {
                distance = parseFloat((Math.random() * 20 + 1).toFixed(1));
            }
            return {
                ...u._doc,
                distance: parseFloat(distance.toFixed(1))
            };
        });

        // ترتيب حسب المسافة (الأقرب أولاً)
        usersWithDistance.sort((a, b) => a.distance - b.distance);
        
        // إرجاع أول 20 مستخدم
        res.json(usersWithDistance.slice(0, 20));
    } catch (error) {
        console.error('❌ خطأ في البحث عن القريبين:', error);
        res.status(500).json({ 
            message: '❌ حدث خطأ أثناء البحث عن القراء القريبين',
            error: error.message 
        });
    }
});

// البحث عن المستخدمين حسب المدينة
router.get('/', async (req, res) => {
    try {
        const { city } = req.query;
        if (!city) {
            return res.status(400).json({ message: '❌ يرجى إدخال اسم المدينة' });
        }

        const token = req.headers.authorization?.split(' ')[1];
        let userId = null;
        if (token) {
            try {
                const jwt = require('jsonwebtoken');
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
                userId = decoded.userId || decoded.id;
            } catch (e) {}
        }

        const query = {
            city: { $regex: new RegExp(city, 'i') }
        };
        if (userId) {
            query._id = { $ne: userId };
        }

        const users = await User.find(query)
            .select('_id name email phone city address rating profileImage booksCount');

        res.json(users);
    } catch (error) {
        console.error('❌ خطأ في البحث حسب المدينة:', error);
        res.status(500).json({ 
            message: '❌ حدث خطأ أثناء البحث حسب المدينة',
            error: error.message 
        });
    }
});

// جلب الملف الشخصي للمستخدم الحالي
router.get('/profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.userId)
            .select('-password -__v');
        if (!user) {
            return res.status(404).json({ message: '❌ المستخدم غير موجود' });
        }
        
        // جلب عدد كتب المستخدم
        const booksCount = await Book.countDocuments({ 
            owner: req.userId, 
            isAvailable: true 
        });
        
        // جلب عدد الطلبات المعلقة
        const pendingTrades = await TradeRequest.countDocuments({
            $or: [{ requester: req.userId }, { owner: req.userId }],
            status: 'pending'
        });

        res.json({
            ...user._doc,
            booksCount,
            pendingTrades
        });
    } catch (error) {
        console.error('❌ خطأ في جلب الملف الشخصي:', error);
        res.status(500).json({ message: error.message });
    }
});

// جلب نقاط المستخدم الحالي
router.get('/me/points', auth, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('points');
        if (!user) {
            return res.status(404).json({ message: '❌ المستخدم غير موجود' });
        }
        res.json({ points: user.points || 0 });
    } catch (error) {
        console.error('❌ خطأ في جلب النقاط:', error);
        res.status(500).json({ message: error.message });
    }
});

// تحديث الملف الشخصي
router.put('/profile', auth, async (req, res) => {
    try {
        const { name, phone, city, address, bio, lat, lng } = req.body;
        const updateData = {};
        if (name) updateData.name = name;
        if (phone) updateData.phone = phone;
        if (city) updateData.city = city;
        if (address !== undefined) updateData.address = address;
        if (bio !== undefined) updateData.bio = bio;
        if (lat !== undefined && lng !== undefined) {
            updateData.lat = parseFloat(lat);
            updateData.lng = parseFloat(lng);
        }

        const user = await User.findByIdAndUpdate(req.userId, updateData, { 
            new: true,
            runValidators: true
        }).select('-password -__v');
        
        if (!user) {
            return res.status(404).json({ message: '❌ المستخدم غير موجود' });
        }
        
        res.json({ message: '✅ تم تحديث الملف الشخصي', user });
    } catch (error) {
        console.error('❌ خطأ في تحديث الملف الشخصي:', error);
        res.status(500).json({ message: error.message });
    }
});

// تغيير كلمة المرور
router.put('/change-password', auth, async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        
        if (!oldPassword || !newPassword) {
            return res.status(400).json({ message: '❌ يرجى إدخال كلمة المرور الحالية والجديدة' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ message: '❌ كلمة المرور الجديدة يجب أن لا تقل عن 6 أحرف' });
        }

        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ message: '❌ المستخدم غير موجود' });
        }

        // التحقق من كلمة المرور الحالية (باستخدام bcrypt)
        const bcrypt = require('bcryptjs');
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: '❌ كلمة المرور الحالية غير صحيحة' });
        }

        // تشفير كلمة المرور الجديدة
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({ message: '✅ تم تغيير كلمة المرور بنجاح' });
    } catch (error) {
        console.error('❌ خطأ في تغيير كلمة المرور:', error);
        res.status(500).json({ message: error.message });
    }
});

// حذف الحساب
router.delete('/me', auth, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ message: '❌ المستخدم غير موجود' });
        }

        // حذف جميع كتب المستخدم
        await Book.deleteMany({ owner: req.userId });
        
        // حذف جميع طلبات التبادل التي تخص المستخدم
        await TradeRequest.deleteMany({
            $or: [{ requester: req.userId }, { owner: req.userId }]
        });
        
        // حذف جميع الإشعارات
        await Notification.deleteMany({ userId: req.userId });
        
        // حذف المستخدم
        await User.findByIdAndDelete(req.userId);

        res.json({ message: '✅ تم حذف الحساب وجميع بياناته' });
    } catch (error) {
        console.error('❌ خطأ في حذف الحساب:', error);
        res.status(500).json({ message: error.message });
    }
});

// ============================================================
// 📌 المسارات الديناميكية (تأتي في النهاية)
// ============================================================

// جلب مستخدم بواسطة ID مع كتبه
router.get('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select('-password -__v');
        if (!user) {
            return res.status(404).json({ message: '❌ المستخدم غير موجود' });
        }
        
        const books = await Book.find({ 
            owner: req.params.id, 
            isAvailable: true 
        }).select('title author category condition coverImage');
        
        res.json({ 
            ...user._doc, 
            books 
        });
    } catch (error) {
        console.error('❌ خطأ في جلب المستخدم:', error);
        res.status(500).json({ message: error.message });
    }
});

// حذف مستخدم (للإداريين فقط)
router.delete('/:id', auth, async (req, res) => {
    try {
        // التحقق من صلاحيات المدير
        const admin = await User.findById(req.userId);
        if (!admin || !admin.isAdmin) {
            return res.status(403).json({ message: '❌ غير مصرح: يجب أن تكون مديراً' });
        }

        // منع حذف المدير نفسه
        if (req.params.id === req.userId) {
            return res.status(400).json({ message: '❌ لا يمكن حذف حساب المدير نفسه' });
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: '❌ المستخدم غير موجود' });
        }

        // حذف جميع بيانات المستخدم
        await Book.deleteMany({ owner: req.params.id });
        await TradeRequest.deleteMany({
            $or: [{ requester: req.params.id }, { owner: req.params.id }]
        });
        await Notification.deleteMany({ userId: req.params.id });
        await User.findByIdAndDelete(req.params.id);

        res.json({ message: `✅ تم حذف المستخدم ${user.name} وجميع بياناته` });
    } catch (error) {
        console.error('❌ خطأ في حذف المستخدم:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;