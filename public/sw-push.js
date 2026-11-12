// EduTask IA - Service Worker Web Push Listener
// Loaded via Workbox importScripts in production (/sw.js) and registered directly in dev mode.

self.addEventListener('push', function (event) {
  let payload = {
    title: 'EduTask IA',
    body: 'Você tem uma nova atualização.',
    url: '/aluno',
    tag: 'edutask-notification',
  };

  try {
    if (event.data) {
      const text = event.data.text();
      try {
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === 'object') {
          payload = { ...payload, ...parsed };
        }
      } catch {
        if (text) payload.body = text;
      }
    }
  } catch {
    // Fallback to default payload
  }

  const options = {
    body: payload.body || '',
    icon: payload.icon || '/pwa-192x192.png',
    badge: payload.badge || '/pwa-192x192.png',
    tag: payload.tag || 'edutask-notification',
    renotify: true,
    vibrate: [150, 80, 150],
    data: {
      url: payload.url || '/aluno',
    },
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || 'EduTask IA', options)
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/aluno';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client && targetUrl) {
            try {
              const target = new URL(targetUrl, self.location.origin).href;
              if (client.url !== target) {
                return client.navigate(target);
              }
            } catch {}
          }
          return client;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
