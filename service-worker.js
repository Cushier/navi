// 青年科技学习导航 PWA Service Worker
// 缓存策略：网络优先（有网时永远加载最新，没网时用缓存）

const CACHE_NAME = 'qnkjxx-nav-v1';

// 安装时立即激活
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// 激活时清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 网络优先策略
self.addEventListener('fetch', (event) => {
  // 只处理 GET 请求
  if (event.request.method !== 'GET') return;

  // 只缓存同源资源（不缓存第三方API、外部图片等）
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 网络成功，更新缓存
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // 网络失败，从缓存读取
        return caches.match(event.request).then((cached) => {
          if (cached) {
            return cached;
          }
          // 缓存也没有，返回离线提示
          return new Response('网络连接失败，请检查网络后重试', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        });
      })
  );
});
