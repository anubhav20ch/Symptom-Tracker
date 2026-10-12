const { query } = require('../config/db');
const { sendMail } = require('../services/mailService');
const logger = require('./logger');

// APPT-6: no appointment duration is modeled anywhere in the schema, so a
// fixed slot width is the simplest conflict rule that's still meaningful --
// two bookings for the same physician within this many minutes of each
// other are treated as overlapping. Tunable; not a clinical guideline.
const SLOT_DURATION_MINUTES = 30;

async function hasSlotConflict(doctorId, scheduledAtIso, excludeAppointmentId = null) {
  if (!doctorId) return false;

  const windowMs = SLOT_DURATION_MINUTES * 60 * 1000;
  const scheduled = new Date(scheduledAtIso).getTime();
  const windowStart = new Date(scheduled - windowMs).toISOString();
  const windowEnd = new Date(scheduled + windowMs).toISOString();

  const params = [doctorId, windowStart, windowEnd];
  let sql = `SELECT id FROM appointments
             WHERE doctor_id = $1
               AND status != 'cancelled'
               AND scheduled_at > $2 AND scheduled_at < $3`;
  if (excludeAppointmentId) {
    sql += ' AND id != $4';
    params.push(excludeAppointmentId);
  }

  const res = await query(sql, params);
  return res.rows.length > 0;
}

// APPT-8: full status history (old -> new, who, when) is retained per
// appointment, independent of whatever the "current" status column says.
async function recordStatusChange(appointmentId, oldStatus, newStatus, actorType, actorId) {
  if (oldStatus === newStatus) return;
  await query(
    `INSERT INTO appointment_status_history (appointment_id, old_status, new_status, changed_by_type, changed_by_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [appointmentId, oldStatus || null, newStatus, actorType, actorId || null]
  );
}

// APPT-9: notify the counterpart party when an appointment is cancelled or
// rescheduled -- the patient if a physician made the change, the
// physician if the patient did. Delivered through the same mail channel
// as password resets (dev outbox locally; a real provider in production,
// see AUTH-14/docs/DECISIONS.md), since there is no other notification
// channel that reaches a physician today (push subscriptions are
// patient-only).
async function notifyCounterpart({ appointment, action, counterpartEmail, counterpartLabel }) {
  if (!counterpartEmail) return;
  try {
    const when = new Date(appointment.scheduled_at).toISOString();
    await sendMail({
      to: counterpartEmail,
      subject: `Appointment ${action}`,
      text: `An appointment scheduled for ${when} has been ${action}. Please check your SymptomLog account for details.`
    });
  } catch (err) {
    // A notification failure must never block the status change itself.
    logger.error({ err: err.message, counterpartLabel }, 'failed to notify appointment counterpart');
  }
}

module.exports = { hasSlotConflict, recordStatusChange, notifyCounterpart, SLOT_DURATION_MINUTES };
