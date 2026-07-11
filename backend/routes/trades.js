const express = require('express');
const auth = require('../middleware/auth');
const TradeRequest = require('../models/TradeRequest');
const Book = require('../models/Book');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Point = require('../models/Point');
const router = express.Router();

// ============================================================
// إنشاء طلب تبادل
// ============================================================
router.post('/', auth, async (req, res) => {
    try {
        const { requestedBookId, offeredBookId, message } = req.body;
        const requestedBook = await Book.findById(requestedBookId);
        if (!requestedBook || !requestedBook.isAvailable) {
            return res.status(400).json({ message: '❌ الكتاب غير متاح' });
        }
        const offeredBook = await Book.findById(offeredBookId);
        if (!offeredBook || !offeredBook.isAvailable) {
            return res.status(400).json({ message: '❌ الكتاب المعروض غير متاح' });
        }
        if (offeredBook.owner.toString() !== req.userId) {
            return res.status(403).json({ message: '❌ هذا الكتاب ليس ملكك' });
        }
        if (requestedBook.owner.toString() === req.userId) {
            return res.status(400).json({ message: '❌ لا يمكنك طلب كتابك' });
        }
        const existing = await TradeRequest.findOne({
            requestedBook: requestedBookId,
            requester: req.userId,
            status: { $in: ['pending', 'accepted'] }
        });
        if (existing) {
            return res.status(409).json({ message: '❌ لديك طلب مسبق' });
        }
        const trade = new TradeRequest({
            requestedBook: requestedBookId,
            offeredBook: offeredBookId,
            requester: req.userId,
            owner: requestedBook.owner,
            message: message || ''
        });
        await trade.save();

        const notification = new Notification({
            userId: requestedBook.owner,
            title: '📚 طلب تبادل جديد',
            message: `${req.userId} طلب تبادل كتاب "${requestedBook.title}"`,
            type: 'trade',
            link: `/trades/${trade._id}`
        });
        await notification.save();

        const io = req.app.get('io');
        const requester = await User.findById(req.userId);
        io.to(`user-${requestedBook.owner}`).emit('trade-notification', {
            title: '📚 طلب تبادل جديد',
            message: `${requester.name} طلب تبادل كتاب "${requestedBook.title}"`,
            tradeId: trade._id,
            link: `/trades/${trade._id}`
        });

        res.status(201).json({ message: '✅ تم إرسال الطلب', trade });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ============================================================
// جلب طلبات المستخدم
// ============================================================
router.get('/my', auth, async (req, res) => {
    try {
        const trades = await TradeRequest.find({
            $or: [{ requester: req.userId }, { owner: req.userId }]
        })
            .populate('requestedBook offeredBook', 'title author coverImage')
            .populate('requester owner', 'name city rating')
            .sort({ createdAt: -1 });
        res.json(trades);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ============================================================
// قبول الطلب
// ============================================================
router.put('/:id/accept', auth, async (req, res) => {
    try {
        const trade = await TradeRequest.findById(req.params.id).populate('requestedBook offeredBook');
        if (!trade) return res.status(404).json({ message: '❌ غير موجود' });
        if (trade.owner.toString() !== req.userId) {
            return res.status(403).json({ message: '❌ غير مصرح' });
        }
        if (trade.status !== 'pending') {
            return res.status(400).json({ message: '❌ تم التعامل معه' });
        }
        if (!trade.requestedBook.isAvailable || !trade.offeredBook.isAvailable) {
            return res.status(400).json({ message: '❌ أحد الكتب غير متاح' });
        }

        trade.status = 'accepted';
        await trade.save();

        trade.requestedBook.isAvailable = false;
        await trade.requestedBook.save();
        trade.offeredBook.isAvailable = false;
        await trade.offeredBook.save();

        const notification = new Notification({
            userId: trade.requester,
            title: '✅ تم قبول طلب التبادل',
            message: `تم قبول طلب تبادل كتاب "${trade.requestedBook.title}"`,
            type: 'trade',
            link: `/trades/${trade._id}`
        });
        await notification.save();

        const io = req.app.get('io');
        io.to(`user-${trade.requester}`).emit('trade-notification', {
            title: '✅ تم قبول طلب التبادل',
            message: `تم قبول طلب تبادل كتاب "${trade.requestedBook.title}"`,
            tradeId: trade._id,
            link: `/trades/${trade._id}`
        });

        res.json({ message: '✅ تم القبول', trade });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ============================================================
// رفض الطلب
// ============================================================
router.put('/:id/reject', auth, async (req, res) => {
    try {
        const trade = await TradeRequest.findById(req.params.id);
        if (!trade) return res.status(404).json({ message: '❌ غير موجود' });
        if (trade.owner.toString() !== req.userId) {
            return res.status(403).json({ message: '❌ غير مصرح' });
        }
        if (trade.status !== 'pending') {
            return res.status(400).json({ message: '❌ تم التعامل معه' });
        }

        trade.status = 'rejected';
        await trade.save();

        const notification = new Notification({
            userId: trade.requester,
            title: '❌ تم رفض طلب التبادل',
            message: 'تم رفض طلب تبادل كتاب',
            type: 'trade'
        });
        await notification.save();

        const io = req.app.get('io');
        io.to(`user-${trade.requester}`).emit('trade-notification', {
            title: '❌ تم رفض طلب التبادل',
            message: 'تم رفض طلب تبادل كتاب',
            tradeId: trade._id
        });

        res.json({ message: '✅ تم الرفض', trade });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ============================================================
// إلغاء الطلب
// ============================================================
router.put('/:id/cancel', auth, async (req, res) => {
    try {
        const trade = await TradeRequest.findById(req.params.id);
        if (!trade) return res.status(404).json({ message: '❌ غير موجود' });
        if (trade.requester.toString() !== req.userId) {
            return res.status(403).json({ message: '❌ غير مصرح' });
        }
        if (trade.status === 'completed' || trade.status === 'cancelled') {
            return res.status(400).json({ message: '❌ لا يمكن الإلغاء' });
        }

        if (trade.status === 'accepted') {
            const requestedBook = await Book.findById(trade.requestedBook);
            const offeredBook = await Book.findById(trade.offeredBook);
            if (requestedBook) {
                requestedBook.isAvailable = true;
                await requestedBook.save();
            }
            if (offeredBook) {
                offeredBook.isAvailable = true;
                await offeredBook.save();
            }
        }

        trade.status = 'cancelled';
        await trade.save();

        res.json({ message: '✅ تم الإلغاء', trade });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ============================================================
// إكمال التبادل (مع نقاط وإنجازات)
// ============================================================
router.put('/:id/complete', auth, async (req, res) => {
    try {
        const trade = await TradeRequest.findById(req.params.id).populate('requestedBook offeredBook');
        if (!trade) return res.status(404).json({ message: '❌ غير موجود' });
        if (trade.requester.toString() !== req.userId && trade.owner.toString() !== req.userId) {
            return res.status(403).json({ message: '❌ غير مصرح' });
        }
        if (trade.status !== 'accepted') {
            return res.status(400).json({ message: '❌ لا يمكن الإكمال' });
        }

        trade.status = 'completed';
        trade.completedAt = new Date();
        await trade.save();

        // تبديل المالكين
        const tempOwner = trade.requestedBook.owner;
        trade.requestedBook.owner = trade.offeredBook.owner;
        trade.offeredBook.owner = tempOwner;
        trade.requestedBook.isAvailable = true;
        trade.offeredBook.isAvailable = true;
        await trade.requestedBook.save();
        await trade.offeredBook.save();

        // إضافة نقاط للمستخدمين
        const requester = await User.findById(trade.requester);
        const owner = await User.findById(trade.owner);

        await requester.addPoints(20);
        await owner.addPoints(20);

        requester.totalTrades += 1;
        owner.totalTrades += 1;
        await requester.save();
        await owner.save();

        await Point.create({
            userId: trade.requester,
            amount: 20,
            type: 'trade',
            description: `تبادل كتاب "${trade.requestedBook.title}"`
        });
        await Point.create({
            userId: trade.owner,
            amount: 20,
            type: 'trade',
            description: `تبادل كتاب "${trade.requestedBook.title}"`
        });

        await checkAchievements(trade.requester);
        await checkAchievements(trade.owner);

        const notification = new Notification({
            userId: trade.requester,
            title: '✅ تم إكمال التبادل',
            message: `تم إكمال تبادل كتاب "${trade.requestedBook.title}" +20 نقطة`,
            type: 'trade',
            link: `/trades/${trade._id}`
        });
        await notification.save();

        const notification2 = new Notification({
            userId: trade.owner,
            title: '✅ تم إكمال التبادل',
            message: `تم إكمال تبادل كتاب "${trade.requestedBook.title}" +20 نقطة`,
            type: 'trade',
            link: `/trades/${trade._id}`
        });
        await notification2.save();

        const io = req.app.get('io');
        io.to(`user-${trade.requester}`).emit('trade-notification', {
            title: '✅ تم إكمال التبادل',
            message: '+20 نقطة',
            tradeId: trade._id
        });
        io.to(`user-${trade.owner}`).emit('trade-notification', {
            title: '✅ تم إكمال التبادل',
            message: '+20 نقطة',
            tradeId: trade._id
        });

        res.json({ message: '✅ تم إكمال التبادل', trade });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ============================================================
// تقييم التبادل
// ============================================================
router.post('/:id/review', auth, async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const trade = await TradeRequest.findById(req.params.id);
        if (!trade) return res.status(404).json({ message: '❌ غير موجود' });
        if (trade.status !== 'completed') {
            return res.status(400).json({ message: '❌ يجب إكمال التبادل أولاً' });
        }

        const isRequester = trade.requester.toString() === req.userId;
        const isOwner = trade.owner.toString() === req.userId;
        if (!isRequester && !isOwner) {
            return res.status(403).json({ message: '❌ غير مصرح' });
        }

        const targetUserId = isRequester ? trade.owner : trade.requester;
        const targetUser = await User.findById(targetUserId);
        if (!targetUser) return res.status(404).json({ message: '❌ المستخدم غير موجود' });

        const totalReviews = targetUser.totalReviews + 1;
        const newRating = ((targetUser.rating * targetUser.totalReviews) + rating) / totalReviews;
        targetUser.rating = Math.round(newRating * 10) / 10;
        targetUser.totalReviews = totalReviews;
        await targetUser.save();

        if (isRequester) {
            trade.requesterRating = rating;
            trade.requesterReview = comment || '';
        } else {
            trade.ownerRating = rating;
            trade.ownerReview = comment || '';
        }
        trade.reviewGiven = true;
        await trade.save();

        await targetUser.addPoints(5);
        await Point.create({
            userId: targetUserId,
            amount: 5,
            type: 'review',
            description: 'تقييم تبادل'
        });

        res.json({ message: '✅ تم إضافة التقييم' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ============================================================
// عدد التبادلات المكتملة
// ============================================================
router.get('/count', async (req, res) => {
    try {
        const count = await TradeRequest.countDocuments({ status: 'completed' });
        res.json({ count });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ============================================================
// وظائف مساعدة للإنجازات
// ============================================================
async function checkAchievements(userId) {
    const user = await User.findById(userId);
    if (!user) return;

    const booksCount = await Book.countDocuments({ owner: userId });

    const achievements = {
        'أول تبادل': { condition: user.totalTrades >= 1, points: 10 },
        'خمس تبادلات': { condition: user.totalTrades >= 5, points: 25 },
        'عشرة تبادلات': { condition: user.totalTrades >= 10, points: 50 },
        'خمسون تبادل': { condition: user.totalTrades >= 50, points: 100 },
        'نجم التبادل': { condition: user.totalTrades >= 100, points: 200 },
        '📚 قارئ نهم': { condition: booksCount >= 10, points: 30 },
        '📚 أمين المكتبة': { condition: booksCount >= 25, points: 60 },
        '🤝 سفير التبادل': { condition: user.totalTrades >= 20, points: 50 }
    };

    const io = require('socket.io')().of('/');

    for (const [name, data] of Object.entries(achievements)) {
        if (data.condition && !user.achievements.includes(name)) {
            user.achievements.push(name);
            await user.addPoints(data.points);

            await Point.create({
                userId,
                amount: data.points,
                type: 'achievement',
                description: `تحقيق: ${name}`
            });

            const notification = new Notification({
                userId,
                title: `🏆 إنجاز جديد: ${name}`,
                message: `حصلت على ${data.points} نقطة إضافية!`,
                type: 'achievement',
                icon: '🏆'
            });
            await notification.save();

            io.to(`user-${userId}`).emit('achievement-notification', {
                title: `🏆 إنجاز جديد: ${name}`,
                message: `+${data.points} نقطة`,
                link: '/profile'
            });
        }
    }
}

module.exports = router;