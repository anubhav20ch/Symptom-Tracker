const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { validateBody, reminderSchema } = require('../middleware/validate');
const { parsePagination, paginatedResponse } = require('../utils/pagination');
const { sendError } = require('../utils/apiError');

// GET /api/reminders - List user reminders with auto-expiry processing
// (API-3, PERF-5). Default/max page size is raised for this endpoint: the
// in-tab alarm poller and background scheduler both depend on seeing every
// active reminder, not a silently-truncated first page.
router.get('/', authenticateToken, async (req, res) => {
  try {
    const nowIso = new Date().toISOString();
    const { limit, offset } = parsePagination(req.query, { defaultLimit: 200, maxLimit: 500 });

    // Auto-expire reminders whose prescribed duration has passed
    await query(
      `UPDATE reminders
       SET active = 0
       WHERE user_id = $1 AND expires_at IS NOT NULL AND expires_at < $2 AND active = 1`,
      [req.user.id, nowIso]
    );

    const countResult = await query('SELECT COUNT(*) as total FROM reminders WHERE user_id = $1', [
      req.user.id
    ]);
    const total = parseInt(countResult.rows[0]?.total ?? 0, 10);

    const result = await query(
      `SELECT
        r.*,
        m.name AS medication_name,
        m.dosage AS medication_dosage,
        m.frequency AS medication_frequency,
        m.instructions AS medication_instructions
       FROM reminders r
       LEFT JOIN medications m ON r.medication_id = m.id
       WHERE r.user_id = $1
       ORDER BY r.active DESC, r.scheduled_time ASC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    // Annotate whether reminder is auto-expired
    const annotated = result.rows.map((r) => {
      const isExpired = r.expires_at && new Date(r.expires_at) < new Date();
      return {
        ...r,
        is_expired: !!isExpired,
        course_status: isExpired
          ? 'Course Completed (Auto-Expired)'
          : r.active
            ? 'Active Schedule'
            : 'Paused'
      };
    });

    res.json(paginatedResponse('reminders', annotated, total, { limit, offset }));
  } catch (err) {
    req.log?.error({ err: err.message }, 'get reminders failed');
    sendError(res, 500, 'Failed to fetch reminders');
  }
});

// POST /api/reminders - Create reminder with optional duration and alarm chime
router.post('/', authenticateToken, validateBody(reminderSchema), async (req, res) => {
  try {
    const {
      scheduled_time,
      label = 'Daily Symptom Check-in',
      medication_id,
      reminder_type = 'medication',
      duration_days,
      sound_alarm = true
    } = req.body;

    let expiresAt = null;
    let durationNum = null;
    if (duration_days && parseInt(duration_days, 10) > 0) {
      durationNum = parseInt(duration_days, 10);
      expiresAt = new Date(Date.now() + durationNum * 24 * 60 * 60 * 1000).toISOString();
    }

    const insertRes = await query(
      `INSERT INTO reminders (
        user_id, scheduled_time, active, label, medication_id, reminder_type, 
        expires_at, prescribed_duration_days, sound_alarm
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        req.user.id,
        scheduled_time.trim(),
        1,
        label.trim(),
        medication_id ? parseInt(medication_id, 10) : null,
        reminder_type,
        expiresAt,
        durationNum,
        sound_alarm ? 1 : 0
      ]
    );

    let created = insertRes.rows[0];
    if (!created) {
      const fetchR = await query(
        'SELECT * FROM reminders WHERE user_id = $1 ORDER BY id DESC LIMIT 1',
        [req.user.id]
      );
      created = fetchR.rows[0];
    }

    res
      .status(201)
      .json({ message: 'Medication alarm schedule created successfully', reminder: created });
  } catch (err) {
    console.error('[Create reminder error]:', err);
    sendError(res, 500, 'Failed to create reminder');
  }
});

// PUT /api/reminders/:id - Update reminder
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { scheduled_time, label, active, sound_alarm } = req.body;
    const activeVal = active !== undefined ? (active ? 1 : 0) : undefined;
    const soundVal = sound_alarm !== undefined ? (sound_alarm ? 1 : 0) : undefined;

    await query(
      `UPDATE reminders 
       SET scheduled_time = COALESCE($1, scheduled_time),
           label = COALESCE($2, label),
           active = COALESCE($3, active),
           sound_alarm = COALESCE($4, sound_alarm)
       WHERE id = $5 AND user_id = $6`,
      [scheduled_time, label, activeVal, soundVal, req.params.id, req.user.id]
    );

    const updated = await query('SELECT * FROM reminders WHERE id = $1 AND user_id = $2', [
      req.params.id,
      req.user.id
    ]);
    if (updated.rows.length === 0) {
      return sendError(res, 404, 'Reminder not found');
    }

    res.json({ message: 'Reminder updated', reminder: updated.rows[0] });
  } catch (err) {
    sendError(res, 500, 'Failed to update reminder');
  }
});

// PATCH /api/reminders/:id/toggle - Toggle active status
router.patch('/:id/toggle', authenticateToken, async (req, res) => {
  try {
    const check = await query('SELECT * FROM reminders WHERE id = $1 AND user_id = $2', [
      req.params.id,
      req.user.id
    ]);
    if (check.rows.length === 0) {
      return sendError(res, 404, 'Reminder not found');
    }

    const currentActive = check.rows[0].active;
    const newActive = currentActive === 1 || currentActive === true ? 0 : 1;

    await query('UPDATE reminders SET active = $1 WHERE id = $2 AND user_id = $3', [
      newActive,
      req.params.id,
      req.user.id
    ]);
    res.json({ message: 'Reminder toggled', active: !!newActive });
  } catch (err) {
    sendError(res, 500, 'Failed to toggle reminder');
  }
});

// DELETE /api/reminders/:id - Patient can remove / delete any schedule anytime
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const del = await query('DELETE FROM reminders WHERE id = $1 AND user_id = $2', [
      req.params.id,
      req.user.id
    ]);
    if (del.rowCount === 0) {
      return sendError(res, 404, 'Reminder not found or already removed');
    }
    res.json({ message: 'Reminder schedule removed successfully' });
  } catch (err) {
    sendError(res, 500, 'Failed to delete reminder schedule');
  }
});

// POST /api/reminders/:id/dose - record a dose as taken/skipped for a given
// date. Server-persisted (visible to doctors/caregivers), replacing the old
// localStorage-only tracking that was invisible outside the patient's own browser.
router.post('/:id/dose', authenticateToken, async (req, res) => {
  try {
    const { status, note, dose_date } = req.body;
    if (!['taken', 'skipped'].includes(status)) {
      return sendError(res, 400, "status must be 'taken' or 'skipped'");
    }

    const owns = await query('SELECT id FROM reminders WHERE id = $1 AND user_id = $2', [
      req.params.id,
      req.user.id
    ]);
    if (owns.rows.length === 0) {
      return sendError(res, 404, 'Reminder not found');
    }

    const doseDate = dose_date || new Date().toISOString().slice(0, 10);

    await query('DELETE FROM dose_logs WHERE reminder_id = $1 AND dose_date = $2', [
      req.params.id,
      doseDate
    ]);
    await query(
      `INSERT INTO dose_logs (reminder_id, user_id, dose_date, status, note)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.params.id, req.user.id, doseDate, status, note || null]
    );

    res.status(201).json({ message: `Dose marked as ${status}` });
  } catch (err) {
    console.error('[Log dose error]:', err);
    sendError(res, 500, 'Failed to record dose status');
  }
});

// DELETE /api/reminders/:id/dose/:date - undo a logged dose for a given date
router.delete('/:id/dose/:date', authenticateToken, async (req, res) => {
  try {
    const owns = await query('SELECT id FROM reminders WHERE id = $1 AND user_id = $2', [
      req.params.id,
      req.user.id
    ]);
    if (owns.rows.length === 0) {
      return sendError(res, 404, 'Reminder not found');
    }
    await query('DELETE FROM dose_logs WHERE reminder_id = $1 AND dose_date = $2', [
      req.params.id,
      req.params.date
    ]);
    res.json({ message: 'Dose log entry removed' });
  } catch (err) {
    sendError(res, 500, 'Failed to remove dose log entry');
  }
});

// GET /api/reminders/doses?since=YYYY-MM-DD - adherence history for the
// current user (used by the Reminders page and, later, doctor/caregiver
// views). REM-11: also returns a computed adherence percentage over the
// same window (taken / (taken + skipped + missed)) rather than leaving
// every caller to recompute it from the raw rows.
router.get('/doses', authenticateToken, async (req, res) => {
  try {
    const since =
      req.query.since || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const result = await query(
      `SELECT dl.*, r.label, r.scheduled_time
       FROM dose_logs dl
       JOIN reminders r ON r.id = dl.reminder_id
       WHERE dl.user_id = $1 AND dl.dose_date >= $2
       ORDER BY dl.dose_date DESC`,
      [req.user.id, since]
    );

    const counts = { taken: 0, skipped: 0, missed: 0 };
    for (const row of result.rows) {
      if (counts[row.status] !== undefined) counts[row.status] += 1;
    }
    const totalLogged = counts.taken + counts.skipped + counts.missed;
    const adherence_percentage = totalLogged > 0 ? Math.round((counts.taken / totalLogged) * 1000) / 10 : null;

    res.json({ doses: result.rows, adherence: { ...counts, total: totalLogged, adherence_percentage } });
  } catch (err) {
    sendError(res, 500, 'Failed to fetch dose history');
  }
});

module.exports = router;
