const express = require('express');
const router = express.Router();
const { sendError } = require('../utils/apiError');
const { query } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// Get all symptoms
router.get('/', async (req, res) => {
  try {
    const symptomsRes = await query('SELECT * FROM symptoms ORDER BY category ASC, name ASC');
    res.json({ symptoms: symptomsRes.rows });
  } catch (err) {
    console.error('[Symptom list error]:', err);
    sendError(res, 500, 'Failed to fetch symptoms');
  }
});

// Autocomplete search endpoint
router.get('/autocomplete', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) {
      const all = await query('SELECT * FROM symptoms ORDER BY name ASC LIMIT 20');
      return res.json({ matches: all.rows });
    }

    const searchRes = await query(
      `SELECT * FROM symptoms 
       WHERE LOWER(name) LIKE $1 OR LOWER(category) LIKE $1
       ORDER BY CASE WHEN LOWER(name) LIKE $2 THEN 0 ELSE 1 END, name ASC
       LIMIT 10`,
      [`%${q.toLowerCase()}%`, `${q.toLowerCase()}%`]
    );

    res.json({ matches: searchRes.rows });
  } catch (err) {
    console.error('[Symptom autocomplete error]:', err);
    sendError(res, 500, 'Failed to search symptoms');
  }
});

// Create custom symptom
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, category } = req.body;
    if (!name || !category) {
      return sendError(res, 400, 'Name and category are required');
    }

    const existing = await query('SELECT * FROM symptoms WHERE LOWER(name) = $1', [
      name.toLowerCase().trim()
    ]);
    if (existing.rows.length > 0) {
      return res.json({ symptom: existing.rows[0], message: 'Symptom already exists' });
    }

    const insertRes = await query(
      'INSERT INTO symptoms (name, category) VALUES ($1, $2) RETURNING *',
      [name.trim(), category.trim()]
    );

    let created = insertRes.rows[0];
    if (!created) {
      const fetch = await query('SELECT * FROM symptoms WHERE LOWER(name) = $1', [
        name.toLowerCase().trim()
      ]);
      created = fetch.rows[0];
    }

    res.status(201).json({ symptom: created, message: 'Symptom added successfully' });
  } catch (err) {
    console.error('[Create symptom error]:', err);
    sendError(res, 500, 'Failed to create symptom');
  }
});

module.exports = router;
