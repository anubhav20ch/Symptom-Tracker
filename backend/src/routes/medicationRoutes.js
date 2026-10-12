const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { parsePagination, paginatedResponse } = require('../utils/pagination');
const { sendError } = require('../utils/apiError');

// GET /api/medications - List user medications with auto-expiry check (API-3, PERF-5)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const nowIso = new Date().toISOString();
    const { limit, offset } = parsePagination(req.query);

    // Auto-expire medications past their end date
    await query(
      `UPDATE medications
       SET active = 0
       WHERE user_id = $1 AND ended_at IS NOT NULL AND ended_at < $2 AND active = 1`,
      [req.user.id, nowIso]
    );

    const countResult = await query(
      'SELECT COUNT(*) as total FROM medications WHERE user_id = $1',
      [req.user.id]
    );
    const total = parseInt(countResult.rows[0]?.total ?? 0, 10);

    const result = await query(
      `SELECT
        m.*,
        d.name AS doctor_name,
        d.specialty AS doctor_specialty
       FROM medications m
       LEFT JOIN doctors d ON m.prescribed_by_doctor_id = d.id
       WHERE m.user_id = $1
       ORDER BY m.active DESC, m.started_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    const annotated = result.rows.map((m) => {
      const isExpired = m.ended_at && new Date(m.ended_at) < new Date();
      return {
        ...m,
        is_expired: !!isExpired,
        course_status: isExpired ? 'Course Completed' : m.active ? 'Active Regimen' : 'Discontinued'
      };
    });

    res.json(paginatedResponse('medications', annotated, total, { limit, offset }));
  } catch (err) {
    req.log?.error({ err: err.message }, 'get medications failed');
    sendError(res, 500, 'Failed to fetch medications');
  }
});

// POST /api/medications - Create medication
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      dosage,
      frequency,
      started_at,
      ended_at,
      duration_days,
      instructions,
      active = true
    } = req.body;
    if (!name) {
      return sendError(res, 400, 'Medication name is required');
    }

    const start = started_at ? new Date(started_at).toISOString() : new Date().toISOString();
    let end = ended_at ? new Date(ended_at).toISOString() : null;
    let durDays = duration_days ? parseInt(duration_days, 10) : null;

    if (!end && durDays && durDays > 0) {
      end = new Date(Date.now() + durDays * 24 * 60 * 60 * 1000).toISOString();
    }

    const activeVal = active ? 1 : 0;

    const insertRes = await query(
      `INSERT INTO medications (user_id, name, dosage, frequency, started_at, ended_at, duration_days, instructions, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [req.user.id, name.trim(), dosage, frequency, start, end, durDays, instructions, activeVal]
    );

    let created = insertRes.rows[0];
    if (!created) {
      const fetchM = await query(
        'SELECT * FROM medications WHERE user_id = $1 ORDER BY id DESC LIMIT 1',
        [req.user.id]
      );
      created = fetchM.rows[0];
    }

    res.status(201).json({ message: 'Medication added successfully', medication: created });
  } catch (err) {
    console.error('[Create medication error]:', err);
    sendError(res, 500, 'Failed to create medication');
  }
});

// PUT /api/medications/:id - Update medication
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, dosage, frequency, started_at, ended_at, duration_days, instructions, active } =
      req.body;
    const activeVal = active !== undefined ? (active ? 1 : 0) : undefined;

    await query(
      `UPDATE medications
       SET name = COALESCE($1, name),
           dosage = COALESCE($2, dosage),
           frequency = COALESCE($3, frequency),
           started_at = COALESCE($4, started_at),
           ended_at = $5,
           duration_days = COALESCE($6, duration_days),
           instructions = COALESCE($7, instructions),
           active = COALESCE($8, active)
       WHERE id = $9 AND user_id = $10`,
      [
        name,
        dosage,
        frequency,
        started_at,
        ended_at,
        duration_days,
        instructions,
        activeVal,
        req.params.id,
        req.user.id
      ]
    );

    const updated = await query('SELECT * FROM medications WHERE id = $1 AND user_id = $2', [
      req.params.id,
      req.user.id
    ]);
    if (updated.rows.length === 0) {
      return sendError(res, 404, 'Medication not found');
    }

    res.json({ message: 'Medication updated successfully', medication: updated.rows[0] });
  } catch (err) {
    sendError(res, 500, 'Failed to update medication');
  }
});

// PATCH /api/medications/:id/toggle - Toggle active status
router.patch('/:id/toggle', authenticateToken, async (req, res) => {
  try {
    const check = await query('SELECT * FROM medications WHERE id = $1 AND user_id = $2', [
      req.params.id,
      req.user.id
    ]);
    if (check.rows.length === 0) {
      return sendError(res, 404, 'Medication not found');
    }

    const currentActive = check.rows[0].active;
    const newActive = currentActive === 1 || currentActive === true ? 0 : 1;
    const endedAt = newActive === 0 ? new Date().toISOString() : null;

    await query(
      'UPDATE medications SET active = $1, ended_at = $2 WHERE id = $3 AND user_id = $4',
      [newActive, endedAt, req.params.id, req.user.id]
    );

    res.json({ message: 'Medication status updated', active: !!newActive });
  } catch (err) {
    sendError(res, 500, 'Failed to toggle medication');
  }
});

// DELETE /api/medications/:id - Patient can remove medication anytime
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    // Delete linked reminders first, then delete medication
    await query('DELETE FROM reminders WHERE medication_id = $1 AND user_id = $2', [
      req.params.id,
      req.user.id
    ]);
    const del = await query('DELETE FROM medications WHERE id = $1 AND user_id = $2', [
      req.params.id,
      req.user.id
    ]);
    if (del.rowCount === 0) {
      return sendError(res, 404, 'Medication not found or already removed');
    }
    res.json({ message: 'Medication and linked alarm schedules removed successfully' });
  } catch (err) {
    sendError(res, 500, 'Failed to delete medication');
  }
});

module.exports = router;
