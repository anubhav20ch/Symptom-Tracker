// Medicine alarm service worker.
//
// Why this exists: a plain React setInterval only runs while its tab is open
// and active. This worker is registered once and then lives independently of
// any tab — the browser wakes it up to handle incoming push messages even if
// every SymptomLog tab is closed, as long as the browser process itself is
// running. That's what turns "reminder" into an actual "alarm".

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = { title: 'Medicine Reminder', body: 'Time to take your scheduled dose' };
  try {
    if (event.data) data = event.data.json();
  } catch {
    // Non-JSON payload: fall back to the default text above.
  }

  const options = {
    body: data.body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: data.reminderId ? `symptomlog-reminder-${data.reminderId}` : 'symptomlog-reminder',
    requireInteraction: true,
    data: { reminderId: data.reminderId, scheduledTime: data.scheduledTime }
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Clicking the notification focuses an existing SymptomLog tab (navigating it
// to the Reminders page) instead of opening a duplicate one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({ type: 'OPEN_REMINDERS', reminderId: event.notification.data?.reminderId });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/reminders');
      }
    })
  );
});
