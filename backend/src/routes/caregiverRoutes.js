const express = require('express');
const router = express.Router();
const { sendError } = require('../utils/apiError');
const crypto = require('crypto');
const { query } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// POST /api/caregiver/generate - Generate shareable link
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const { days_valid = 14 } = req.body;
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(
      Date.now() + parseInt(days_valid, 10) * 24 * 60 * 60 * 1000
    ).toISOString();

    const insertRes = await query(
      'INSERT INTO caregiver_shares (user_id, token, expires_at) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, token, expiresAt]
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
      share_url: `/share/${token}`
    });
  } catch (err) {
    console.error('[Caregiver share link error]:', err);
    sendError(res, 500, 'Failed to generate caregiver share link');
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
    if (new Date(share.expires_at) < new Date()) {
      return sendError(res, 410, 'This share link has expired');
    }

    // Fetch user demographics (anonymized/safe)
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

    // Fetch recent symptom entries (last 60 days)
    const entriesRes = await query(
      `SELECT se.*, s.name as symptom_name, s.category as symptom_category
       FROM symptom_entries se
       JOIN symptoms s ON se.symptom_id = s.id
       WHERE se.user_id = $1
       ORDER BY se.started_at DESC
       LIMIT 30`,
      [share.user_id]
    );

    // Fetch active medications
    const medsRes = await query(
      'SELECT * FROM medications WHERE user_id = $1 AND (active = 1 OR active = true) ORDER BY name ASC',
      [share.user_id]
    );

    res.json({
      patient,
      entries: entriesRes.rows,
      medications: medsRes.rows,
      expires_at: share.expires_at
    });
  } catch (err) {
    console.error('[Caregiver view error]:', err);
    sendError(res, 500, 'Failed to load caregiver summary');
  }
});

module.exports = router;
