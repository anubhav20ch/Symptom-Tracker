const express = require('express');
const router = express.Router();
const { sendError } = require('../utils/apiError');
const { authenticateToken } = require('../middleware/auth');
const { computeUserInsights } = require('../services/insightsService');

// GET /api/insights - Compute deep clinical insights & correlations
router.get('/', authenticateToken, async (req, res) => {
  try {
    const insights = await computeUserInsights(req.user.id);
    res.json({ insights });
  } catch (err) {
    console.error('[Get insights error]:', err);
    sendError(res, 500, 'Failed to compute symptom insights');
  }
});

module.exports = router;
