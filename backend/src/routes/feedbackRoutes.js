const express = require('express');
const router = express.Router();
const { sendError } = require('../utils/apiError');
const axios = require('axios');
const { query } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
require('dotenv').config();

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';

// POST /api/feedback - Submit feedback on classification recommendation
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { entry_id, was_helpful, comment } = req.body;
    if (!entry_id || was_helpful === undefined) {
      return sendError(res, 400, 'entry_id and was_helpful boolean are required');
    }

    // Verify entry belongs to user
    const entryCheck = await query(
      `SELECT se.*, s.name as symptom_name 
       FROM symptom_entries se 
       JOIN symptoms s ON se.symptom_id = s.id 
       WHERE se.id = $1 AND se.user_id = $2`,
      [entry_id, req.user.id]
    );

    if (entryCheck.rows.length === 0) {
      return sendError(res, 404, 'Symptom entry not found');
    }

    const entry = entryCheck.rows[0];
    const helpfulVal = was_helpful ? 1 : 0;

    // Check if feedback already exists for this entry
    const existing = await query('SELECT id FROM feedback WHERE entry_id = $1 AND user_id = $2', [
      entry_id,
      req.user.id
    ]);

    let fbResult;
    if (existing.rows.length > 0) {
      await query(
        'UPDATE feedback SET was_helpful = $1, comment = $2, created_at = CURRENT_TIMESTAMP WHERE id = $3',
        [helpfulVal, comment, existing.rows[0].id]
      );
      fbResult = {
        id: existing.rows[0].id,
        entry_id,
        user_id: req.user.id,
        was_helpful: !!was_helpful,
        comment
      };
    } else {
      const insertRes = await query(
        'INSERT INTO feedback (entry_id, user_id, was_helpful, comment) VALUES ($1, $2, $3, $4) RETURNING *',
        [entry_id, req.user.id, helpfulVal, comment]
      );
      fbResult = insertRes.rows[0] || {
        entry_id,
        user_id: req.user.id,
        was_helpful: !!was_helpful,
        comment
      };
    }

    // Forward feedback asynchronously to ML microservice for future retraining dataset accumulation
    axios
      .post(`${ML_SERVICE_URL}/feedback`, {
        entry_id: String(entry_id),
        original_text: entry.description || '',
        predicted_symptom: entry.symptom_name,
        was_helpful: !!was_helpful,
        comment: comment || ''
      })
      .catch((err) => {
        // Non-blocking log
        console.log(
          `[ML Feedback forwarding note]: ML service feedback endpoint response: ${err.message}`
        );
      });

    res.status(201).json({
      message: 'Thank you for your feedback! This data helps refine our clinical suggestions.',
      feedback: fbResult
    });
  } catch (err) {
    console.error('[Feedback error]:', err);
    sendError(res, 500, 'Failed to record feedback');
  }
});

// GET /api/feedback/stats - Aggregate stats
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const statsRes = await query(
      `SELECT 
        COUNT(*) as total_feedback,
        SUM(CASE WHEN was_helpful = 1 OR was_helpful = true THEN 1 ELSE 0 END) as helpful_count,
        SUM(CASE WHEN was_helpful = 0 OR was_helpful = false THEN 1 ELSE 0 END) as unhelpful_count
       FROM feedback 
       WHERE user_id = $1`,
      [req.user.id]
    );

    const stats = statsRes.rows[0] || { total_feedback: 0, helpful_count: 0, unhelpful_count: 0 };
    res.json({ stats });
  } catch (err) {
    sendError(res, 500, 'Failed to retrieve feedback stats');
  }
});

module.exports = router;
