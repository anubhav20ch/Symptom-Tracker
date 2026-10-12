const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { parsePagination, paginatedResponse } = require('../utils/pagination');
const { sendError } = require('../utils/apiError');

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
router.post('/', authenticateToken, async (req, res) => {
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
    if (!scheduled_at) {
      return sendError(res, 400, 'Scheduled date and time are required');
    }

    const scheduledDate = new Date(scheduled_at).toISOString();

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

    res.status(201).json({ message: 'Appointment scheduled successfully', appointment: created });
  } catch (err) {
    console.error('[Create appointment error]:', err);
    sendError(res, 500, 'Failed to schedule appointment');
  }
});

// PUT /api/appointments/:id - Update appointment
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { entry_id, doctor_name, doctor_id, specialty, scheduled_at, status, notes } = req.body;
    const scheduledDate = scheduled_at ? new Date(scheduled_at).toISOString() : undefined;

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
    if (updated.rows.length === 0) {
      return sendError(res, 404, 'Appointment not found');
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

    const check = await query('SELECT id FROM appointments WHERE id = $1 AND user_id = $2', [
      req.params.id,
      req.user.id
    ]);
    if (check.rows.length === 0) {
      return sendError(res, 404, 'Appointment not found');
    }

    await query('UPDATE appointments SET status = $1 WHERE id = $2 AND user_id = $3', [
      status,
      req.params.id,
      req.user.id
    ]);
    const updated = await query('SELECT * FROM appointments WHERE id = $1', [req.params.id]);
    res.json({
      message: `Appointment status updated to ${status}`,
      status,
      appointment: updated.rows[0]
    });
  } catch (err) {
    sendError(res, 500, 'Failed to update status');
  }
});

// DELETE /api/appointments/:id - Delete appointment
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const del = await query('DELETE FROM appointments WHERE id = $1 AND user_id = $2', [
      req.params.id,
      req.user.id
    ]);
    if (del.rowCount === 0) {
      return sendError(res, 404, 'Appointment not found');
    }
    res.json({ message: 'Appointment deleted' });
  } catch (err) {
    sendError(res, 500, 'Failed to delete appointment');
  }
});

module.exports = router;
