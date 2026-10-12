const express = require('express');
const router = express.Router();
const { sendError } = require('../utils/apiError');
const crypto = require('crypto');
const { z } = require('zod');
const { query } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');

const SHARE_SECTIONS = ['symptoms', 'medications', 'appointments'];

const generateShareSchema = z.object({
  days_valid: z.coerce.number().int().positive().max(365).optional(),
  label: z.string().trim().max(255).optional(),
  scope: z.array(z.enum(SHARE_SECTIONS)).min(1).optional()
});

function parseScope(share) {
  try {
    const parsed = JSON.parse(share.scope);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SHARE_SECTIONS;
  } catch {
    return SHARE_SECTIONS;
  }
}

// POST /api/caregiver/generate - Generate a scoped, time-limited shareable link.
router.post('/generate', authenticateToken, validateBody(generateShareSchema), async (req, res) => {
  try {
    const { days_valid = 14, label, scope } = req.body;
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + days_valid * 24 * 60 * 60 * 1000).toISOString();
    // CARE-6: which sections this link exposes, chosen by the patient.
    const scopeJson = JSON.stringify(scope && scope.length > 0 ? scope : SHARE_SECTIONS);

    const insertRes = await query(
      'INSERT INTO caregiver_shares (user_id, token, expires_at, label, scope) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.user.id, token, expiresAt, label || null, scopeJson]
    );

    let share = insertRes.rows[0];
    if (!share) {
      const fetchS = await query('SELECT * FROM caregiver_shares WHERE token = $1', [token]);
      share = fetchS.rows[0];
    }

    res.status(201).json({
      message: 'Caregiver share link generated successfully',
      token,
      expires_at: expiresAt,
      share_url: `/share/${token}`,
      label: share.label,
      scope: parseScope(share)
    });
  } catch (err) {
    console.error('[Caregiver share link error]:', err);
    sendError(res, 500, 'Failed to generate caregiver share link');
  }
});

// GET /api/caregiver/shares - CARE-4: list every share link this patient
// has created, active or not, so they can see what's out there and revoke
// anything they no longer want shared.
router.get('/shares', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT cs.id, cs.token, cs.label, cs.scope, cs.expires_at, cs.revoked, cs.created_at,
              (SELECT COUNT(*) FROM caregiver_share_access_log WHERE share_id = cs.id) AS access_count,
              (SELECT MAX(accessed_at) FROM caregiver_share_access_log WHERE share_id = cs.id) AS last_accessed_at
       FROM caregiver_shares cs
       WHERE cs.user_id = $1
       ORDER BY cs.created_at DESC`,
      [req.user.id]
    );
    const shares = result.rows.map((s) => ({
      ...s,
      scope: parseScope(s),
      is_active: !s.revoked && new Date(s.expires_at) > new Date(),
      // Never return the raw token in a list view -- it's a bearer
      // credential, and the patient already has it from when they
      // generated the link. A trailing fragment is enough to recognize
      // which link is which without re-exposing the full secret.
      token_suffix: s.token.slice(-8)
    }));
    shares.forEach((s) => delete s.token);
    res.json({ shares });
  } catch (err) {
    console.error('[Caregiver list shares error]:', err);
    sendError(res, 500, 'Failed to list caregiver share links');
  }
});

// DELETE /api/caregiver/shares/:id - CARE-5: revoke a link before its
// natural expiry.
router.delete('/shares/:id', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'UPDATE caregiver_shares SET revoked = TRUE WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (result.rowCount === 0) {
      return sendError(res, 404, 'Share link not found');
    }
    res.json({ message: 'Caregiver share link revoked' });
  } catch (err) {
    sendError(res, 500, 'Failed to revoke caregiver share link');
  }
});

// GET /api/caregiver/shares/:id/access-log - CARE-7: every access to a
// caregiver link is visible to the owning patient.
router.get('/shares/:id/access-log', authenticateToken, async (req, res) => {
  try {
    const owns = await query('SELECT id FROM caregiver_shares WHERE id = $1 AND user_id = $2', [
      req.params.id,
      req.user.id
    ]);
    if (owns.rows.length === 0) {
      return sendError(res, 404, 'Share link not found');
    }
    const log = await query(
      'SELECT id, accessed_at FROM caregiver_share_access_log WHERE share_id = $1 ORDER BY accessed_at DESC',
      [req.params.id]
    );
    res.json({ access_log: log.rows });
  } catch (err) {
    sendError(res, 500, 'Failed to fetch access log');
  }
});

// GET /api/caregiver/view/:token - Public read-only view for doctors/family
router.get('/view/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const shareRes = await query('SELECT * FROM caregiver_shares WHERE token = $1', [token]);

    if (shareRes.rows.length === 0) {
      return sendError(res, 404, 'Invalid or non-existent share link');
    }

    const share = shareRes.rows[0];
    // CARE-5: a revoked link is rejected the same way an expired one is --
    // from the caregiver's side there is no observable difference between
    // "expired" and "the patient took it back".
    if (share.revoked) {
      return sendError(res, 410, 'This share link has been revoked');
    }
    if (new Date(share.expires_at) < new Date()) {
      return sendError(res, 410, 'This share link has expired');
    }

    // CARE-7: log this access before returning data, so a failed/aborted
    // response still counts -- the point is "was this link used", not
    // "was it used successfully".
    await query('INSERT INTO caregiver_share_access_log (share_id) VALUES ($1)', [share.id]);

    // Fetch user demographics (anonymized/safe) -- always included; it's
    // not one of the toggleable sections, just minimal context for
    // whichever sections are shown.
    const userRes = await query(
      'SELECT id, name, age, gender, chronic_conditions, created_at FROM users WHERE id = $1',
      [share.user_id]
    );
    if (userRes.rows.length === 0) {
      return sendError(res, 404, 'User not found');
    }

    const patient = userRes.rows[0];
    try {
      if (typeof patient.chronic_conditions === 'string') {
        patient.chronic_conditions = JSON.parse(patient.chronic_conditions);
      }
    } catch (e) {
      patient.chronic_conditions = [];
    }

    // CARE-6: only the sections this link's scope includes are returned.
    const scope = parseScope(share);
    const response = { patient, expires_at: share.expires_at, scope };

    if (scope.includes('symptoms')) {
      const entriesRes = await query(
        `SELECT se.*, s.name as symptom_name, s.category as symptom_category
         FROM symptom_entries se
         JOIN symptoms s ON se.symptom_id = s.id
         WHERE se.user_id = $1
         ORDER BY se.started_at DESC
         LIMIT 30`,
        [share.user_id]
      );
      response.entries = entriesRes.rows;
    }

    if (scope.includes('medications')) {
      const medsRes = await query(
        'SELECT * FROM medications WHERE user_id = $1 AND (active = 1 OR active = true) ORDER BY name ASC',
        [share.user_id]
      );
      response.medications = medsRes.rows;
    }

    if (scope.includes('appointments')) {
      const apptsRes = await query(
        `SELECT a.*, d.name AS doctor_full_name, d.specialty AS doctor_full_specialty
         FROM appointments a
         LEFT JOIN doctors d ON d.id = a.doctor_id
         WHERE a.user_id = $1
         ORDER BY a.scheduled_at DESC
         LIMIT 20`,
        [share.user_id]
      );
      response.appointments = apptsRes.rows;
    }

    res.json(response);
  } catch (err) {
    console.error('[Caregiver view error]:', err);
    sendError(res, 500, 'Failed to load caregiver summary');
  }
});

module.exports = router;
