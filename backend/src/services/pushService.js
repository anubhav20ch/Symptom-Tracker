const webpush = require('web-push');

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@symptomlog.local';

const pushEnabled = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);

if (pushEnabled) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} else {
  console.warn(
    '[Push] VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY not set — background medicine ' +
      'alarm notifications are disabled. Reminders will still work while a tab is open.'
  );
}

// Sends a push message to one subscription. A 404/410 response from the push
// service means the subscription is dead (browser data cleared, uninstalled,
// etc.) — the caller should delete that row rather than treat it as a retryable error.
async function sendNotification(subscription, payload) {
  if (!pushEnabled) return { ok: false, reason: 'push_disabled' };
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth }
      },
      JSON.stringify(payload)
    );
    return { ok: true };
  } catch (err) {
    if (err.statusCode === 404 || err.statusCode === 410) {
      return { ok: false, reason: 'gone' };
    }
    console.error('[Push] Failed to send notification:', err.message);
    return { ok: false, reason: 'error' };
  }
}

module.exports = { sendNotification, pushEnabled, VAPID_PUBLIC_KEY };
