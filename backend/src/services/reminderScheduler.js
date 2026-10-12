const cron = require('node-cron');
const { query } = require('../config/db');
const { sendNotification, pushEnabled } = require('./pushService');
const { getLocalTimeParts } = require('../utils/timezoneClock');

// Runs once a minute, server-side, independent of any open browser tab.
// This is what makes the medicine alarm a real alarm: it fires from the
// backend process (as long as the backend is running) and pushes a system
// notification to every subscribed device, rather than relying on a
// setInterval inside a React component that only runs while a tab is open.

// REM-10: a dose not acted on within this many minutes of its due time (in
// the patient's own time zone) is automatically marked missed. Tunable --
// 60 minutes is a reasonable default for "did they take this dose today",
// not a clinical guideline.
const MISSED_GRACE_PERIOD_MINUTES = 60;

// REM-9: idempotent dispatch -- a reminder already notified within this
// window is skipped even if it matches the current minute again (clock
// skew, a slow query, two overlapping cron ticks), so the same dose never
// triggers two pushes for one due time.
const DISPATCH_DEDUPE_WINDOW_MS = 55 * 1000;

async function checkAndNotify() {
  const nowIso = new Date().toISOString();

  let active;
  try {
    active = await query(
      `SELECT r.*, u.timezone AS user_timezone
       FROM reminders r
       JOIN users u ON u.id = r.user_id
       WHERE r.active = 1
         AND (r.expires_at IS NULL OR r.expires_at > $1)`,
      [nowIso]
    );
  } catch (err) {
    console.error('[ReminderScheduler] Failed to query active reminders:', err.message);
    return;
  }

  const now = new Date();
  const dedupeCutoff = new Date(now.getTime() - DISPATCH_DEDUPE_WINDOW_MS).toISOString();

  for (const reminder of active.rows) {
    // REM-8: due-time comparison happens in the patient's own time zone,
    // not the server's.
    const { timeStr: localTimeStr } = getLocalTimeParts(reminder.user_timezone, now);
    const isDueNow = reminder.scheduled_time === localTimeStr;
    const alreadyNotifiedRecently = reminder.last_notified_at && reminder.last_notified_at >= dedupeCutoff;

    if (isDueNow && !alreadyNotifiedRecently) {
      await query('UPDATE reminders SET last_notified_at = $1 WHERE id = $2', [nowIso, reminder.id]);
      await dispatchPush(reminder);
    }
  }

  await markMissedDoses(active.rows, now);
}

async function dispatchPush(reminder) {
  if (!pushEnabled) return;

  const subsRes = await query('SELECT * FROM push_subscriptions WHERE user_id = $1', [reminder.user_id]);

  // REM-14: lock-screen-visible text carries no diagnosis, condition name,
  // or medication name -- only this neutral wording, regardless of what
  // the patient named the reminder (which can be arbitrarily specific,
  // e.g. "Morning Blood Pressure & Pain Log").
  const payload = {
    title: 'Medication reminder',
    body: 'You have a scheduled dose due now.',
    reminderId: reminder.id,
    scheduledTime: reminder.scheduled_time
  };

  for (const sub of subsRes.rows) {
    const result = await sendNotification(sub, payload);
    if (!result.ok && result.reason === 'gone') {
      // REM-13: a 404/410 from the push service means this subscription
      // will never succeed again (the browser unregistered it, a profile
      // was reset, etc.) -- stop trying.
      await query('DELETE FROM push_subscriptions WHERE id = $1', [sub.id]);
    }
  }
}

// REM-10: for every active reminder whose due time (in the patient's own
// zone) plus the grace period has already passed today, with no taken or
// skipped log for that date, write a "missed" dose_log row. Runs every
// tick alongside the notification check; the dose_logs UNIQUE(reminder_id,
// dose_date) constraint makes a duplicate insert a no-op race guard rather
// than a bug if two ticks ever overlapped.
async function markMissedDoses(activeReminders, now) {
  for (const reminder of activeReminders) {
    const { dateStr: localDate, timeStr: localTimeStr } = getLocalTimeParts(reminder.user_timezone, now);

    const [schedH, schedM] = reminder.scheduled_time.split(':').map(Number);
    const [nowH, nowM] = localTimeStr.split(':').map(Number);
    const minutesPastDue = nowH * 60 + nowM - (schedH * 60 + schedM);

    if (minutesPastDue < MISSED_GRACE_PERIOD_MINUTES) continue;

    try {
      const existing = await query('SELECT id FROM dose_logs WHERE reminder_id = $1 AND dose_date = $2', [
        reminder.id,
        localDate
      ]);
      if (existing.rows.length > 0) continue;

      await query(
        `INSERT INTO dose_logs (reminder_id, user_id, dose_date, status, note)
         VALUES ($1, $2, $3, 'missed', 'Auto-marked: no action within the grace period')`,
        [reminder.id, reminder.user_id, localDate]
      );
    } catch (err) {
      // A UNIQUE-constraint race (two ticks landing on the same reminder
      // at once) is not an error worth logging; anything else is.
      if (!/unique/i.test(err.message || '')) {
        console.error('[ReminderScheduler] Failed to mark missed dose:', err.message);
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

module.exports = { startReminderScheduler, checkAndNotify, MISSED_GRACE_PERIOD_MINUTES };
