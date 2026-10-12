const cron = require('node-cron');
const { query } = require('../config/db');
const { sendNotification, pushEnabled } = require('./pushService');

// APPT-5: send a reminder notification ahead of a scheduled appointment.
// Runs every 15 minutes (appointment reminders don't need minute-level
// precision the way a medicine dose alarm does) and looks for scheduled
// appointments inside the reminder window that haven't been reminded yet.
const REMINDER_WINDOW_HOURS = 24;

async function sendDueAppointmentReminders() {
  const nowIso = new Date().toISOString();
  const windowEndIso = new Date(Date.now() + REMINDER_WINDOW_HOURS * 60 * 60 * 1000).toISOString();

  let due;
  try {
    due = await query(
      `SELECT a.*, u.id AS patient_user_id
       FROM appointments a
       JOIN users u ON u.id = a.user_id
       WHERE a.status = 'scheduled'
         AND a.reminder_sent_at IS NULL
         AND a.scheduled_at > $1
         AND a.scheduled_at <= $2`,
      [nowIso, windowEndIso]
    );
  } catch (err) {
    console.error('[AppointmentReminderScheduler] Failed to query due appointments:', err.message);
    return;
  }

  for (const appt of due.rows) {
    await query('UPDATE appointments SET reminder_sent_at = $1 WHERE id = $2', [nowIso, appt.id]);

    if (!pushEnabled) continue;

    const subsRes = await query('SELECT * FROM push_subscriptions WHERE user_id = $1', [appt.user_id]);
    // Neutral, lock-screen-safe wording -- same principle as REM-14 even
    // though this is a different notification type.
    const payload = {
      title: 'Upcoming appointment',
      body: 'You have an appointment scheduled soon.',
      appointmentId: appt.id
    };

    for (const sub of subsRes.rows) {
      const result = await sendNotification(sub, payload);
      if (!result.ok && result.reason === 'gone') {
        await query('DELETE FROM push_subscriptions WHERE id = $1', [sub.id]);
      }
    }
  }
}

function startAppointmentReminderScheduler() {
  cron.schedule('*/15 * * * *', () => {
    sendDueAppointmentReminders().catch((err) =>
      console.error('[AppointmentReminderScheduler] Unexpected error:', err)
    );
  });
  console.log('[AppointmentReminderScheduler] Started — checking for upcoming appointments every 15 minutes.');
}

module.exports = { startAppointmentReminderScheduler, sendDueAppointmentReminders, REMINDER_WINDOW_HOURS };
