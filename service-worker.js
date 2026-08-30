// 青年科技学习导航 PWA Service Worker
// 缓存策略：Stale-While-Revalidate（后台静默更新）
// 先用缓存显示（秒开），后台偷偷更新缓存，用户下次打开就是最新内容

const CACHE_NAME = 'qnkjxx-nav-v4';

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

// Stale-While-Revalidate 策略
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
        // 后台发起网络请求，更新缓存（不管有没有缓存都更新）
        const networkUpdate = fetch(event.request)
          .then((response) => {
            // 网络成功，更新缓存（同源200，跨域opaque都缓存）
            if (response.status === 200 || response.type === 'opaque') {
              cache.put(event.request, response.clone());
            }
            return response;
          })
          .catch(() => {
            // 网络失败，不处理，用缓存
          });

        // 如果有缓存，直接返回缓存（用户立即看到内容）
        // 如果没有缓存，等待网络请求
        return cached || networkUpdate;
      });
    })
  );
});
