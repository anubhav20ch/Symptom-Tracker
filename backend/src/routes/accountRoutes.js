const express = require('express');
const router = express.Router();
const { sendError } = require('../utils/apiError');
const { query } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { recordAudit } = require('../utils/auditLog');
// PRIV-3: the grace window is owned by retentionJob.js (the thing that
// actually enforces it) and only imported here for the user-facing
// message, so the two can never drift apart.
const { ACCOUNT_DELETION_GRACE_HOURS } = require('../services/retentionJob');

// -------------------------------------------------------------
// PRIV-2: full data export, machine-readable JSON, every table this
// account owns. Kept as one big read rather than paging, since "the
// entirety of their own data" is the point -- a user exporting their own
// (bounded, single-account) data is not the same scale problem as a list
// endpoint over every user's rows.
// -------------------------------------------------------------
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const [
      profileRes,
      entriesRes,
      attachmentsRes,
      medicationsRes,
      remindersRes,
      doseLogsRes,
      appointmentsRes,
      reportsRes,
      caregiverSharesRes,
      feedbackRes,
      consentsRes,
      deletionRequestsRes
    ] = await Promise.all([
      query(
        'SELECT id, name, email, age, gender, chronic_conditions, dark_mode, timezone, user_tier, created_at FROM users WHERE id = $1',
        [userId]
      ),
      query('SELECT * FROM symptom_entries WHERE user_id = $1 ORDER BY created_at ASC', [userId]),
      query(
        `SELECT a.* FROM attachments a
         JOIN symptom_entries se ON a.entry_id = se.id
         WHERE se.user_id = $1
         ORDER BY a.uploaded_at ASC`,
        [userId]
      ),
      query('SELECT * FROM medications WHERE user_id = $1 ORDER BY created_at ASC', [userId]),
      query('SELECT * FROM reminders WHERE user_id = $1 ORDER BY created_at ASC', [userId]),
      query('SELECT * FROM dose_logs WHERE user_id = $1 ORDER BY logged_at ASC', [userId]),
      query('SELECT * FROM appointments WHERE user_id = $1 ORDER BY scheduled_at ASC', [userId]),
      query('SELECT * FROM reports WHERE user_id = $1 ORDER BY generated_at ASC', [userId]),
      // Raw tokens are never exported -- same rule as GET /caregiver/shares.
      query(
        'SELECT id, label, scope, expires_at, revoked, created_at FROM caregiver_shares WHERE user_id = $1 ORDER BY created_at ASC',
        [userId]
      ),
      query(
        `SELECT f.* FROM feedback f
         JOIN symptom_entries se ON f.entry_id = se.id
         WHERE f.user_id = $1
         ORDER BY f.created_at ASC`,
        [userId]
      ),
      query('SELECT consent_version, accepted_at FROM consents WHERE user_id = $1 ORDER BY accepted_at ASC', [userId]),
      query(
        'SELECT status, requested_at, completed_at FROM deletion_requests WHERE user_id = $1 ORDER BY requested_at DESC',
        [userId]
      )
    ]);

    await recordAudit({
      actorType: 'patient',
      actorId: userId,
      action: 'data_exported',
      targetType: 'user',
      targetId: userId,
      requestId: req.id
    });

    res.json({
      exported_at: new Date().toISOString(),
      profile: profileRes.rows[0] || null,
      symptom_entries: entriesRes.rows,
      attachments: attachmentsRes.rows,
      medications: medicationsRes.rows,
      reminders: remindersRes.rows,
      dose_logs: doseLogsRes.rows,
      appointments: appointmentsRes.rows,
      reports: reportsRes.rows,
      caregiver_shares: caregiverSharesRes.rows,
      feedback: feedbackRes.rows,
      consents: consentsRes.rows,
      deletion_requests: deletionRequestsRes.rows
    });
  } catch (err) {
    console.error('[Account Export Error]:', err);
    sendError(res, 500, 'Failed to export account data');
  }
});

// -------------------------------------------------------------
// PRIV-3: request account deletion, check its status, or cancel a still-
// pending request. Actual deletion (PRIV-6 cascade) happens later, in the
// retention job, once the grace window has elapsed.
// -------------------------------------------------------------
router.post('/deletion-request', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const existing = await query(
      "SELECT id FROM deletion_requests WHERE user_id = $1 AND status = 'pending'",
      [userId]
    );
    if (existing.rows.length > 0) {
      return sendError(res, 409, 'A deletion request is already pending for this account', {
        code: 'DELETION_ALREADY_PENDING'
      });
    }

    const result = await query(
      'INSERT INTO deletion_requests (user_id, user_email, status) VALUES ($1, $2, $3) RETURNING id, status, requested_at',
      [userId, req.user.email, 'pending']
    );

    await recordAudit({
      actorType: 'patient',
      actorId: userId,
      action: 'deletion_requested',
      targetType: 'user',
      targetId: userId,
      requestId: req.id
    });

    res.status(201).json({
      message: `Deletion request received. Your account will be permanently deleted within ${ACCOUNT_DELETION_GRACE_HOURS} hours unless you cancel it first.`,
      deletion_request: result.rows[0]
    });
  } catch (err) {
    console.error('[Account Deletion Request Error]:', err);
    sendError(res, 500, 'Failed to submit deletion request');
  }
});

router.get('/deletion-request', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, status, requested_at, completed_at FROM deletion_requests WHERE user_id = $1 ORDER BY requested_at DESC LIMIT 1',
      [req.user.id]
    );
    res.json({ deletion_request: result.rows[0] || null });
  } catch (err) {
    console.error('[Account Deletion Status Error]:', err);
    sendError(res, 500, 'Failed to fetch deletion request status');
  }
});

router.delete('/deletion-request', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await query(
      "UPDATE deletion_requests SET status = 'cancelled' WHERE user_id = $1 AND status = 'pending' RETURNING id",
      [userId]
    );
    if (result.rows.length === 0) {
      return sendError(res, 404, 'No pending deletion request to cancel');
    }
    await recordAudit({
      actorType: 'patient',
      actorId: userId,
      action: 'deletion_cancelled',
      targetType: 'user',
      targetId: userId,
      requestId: req.id
    });
    res.json({ message: 'Deletion request cancelled' });
  } catch (err) {
    console.error('[Account Deletion Cancel Error]:', err);
    sendError(res, 500, 'Failed to cancel deletion request');
  }
});

// -------------------------------------------------------------
// PRIV-4: a unified view of who has accessed this patient's data --
// physician reads (AUDIT-2, target_type='user'/target_id=this user),
// administrator reads, and every caregiver-share-link view (CARE-7),
// merged into one chronological list rather than three places to check.
// -------------------------------------------------------------
router.get('/access-log', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const [auditRes, shareAccessRes] = await Promise.all([
      query(
        `SELECT actor_type, actor_id, action, created_at
         FROM audit_logs
         WHERE target_type = 'user' AND target_id = $1
         ORDER BY created_at DESC
         LIMIT 200`,
        [userId]
      ),
      query(
        `SELECT cs.label AS share_label, csal.accessed_at
         FROM caregiver_share_access_log csal
         JOIN caregiver_shares cs ON cs.id = csal.share_id
         WHERE cs.user_id = $1
         ORDER BY csal.accessed_at DESC
         LIMIT 200`,
        [userId]
      )
    ]);

    const entries = [
      ...auditRes.rows.map((r) => ({
        source: 'account_access',
        accessor_type: r.actor_type,
        accessor_id: r.actor_id,
        action: r.action,
        occurred_at: r.created_at
      })),
      ...shareAccessRes.rows.map((r) => ({
        source: 'caregiver_share',
        accessor_type: 'caregiver',
        accessor_id: null,
        action: `viewed shared summary (${r.share_label || 'unlabeled link'})`,
        occurred_at: r.accessed_at
      }))
    ].sort((a, b) => new Date(b.occurred_at) - new Date(a.occurred_at));

    res.json({ access_log: entries });
  } catch (err) {
    console.error('[Account Access Log Error]:', err);
    sendError(res, 500, 'Failed to fetch access log');
  }
});

module.exports = { router, ACCOUNT_DELETION_GRACE_HOURS };
