const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

dotenv.config();

// ============================================================
// 1. تعريف app أولاً (قبل أي use)
// ============================================================
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    pingTimeout: 60000,
});

// ============================================================
// 2. Middleware (بعد تعريف app)
// ============================================================
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================
// 3. خدمة الملفات الثابتة (Frontend)
// ============================================================
app.use(express.static(path.join(__dirname, '../frontend')));

// ============================================================
// 4. Socket.io
// ============================================================
const onlineUsers = new Map();

io.on('connection', (socket) => {
    console.log('📚 قارئ متصل:', socket.id);

    socket.on('user-online', (userId) => {
        onlineUsers.set(userId, socket.id);
        socket.userId = userId;
        socket.join(`user-${userId}`);
        console.log(`👤 المستخدم ${userId} متصل الآن`);
        io.emit('user-status', { userId, status: 'online' });
    });

    socket.on('join-trade-room', (tradeId) => {
        socket.join(`trade-${tradeId}`);
        console.log(`📖 انضم إلى محادثة التبادل ${tradeId}`);
    });

    socket.on('send-message', (data) => {
        const { tradeId, senderId, content, senderName } = data;
        io.to(`trade-${tradeId}`).emit('new-message', {
            tradeId,
            senderId,
            senderName,
            content,
            timestamp: new Date().toISOString(),
        });
    });

    socket.on('trade-notification', (data) => {
        const { userId, title, message, tradeId } = data;
        const targetSocket = onlineUsers.get(userId);
        if (targetSocket) {
            io.to(targetSocket).emit('trade-notification', { title, message, tradeId });
        }
    });

    socket.on('disconnect', () => {
        if (socket.userId) {
            onlineUsers.delete(socket.userId);
            io.emit('user-status', { userId: socket.userId, status: 'offline' });
            console.log(`👤 المستخدم ${socket.userId} غير متصل`);
        }
        console.log('📚 قارئ disconnected:', socket.id);
    });
});

app.set('io', io);

// ============================================================
// 5. المسارات (Routes) - يجب أن تكون بعد تعريف app
// ============================================================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/books', require('./routes/books'));
app.use('/api/trades', require('./routes/trades'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/points', require('./routes/points'));
app.use('/api/leaderboard', require('./routes/leaderboard'));

// ============================================================
// 6. مسار الجذر
// ============================================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ============================================================
// 7. الاتصال بقاعدة البيانات
// ============================================================
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/BookExchange')
    .then(() => console.log('✅ تم الاتصال بقاعدة البيانات (Book Exchange)'))
    .catch(err => {
        console.error('❌ فشل الاتصال بقاعدة البيانات:', err);
        process.exit(1);
    });

// ============================================================
// 8. تشغيل الخادم
// ============================================================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 خادم تبادل الكتب يعمل على http://localhost:${PORT}`);
    console.log(`📡 Socket.io جاهز للإشعارات الفورية`);
});
