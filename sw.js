const CACHE = 'asa-routine-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './assets/audio/432Hz.mp3',
  './assets/audio/528Hz.mp3'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

// メインスレッドからの通知予約（ベストエフォート）
let timerHandle = null;
self.addEventListener('message', (e) => {
  const data = e.data || {};
  if (data.type === 'scheduleTimer') {
    if (timerHandle) clearTimeout(timerHandle);
    const delay = data.endTime - Date.now();
    if (delay > 0 && delay < 2147483647) {
      timerHandle = setTimeout(() => {
        timerHandle = null;
        self.registration.showNotification(data.title || 'タイマー終了', {
          body: data.body || '',
          icon: './icon-192.png',
          badge: './icon-192.png',
          tag: 'timer-done',
          vibrate: [200, 100, 200, 100, 200]
        });
      }, delay);
    }
  }
  if (data.type === 'cancelTimer') {
    if (timerHandle) { clearTimeout(timerHandle); timerHandle = null; }
  }
  if (data.type === 'notify') {
    self.registration.showNotification(data.title || 'リマインダー', {
      body: data.body || '',
      icon: './icon-192.png',
      badge: './icon-192.png',
      tag: data.tag || 'reminder',
      vibrate: [120, 60, 120]
    });
  }
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) { if ('focus' in c) return c.focus(); }
      if (clients.openWindow) return clients.openWindow('./index.html');
    })
  );
});
