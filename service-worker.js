// 青年科技学习导航 PWA Service Worker
// 缓存策略：缓存优先（有缓存直接用，不请求网络，省流量；缓存没有才请求并缓存）

const CACHE_NAME = 'qnkjxx-nav-v3';

// 需要缓存的第三方域名（静态资源CDN、图片OSS）
const CACHE_DOMAINS = [
  'qnkjxx.oss-cn-hangzhou.aliyuncs.com',
  'cdn.staticfile.org'
];

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

// 判断是否需要缓存
function shouldCache(url) {
  // 同源资源都缓存
  if (url.origin === location.origin) return true;
  // 第三方域名在白名单里的缓存
  if (CACHE_DOMAINS.some(domain => url.hostname === domain)) return true;
  return false;
}

// 缓存优先策略
self.addEventListener('fetch', (event) => {
  // 只处理 GET 请求
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 不在缓存范围内的请求，直接走网络
  if (!shouldCache(url)) return;

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      // 先从缓存里找
      return cache.match(event.request).then((cached) => {
        if (cached) {
          // 缓存命中，直接返回缓存，不请求网络（省流量）
          return cached;
        }
        // 缓存没命中，请求网络
        return fetch(event.request).then((response) => {
          // 网络成功，存入缓存（只缓存成功的响应）
          if (response.status === 200) {
            cache.put(event.request, response.clone());
          }
          return response;
        }).catch(() => {
          // 网络失败，返回离线提示
          return new Response('网络连接失败，请检查网络后重试', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        });
      });
    })
  );
});
