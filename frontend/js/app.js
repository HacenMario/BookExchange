// ============================================================
// دالة تنسيق التاريخ
// ============================================================
function formatDate(dateString) {
    if (!dateString) return 'تاريخ غير معروف';
    try {
        const date = new Date(dateString);
        return date.toLocaleString('ar-EG', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return dateString;
    }
}

// ============================================================
// دالة مساعدة لمعالجة الوسوم (tags) - تدعم المصفوفة والنص
// ============================================================
function parseTags(tags) {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags;
    if (typeof tags === 'string') {
        return tags.split(',').map(t => t.trim()).filter(t => t);
    }
    return [];
}

// ============================================================
// عرض شرح طريقة حساب النقاط
// ============================================================
function getPointsExplanation() {
    return `
        <div style="background:#f9f6f2;padding:1rem;border-radius:12px;margin:1rem 0;border:1px solid #e8e0d8;">
            <h4 style="color:var(--brown);margin-bottom:0.5rem;">💰 كيف تحسب النقاط؟</h4>
            <ul style="list-style:none;padding:0;margin:0;font-size:0.9rem;color:#555;">
                <li style="padding:0.3rem 0;border-bottom:1px solid #eee;">
                    🔄 <strong>إكمال تبادل</strong> → <span style="color:var(--gold);font-weight:bold;">+20 نقطة</span>
                    <span style="color:#888;font-size:0.8rem;">(لكل طرف)</span>
                </li>
                <li style="padding:0.3rem 0;border-bottom:1px solid #eee;">
                    ⭐ <strong>تقييم الطرف الآخر</strong> → <span style="color:var(--gold);font-weight:bold;">+5 نقاط</span>
                </li>
                <li style="padding:0.3rem 0;border-bottom:1px solid #eee;">
                    🏆 <strong>إنجاز "أول تبادل"</strong> → <span style="color:var(--gold);font-weight:bold;">+10 نقاط</span>
                </li>
                <li style="padding:0.3rem 0;border-bottom:1px solid #eee;">
                    🏆 <strong>إنجاز "خمس تبادلات"</strong> → <span style="color:var(--gold);font-weight:bold;">+25 نقطة</span>
                </li>
                <li style="padding:0.3rem 0;border-bottom:1px solid #eee;">
                    🏆 <strong>إنجاز "عشرة تبادلات"</strong> → <span style="color:var(--gold);font-weight:bold;">+50 نقطة</span>
                </li>
                <li style="padding:0.3rem 0;border-bottom:1px solid #eee;">
                    🏆 <strong>إنجاز "خمسون تبادل"</strong> → <span style="color:var(--gold);font-weight:bold;">+100 نقطة</span>
                </li>
                <li style="padding:0.3rem 0;">
                    🏆 <strong>إنجاز "نجم التبادل"</strong> → <span style="color:var(--gold);font-weight:bold;">+200 نقطة</span>
                </li>
            </ul>
            <div style="margin-top:0.5rem;font-size:0.8rem;color:#888;">
                💡 تظهر النقاط تلقائياً عند تحقيق أي من الإنجازات أو إكمال تبادل أو تقييم.
            </div>
        </div>
    `;
}

// عند النقر على النقاط في الصفحة الرئيسية
document.addEventListener('click', function(e) {
    if (e.target.closest('#totalPoints')) {
        alert(`💰 طريقة حساب النقاط:\n\n` +
              `🔄 إكمال تبادل: +20 نقطة\n` +
              `⭐ تقييم الطرف الآخر: +5 نقاط\n` +
              `🏆 إنجاز "أول تبادل": +10 نقاط\n` +
              `🏆 إنجاز "خمس تبادلات": +25 نقطة\n` +
              `🏆 إنجاز "عشرة تبادلات": +50 نقطة\n` +
              `🏆 إنجاز "خمسون تبادل": +100 نقطة\n` +
              `🏆 إنجاز "نجم التبادل": +200 نقطة`);
    }
});

// ============================================================
// الإعدادات الأساسية
// ============================================================
const API_BASE = 'https://bookexchange-118x.onrender.com/api';
const SOCKET_URL = 'https://bookexchange-118x.onrender.com';
let currentUser = null;
let allBooks = [];
let socket = null;
let currentPage = 'home';
let notifications = [];
let currentTradeFilter = 'all';

// ============================================================
// نظام التنبيهات (Toast)
// ============================================================
function showToast(msg, type = 'info') {
    const toast = document.getElementById('toast');
    const msgEl = document.getElementById('toastMsg');
    if (!toast) {
        alert(msg);
        return;
    }
    msgEl.textContent = msg;
    toast.style.display = 'block';
    toast.style.background = type === 'error' ? '#e74c3c' : type === 'success' ? '#2ecc71' : '#2c1810';
    toast.style.borderRightColor = type === 'error' ? '#e74c3c' : type === 'success' ? '#2ecc71' : '#c9a050';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
        toast.style.display = 'none';
    }, 3500);
}

// ============================================================
// النوافذ المنبثقة
// ============================================================
function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

document.querySelectorAll('.modal-overlay').forEach(m => {
    m.addEventListener('click', function(e) {
        if (e.target === this) closeModal(this.id);
    });
});
// ============================================================
// المصادقة (Authentication)
// ============================================================

// تسجيل الدخول
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    if (!email || !password) {
        showToast('❌ الرجاء إدخال البريد الإلكتروني وكلمة المرور', 'error');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (res.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            currentUser = data.user;
            closeModal('loginModal');
            document.getElementById('loginForm').reset();
            updateUI();
            navigateTo('home');
            loadBooks();
            initSocket();
            showToast(`👋 مرحباً ${data.user.name}`, 'success');
        } else {
            showToast(`❌ ${data.message}`, 'error');
        }
    } catch (error) {
        console.error('خطأ في تسجيل الدخول:', error);
        showToast('❌ فشل الاتصال بالخادم', 'error');
    }
});

// تسجيل جديد
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const city = document.getElementById('regCity').value;
    const password = document.getElementById('regPassword').value;
    const address = document.getElementById('regAddress').value.trim();

    if (!name || !email || !phone || !city || password.length < 6) {
        showToast('❌ الرجاء ملء جميع الحقول المطلوبة', 'error');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone, city, address, password })
        });
        const data = await res.json();

        if (res.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            currentUser = data.user;
            closeModal('registerModal');
            document.getElementById('registerForm').reset();
            updateUI();
            navigateTo('home');
            loadBooks();
            initSocket();
            showToast(`✅ مرحباً ${data.user.name}`, 'success');
        } else {
            showToast(`❌ ${data.message}`, 'error');
        }
    } catch (error) {
        console.error('خطأ في التسجيل:', error);
        showToast('❌ فشل الاتصال بالخادم', 'error');
    }
});

// تسجيل الخروج
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    currentUser = null;
    if (socket) {
        socket.disconnect();
        socket = null;
    }
    updateUI();
    navigateTo('home');
    loadBooks();
    showToast('👋 تم تسجيل الخروج', 'info');
}

// ============================================================
// Socket.io – الدردشة والإشعارات الفورية
// ============================================================
function initSocket() {
    if (socket) return;
    try {
        let userId = null;
        if (currentUser) {
            userId = currentUser._id || currentUser.id || currentUser.userId || null;
        }
        if (!userId) {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                try {
                    const user = JSON.parse(storedUser);
                    userId = user._id || user.id || user.userId || null;
                    if (!currentUser) {
                        currentUser = user;
                        console.log('🔄 تم استعادة المستخدم من localStorage:', currentUser);
                    }
                } catch (e) {
                    console.warn('⚠️ فشل parse user من localStorage', e);
                }
            }
        }
        if (userId && typeof userId !== 'string') {
            userId = userId.toString();
        }

        socket = io(SOCKET_URL);
        socket.on('connect', () => {
            console.log('📚 متصل بالدردشة');
            if (userId) {
                socket.emit('user-online', userId);
                console.log(`👤 تم إرسال معرف المستخدم: ${userId}`);
            } else {
                console.warn('⚠️ لا يوجد معرف مستخدم للإرسال');
            }
        });

        socket.on('new-message', (data) => {
            console.log('💬 رسالة جديدة:', data);
            showToast(`💬 رسالة جديدة من ${data.senderName || 'مستخدم'}`, 'info');
            if (currentPage === 'trades') {
                loadTrades();
            }
        });

        socket.on('trade-updated', (data) => {
            showToast(`🔄 ${data.message}`, 'info');
            if (currentPage === 'trades') {
                loadTrades();
            }
            loadBooks();
        });

        socket.on('trade-notification', (data) => {
            console.log('🔔 إشعار تبادل:', data);
            addNotification(data.title, data.message, 'trade', data.link || '/trades');
        });

        socket.on('achievement-notification', (data) => {
            console.log('🏆 إشعار إنجاز:', data);
            addNotification(data.title, data.message, 'achievement', data.link || '/profile');
        });

        socket.on('disconnect', () => {
            console.log('📚 تم قطع الاتصال بالدردشة');
        });
    } catch (error) {
        console.error('خطأ في تهيئة Socket.io:', error);
    }
}
// ============================================================
// تحديث واجهة المستخدم
// ============================================================
function updateUI() {
    const token = localStorage.getItem('token');
    const isLoggedIn = !!token;

    document.getElementById('loginBtn').style.display = isLoggedIn ? 'none' : 'inline-block';
    document.getElementById('registerBtn').style.display = isLoggedIn ? 'none' : 'inline-block';
    document.getElementById('logoutBtn').style.display = isLoggedIn ? 'inline-block' : 'none';
    document.getElementById('userDisplay').style.display = isLoggedIn ? 'inline-block' : 'none';
    document.getElementById('addBookHeroBtn').style.display = isLoggedIn ? 'inline-block' : 'none';

    document.getElementById('myBooksLink').style.display = isLoggedIn ? 'inline-block' : 'none';
    document.getElementById('tradesLink').style.display = isLoggedIn ? 'inline-block' : 'none';
    document.getElementById('profileLink').style.display = isLoggedIn ? 'inline-block' : 'none';

    document.getElementById('bottomTrades').style.display = isLoggedIn ? 'inline-block' : 'none';
    document.getElementById('bottomProfile').style.display = isLoggedIn ? 'inline-block' : 'none';

    // المتصدرين يظهر دائماً
    document.getElementById('leaderboardLink').style.display = 'inline-block';
    document.getElementById('bottomLeaderboard').style.display = 'inline-block';

    if (isLoggedIn && currentUser) {
        document.getElementById('userDisplay').textContent = `👋 ${currentUser.name}`;
    }
}

// ============================================================
// التنقل بين الصفحات
// ============================================================
function navigateTo(page) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));

    const target = document.getElementById(`page-${page}`);
    if (target) {
        target.classList.add('active');
    } else {
        showToast(`❌ الصفحة غير موجودة`, 'error');
        return;
    }

    document.querySelectorAll('.nav-links a').forEach(l => l.classList.remove('active'));
    const navLink = document.querySelector(`.nav-links a[data-page="${page}"]`);
    if (navLink) navLink.classList.add('active');

    document.querySelectorAll('.bottom-nav a').forEach(l => l.classList.remove('active'));
    const bottomLink = document.querySelector(`.bottom-nav a[data-page="${page}"]`);
    if (bottomLink) bottomLink.classList.add('active');

    currentPage = page;

    if (page === 'my-books' || page === 'trades' || page === 'profile') {
        if (!localStorage.getItem('token')) {
            showToast('❌ يرجى تسجيل الدخول أولاً', 'error');
            navigateTo('home');
            return;
        }
        if (page === 'my-books') loadMyBooks();
        if (page === 'trades') loadTrades();
        if (page === 'profile') loadProfile();
    }
    if (page === 'leaderboard') {
        loadLeaderboard();
    }
}

document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        navigateTo(this.dataset.page);
    });
});

document.querySelectorAll('.bottom-nav a').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        navigateTo(this.dataset.page);
    });
});
// ============================================================
// جلب وعرض الكتب
// ============================================================
async function loadBooks() {
    try {
        const res = await fetch(`${API_BASE}/books`);
        if (!res.ok) throw new Error('فشل في جلب الكتب');
        allBooks = await res.json();

        renderHomeBooks(allBooks);
        renderAllBooks(allBooks);

        const availableBooks = allBooks.filter(b => b.isAvailable !== false);
        document.getElementById('totalBooks').textContent = availableBooks.length;

        try {
            const usersRes = await fetch(`${API_BASE}/users/count`);
            if (usersRes.ok) {
                const usersData = await usersRes.json();
                document.getElementById('totalUsers').textContent = usersData.count || '0';
            }
        } catch (e) {}

        try {
            const tradesRes = await fetch(`${API_BASE}/trades/count`);
            if (tradesRes.ok) {
                const tradesData = await tradesRes.json();
                document.getElementById('totalTrades').textContent = tradesData.count || '0';
            }
        } catch (e) {}

        if (localStorage.getItem('token')) {
            try {
                const token = localStorage.getItem('token');
                const pointsRes = await fetch(`${API_BASE}/users/me/points`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (pointsRes.ok) {
                    const pointsData = await pointsRes.json();
                    document.getElementById('totalPoints').textContent = pointsData.points || '0';
                }
            } catch (e) {}
        }
    } catch (error) {
        console.error('خطأ في تحميل الكتب:', error);
        showToast('❌ فشل في تحميل الكتب', 'error');
    }
}

function renderHomeBooks(books) {
    const grid = document.getElementById('homeBooksGrid');
    
    let userId = null;
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
        try {
            const user = JSON.parse(storedUser);
            userId = user._id?.toString() || user.id?.toString() || user.userId?.toString() || null;
        } catch (e) {}
    }
    
    let filteredBooks = books;
    if (userId) {
        filteredBooks = books.filter(b => {
            const ownerId = b.owner?._id ? b.owner._id.toString() : b.owner?.toString?.() || '';
            return ownerId !== userId;
        });
    }
    
    const top = filteredBooks.slice(0, 6);
    if (top.length === 0) {
        grid.innerHTML = '<p style="text-align:center;color:#999;padding:2rem;">📭 لا توجد كتب متاحة من مستخدمين آخرين حالياً</p>';
        return;
    }
    grid.innerHTML = top.map(b => createBookCard(b)).join('');
}

function renderAllBooks(books) {
    const grid = document.getElementById('allBooksGrid');
    
    let userId = null;
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
        try {
            const user = JSON.parse(storedUser);
            userId = user._id?.toString() || user.id?.toString() || user.userId?.toString() || null;
        } catch (e) {}
    }
    
    let filteredBooks = books;
    if (userId) {
        filteredBooks = books.filter(b => {
            const ownerId = b.owner?._id ? b.owner._id.toString() : b.owner?.toString?.() || '';
            return ownerId !== userId;
        });
    }
    
    if (!filteredBooks || filteredBooks.length === 0) {
        grid.innerHTML = '<div style="text-align:center;color:#999;padding:2rem;">😕 لا توجد كتب متاحة للتبادل من مستخدمين آخرين</div>';
        document.getElementById('booksResultCount').textContent = '';
        return;
    }
    grid.innerHTML = filteredBooks.map(b => createBookCard(b)).join('');
    document.getElementById('booksResultCount').textContent = `🔄 عدد النتائج: ${filteredBooks.length}`;
}

function createBookCard(book) {
    const coverHtml = book.coverImage ?
        `<img src="${book.coverImage}" alt="${book.title}">` :
        `<div class="no-image"><i class="fas fa-book"></i></div>`;

    const ownerName = book.owner?.name || 'مستخدم';
    const location = book.location || book.owner?.city || '';
    const isAvailable = book.isAvailable !== false;

    return `
        <div class="book-card" onclick="showBookDetails('${book._id}')">
            <div class="cover">
                ${coverHtml}
                <span class="condition-badge">${book.condition}</span>
                ${!isAvailable ? '<span class="condition-badge" style="background:#e74c3c;right:65px;">غير متاح</span>' : ''}
            </div>
            <div class="body">
                <h3>${book.title}</h3>
                <div class="author">✍️ ${book.author}</div>
                <span class="category">${book.category}</span>
                <div class="location"><i class="fas fa-map-marker-alt"></i> ${location}</div>
                <div class="owner">👤 ${ownerName} ⭐ ${book.owner?.rating || 0}</div>
                ${isAvailable && localStorage.getItem('token') ? `
                    <button class="btn-trade" onclick="event.stopPropagation();openTradeRequest('${book._id}')">
                        <i class="fas fa-exchange-alt"></i> طلب تبادل
                    </button>
                ` : ''}
                ${!isAvailable ? '<button class="btn-trade" style="background:#999;cursor:not-allowed;">غير متاح</button>' : ''}
                ${localStorage.getItem('token') ? `
                    <button class="btn-outline btn-sm" style="margin-top:0.3rem;width:100%;" onclick="event.stopPropagation();toggleWishlist('${book._id}')">
                        <i class="fas fa-heart${book.wishlistedBy?.includes(currentUser?._id) ? '' : '-o'}"></i>
                        ${book.wishlistedBy?.includes(currentUser?._id) ? ' في قائمة الرغبات' : ' أضف إلى الرغبات'}
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

// ============================================================
// البحث والفلترة
// ============================================================
function applyFilters() {
    const search = document.getElementById('searchBook').value.toLowerCase().trim();
    const category = document.getElementById('filterCategory').value;
    const city = document.getElementById('filterCity').value;

    let result = allBooks.filter(b => {
        const matchSearch = b.title.toLowerCase().includes(search) || b.author.toLowerCase().includes(search);
        const matchCategory = category ? b.category === category : true;
        const matchCity = city ? (b.location === city || b.owner?.city === city) : true;
        return matchSearch && matchCategory && matchCity && b.isAvailable !== false;
    });

    let userId = null;
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
        try {
            const user = JSON.parse(storedUser);
            userId = user._id?.toString() || user.id?.toString() || user.userId?.toString() || null;
        } catch (e) {}
    }
    if (userId) {
        result = result.filter(b => {
            const ownerId = b.owner?._id ? b.owner._id.toString() : b.owner?.toString?.() || '';
            return ownerId !== userId;
        });
    }

    renderAllBooks(result);
}

document.getElementById('searchBook').addEventListener('input', applyFilters);
document.getElementById('filterCategory').addEventListener('change', applyFilters);
document.getElementById('filterCity').addEventListener('change', applyFilters);

// ============================================================
// تفاصيل الكتاب (معدل لاستخدام parseTags)
// ============================================================
async function showBookDetails(bookId) {
    try {
        console.log('📖 جلب تفاصيل الكتاب:', bookId);
        
        const res = await fetch(`${API_BASE}/books/${bookId}`);
        if (!res.ok) {
            const errorText = await res.text();
            console.error('❌ فشل جلب الكتاب:', res.status, errorText);
            showToast('❌ فشل في تحميل تفاصيل الكتاب', 'error');
            return;
        }
        
        const book = await res.json();
        console.log('📦 بيانات الكتاب:', book);

        // التأكد من وجود عناصر النافذة
        const modal = document.getElementById('bookDetailsModal');
        const content = document.getElementById('bookDetailsContent');
        if (!modal || !content) {
            console.error('❌ عناصر النافذة غير موجودة');
            showToast('❌ خطأ في عرض التفاصيل', 'error');
            return;
        }

        // ===== معالجة الوسوم (tags) بأمان =====
        let tagsArray = [];
        if (book.tags) {
            if (Array.isArray(book.tags)) {
                tagsArray = book.tags;
            } else if (typeof book.tags === 'string') {
                tagsArray = book.tags.split(',').map(t => t.trim()).filter(t => t);
            }
        }
        const tagsHtml = tagsArray.length > 0
            ? `<div style="display:flex;gap:0.3rem;flex-wrap:wrap;justify-content:center;margin-top:0.5rem;">
                ${tagsArray.map(tag => `<span style="background:#eee;padding:0.1rem 0.6rem;border-radius:50px;font-size:0.7rem;color:#666;">#${tag}</span>`).join('')}
               </div>`
            : '';

        // ===== تنسيق التاريخ =====
        const addedDate = book.createdAt
            ? new Date(book.createdAt).toLocaleDateString('ar-EG', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })
            : 'تاريخ غير معروف';

        // ===== صورة الغلاف =====
        const coverHtml = book.coverImage
            ? `<img src="${book.coverImage}" alt="${book.title}" style="max-width:100%;max-height:250px;object-fit:contain;border-radius:8px;">`
            : `<div style="font-size:5rem;color:var(--gold);opacity:0.5;text-align:center;">📖</div>`;

        const isAvailable = book.isAvailable !== false;
        const ownerName = book.owner?.name || 'مستخدم غير معروف';
        const ownerId = book.owner?._id || null;
        const isOwner = currentUser && ownerId === currentUser._id;

        // ===== مقتطف حسب التصنيف =====
        const excerpts = {
            'رواية': '"كانت القراءة هي النافذة الوحيدة التي تطلع منها على عالم لم تراه بعينيها..."',
            'تنمية بشرية': '"التغيير الحقيقي لا يبدأ من الخارج، بل من الداخل..."',
            'فلسفة': '"الحكمة الحقيقية ليست في معرفة الإجابات، بل في طرح الأسئلة الصحيحة."',
            'تاريخي': '"التاريخ ليس مجرد ماضٍ نقرأه، بل هو مرآة تعكس حاضرنا ومستقبلنا."',
            'شعر': '"والشعرُ كالماءِ لا يصفو ولا يَرِقُ إلّا إذا جاوَرَ الإحساسَ والشفقا"'
        };
        const excerpt = book.excerpt || excerpts[book.category] || '"الكتاب خير جليس في الزمان، وخير صاحب في الأوقات."';

        // ===== بناء محتوى النافذة =====
        content.innerHTML = `
            <div style="display:flex;flex-direction:column;gap:1rem;">
                <!-- صورة الغلاف -->
                <div style="text-align:center;background:#f9f6f2;padding:1rem;border-radius:12px;">
                    ${coverHtml}
                </div>
                
                <!-- عنوان الكتاب -->
                <h2 style="color:var(--brown);font-size:1.5rem;margin:0;text-align:center;">
                    📖 ${book.title}
                </h2>
                
                <!-- معلومات أساسية -->
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;background:#f9f6f2;padding:0.8rem;border-radius:10px;">
                    <div><strong>✍️ المؤلف:</strong> ${book.author}</div>
                    <div><strong>📂 التصنيف:</strong> ${book.category}</div>
                    <div><strong>📌 الحالة:</strong> ${book.condition}</div>
                    <div><strong>📍 الموقع:</strong> ${book.location || book.owner?.city || 'غير محدد'}</div>
                    <div><strong>📅 تاريخ الإضافة:</strong> ${addedDate}</div>
                    <div><strong>👤 المالك:</strong> ${ownerName} ⭐ ${book.owner?.rating || 0}</div>
                    <div style="grid-column:span 2;">
                        <strong>🔄 حالة الكتاب:</strong> 
                        <span style="color:${isAvailable ? '#2ecc71' : '#e74c3c'};font-weight:bold;">
                            ${isAvailable ? '✅ متاح للتبادل' : '❌ غير متاح حالياً'}
                        </span>
                    </div>
                </div>
                
                <!-- وصف الكتاب -->
                ${book.description ? `
                    <div style="background:#fef9f0;padding:0.8rem;border-radius:10px;border-right:4px solid var(--gold);">
                        <h4 style="color:var(--brown);margin:0 0 0.3rem 0;">📝 وصف الكتاب:</h4>
                        <p style="color:#555;margin:0;line-height:1.8;">${book.description}</p>
                    </div>
                ` : `
                    <div style="background:#f9f6f2;padding:0.8rem;border-radius:10px;color:#888;text-align:center;">
                        📝 لا يوجد وصف لهذا الكتاب
                    </div>
                `}
                
                <!-- مقتطف -->
                <div style="background:#f0f4f8;padding:0.8rem;border-radius:10px;border-right:4px solid #3498db;">
                    <h4 style="color:var(--brown);margin:0 0 0.3rem 0;">📖 مقتطف من الكتاب:</h4>
                    <p style="color:#555;margin:0;line-height:1.8;font-style:italic;">${excerpt}</p>
                </div>
                
                <!-- الوسوم -->
                ${tagsHtml}
                
                <!-- أزرار الإجراءات -->
                <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.5rem;">
                    ${!isOwner && isAvailable && localStorage.getItem('token') ? `
                        <button class="btn-gold" onclick="closeModal('bookDetailsModal');openTradeRequest('${book._id}')" style="flex:1;min-width:120px;">
                            <i class="fas fa-exchange-alt"></i> طلب تبادل
                        </button>
                    ` : ''}
                    ${isOwner ? `
                        <button class="btn-primary" onclick="closeModal('bookDetailsModal');editBook('${book._id}')" style="flex:1;min-width:120px;">
                            <i class="fas fa-edit"></i> تعديل
                        </button>
                        <button class="btn-danger" onclick="closeModal('bookDetailsModal');deleteBook('${book._id}')" style="flex:1;min-width:120px;">
                            <i class="fas fa-trash"></i> حذف
                        </button>
                    ` : ''}
                    ${!localStorage.getItem('token') ? `
                        <button class="btn-outline" onclick="closeModal('bookDetailsModal');openModal('loginModal')" style="flex:1;min-width:120px;">
                            <i class="fas fa-sign-in-alt"></i> سجل دخول للطلب
                        </button>
                    ` : ''}
                    <button class="btn-outline" onclick="closeModal('bookDetailsModal')" style="flex:1;min-width:120px;">
                        <i class="fas fa-times"></i> إغلاق
                    </button>
                </div>
            </div>
        `;

        // فتح النافذة المنبثقة
        openModal('bookDetailsModal');
        console.log('✅ تم عرض تفاصيل الكتاب بنجاح');

    } catch (error) {
        console.error('❌ خطأ في جلب تفاصيل الكتاب:', error);
        showToast('❌ فشل في تحميل تفاصيل الكتاب: ' + error.message, 'error');
    }
}
// ============================================================
// طلب التبادل
// ============================================================
let selectedRequestedBookId = null;
let _selectedOfferedBook = null;

function openTradeRequest(bookId) {
    if (!localStorage.getItem('token')) {
        showToast('❌ يرجى تسجيل الدخول أولاً', 'error');
        return;
    }
    selectedRequestedBookId = bookId;

    const token = localStorage.getItem('token');
    fetch(`${API_BASE}/books/my`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(books => {
        const userBooks = books.filter(b => b._id !== bookId && b.isAvailable !== false);
        if (userBooks.length === 0) {
            showToast('📭 ليس لديك كتب متاحة للتبادل. أضف كتباً أولاً.', 'info');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.innerHTML = `
            <div class="modal-box">
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                <h2><i class="fas fa-exchange-alt"></i> طلب تبادل</h2>
                <p style="color:#888;margin-bottom:1rem;">اختر الكتاب الذي تريد تقديمه للتبادل:</p>
                ${userBooks.map(b => `
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:0.5rem;border-bottom:1px solid #eee;cursor:pointer;" onclick="selectBookForTrade('${b._id}')">
                        <div>
                            <strong>${b.title}</strong> (${b.author})
                            <div style="font-size:0.8rem;color:#888;">${b.condition}</div>
                        </div>
                        <button class="btn-primary btn-sm">اختيار</button>
                    </div>
                `).join('')}
                <div style="margin-top:1rem;">
                    <div class="form-group">
                        <label>رسالة (اختياري)</label>
                        <input type="text" id="tradeMessage" placeholder="لماذا ترغب في هذا الكتاب؟" />
                    </div>
                </div>
                <button class="btn-gold" style="width:100%;padding:0.5rem;margin-top:0.5rem;" onclick="sendTradeRequestWithMessage()">
                    <i class="fas fa-paper-plane"></i> إرسال الطلب
                </button>
            </div>
        `;
        document.body.appendChild(modal);
    })
    .catch(() => {
        showToast('❌ فشل في تحميل كتبك', 'error');
    });
}

function selectBookForTrade(bookId) {
    _selectedOfferedBook = bookId;
    const message = document.getElementById('tradeMessage')?.value || '';
    const modal = document.querySelector('.modal-overlay.active');
    if (modal) modal.remove();
    sendTradeRequestWithData(bookId, message);
}

function sendTradeRequestWithMessage() {
    if (_selectedOfferedBook) {
        const message = document.getElementById('tradeMessage')?.value || '';
        sendTradeRequestWithData(_selectedOfferedBook, message);
    }
}

async function sendTradeRequestWithData(offeredBookId, message) {
    const token = localStorage.getItem('token');
    if (!token) {
        showToast('❌ يرجى تسجيل الدخول', 'error');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/trades`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                requestedBookId: selectedRequestedBookId,
                offeredBookId: offeredBookId,
                message: message || ''
            })
        });
        const data = await res.json();
        if (res.ok) {
            showToast('✅ تم إرسال طلب التبادل بنجاح', 'success');
            const modal = document.querySelector('.modal-overlay.active');
            if (modal) modal.remove();
            loadBooks();
            if (currentPage === 'trades') loadTrades();
        } else {
            showToast(`❌ ${data.message}`, 'error');
        }
    } catch (error) {
        console.error('خطأ في إرسال طلب التبادل:', error);
        showToast('❌ فشل الاتصال بالخادم', 'error');
    }
}

// ============================================================
// قائمة الرغبات
// ============================================================
async function toggleWishlist(bookId) {
    const token = localStorage.getItem('token');
    if (!token) {
        showToast('❌ يرجى تسجيل الدخول أولاً', 'error');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/books/${bookId}/wishlist`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
            showToast(data.wishlisted ? '✅ أضيف إلى قائمة الرغبات' : '✅ أزيل من قائمة الرغبات', 'success');
            loadBooks();
        } else {
            showToast(`❌ ${data.message}`, 'error');
        }
    } catch (error) {
        showToast('❌ فشل الاتصال', 'error');
    }
}
// ============================================================
// كتبي
// ============================================================
async function loadMyBooks() {
    const token = localStorage.getItem('token');
    if (!token) {
        navigateTo('home');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/books/my`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('فشل في جلب كتبي');
        const books = await res.json();
        const grid = document.getElementById('myBooksGrid');

        if (books.length === 0) {
            grid.innerHTML = `
                <div style="text-align:center;color:#999;padding:2rem;grid-column:1/-1;">
                    📭 لم تقم بإضافة أي كتاب بعد
                    <br>
                    <button class="btn-gold" style="margin-top:1rem;" onclick="openModal('addBookModal')">
                        <i class="fas fa-plus-circle"></i> أضف كتاباً الآن
                    </button>
                </div>
            `;
            return;
        }

        grid.innerHTML = books.map(b => {
            const coverHtml = b.coverImage ?
                `<img src="${b.coverImage}" alt="${b.title}">` :
                `<div class="no-image"><i class="fas fa-book"></i></div>`;
            return `
                <div class="book-card">
                    <div class="cover">
                        ${coverHtml}
                        <span class="condition-badge">${b.condition}</span>
                        <span class="condition-badge" style="right:65px;background:${b.isAvailable ? '#2ecc71' : '#e74c3c'};">
                            ${b.isAvailable ? 'متاح' : 'غير متاح'}
                        </span>
                    </div>
                    <div class="body">
                        <h3>${b.title}</h3>
                        <div class="author">✍️ ${b.author}</div>
                        <span class="category">${b.category}</span>
                        <div class="location"><i class="fas fa-map-marker-alt"></i> ${b.location || ''}</div>
                        <div style="display:flex;gap:0.3rem;margin-top:0.3rem;flex-wrap:wrap;">
                            <button class="btn-primary btn-sm" onclick="editBook('${b._id}')"><i class="fas fa-edit"></i> تعديل</button>
                            <button class="btn-danger btn-sm" onclick="deleteBook('${b._id}')"><i class="fas fa-trash"></i> حذف</button>
                            <button class="btn-outline btn-sm" onclick="toggleAvailability('${b._id}')">
                                ${b.isAvailable ? '❌ إخفاء' : '✅ إظهار'}
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('خطأ في تحميل كتبي:', error);
        showToast('❌ فشل في تحميل كتبي', 'error');
    }
}

// ============================================================
// إدارة الكتب
// ============================================================
async function deleteBook(bookId) {
    if (!confirm('هل أنت متأكد من حذف هذا الكتاب؟')) return;
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_BASE}/books/${bookId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            showToast('✅ تم حذف الكتاب', 'success');
            loadMyBooks();
            loadBooks();
        } else {
            const data = await res.json();
            showToast(`❌ ${data.message}`, 'error');
        }
    } catch {
        showToast('❌ فشل الاتصال', 'error');
    }
}

async function toggleAvailability(bookId) {
    const token = localStorage.getItem('token');
    try {
        const getRes = await fetch(`${API_BASE}/books/${bookId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const book = await getRes.json();
        const newStatus = !book.isAvailable;

        const res = await fetch(`${API_BASE}/books/${bookId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ isAvailable: newStatus })
        });
        if (res.ok) {
            showToast(`✅ تم ${newStatus ? 'إظهار' : 'إخفاء'} الكتاب`, 'success');
            loadMyBooks();
            loadBooks();
        } else {
            const data = await res.json();
            showToast(`❌ ${data.message}`, 'error');
        }
    } catch {
        showToast('❌ فشل الاتصال', 'error');
    }
}

async function editBook(bookId) {
    const token = localStorage.getItem('token');
    if (!token) {
        showToast('❌ يرجى تسجيل الدخول أولاً', 'error');
        return;
    }

    try {
        // جلب بيانات الكتاب الحالية
        const res = await fetch(`${API_BASE}/books/${bookId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('فشل في جلب بيانات الكتاب');
        const book = await res.json();

        // إنشاء نافذة التعديل
        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'editBookModal';
        modal.innerHTML = `
            <div class="modal-box" style="max-width:600px;">
                <button class="modal-close" onclick="closeModal('editBookModal')">&times;</button>
                <h2><i class="fas fa-edit"></i> تعديل الكتاب</h2>
                <form id="editBookForm">
                    <div class="form-group">
                        <label>العنوان *</label>
                        <input type="text" id="editTitle" value="${book.title}" required>
                    </div>
                    <div class="form-group">
                        <label>المؤلف *</label>
                        <input type="text" id="editAuthor" value="${book.author}" required>
                    </div>
                    <div class="form-group">
                        <label>الوصف</label>
                        <textarea id="editDescription" rows="3">${book.description || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label>التصنيف *</label>
                        <select id="editCategory" required>
                            ${['رواية', 'علمي', 'ديني', 'تنمية بشرية', 'تاريخي', 'سياسي', 'أدب', 'شعر', 'فلسفة', 'أطفال', 'أخرى'].map(cat =>
                                `<option value="${cat}" ${book.category === cat ? 'selected' : ''}>${cat}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>حالة الكتاب *</label>
                        <select id="editCondition" required>
                            ${['جديد', 'ممتاز', 'جيد جداً', 'جيد', 'مقبول'].map(cond =>
                                `<option value="${cond}" ${book.condition === cond ? 'selected' : ''}>${cond}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>الموقع</label>
                        <input type="text" id="editLocation" value="${book.location || ''}">
                    </div>
                    <div class="form-group">
                        <label>الوسوم (مفصولة بفواصل)</label>
                        <input type="text" id="editTags" value="${Array.isArray(book.tags) ? book.tags.join(',') : book.tags || ''}">
                    </div>
                    <div class="form-group">
                        <label>رابط صورة الغلاف (اختياري)</label>
                        <input type="text" id="editCoverImage" value="${book.coverImage || ''}">
                    </div>
                    <div style="display:flex;gap:0.5rem;margin-top:1rem;">
                        <button type="submit" class="btn-gold" style="flex:1;padding:0.5rem;">
                            <i class="fas fa-save"></i> حفظ التغييرات
                        </button>
                        <button type="button" class="btn-outline" onclick="closeModal('editBookModal')" style="flex:1;padding:0.5rem;">
                            إلغاء
                        </button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);

        // معالجة تقديم النموذج
        document.getElementById('editBookForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const updatedData = {
                title: document.getElementById('editTitle').value.trim(),
                author: document.getElementById('editAuthor').value.trim(),
                description: document.getElementById('editDescription').value.trim(),
                category: document.getElementById('editCategory').value,
                condition: document.getElementById('editCondition').value,
                location: document.getElementById('editLocation').value.trim(),
                tags: document.getElementById('editTags').value.trim(),
                coverImage: document.getElementById('editCoverImage').value.trim()
            };

            if (!updatedData.title || !updatedData.author) {
                showToast('❌ العنوان والمؤلف مطلوبان', 'error');
                return;
            }

            try {
                const updateRes = await fetch(`${API_BASE}/books/${bookId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(updatedData)
                });
                const result = await updateRes.json();
                if (updateRes.ok) {
                    showToast('✅ تم تحديث الكتاب بنجاح', 'success');
                    closeModal('editBookModal');
                    loadBooks();
                    if (currentPage === 'my-books') loadMyBooks();
                } else {
                    showToast(`❌ ${result.message}`, 'error');
                }
            } catch (err) {
                showToast('❌ فشل الاتصال', 'error');
                console.error(err);
            }
        });

    } catch (error) {
        console.error('خطأ في تحميل بيانات الكتاب:', error);
        showToast('❌ فشل في تحميل بيانات الكتاب', 'error');
    }
}
// ============================================================
// طلبات التبادل
// ============================================================
function setTradeFilter(filter) {
    currentTradeFilter = filter;
    loadTrades();
}

async function loadTrades() {
    const token = localStorage.getItem('token');
    if (!token) {
        navigateTo('home');
        return;
    }

    if (!currentUser) {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                currentUser = JSON.parse(storedUser);
            } catch (e) {
                showToast('❌ يرجى تسجيل الدخول مرة أخرى', 'error');
                logout();
                return;
            }
        } else {
            showToast('❌ يرجى تسجيل الدخول مرة أخرى', 'error');
            logout();
            return;
        }
    }

    let userId = currentUser._id?.toString() || currentUser.id?.toString() || currentUser.userId?.toString();
    if (!userId) {
        showToast('❌ بيانات المستخدم غير مكتملة', 'error');
        logout();
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/trades/my`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('فشل في جلب الطلبات');
        const trades = await res.json();

        const incoming = trades.filter(t => {
            let ownerId = null;
            if (t.owner && typeof t.owner === 'object' && t.owner._id) {
                ownerId = t.owner._id.toString();
            } else if (typeof t.owner === 'string') {
                ownerId = t.owner;
            } else if (t.ownerId) {
                ownerId = t.ownerId.toString();
            }
            return ownerId === userId;
        });

        const outgoing = trades.filter(t => {
            let requesterId = null;
            if (t.requester && typeof t.requester === 'object' && t.requester._id) {
                requesterId = t.requester._id.toString();
            } else if (typeof t.requester === 'string') {
                requesterId = t.requester;
            } else if (t.requesterId) {
                requesterId = t.requesterId.toString();
            }
            return requesterId === userId;
        });

        let allTrades = [
            ...incoming.map(t => ({ ...t, _type: 'incoming' })),
            ...outgoing.map(t => ({ ...t, _type: 'outgoing' }))
        ];

        allTrades.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        if (currentTradeFilter !== 'all') {
            allTrades = allTrades.filter(t => t.status === currentTradeFilter);
        }

        const container = document.getElementById('tradesList');
        if (!container) {
            console.error('❌ عنصر #tradesList غير موجود');
            showToast('❌ خطأ في الصفحة', 'error');
            return;
        }

        const filterHtml = `
            <div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:1rem;background:#fff;padding:0.8rem;border-radius:12px;border:1px solid #eee;">
                <button class="btn-filter ${currentTradeFilter === 'all' ? 'active-filter' : ''}" onclick="setTradeFilter('all')">الكل</button>
                <button class="btn-filter ${currentTradeFilter === 'pending' ? 'active-filter' : ''}" onclick="setTradeFilter('pending')">⏳ قيد الانتظار</button>
                <button class="btn-filter ${currentTradeFilter === 'accepted' ? 'active-filter' : ''}" onclick="setTradeFilter('accepted')">✅ مقبول</button>
                <button class="btn-filter ${currentTradeFilter === 'completed' ? 'active-filter' : ''}" onclick="setTradeFilter('completed')">📌 مكتمل</button>
                <button class="btn-filter ${currentTradeFilter === 'rejected' ? 'active-filter' : ''}" onclick="setTradeFilter('rejected')">❌ مرفوض</button>
                <button class="btn-filter ${currentTradeFilter === 'cancelled' ? 'active-filter' : ''}" onclick="setTradeFilter('cancelled')">🚫 ملغي</button>
            </div>
            <style>
                .btn-filter {
                    padding:0.3rem 0.8rem;border-radius:50px;border:1px solid #ddd;background:#f9f6f2;cursor:pointer;font-size:0.85rem;transition:all 0.2s;
                }
                .btn-filter:hover {
                    background:#e8e0d8;
                }
                .active-filter {
                    background:var(--gold) !important;
                    color:#fff !important;
                    border-color:var(--gold) !important;
                }
            </style>
        `;

        if (allTrades.length === 0) {
            container.innerHTML = filterHtml + `
                <div style="text-align:center;color:#999;padding:2rem;">
                    📭 لا توجد طلبات تطابق الفلترة المختارة
                </div>
            `;
            return;
        }

        let html = filterHtml;
        html += allTrades.map(t => {
            const statusMap = {
                'pending': { label: 'قيد الانتظار', color: '#f1c40f' },
                'accepted': { label: 'مقبول', color: '#2ecc71' },
                'rejected': { label: 'مرفوض', color: '#e74c3c' },
                'completed': { label: 'مكتمل', color: '#3498db' },
                'cancelled': { label: 'ملغي', color: '#999' }
            };
            const status = statusMap[t.status] || { label: t.status || 'غير معروف', color: '#999' };
            const isIncoming = t._type === 'incoming';
            const isOwner = (t.owner && typeof t.owner === 'object' && t.owner._id) ? t.owner._id.toString() === userId : false;
            const isRequester = (t.requester && typeof t.requester === 'object' && t.requester._id) ? t.requester._id.toString() === userId : false;

            let actionsHtml = '';
            if (isIncoming && t.status === 'pending' && isOwner) {
                actionsHtml = `
                    <button class="btn-success btn-sm" onclick="acceptTrade('${t._id}')"><i class="fas fa-check"></i> قبول</button>
                    <button class="btn-danger btn-sm" onclick="rejectTrade('${t._id}')"><i class="fas fa-times"></i> رفض</button>
                    <button class="btn-outline btn-sm" onclick="openChat('${t._id}')"><i class="fas fa-comment"></i> دردشة</button>
                `;
            } else if (t.status === 'accepted') {
                actionsHtml = `
                    <button class="btn-gold btn-sm" onclick="completeTrade('${t._id}')"><i class="fas fa-check-double"></i> إكمال التبادل</button>
                    <button class="btn-outline btn-sm" onclick="openChat('${t._id}')"><i class="fas fa-comment"></i> دردشة</button>
                `;
            } else if (!isIncoming && t.status === 'pending' && isRequester) {
                actionsHtml = `
                    <button class="btn-danger btn-sm" onclick="cancelTrade('${t._id}')"><i class="fas fa-times"></i> إلغاء</button>
                `;
            } else if (t.status === 'completed' && !t.reviewGiven) {
                actionsHtml = `
                    <button class="btn-primary btn-sm" onclick="reviewTrade('${t._id}')"><i class="fas fa-star"></i> تقييم</button>
                `;
            } else if (t.status === 'completed' && t.reviewGiven) {
                actionsHtml = `<span style="color:#2ecc71;font-size:0.85rem;">✅ تم التقييم</span>`;
            }

            let relationText = '';
            if (isIncoming) {
                const requesterName = (typeof t.requester === 'object' && t.requester.name) ? t.requester.name : (typeof t.requester === 'string' ? t.requester : 'مستخدم');
                relationText = `📥 طلب إليك من ${requesterName}`;
            } else {
                const ownerName = (typeof t.owner === 'object' && t.owner.name) ? t.owner.name : (typeof t.owner === 'string' ? t.owner : 'مستخدم');
                relationText = `📤 أرسلته أنت إلى ${ownerName}`;
            }

            const dateStr = formatDate(t.createdAt);

            return `
                <div style="background:#fff;padding:1rem;border-radius:12px;margin-bottom:0.8rem;border:1px solid #eee;box-shadow:var(--shadow);">
                    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;">
                        <div>
                            <strong>📖 ${t.requestedBook?.title || 'كتاب'}</strong>
                            <span style="color:#888;font-size:0.9rem;">↔️ ${t.offeredBook?.title || 'كتاب'}</span>
                        </div>
                        <span style="padding:0.2rem 0.8rem;border-radius:50px;font-size:0.8rem;font-weight:600;background:${status.color};color:#fff;">
                            ${status.label}
                        </span>
                    </div>
                    <div style="color:#888;font-size:0.85rem;margin-top:0.3rem;">
                        ${relationText}
                    </div>
                    <div style="color:#aaa;font-size:0.75rem;margin-top:0.2rem;">
                        🕒 ${dateStr}
                    </div>
                    ${t.message ? `<div style="color:#666;font-size:0.9rem;margin-top:0.3rem;background:#f9f6f2;padding:0.5rem;border-radius:8px;">💬 ${t.message}</div>` : ''}
                    ${actionsHtml ? `<div style="margin-top:0.5rem;display:flex;gap:0.5rem;flex-wrap:wrap;">${actionsHtml}</div>` : ''}
                </div>
            `;
        }).join('');

        container.innerHTML = html;

    } catch (error) {
        console.error('❌ فشل في تحميل الطلبات:', error);
        const container = document.getElementById('tradesList');
        if (container) {
            container.innerHTML = `
                <div style="text-align:center;color:#e74c3c;padding:2rem;">
                    ❌ فشل في تحميل الطلبات
                    <br>
                    <button class="btn-primary btn-sm" style="margin-top:0.5rem;" onclick="loadTrades()">🔄 إعادة المحاولة</button>
                </div>
            `;
        }
        showToast('❌ فشل في تحميل الطلبات', 'error');
    }
}
// ============================================================
// إدارة طلبات التبادل
// ============================================================
async function acceptTrade(id) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_BASE}/trades/${id}/accept`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
            showToast('✅ تم قبول طلب التبادل', 'success');
            if (socket) socket.emit('trade-updated', { tradeId: id, message: 'تم قبول طلب التبادل' });
            loadTrades();
            loadBooks();
        } else {
            showToast(`❌ ${data.message}`, 'error');
        }
    } catch {
        showToast('❌ فشل الاتصال', 'error');
    }
}

async function rejectTrade(id) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_BASE}/trades/${id}/reject`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
            showToast('✅ تم رفض طلب التبادل', 'info');
            if (socket) socket.emit('trade-updated', { tradeId: id, message: 'تم رفض طلب التبادل' });
            loadTrades();
        } else {
            showToast(`❌ ${data.message}`, 'error');
        }
    } catch {
        showToast('❌ فشل الاتصال', 'error');
    }
}

async function completeTrade(id) {
    if (!confirm('هل أنت متأكد من إكمال هذا التبادل؟')) return;
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_BASE}/trades/${id}/complete`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
            showToast('✅ تم إكمال التبادل بنجاح!', 'success');
            if (socket) socket.emit('trade-updated', { tradeId: id, message: 'تم إكمال التبادل' });
            loadTrades();
            loadBooks();
            loadProfile();
        } else {
            showToast(`❌ ${data.message}`, 'error');
        }
    } catch {
        showToast('❌ فشل الاتصال', 'error');
    }
}

async function cancelTrade(id) {
    if (!confirm('هل تريد إلغاء هذا الطلب؟')) return;
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_BASE}/trades/${id}/cancel`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
            showToast('✅ تم إلغاء الطلب', 'info');
            if (socket) socket.emit('trade-updated', { tradeId: id, message: 'تم إلغاء الطلب' });
            loadTrades();
            loadBooks();
        } else {
            showToast(`❌ ${data.message}`, 'error');
        }
    } catch {
        showToast('❌ فشل الاتصال', 'error');
    }
}

async function reviewTrade(id) {
    const rating = prompt('أدخل التقييم (1-5):');
    if (!rating || isNaN(rating) || rating < 1 || rating > 5) {
        showToast('❌ تقييم غير صحيح (1-5)', 'error');
        return;
    }
    const comment = prompt('أدخل تعليقك (اختياري):') || '';
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_BASE}/trades/${id}/review`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ rating: parseInt(rating), comment })
        });
        const data = await res.json();
        if (res.ok) {
            showToast('✅ تم إضافة التقييم', 'success');
            loadTrades();
            loadProfile();
            loadBooks();
        } else {
            showToast(`❌ ${data.message}`, 'error');
        }
    } catch {
        showToast('❌ فشل الاتصال', 'error');
    }
}

function openChat(tradeId) {
    showToast(`💬 سيتم فتح الدردشة للطلب ${tradeId}`, 'info');
}
// ============================================================
// إضافة كتاب
// ============================================================
document.getElementById('addBookForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
        showToast('❌ يرجى تسجيل الدخول أولاً', 'error');
        return;
    }

    const title = document.getElementById('bookTitle').value.trim();
    const author = document.getElementById('bookAuthor').value.trim();
    const description = document.getElementById('bookDescription').value.trim();
    const excerpt = document.getElementById('bookExcerpt').value.trim();
    const category = document.getElementById('bookCategory').value;
    const condition = document.getElementById('bookCondition').value;
    const location = document.getElementById('bookLocation').value.trim();
    const coverFile = document.getElementById('bookCover').files[0];

    if (!title || !author || !category || !condition) {
        showToast('❌ الرجاء ملء جميع الحقول المطلوبة', 'error');
        return;
    }

    let coverImage = '';
    if (coverFile) {
        try {
            const reader = new FileReader();
            coverImage = await new Promise(resolve => {
                reader.onload = e => resolve(e.target.result);
                reader.readAsDataURL(coverFile);
            });
        } catch (error) {
            showToast('❌ فشل في قراءة الصورة', 'error');
            return;
        }
    }

    try {
        const res = await fetch(`${API_BASE}/books`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title, author, description, category, condition,
                coverImage, location: location || ''
            })
        });
        const data = await res.json();
        if (res.ok) {
            showToast('✅ تم إضافة الكتاب بنجاح', 'success');
            closeModal('addBookModal');
            document.getElementById('addBookForm').reset();
            document.getElementById('bookCover').value = '';
            loadBooks();
            if (currentPage === 'my-books') loadMyBooks();
        } else {
            showToast(`❌ ${data.message}`, 'error');
        }
    } catch (error) {
        console.error('خطأ في إضافة الكتاب:', error);
        showToast('❌ فشل الاتصال بالخادم', 'error');
    }
});

// ============================================================
// الملف الشخصي
// ============================================================
async function loadProfile() {
    const token = localStorage.getItem('token');
    if (!token) {
        navigateTo('home');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/users/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('فشل في جلب الملف الشخصي');
        const user = await res.json();

        let points = 0;
        try {
            const pointsRes = await fetch(`${API_BASE}/users/me/points`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (pointsRes.ok) {
                const pointsData = await pointsRes.json();
                points = pointsData.points || 0;
            }
        } catch (e) {}

        // ===== حساب المستوى والنقاط المطلوبة =====
        let level = user.level || 'برونز';
        let nextLevelPoints = user.levelPoints || 50;
        let progress = 0;
        
        // حساب التقدم للمستوى التالي
        if (nextLevelPoints) {
            const prevLevelPoints = getPreviousLevelPoints(user.points || 0);
            progress = ((user.points - prevLevelPoints) / (nextLevelPoints - prevLevelPoints)) * 100;
            progress = Math.min(100, Math.max(0, progress));
        }

        // ===== جلب الشارات الخاصة =====
        let badges = [];
        try {
            const badgesRes = await fetch(`${API_BASE}/users/badges`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (badgesRes.ok) {
                const badgesData = await badgesRes.json();
                badges = badgesData.badges || [];
            }
        } catch (e) {}

        document.getElementById('profileContent').innerHTML = `
            <div style="max-width:650px;margin:0 auto;background:#fff;padding:1.5rem;border-radius:var(--radius);box-shadow:var(--shadow);">
                <div style="text-align:center;margin-bottom:1rem;">
                    <div style="width:80px;height:80px;border-radius:50%;background:var(--beige);margin:0 auto;display:flex;align-items:center;justify-content:center;font-size:2.5rem;border:2px solid var(--gold);overflow:hidden;">
                        ${user.profileImage ? `<img src="${user.profileImage}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` : '👤'}
                    </div>
                    <h3 style="color:var(--brown);margin-top:0.5rem;">${user.name}</h3>
                    <p style="color:#888;"><i class="fas fa-envelope"></i> ${user.email}</p>
                    <p style="color:#888;"><i class="fas fa-phone"></i> ${user.phone}</p>
                    <p style="color:#888;"><i class="fas fa-map-marker-alt"></i> ${user.city}</p>
                    
                    <!-- ===== التقييم ===== -->
                    <div style="margin:0.5rem 0;">
                        <span style="color:var(--gold);font-size:1.2rem;">${'★'.repeat(Math.floor(user.rating || 0))}${(user.rating || 0) % 1 >= 0.5 ? '☆' : ''}</span>
                        <span style="color:#888;"> (${user.totalReviews || 0} تقييم)</span>
                    </div>
                    
                    <!-- ===== المستوى ===== -->
                    <div style="margin:0.5rem 0;background:#f9f6f2;padding:0.5rem;border-radius:10px;">
                        <p style="color:var(--gold);font-size:1.2rem;font-weight:bold;">🏅 المستوى: ${level}</p>
                        ${nextLevelPoints ? `
                            <div style="margin-top:0.3rem;">
                                <div style="background:#e8e0d8;border-radius:50px;height:8px;overflow:hidden;max-width:300px;margin:0 auto;">
                                    <div style="background:var(--gold);height:100%;border-radius:50px;width:${progress}%;transition:width 0.5s;"></div>
                                </div>
                                <p style="color:#888;font-size:0.75rem;margin-top:0.2rem;">
                                    ${user.points} / ${nextLevelPoints} نقطة للمستوى التالي
                                </p>
                            </div>
                        ` : `
                            <p style="color:var(--gold);font-size:0.9rem;">👑 أعلى مستوى!</p>
                        `}
                    </div>
                    
                    <!-- ===== النقاط والإحصائيات ===== -->
                    <p style="color:#999;font-size:0.85rem;">📚 ${user.booksCount || 0} كتاب متاح</p>
                    <p style="color:#999;font-size:0.85rem;">🔄 ${user.pendingTrades || 0} طلب قيد الانتظار</p>
                    <p style="color:var(--gold);font-size:1.5rem;font-weight:bold;">⭐ ${points} نقطة</p>
                    
                    ${user.bio ? `<p style="color:#666;font-size:0.9rem;margin-top:0.5rem;background:#f9f6f2;padding:0.5rem;border-radius:8px;">💬 ${user.bio}</p>` : ''}
                    <button class="btn-outline btn-sm" style="margin-top:0.5rem;" onclick="updateLocation()"><i class="fas fa-map-marker-alt"></i> تحديث موقعي</button>
                </div>
                <hr style="border-color:#eee;margin:1rem 0;">

                <!-- ===== شرح النقاط ===== -->
                ${getPointsExplanation()}

                <!-- ===== الإنجازات ===== -->
                ${user.achievements && user.achievements.length > 0 ? `
                    <div style="background:#f9f6f2;padding:1rem;border-radius:12px;margin:1rem 0;border:1px solid #e8e0d8;">
                        <h4 style="color:var(--brown);margin-bottom:0.5rem;">🏆 إنجازاتي (${user.achievements.length})</h4>
                        <div style="display:flex;flex-wrap:wrap;gap:0.5rem;">
                            ${user.achievements.map(a => `<span style="background:var(--gold);color:#fff;padding:0.3rem 0.8rem;border-radius:50px;font-size:0.8rem;font-weight:600;">🏅 ${a}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- ===== الشارات الخاصة ===== -->
                ${badges && badges.length > 0 ? `
                    <div style="background:linear-gradient(135deg,#667eea15 0%,#764ba215 100%);padding:1rem;border-radius:12px;margin:1rem 0;border:1px solid #b8d4e3;">
                        <h4 style="color:var(--brown);margin-bottom:0.5rem;">🎖️ شاراتي الخاصة</h4>
                        <div style="display:flex;flex-wrap:wrap;gap:0.5rem;">
                            ${badges.map(b => `<span style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;padding:0.3rem 0.8rem;border-radius:50px;font-size:0.8rem;font-weight:600;box-shadow:0 2px 10px rgba(102,126,234,0.3);">${b}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}

                <hr style="border-color:#eee;margin:1rem 0;">
                <form id="profileForm">
                    <div class="form-group"><label>الاسم</label><input type="text" id="profName" value="${user.name}" /></div>
                    <div class="form-group"><label>رقم الهاتف</label><input type="tel" id="profPhone" value="${user.phone}" /></div>
                    <div class="form-group"><label>المدينة</label><input type="text" id="profCity" value="${user.city}" /></div>
                    <div class="form-group"><label>العنوان</label><input type="text" id="profAddress" value="${user.address || ''}" /></div>
                    <div class="form-group"><label>نبذة عنك</label><textarea id="profBio" rows="2">${user.bio || ''}</textarea></div>
                    <button type="submit" class="btn-gold" style="width:100%;padding:0.7rem;"><i class="fas fa-save"></i> تحديث الملف</button>
                </form>
                <button class="btn-gold btn-sm" style="width:100%;margin-top:0.5rem;padding:0.5rem;" onclick="openModal('changePasswordModal')"><i class="fas fa-key"></i> تغيير كلمة المرور</button>
                <button class="btn-danger" style="width:100%;margin-top:0.5rem;padding:0.7rem;" onclick="deleteAccount()"><i class="fas fa-user-slash"></i> حذف الحساب</button>
            </div>
        `;

        document.getElementById('profileForm').addEventListener('submit', updateProfile);

    } catch (error) {
        console.error('خطأ في تحميل الملف الشخصي:', error);
        showToast('❌ فشل في تحميل الملف الشخصي', 'error');
    }
}

// ============================================================
// دالة مساعدة لحساب النقاط السابقة للمستوى
// ============================================================
function getPreviousLevelPoints(points) {
    if (points >= 500) return 300;
    if (points >= 300) return 150;
    if (points >= 150) return 50;
    if (points >= 50) return 0;
    return 0;
}

async function updateProfile(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const name = document.getElementById('profName').value.trim();
    const phone = document.getElementById('profPhone').value.trim();
    const city = document.getElementById('profCity').value.trim();
    const address = document.getElementById('profAddress').value.trim();
    const bio = document.getElementById('profBio').value.trim();

    try {
        const res = await fetch(`${API_BASE}/users/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name, phone, city, address, bio })
        });
        const data = await res.json();
        if (res.ok) {
            showToast('✅ تم تحديث الملف الشخصي', 'success');
            if (currentUser) {
                currentUser.name = name;
                currentUser.phone = phone;
                currentUser.city = city;
                localStorage.setItem('user', JSON.stringify(currentUser));
                updateUI();
            }
            loadProfile();
        } else {
            showToast(`❌ ${data.message}`, 'error');
        }
    } catch {
        showToast('❌ فشل الاتصال', 'error');
    }
}

function updateLocation() {
    if (!navigator.geolocation) {
        showToast('❌ متصفحك لا يدعم تحديد الموقع', 'error');
        return;
    }
    showToast('⏳ جاري تحديد موقعك...', 'info');
    navigator.geolocation.getCurrentPosition(
        async (pos) => {
            const { latitude, longitude } = pos.coords;
            const token = localStorage.getItem('token');
            try {
                const res = await fetch(`${API_BASE}/users/profile`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ lat: latitude, lng: longitude })
                });
                if (res.ok) {
                    showToast('✅ تم تحديث موقعك', 'success');
                    loadProfile();
                } else {
                    showToast('❌ فشل في تحديث الموقع', 'error');
                }
            } catch {
                showToast('❌ فشل الاتصال', 'error');
            }
        },
        () => {
            showToast('❌ فشل تحديد الموقع. تأكد من السماح بالوصول.', 'error');
        }
    );
}

async function deleteAccount() {
    if (!confirm('⚠️ هل أنت متأكد من حذف حسابك؟ هذا الإجراء لا يمكن التراجع عنه.')) return;
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`${API_BASE}/users/me`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            showToast('✅ تم حذف حسابك', 'success');
            logout();
        } else {
            const data = await res.json();
            showToast(`❌ ${data.message}`, 'error');
        }
    } catch {
        showToast('❌ فشل الاتصال', 'error');
    }
}
// ============================================================
// البحث عن القراء القريبين
// ============================================================
async function findNearbyReaders() {
    const container = document.getElementById('nearbyResults');
    if (!container) return;

    container.innerHTML = '<p style="color:#f5b042;">⏳ جاري تحديد موقعك...</p>';

    if (!navigator.geolocation) {
        container.innerHTML = `
            <p style="color:#e74c3c;">❌ متصفحك لا يدعم تحديد الموقع.</p>
            <button class="btn-outline btn-sm" onclick="showCitySearch()">🔍 بحث حسب المدينة</button>
        `;
        return;
    }

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const { latitude, longitude } = position.coords;
            container.innerHTML = '<p style="color:#f5b042;">🔍 جاري البحث عن القراء القريبين...</p>';

            try {
                const token = localStorage.getItem('token');
                const url = `${API_BASE}/users/nearby?lat=${latitude}&lng=${longitude}&radius=30`;
                const res = await fetch(url, {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                });

                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}));
                    throw new Error(errorData.message || `الخادم رد بـ ${res.status}`);
                }

                const data = await res.json();
                const users = Array.isArray(data) ? data : [];

                if (users.length === 0) {
                    container.innerHTML = `
                        <p style="color:#888;">😕 لا يوجد قراء قريبون ضمن 30 كم.</p>
                        <button class="btn-outline btn-sm" onclick="showCitySearch()">🔍 بحث حسب المدينة</button>
                    `;
                    return;
                }

                container.innerHTML = `
                    <h3 style="color:var(--brown);margin-bottom:0.5rem;">✅ تم العثور على ${users.length} قارئ قريب</h3>
                    <div class="grid-3">
                        ${users.map(u => `
                            <div class="book-card" style="padding:1rem;">
                                <div style="display:flex;align-items:center;gap:10px;margin-bottom:0.5rem;">
                                    <div style="width:50px;height:50px;border-radius:50%;background:var(--beige);display:flex;align-items:center;justify-content:center;font-size:1.8rem;overflow:hidden;">
                                        ${u.profileImage ? `<img src="${u.profileImage}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` : '👤'}
                                    </div>
                                    <div>
                                        <strong>${u.name}</strong>
                                        <div style="font-size:0.8rem;color:#888;">⭐ ${u.rating || 0} (${u.totalReviews || 0})</div>
                                        <div style="font-size:0.8rem;color:#888;"><i class="fas fa-map-marker-alt"></i> ${u.city || 'غير محدد'} ${u.distance ? `(${u.distance.toFixed(1)} كم)` : ''}</div>
                                    </div>
                                </div>
                                <button class="btn-trade" onclick="viewUserBooks('${u._id}')"><i class="fas fa-book"></i> عرض كتبه</button>
                            </div>
                        `).join('')}
                    </div>
                `;
            } catch (error) {
                console.error('❌ خطأ في البحث عن القريبين:', error);
                container.innerHTML = `
                    <p style="color:#e74c3c;">❌ ${error.message || 'فشل في البحث. حاول مرة أخرى.'}</p>
                    <button class="btn-outline btn-sm" onclick="showCitySearch()">🔍 بحث حسب المدينة</button>
                    <button class="btn-primary btn-sm" style="margin-right:0.5rem;" onclick="findNearbyReaders()">🔄 إعادة المحاولة</button>
                `;
            }
        },
        (error) => {
            console.warn('❌ فشل تحديد الموقع:', error);
            container.innerHTML = `
                <p style="color:#e74c3c;">❌ لم نتمكن من تحديد موقعك.</p>
                <button class="btn-outline btn-sm" onclick="showCitySearch()">🔍 بحث حسب المدينة</button>
            `;
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
}

function showCitySearch() {
    const container = document.getElementById('nearbyResults');
    if (!container) return;
    container.innerHTML = `
        <div style="max-width:400px;margin:0 auto;">
            <h4 style="color:var(--brown);">🔍 ابحث حسب المدينة</h4>
            <div style="display:flex;gap:0.5rem;margin-top:0.5rem;">
                <input type="text" id="searchCity" placeholder="أدخل اسم المدينة" style="flex:1;padding:0.5rem;border-radius:50px;border:1px solid #ddd;" />
                <button class="btn-primary btn-sm" onclick="searchByCity()"><i class="fas fa-search"></i></button>
            </div>
            <div id="cityResults" style="margin-top:1rem;"></div>
        </div>
    `;
}

async function searchByCity() {
    const city = document.getElementById('searchCity').value.trim();
    if (!city) { showToast('❌ أدخل اسم المدينة', 'error'); return; }
    const container = document.getElementById('cityResults');
    if (!container) return;
    container.innerHTML = '<p style="color:#888;">⏳ جاري البحث...</p>';

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/users?city=${encodeURIComponent(city)}`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.message || `الخادم رد بـ ${res.status}`);
        }

        const users = await res.json();
        const usersArray = Array.isArray(users) ? users : [];

        if (usersArray.length === 0) {
            container.innerHTML = '<p style="color:#888;">😕 لا يوجد قراء في هذه المدينة</p>';
            return;
        }
        container.innerHTML = `
            <h4 style="color:var(--brown);">✅ ${usersArray.length} قارئ في ${city}</h4>
            <div style="display:grid;grid-template-columns:1fr;gap:0.5rem;">
                ${usersArray.map(u => `
                    <div style="background:#fff;padding:0.8rem;border-radius:10px;border:1px solid #eee;display:flex;justify-content:space-between;align-items:center;">
                        <div><strong>${u.name}</strong> (⭐ ${u.rating || 0}) - ${u.city || ''}</div>
                        <button class="btn-trade btn-sm" onclick="viewUserBooks('${u._id}')">عرض كتبه</button>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error('❌ خطأ في البحث حسب المدينة:', error);
        container.innerHTML = `
            <p style="color:#e74c3c;">❌ ${error.message || 'فشل البحث'}</p>
            <button class="btn-primary btn-sm" onclick="searchByCity()">🔄 إعادة المحاولة</button>
        `;
    }
}

async function viewUserBooks(userId) {
    showToast('📚 جاري تحميل كتب المستخدم...', 'info');
    try {
        const res = await fetch(`${API_BASE}/books/user/${userId}`);
        const books = await res.json();
        if (books.length === 0) {
            showToast('📭 هذا المستخدم لا يملك كتباً متاحة', 'info');
            return;
        }
        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.innerHTML = `
            <div class="modal-box" style="max-width:600px;">
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                <h2>📚 كتب المستخدم</h2>
                <div style="display:grid;grid-template-columns:1fr;gap:0.5rem;max-height:400px;overflow-y:auto;">
                    ${books.map(b => `
                        <div style="display:flex;justify-content:space-between;align-items:center;padding:0.5rem;border-bottom:1px solid #eee;">
                            <div>
                                <strong>${b.title}</strong>
                                <div style="font-size:0.8rem;color:#888;">${b.author} - ${b.condition}</div>
                            </div>
                            ${localStorage.getItem('token') && b.isAvailable ? `
                                <button class="btn-primary btn-sm" onclick="openTradeRequest('${b._id}')">طلب تبادل</button>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    } catch {
        showToast('❌ فشل في تحميل الكتب', 'error');
    }
}

// ============================================================
// لوحة المتصدرين (Leaderboard)
// ============================================================
async function loadLeaderboard(tab = 'all') {
    const container = document.getElementById('leaderboardContent');
    if (!container) return;

    try {
        // ===== تبويبات المتصدرين =====
        const tabsHtml = `
            <div style="display:flex;gap:0.5rem;justify-content:center;margin-bottom:1.5rem;flex-wrap:wrap;">
                <button class="btn-filter ${tab === 'all' ? 'active-filter' : ''}" onclick="loadLeaderboard('all')">🏆 الكل</button>
                <button class="btn-filter ${tab === 'monthly' ? 'active-filter' : ''}" onclick="loadLeaderboard('monthly')">📅 شهري</button>
            </div>
        `;

        // ===== جلب البيانات =====
        const url = tab === 'monthly' ? `${API_BASE}/leaderboard/monthly` : `${API_BASE}/leaderboard`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('فشل في جلب المتصدرين');
        const leaders = await res.json();

        // ===== ترتيب المستخدم الحالي =====
        let myRank = null;
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const rankRes = await fetch(`${API_BASE}/leaderboard/my-rank`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (rankRes.ok) {
                    myRank = await rankRes.json();
                }
            } catch (e) {}
        }

        if (leaders.length === 0) {
            container.innerHTML = tabsHtml + `
                <div style="text-align:center;color:#999;padding:2rem;">
                    🏆 لا يوجد متصدرين حتى الآن
                    <br>
                    <span style="font-size:0.85rem;">كن أول من يكسب النقاط!</span>
                </div>
            `;
            return;
        }

        // ===== عرض المتصدرين =====
        const medals = ['🥇', '🥈', '🥉'];
        const colors = ['#FFD700', '#C0C0C0', '#CD7F32'];

        const leadersHtml = `
            <div style="max-width:800px;margin:0 auto;background:#fff;border-radius:var(--radius);box-shadow:var(--shadow);overflow:hidden;border:1px solid #eee;">
                ${leaders.map((user, index) => {
                    const isCurrentUser = currentUser && user._id === currentUser._id;
                    const medal = index < 3 ? medals[index] : `${index + 1}.`;
                    const color = index < 3 ? colors[index] : 'var(--brown)';
                    const monthlyPoints = user.monthlyPoints || user.points || 0;
                    
                    return `
                        <div style="display:flex;align-items:center;gap:1rem;padding:0.8rem 1.5rem;border-bottom:1px solid #f5f0eb;${isCurrentUser ? 'background:#fef9f0;border-right:4px solid var(--gold);' : ''}">
                            <div style="font-size:1.5rem;font-weight:700;color:${color};width:50px;text-align:center;">
                                ${medal}
                            </div>
                            <div style="width:50px;height:50px;border-radius:50%;background:var(--beige);display:flex;align-items:center;justify-content:center;font-size:1.5rem;overflow:hidden;border:2px solid ${color};">
                                ${user.profileImage ? `<img src="${user.profileImage}" style="width:100%;height:100%;object-fit:cover;">` : '👤'}
                            </div>
                            <div style="flex:1;">
                                <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
                                    <span style="font-weight:600;color:var(--brown);font-size:1.1rem;">
                                        ${user.name} ${isCurrentUser ? '👈 (أنت)' : ''}
                                    </span>
                                    <span style="font-size:0.8rem;color:var(--gold);background:var(--beige);padding:0.1rem 0.6rem;border-radius:50px;">
                                        🏅 ${user.level || 'برونز'}
                                    </span>
                                </div>
                                <div style="color:#888;font-size:0.85rem;">
                                    📚 ${user.totalTrades || 0} تبادل • ⭐ ${user.rating || 0} تقييم
                                    ${user.city ? `• 📍 ${user.city}` : ''}
                                    ${tab === 'monthly' ? `• 📅 هذا الشهر: ${monthlyPoints} نقطة` : ''}
                                </div>
                            </div>
                            <div style="text-align:center;">
                                <div style="font-size:1.5rem;font-weight:700;color:var(--gold);">⭐ ${tab === 'monthly' ? monthlyPoints : user.points || 0}</div>
                                <div style="font-size:0.7rem;color:#888;">نقطة</div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
            ${myRank ? `
                <div style="text-align:center;margin-top:1.5rem;background:#fcf9f5;padding:1rem;border-radius:var(--radius);border:1px solid #e8e0d8;">
                    <span style="color:var(--gold);font-weight:700;">⭐ ترتيبك: #${myRank.rank}</span>
                    <span style="color:#888;margin-right:0.5rem;">|</span>
                    <span style="color:var(--brown);">${myRank.points} نقطة</span>
                    ${myRank.level ? `<span style="color:#888;margin-right:0.5rem;">|</span><span style="color:var(--gold);">🏅 ${myRank.level}</span>` : ''}
                </div>
            ` : `
                <div style="text-align:center;margin-top:1.5rem;color:#888;">
                    🔑 <a href="#" onclick="openModal('loginModal')" style="color:var(--gold);">سجل دخولك</a> لترى ترتيبك
                </div>
            `}
        `;

        container.innerHTML = tabsHtml + leadersHtml;

    } catch (error) {
        console.error('❌ خطأ في تحميل المتصدرين:', error);
        container.innerHTML = `
            <div style="text-align:center;color:#e74c3c;padding:2rem;">
                ❌ فشل في تحميل المتصدرين
                <br>
                <button class="btn-primary btn-sm" style="margin-top:0.5rem;" onclick="loadLeaderboard('${tab}')">🔄 إعادة المحاولة</button>
            </div>
        `;
    }
}
// ============================================================
// نظام الإشعارات الفورية
// ============================================================
function loadNotifications() {
    try {
        const stored = localStorage.getItem('notifications');
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

function saveNotifications(notifs) {
    localStorage.setItem('notifications', JSON.stringify(notifs));
}

function addNotification(title, message, type = 'info', link = null) {
    const notifs = loadNotifications();
    const newNotif = {
        id: Date.now(),
        title,
        message,
        type,
        link,
        read: false,
        timestamp: new Date().toISOString()
    };
    notifs.unshift(newNotif);
    if (notifs.length > 50) notifs.pop();
    saveNotifications(notifs);
    updateNotificationUI();
    const icon = type === 'trade' ? '🔄' : type === 'achievement' ? '🏆' : '📬';
    showToast(`${icon} ${title}`, 'info');
}

function updateNotificationUI() {
    const notifs = loadNotifications();
    const unreadCount = notifs.filter(n => !n.read).length;
    
    const badge = document.getElementById('notifBadge');
    if (badge) {
        if (unreadCount > 0) {
            badge.style.display = 'inline-block';
            badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        } else {
            badge.style.display = 'none';
        }
    }

    const list = document.getElementById('notifList');
    if (!list) return;

    if (notifs.length === 0) {
        list.innerHTML = '<p style="color:#999;text-align:center;padding:1rem;">📭 لا توجد إشعارات</p>';
        return;
    }

    list.innerHTML = notifs.slice(0, 10).map(n => `
        <div class="notif-item" style="padding:0.5rem 0.8rem;border-bottom:1px solid #f5f0eb;${n.read ? '' : 'background:#fef9f0;border-right:3px solid #c9a050;'}">
            <div style="display:flex;justify-content:space-between;align-items:start;">
                <div style="flex:1;">
                    <div style="font-weight:600;font-size:0.9rem;color:#2c1810;">${n.title}</div>
                    <div style="font-size:0.8rem;color:#666;">${n.message}</div>
                    <div style="font-size:0.65rem;color:#999;margin-top:0.2rem;">${formatDate(n.timestamp)}</div>
                </div>
                ${!n.read ? `<span style="background:#c9a050;border-radius:50%;width:8px;height:8px;display:inline-block;flex-shrink:0;margin-top:0.3rem;"></span>` : ''}
            </div>
            ${n.link ? `<a href="${n.link}" style="font-size:0.75rem;color:#c9a050;text-decoration:none;" onclick="event.stopPropagation();">عرض التفاصيل →</a>` : ''}
        </div>
    `).join('');
}

// ============================================================
// قائمة الإشعارات المنبثقة
// ============================================================
function toggleNotifications() {
    const dropdown = document.getElementById('notifDropdown');
    if (!dropdown) return;

    if (dropdown.style.display === 'block') {
        dropdown.style.display = 'none';
    } else {
        dropdown.style.display = 'block';
        updateNotificationUI();
    }
}

function markAllNotificationsRead() {
    const notifs = loadNotifications();
    let changed = false;
    notifs.forEach(n => { if (!n.read) { n.read = true; changed = true; } });
    if (changed) {
        saveNotifications(notifs);
        updateNotificationUI();
    }
}

function clearAllNotifications() {
    if (confirm('هل أنت متأكد من مسح جميع الإشعارات؟')) {
        saveNotifications([]);
        updateNotificationUI();
        showToast('🗑️ تم مسح جميع الإشعارات', 'info');
    }
}

// ============================================================
// تغيير كلمة المرور
// ============================================================
document.getElementById('changePasswordForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) { showToast('❌ يرجى تسجيل الدخول', 'error'); return; }

    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (newPassword !== confirmPassword) {
        showToast('❌ كلمة المرور الجديدة غير متطابقة', 'error');
        return;
    }
    if (newPassword.length < 6) {
        showToast('❌ كلمة المرور يجب أن لا تقل عن 6 أحرف', 'error');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/auth/change-password`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ oldPassword, newPassword })
        });
        const data = await res.json();
        if (res.ok) {
            showToast('✅ تم تغيير كلمة المرور بنجاح', 'success');
            closeModal('changePasswordModal');
            document.getElementById('changePasswordForm').reset();
        } else {
            showToast(`❌ ${data.message}`, 'error');
        }
    } catch {
        showToast('❌ فشل الاتصال', 'error');
    }
});

// ============================================================
// تهيئة التطبيق
// ============================================================
async function init() {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
        try {
            const user = JSON.parse(storedUser);
            if (user.id && !user._id) {
                user._id = user.id;
            }
            currentUser = user;
            updateUI();
            initSocket();
        } catch (e) {
            console.warn('⚠️ فشل تحميل المستخدم:', e);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            currentUser = null;
        }
    }

    updateUI();
    await loadBooks();

    const today = new Date().toISOString().split('T')[0];
    document.querySelectorAll('input[type="date"]').forEach(el => {
        if (!el.value) el.setAttribute('min', today);
    });

    console.log('📚 منصة تبادل الكتب – النسخة الاحترافية');
    console.log('✅ API يعمل على:', API_BASE);
    console.log('👤 المستخدم:', currentUser?.name || 'غير مسجل');
}

document.addEventListener('DOMContentLoaded', init);
