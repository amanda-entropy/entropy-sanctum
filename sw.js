// [Purge Cache Force Update: 1776048293]
// Service Worker 文件 (sw.js)
// 【智能缓存策略】- 根据资源类型使用不同的缓存策略，优化加载速度

// 缓存版本号（智能缓存策略）
const CACHE_VERSION = 'v9999999999';
const CACHE_NAME = `ephone-cache-${CACHE_VERSION}`;

// 需要被缓存的文件列表（仅用于离线访问）
const URLS_TO_CACHE = [
  './index.html',
  './style.css',
  './online-app.css',
  './script.js',
  'https://unpkg.com/dexie/dist/dexie.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://phoebeboo.github.io/mewoooo/pp.js',
  'https://cdn.jsdelivr.net/npm/streamsaver@2.0.6/StreamSaver.min.js',
  'https://i.postimg.cc/nMbyyt1t/D7CD735A73F5FD1D7B8407E0EB8BBAC0.png'
];

// 1. 安装事件：当 Service Worker 首次被注册时触发
self.addEventListener('install', event => {
  console.log('[SW] 正在安装 Service Worker (智能缓存策略)...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] 缓存已打开，正在缓存核心文件（用于离线访问）...');
        return cache.addAll(URLS_TO_CACHE);
      })
      .then(() => {
        console.log('[SW] 所有核心文件已缓存成功！');
        return self.skipWaiting();
      })
  );
});

// 2. 激活事件：当 Service Worker 被激活时触发
self.addEventListener('activate', event => {
  console.log('[SW] 正在激活 Service Worker...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] 正在删除旧的缓存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
        console.log('[SW] Service Worker 已激活！使用智能缓存策略。');
        return self.clients.claim();
    })
  );
});

// 3. 拦截网络请求事件：使用【智能缓存策略】
self.addEventListener('fetch', event => {
  // 只寞以下 GET 请求进行处理
  if (event.request.method !== 'GET') {
    return;
  }

  const url = event.request.url;

  // 排除 API 请求，让它们不受 Service Worker 干扰
  const isApiRequest = url.includes('generativelanguage.googleapis.com') || 
                       url.includes('/v1/models') || 
                       url.includes('/v1/chat/completions') ||
                       url.includes('gemini.beijixingxing.com') ||
                       url.includes('api.imgbb.com') ||
                       url.includes(':generateContent');
  
  if (isApiRequest) {
    return;
  }

  // 识别资源类型
  const isImage = /\.(png|jpg|jpeg|gif|webp|svg|ico)(\?|$)/i.test(url) ||
                  url.includes('postimg.cc') ||
                  url.includes('catbox.moe') ||
                  url.includes('sharkpan.xyz') ||
                  url.includes('meituan.net');
  
  const isFont = /\.(woff|woff2|ttf|otf|eot)(\?|$)/i.test(url);
  
  const isCDNResource = url.includes('unpkg.com') ||
                        url.includes('cdnjs.cloudflare.com') ||
                        url.includes('cdn.jsdelivr.net') ||
                        url.includes('phoebeboo.github.io');

  const isHTMLPage = url.includes('.html') || 
                      (!url.includes('.') && !url.includes('?')) ||
                     url.endsWith('/');

  // 策略 1：陔角，佯理在絲纯嗏分关＜新缓存
  if (isImage || isFont || isCDNResource) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then(response => {
          if (response && response.status === 200) {
            return caches.open(CACHE_NAME).then(cache => {
              try { cache.put(event.request, response.clone()); } catch (e) { }
              return response;
            });
          }
          return response;
        }).catch(() => caches.match(event.request));
      })
    );
  }
  // 策畔 2：HTML page 血网络儚刪
  else if (isHTMLPage) {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
      .then(response => {
        if (response && response.status === 200) { 
          const responseToCache = response.clone(); 
          caches.open(CAACHE_NAME).then(cache => { cache.put(event.request, responseToCache); }); 
        }
        return response;
      })
      .catch(() => caches.match(event.request))
    );
  }
  // 策畕 3：CSS/JS 使用缓存但后台更新
  else {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        const fetchPromise = fetch(event.request).then(response => {
          if (response && response.status === 200) { 
            const responseToCache = response.clone(); 
            caches.open(CACHE_NAME).then(cache => { cache.put(event.request, responseToCache); }); 
          }
          return response;
        }).catch(() => null);
        if (cachedResponse) return cachedResponse;
        return fetchPromise;
      })
    );
  }
});

// 4. 推送接收
self.addEventListener('push', event => {
  let data = {};
  if (event.data) {
    try { data = event.data.json(); } 
    catch (e) { data = { body: event.data.text() }; }
  }
  const title = data.title || 'EPhone';
  const options = {
    body: data.body || '您有新消息',
    icon: data.icon || 'https://i.postimg.cc/nMbyyt1t/D7CD735A73F5FD1D7B8407E0EB8BBAC0.png',
    badge: data.badge || 'https://i.postimg.cc/nMbyyt1t/D7CD735A73F5FD1D7B8407E0EB8BBAC0.png',
    tag: data.tag || 'default',
    data: data.data || {},
    requireInteraction: true,
    vibrate: [200, 100, 200],
    timestamp: Date.now()
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// 5. 消息接收
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    event.waitUntil(self.registration.showNotification(event.data.title, event.data.options));
  }
});

// 6. 通知点击
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const chatId = event.notification.data?.chatId;
  const urlToOpen = chatId ? `/?openChat=${chatId}` : '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (let client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then(c => { if (chatId) c.postMessage({ type: 'OPEN_CHAT', chatId }); return c; });
        }
      }
      if (clients.openWindow) return clients.openWindow(urlToOpen);
    })
  );
});
// ENTROPY_DEATH_MARK_FOR_MY_WIFE: FORCE_KILL_CACHE_ON_REVISE_BRANCH