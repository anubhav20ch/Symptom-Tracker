const cron = require('node-cron');
const { query } = require('../config/db');
const { sendNotification, pushEnabled } = require('./pushService');

// Runs once a minute, server-side, independent of any open browser tab.
// This is what makes the medicine alarm a real alarm: it fires from the
// backend process (as long as the backend is running) and pushes a system
// notification to every subscribed device, rather than relying on a
// setInterval inside a React component that only runs while a tab is open.
function pad(n) {
  return String(n).padStart(2, '0');
}

async function checkAndNotify() {
  const now = new Date();
  const currentTimeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const nowIso = now.toISOString();

  let due;
  try {
    due = await query(
      `SELECT r.*, u.id AS uid
       FROM reminders r
       JOIN users u ON u.id = r.user_id
       WHERE r.active = 1
         AND r.scheduled_time = $1
         AND (r.expires_at IS NULL OR r.expires_at > $2)
         AND (r.last_notified_at IS NULL OR r.last_notified_at < $3)`,
      [currentTimeStr, nowIso, new Date(now.getTime() - 55 * 1000).toISOString()]
    );
  } catch (err) {
    console.error('[ReminderScheduler] Failed to query due reminders:', err.message);
    return;
  }

  for (const reminder of due.rows) {
    await query('UPDATE reminders SET last_notified_at = $1 WHERE id = $2', [nowIso, reminder.id]);

    if (!pushEnabled) continue;

    const subsRes = await query('SELECT * FROM push_subscriptions WHERE user_id = $1', [
      reminder.user_id
    ]);
    const payload = {
      title: '💊 Medicine Reminder',
      body: reminder.label || 'Time to take your scheduled dose',
      reminderId: reminder.id,
      scheduledTime: reminder.scheduled_time
    };

    for (const sub of subsRes.rows) {
      const result = await sendNotification(sub, payload);
      if (!result.ok && result.reason === 'gone') {
        await query('DELETE FROM push_subscriptions WHERE id = $1', [sub.id]);
      }
    }
  }
}

function startReminderScheduler() {
  cron.schedule('* * * * *', () => {
    checkAndNotify().catch((err) => console.error('[ReminderScheduler] Unexpected error:', err));
  });
  console.log('[ReminderScheduler] Started — checking due medicine alarms every minute.');
}

module.exports = { startReminderScheduler, checkAndNotify };
