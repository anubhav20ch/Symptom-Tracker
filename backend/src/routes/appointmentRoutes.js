const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { parsePagination, paginatedResponse } = require('../utils/pagination');
const { sendError } = require('../utils/apiError');
const { validateBody, appointmentCreateSchema, appointmentUpdateSchema } = require('../middleware/validate');
const { hasSlotConflict, recordStatusChange, notifyCounterpart } = require('../utils/appointments');

// GET /api/appointments - List appointments with linked symptom entry details (API-3, PERF-5)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const countResult = await query(
      'SELECT COUNT(*) as total FROM appointments WHERE user_id = $1',
      [req.user.id]
    );
    const total = parseInt(countResult.rows[0]?.total ?? 0, 10);

    const result = await query(
      `SELECT
        a.*,
        se.severity as entry_severity,
        se.started_at as entry_started_at,
        s.name as entry_symptom_name,
        d.name as linked_doctor_name,
        d.specialty as linked_doctor_specialty
       FROM appointments a
       LEFT JOIN symptom_entries se ON a.entry_id = se.id
       LEFT JOIN symptoms s ON se.symptom_id = s.id
       LEFT JOIN doctors d ON a.doctor_id = d.id
       WHERE a.user_id = $1
       ORDER BY a.scheduled_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );
    res.json(paginatedResponse('appointments', result.rows, total, { limit, offset }));
  } catch (err) {
    req.log?.error({ err: err.message }, 'get appointments failed');
    sendError(res, 500, 'Failed to fetch appointments');
  }
});

// POST /api/appointments - Create appointment
router.post('/', authenticateToken, validateBody(appointmentCreateSchema), async (req, res) => {
  try {
    const {
      entry_id,
      doctor_name,
      doctor_id,
      specialty,
      scheduled_at,
      status = 'scheduled',
      notes
    } = req.body;

    const scheduledDate = new Date(scheduled_at).toISOString();

    // APPT-6: no double-booking the same physician for an overlapping slot.
    if (await hasSlotConflict(doctor_id, scheduledDate)) {
      return sendError(res, 409, 'This physician already has an appointment within 30 minutes of that time. Please choose another slot.', {
        code: 'APPOINTMENT_SLOT_CONFLICT'
      });
    }

    const insertRes = await query(
      `INSERT INTO appointments (user_id, entry_id, doctor_name, doctor_id, specialty, scheduled_at, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        req.user.id,
        entry_id || null,
        doctor_name,
        doctor_id || null,
        specialty,
        scheduledDate,
        status,
        notes
      ]
    );

    let created = insertRes.rows[0];
    if (!created) {
      const fetchA = await query(
        'SELECT * FROM appointments WHERE user_id = $1 ORDER BY id DESC LIMIT 1',
        [req.user.id]
      );
      created = fetchA.rows[0];
    }

    await recordStatusChange(created.id, null, created.status, 'patient', req.user.id);

    res.status(201).json({ message: 'Appointment scheduled successfully', appointment: created });
  } catch (err) {
    console.error('[Create appointment error]:', err);
    sendError(res, 500, 'Failed to schedule appointment');
  }
});

// PUT /api/appointments/:id - Update appointment
router.put('/:id', authenticateToken, validateBody(appointmentUpdateSchema), async (req, res) => {
  try {
    const { entry_id, doctor_name, doctor_id, specialty, scheduled_at, status, notes } = req.body;
    const scheduledDate = scheduled_at ? new Date(scheduled_at).toISOString() : undefined;

    const current = await query('SELECT * FROM appointments WHERE id = $1 AND user_id = $2', [
      req.params.id,
      req.user.id
    ]);
    if (current.rows.length === 0) {
      return sendError(res, 404, 'Appointment not found');
    }
    const before = current.rows[0];

    // APPT-6: re-check the slot if the time or the assigned physician is
    // changing, excluding this appointment's own existing row.
    const effectiveDoctorId = doctor_id !== undefined ? doctor_id : before.doctor_id;
    const effectiveScheduledAt = scheduledDate || before.scheduled_at;
    if (
      (scheduledDate || doctor_id !== undefined) &&
      (await hasSlotConflict(effectiveDoctorId, effectiveScheduledAt, before.id))
    ) {
      return sendError(res, 409, 'This physician already has an appointment within 30 minutes of that time. Please choose another slot.', {
        code: 'APPOINTMENT_SLOT_CONFLICT'
      });
    }

    await query(
      `UPDATE appointments
       SET entry_id = COALESCE($1, entry_id),
           doctor_name = COALESCE($2, doctor_name),
           doctor_id = COALESCE($3, doctor_id),
           specialty = COALESCE($4, specialty),
           scheduled_at = COALESCE($5, scheduled_at),
           status = COALESCE($6, status),
           notes = COALESCE($7, notes)
       WHERE id = $8 AND user_id = $9`,
      [
        entry_id,
        doctor_name,
        doctor_id,
        specialty,
        scheduledDate,
        status,
        notes,
        req.params.id,
        req.user.id
      ]
    );

    const updated = await query('SELECT * FROM appointments WHERE id = $1 AND user_id = $2', [
      req.params.id,
      req.user.id
    ]);

    if (status && status !== before.status) {
      await recordStatusChange(before.id, before.status, status, 'patient', req.user.id);
    }

    // APPT-9: a reschedule or cancellation by the patient notifies the
    // assigned physician, if there is one.
    const isReschedule = scheduledDate && scheduledDate !== before.scheduled_at;
    const isCancellation = status === 'cancelled' && before.status !== 'cancelled';
    if ((isReschedule || isCancellation) && effectiveDoctorId) {
      const docRes = await query('SELECT email FROM doctors WHERE id = $1', [effectiveDoctorId]);
      await notifyCounterpart({
        appointment: updated.rows[0],
        action: isCancellation ? 'cancelled' : 'rescheduled',
        counterpartEmail: docRes.rows[0]?.email,
        counterpartLabel: 'doctor'
      });
    }

    res.json({ message: 'Appointment updated successfully', appointment: updated.rows[0] });
  } catch (err) {
    sendError(res, 500, 'Failed to update appointment');
  }
});

// PATCH /api/appointments/:id/status - Quick status update
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['scheduled', 'completed', 'cancelled'].includes(status)) {
      return sendError(res, 400, 'Invalid status. Choose scheduled, completed, or cancelled');
    }

    const check = await query('SELECT * FROM appointments WHERE id = $1 AND user_id = $2', [
      req.params.id,
      req.user.id
    ]);
    if (check.rows.length === 0) {
      return sendError(res, 404, 'Appointment not found');
    }
    const before = check.rows[0];

    await query('UPDATE appointments SET status = $1 WHERE id = $2 AND user_id = $3', [
      status,
      req.params.id,
      req.user.id
    ]);
    const updated = await query('SELECT * FROM appointments WHERE id = $1', [req.params.id]);

    await recordStatusChange(before.id, before.status, status, 'patient', req.user.id);

    if (status === 'cancelled' && before.status !== 'cancelled' && before.doctor_id) {
      const docRes = await query('SELECT email FROM doctors WHERE id = $1', [before.doctor_id]);
      await notifyCounterpart({
        appointment: updated.rows[0],
        action: 'cancelled',
        counterpartEmail: docRes.rows[0]?.email,
        counterpartLabel: 'doctor'
      });
    }

    res.json({
      message: `Appointment status updated to ${status}`,
      status,
      appointment: updated.rows[0]
    });
  } catch (err) {
    sendError(res, 500, 'Failed to update status');
  }
});

// DELETE /api/appointments/:id - Delete appointment. APPT-9: deleting is a
// cancellation from the assigned physician's point of view, so it gets the
// same counterpart notification a status-change cancellation would.
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const existing = await query('SELECT * FROM appointments WHERE id = $1 AND user_id = $2', [
      req.params.id,
      req.user.id
    ]);
    if (existing.rows.length === 0) {
      return sendError(res, 404, 'Appointment not found');
    }
    const appointment = existing.rows[0];

    const del = await query('DELETE FROM appointments WHERE id = $1 AND user_id = $2', [
      req.params.id,
      req.user.id
    ]);
    if (del.rowCount === 0) {
      return sendError(res, 404, 'Appointment not found');
    }

    if (appointment.doctor_id) {
      const docRes = await query('SELECT email FROM doctors WHERE id = $1', [appointment.doctor_id]);
      await notifyCounterpart({
        appointment,
        action: 'cancelled',
        counterpartEmail: docRes.rows[0]?.email,
        counterpartLabel: 'doctor'
      });
    }

    res.json({ message: 'Appointment deleted' });
  } catch (err) {
    sendError(res, 500, 'Failed to delete appointment');
  }
});

// GET /api/appointments/:id/status-history - APPT-8: the full history,
// not just the current status column.
router.get('/:id/status-history', authenticateToken, async (req, res) => {
  try {
    const owns = await query('SELECT id FROM appointments WHERE id = $1 AND user_id = $2', [
      req.params.id,
      req.user.id
    ]);
    if (owns.rows.length === 0) {
      return sendError(res, 404, 'Appointment not found');
    }
    const history = await query(
      'SELECT * FROM appointment_status_history WHERE appointment_id = $1 ORDER BY created_at ASC',
      [req.params.id]
    );
    res.json({ status_history: history.rows });
  } catch (err) {
    sendError(res, 500, 'Failed to fetch status history');
  }
});

module.exports = router;
