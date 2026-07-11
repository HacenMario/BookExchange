const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Point = require('../models/Point');
const auth = require('../middleware/auth');

// ============================================================
// جلب لوحة المتصدرين (الكل)
// ============================================================
router.get('/', async (req, res) => {
    try {
        const users = await User.find()
            .select('name email city rating points achievements totalTrades profileImage level')
            .sort({ points: -1 })
            .limit(10);

        const rankedUsers = users.map((user, index) => ({
            rank: index + 1,
            ...user._doc
        }));

        res.json(rankedUsers);
    } catch (error) {
        console.error('❌ خطأ في جلب المتصدرين:', error);
        res.status(500).json({ message: error.message });
    }
});

// ============================================================
// جلب لوحة المتصدرين الشهرية (نقاط هذا الشهر فقط)
// ============================================================
router.get('/monthly', async (req, res) => {
    try {
        // جلب أول يوم من الشهر الحالي
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        // جلب نقاط هذا الشهر لكل مستخدم
        const monthlyPoints = await Point.aggregate([
            {
                $match: {
                    createdAt: { $gte: startOfMonth },
                    type: { $in: ['trade', 'achievement', 'review'] }
                }
            },
            {
                $group: {
                    _id: '$userId',
                    totalPoints: { $sum: '$amount' }
                }
            },
            {
                $sort: { totalPoints: -1 }
            },
            {
                $limit: 10
            }
        ]);

        // جلب معلومات المستخدمين
        const userIds = monthlyPoints.map(p => p._id);
        const users = await User.find({ _id: { $in: userIds } })
            .select('name email city rating points achievements totalTrades profileImage level');

        // دمج البيانات مع الترتيب
        const result = monthlyPoints.map((p, index) => {
            const user = users.find(u => u._id.toString() === p._id.toString());
            return {
                rank: index + 1,
                ...user._doc,
                monthlyPoints: p.totalPoints
            };
        });

        res.json(result);
    } catch (error) {
        console.error('❌ خطأ في جلب المتصدرين الشهريين:', error);
        res.status(500).json({ message: error.message });
    }
});

// ============================================================
// جلب ترتيب المستخدم الحالي
// ============================================================
router.get('/my-rank', auth, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ message: '❌ المستخدم غير موجود' });
        }

        const count = await User.countDocuments({ points: { $gt: user.points } });
        const rank = count + 1;

        // جلب نقاط المستخدم في هذا الشهر
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const monthlyPoints = await Point.aggregate([
            {
                $match: {
                    userId: user._id,
                    createdAt: { $gte: startOfMonth },
                    type: { $in: ['trade', 'achievement', 'review'] }
                }
            },
            {
                $group: {
                    _id: '$userId',
                    total: { $sum: '$amount' }
                }
            }
        ]);

        const monthlyTotal = monthlyPoints.length > 0 ? monthlyPoints[0].total : 0;

        res.json({
            rank: rank,
            points: user.points,
            name: user.name,
            level: user.level || 'برونز',
            monthlyPoints: monthlyTotal
        });
    } catch (error) {
        console.error('❌ خطأ في جلب ترتيب المستخدم:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;