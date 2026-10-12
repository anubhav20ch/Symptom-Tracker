const express = require('express');
const router = express.Router();
const { sendError } = require('../utils/apiError');
const axios = require('axios');
const {
  extractSymptomFromText,
  predictDiseaseFromText,
  smartAnalyzeText,
  getNumericalStats
} = require('../services/nlpService');
const { query } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';

// POST /api/nlp/smart-analyze - Convert free text to numerical biomarkers & ML triage
router.post('/smart-analyze', authenticateToken, async (req, res) => {
  try {
    const { text, overrides } = req.body;
    if (!text || !text.trim()) {
      return sendError(res, 400, 'Text description is required for analysis');
    }

    const chronicConditions = req.user?.chronic_conditions || [];
    const analysis = await smartAnalyzeText(text, chronicConditions, overrides);

    res.json({
      success: true,
      analysis,
      raw_text: text
    });
  } catch (err) {
    console.error('[NLP smart-analyze route error]:', err);
    sendError(res, 500, 'Failed to perform numerical analysis on symptom text');
  }
});

// GET /api/nlp/numerical-stats - Model accuracy, feature importance, scoring scales
router.get('/numerical-stats', authenticateToken, async (req, res) => {
  try {
    const stats = await getNumericalStats();
    res.json(stats);
  } catch (err) {
    sendError(res, 500, 'Failed to retrieve numerical model stats');
  }
});

// POST /api/nlp/extract - Parse free text description
router.post('/extract', authenticateToken, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return sendError(res, 400, 'Text description is required for NLP parsing');
    }

    const nlpResult = await extractSymptomFromText(text);

    // Check if predicted symptom exists in database
    const sympMatch = await query(
      'SELECT id, name, category FROM symptoms WHERE LOWER(name) = $1 OR LOWER(name) LIKE $2',
      [nlpResult.symptom.toLowerCase(), `%${nlpResult.symptom.toLowerCase()}%`]
    );

    if (sympMatch.rows.length > 0) {
      nlpResult.matched_symptom_id = sympMatch.rows[0].id;
      nlpResult.matched_symptom_name = sympMatch.rows[0].name;
      nlpResult.matched_category = sympMatch.rows[0].category;
    } else {
      nlpResult.matched_symptom_id = null;
      nlpResult.matched_symptom_name = nlpResult.symptom;
      nlpResult.matched_category = nlpResult.category;
    }

    res.json({
      extraction: nlpResult,
      raw_text: text
    });
  } catch (err) {
    console.error('[NLP extraction route error]:', err);
    sendError(res, 500, 'Failed to process natural language text');
  }
});

// POST /api/nlp/predict-disease - Disease classifier trained on the Symptom2Disease dataset
router.post('/predict-disease', authenticateToken, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return sendError(res, 400, 'Text description is required for disease prediction');
    }

    const prediction = await predictDiseaseFromText(text);
    res.json({ prediction, raw_text: text });
  } catch (err) {
    console.error('[NLP disease prediction route error]:', err);
    sendError(res, 500, 'Failed to process disease prediction');
  }
});

// GET /api/nlp/diseases - Lists the disease classes the ML model supports.
router.get('/diseases', authenticateToken, async (req, res) => {
  try {
    const response = await axios.get(`${ML_SERVICE_URL}/diseases`, { timeout: 3000 });
    res.json(response.data);
  } catch (err) {
    sendError(res, 503, 'Disease catalogue is temporarily unavailable');
  }
});

module.exports = router;
