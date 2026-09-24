// Minimal service worker: Android Chrome can only show notifications
// through one (the plain Notification constructor is not allowed there).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// Tapping a notification brings the app back to the front.
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
    if (wins.length) return wins[0].focus();
    return self.clients.openWindow('/');
  }));
});
