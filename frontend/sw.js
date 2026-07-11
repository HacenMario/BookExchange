// sw.js - Service Worker لتخزين الملفات مؤقتاً وتشغيل التطبيق بدون اتصال

const CACHE_NAME = 'my-pwa-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',     // غيّر حسب ملفاتك
  '/script.js',     // غيّر حسب ملفاتك
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-512x512.png'
];

// تثبيت الـ Service Worker وتخزين الملفات الأساسية
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('تم فتح الكاش وإضافة الملفات');
        return cache.addAll(urlsToCache);
      })
  );
});

// تفعيل الـ Service Worker وتنظيف الكاش القديم
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(name => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    })
  );
});

// استراتيجية "Cache First" ثم طلب الشبكة
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // إذا وجد الملف في الكاش، نرجعه
        if (response) {
          return response;
        }
        // وإلا نطلب من الشبكة ونخزنه مؤقتاً للاستخدام القادم
        return fetch(event.request).then(
          networkResponse => {
            // نتحقق من صحة الاستجابة
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }
            // نخزن النسخة الجديدة
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            return networkResponse;
          }
        );
      })
  );
});