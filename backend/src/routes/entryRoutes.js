const express = require('express');
const router = express.Router();
const path = require('path');
const { query } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { classifySymptomEntry } = require('../services/classificationEngine');
const upload = require('../middleware/upload');
const { parsePagination, paginatedResponse } = require('../utils/pagination');
const { sendError } = require('../utils/apiError');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

// GET /api/entries - List user's entries with rich filters (API-3, PERF-5:
// bounded, consistently-shaped pagination)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      symptom_id,
      category,
      classification_type,
      min_severity,
      max_severity,
      search,
      start_date,
      end_date
    } = req.query;
    const { limit, offset } = parsePagination(req.query);

    let whereSql = ' WHERE se.user_id = $1';
    const params = [req.user.id];
    let paramIndex = 2;

    if (symptom_id) {
      whereSql += ` AND se.symptom_id = $${paramIndex++}`;
      params.push(symptom_id);
    }
    if (category) {
      whereSql += ` AND LOWER(s.category) = $${paramIndex++}`;
      params.push(category.toLowerCase());
    }
    if (classification_type) {
      whereSql += ` AND se.classification_type = $${paramIndex++}`;
      params.push(classification_type);
    }
    if (min_severity) {
      whereSql += ` AND se.severity >= $${paramIndex++}`;
      params.push(parseInt(min_severity, 10));
    }
    if (max_severity) {
      whereSql += ` AND se.severity <= $${paramIndex++}`;
      params.push(parseInt(max_severity, 10));
    }
    if (start_date) {
      whereSql += ` AND se.started_at >= $${paramIndex++}`;
      params.push(start_date);
    }
    if (end_date) {
      whereSql += ` AND se.started_at <= $${paramIndex++}`;
      params.push(end_date);
    }
    if (search) {
      whereSql += ` AND (LOWER(s.name) LIKE $${paramIndex} OR LOWER(se.description) LIKE $${paramIndex} OR LOWER(se.trigger) LIKE $${paramIndex} OR LOWER(se.body_location) LIKE $${paramIndex})`;
      params.push(`%${search.toLowerCase()}%`);
      paramIndex++;
    }

    const countResult = await query(
      `SELECT COUNT(*) as total FROM symptom_entries se JOIN symptoms s ON se.symptom_id = s.id${whereSql}`,
      params
    );
    const total = parseInt(countResult.rows[0]?.total ?? 0, 10);

    const dataParams = [...params, limit, offset];
    const sql = `
      SELECT
        se.*,
        s.name as symptom_name,
        s.category as symptom_category,
        (SELECT COUNT(*) FROM attachments a WHERE a.entry_id = se.id) as attachment_count,
        (SELECT was_helpful FROM feedback fb WHERE fb.entry_id = se.id AND fb.user_id = se.user_id ORDER BY fb.created_at DESC LIMIT 1) as user_feedback_helpful,
        (SELECT comment FROM feedback fb WHERE fb.entry_id = se.id AND fb.user_id = se.user_id ORDER BY fb.created_at DESC LIMIT 1) as user_feedback_comment
      FROM symptom_entries se
      JOIN symptoms s ON se.symptom_id = s.id
      ${whereSql}
      ORDER BY se.started_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const result = await query(sql, dataParams);

    res.json({
      ...paginatedResponse('entries', result.rows, total, { limit, offset }),
      count: result.rows.length
    });
  } catch (err) {
    req.log?.error({ err: err.message }, 'get entries failed');
    sendError(res, 500, 'Failed to fetch symptom entries');
  }
});

// GET /api/entries/:id - Get single entry details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const entryRes = await query(
      `SELECT se.*, s.name as symptom_name, s.category as symptom_category
       FROM symptom_entries se
       JOIN symptoms s ON se.symptom_id = s.id
       WHERE se.id = $1 AND se.user_id = $2`,
      [req.params.id, req.user.id]
    );

    if (entryRes.rows.length === 0) {
      return sendError(res, 404, 'Symptom entry not found');
    }

    const entry = entryRes.rows[0];

    // Fetch attachments
    const attachRes = await query(
      'SELECT * FROM attachments WHERE entry_id = $1 ORDER BY uploaded_at ASC',
      [entry.id]
    );
    entry.attachments = attachRes.rows.map((a) => ({
      ...a,
      download_url: `/api/entries/${entry.id}/attachments/${a.id}/file`
    }));

    // Fetch feedback
    const fbRes = await query('SELECT * FROM feedback WHERE entry_id = $1 AND user_id = $2', [
      entry.id,
      req.user.id
    ]);
    entry.feedback = fbRes.rows[0] || null;

    res.json({ entry });
  } catch (err) {
    console.error('[Get single entry error]:', err);
    sendError(res, 500, 'Failed to fetch entry details');
  }
});

// POST /api/entries - Create symptom entry with automated classification
router.post('/', authenticateToken, async (req, res) => {
  try {
    let {
      symptom_id,
      symptom_name,
      symptom_category = 'General',
      description,
      severity,
      body_location,
      trigger,
      started_at,
      ended_at,
      emotion_score = 5.0,
      energy_level = 5.0,
      stress_level = 5.0,
      sleep_quality = 5.0,
      functional_impairment = 3.0,
      urgency_score
    } = req.body;

    if (!severity || (!symptom_id && !symptom_name)) {
      return sendError(res, 400, 'Symptom and severity (1-10) are required');
    }

    // Resolve symptom_id if not given or if new symptom name provided
    if (!symptom_id && symptom_name) {
      const sympCheck = await query(
        'SELECT id, name, category FROM symptoms WHERE LOWER(name) = $1',
        [symptom_name.toLowerCase().trim()]
      );
      if (sympCheck.rows.length > 0) {
        symptom_id = sympCheck.rows[0].id;
        symptom_category = sympCheck.rows[0].category;
      } else {
        const createSymp = await query(
          'INSERT INTO symptoms (name, category) VALUES ($1, $2) RETURNING id',
          [symptom_name.trim(), symptom_category.trim()]
        );
        symptom_id = createSymp.rows[0]?.id;
        if (!symptom_id) {
          const fetchS = await query('SELECT id FROM symptoms WHERE LOWER(name) = $1', [
            symptom_name.toLowerCase().trim()
          ]);
          symptom_id = fetchS.rows[0]?.id;
        }
      }
    } else {
      const sympInfo = await query('SELECT name, category FROM symptoms WHERE id = $1', [
        symptom_id
      ]);
      if (sympInfo.rows.length > 0) {
        symptom_name = sympInfo.rows[0].name;
        symptom_category = sympInfo.rows[0].category;
      }
    }

    const startedTime = started_at ? new Date(started_at).toISOString() : new Date().toISOString();
    const endedTime = ended_at ? new Date(ended_at).toISOString() : null;

    // Run Rule-Based and Numerical Classification Engine
    const classification = await classifySymptomEntry({
      userId: req.user.id,
      symptomName: symptom_name,
      symptomCategory: symptom_category,
      severity: parseInt(severity, 10),
      startedAt: startedTime,
      endedAt: endedTime,
      userChronicConditions: req.user.chronic_conditions || [],
      emotionScore: parseFloat(emotion_score) || 5.0,
      energyLevel: parseFloat(energy_level) || 5.0,
      stressLevel: parseFloat(stress_level) || 5.0,
      sleepQuality: parseFloat(sleep_quality) || 5.0,
      functionalImpairment: parseFloat(functional_impairment) || 3.0
    });

    const finalUrgency =
      urgency_score !== undefined
        ? parseFloat(urgency_score)
        : classification.urgency_score || 30.0;

    const insertRes = await query(
      `INSERT INTO symptom_entries
       (user_id, symptom_id, description, severity, body_location, trigger, started_at, ended_at, classification_type, recommendation, reasoning, emotion_score, energy_level, stress_level, sleep_quality, functional_impairment, urgency_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       RETURNING *`,
      [
        req.user.id,
        symptom_id,
        description || '',
        parseInt(severity, 10),
        body_location || 'General Body',
        trigger || 'None Reported',
        startedTime,
        endedTime,
        classification.classification_type,
        classification.recommendation,
        classification.reasoning,
        parseFloat(emotion_score) || 5.0,
        parseFloat(energy_level) || 5.0,
        parseFloat(stress_level) || 5.0,
        parseFloat(sleep_quality) || 5.0,
        parseFloat(functional_impairment) || 3.0,
        finalUrgency
      ]
    );

    let createdEntry = insertRes.rows[0];
    if (!createdEntry) {
      const fetchLast = await query(
        'SELECT * FROM symptom_entries WHERE user_id = $1 ORDER BY id DESC LIMIT 1',
        [req.user.id]
      );
      createdEntry = fetchLast.rows[0];
    }

    createdEntry.symptom_name = symptom_name;
    createdEntry.symptom_category = symptom_category;

    res.status(201).json({
      message: 'Symptom entry logged successfully',
      entry: createdEntry,
      classification
    });
  } catch (err) {
    console.error('[Create entry error]:', err);
    sendError(res, 500, 'Failed to record symptom entry');
  }
});

// PUT /api/entries/:id - Update entry
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { description, severity, body_location, trigger, started_at, ended_at } = req.body;

    // Check ownership
    const check = await query('SELECT * FROM symptom_entries WHERE id = $1 AND user_id = $2', [
      req.params.id,
      req.user.id
    ]);
    if (check.rows.length === 0) {
      return sendError(res, 404, 'Entry not found');
    }

    const current = check.rows[0];
    const newSeverity = severity ? parseInt(severity, 10) : current.severity;
    const newStart = started_at || current.started_at;
    const newEnd = ended_at !== undefined ? ended_at : current.ended_at;

    // Fetch symptom info for re-classification
    const sInfo = await query('SELECT name, category FROM symptoms WHERE id = $1', [
      current.symptom_id
    ]);
    const sName = sInfo.rows[0]?.name || '';
    const sCat = sInfo.rows[0]?.category || 'General';

    const classification = await classifySymptomEntry({
      userId: req.user.id,
      symptomName: sName,
      symptomCategory: sCat,
      severity: newSeverity,
      startedAt: newStart,
      endedAt: newEnd,
      userChronicConditions: req.user.chronic_conditions || []
    });

    await query(
      `UPDATE symptom_entries
       SET description = COALESCE($1, description),
           severity = COALESCE($2, severity),
           body_location = COALESCE($3, body_location),
           trigger = COALESCE($4, trigger),
           started_at = COALESCE($5, started_at),
           ended_at = $6,
           classification_type = $7,
           recommendation = $8,
           reasoning = $9
       WHERE id = $10 AND user_id = $11`,
      [
        description,
        newSeverity,
        body_location,
        trigger,
        newStart,
        newEnd,
        classification.classification_type,
        classification.recommendation,
        classification.reasoning,
        req.params.id,
        req.user.id
      ]
    );

    const updatedRes = await query(
      `SELECT se.*, s.name as symptom_name, s.category as symptom_category 
       FROM symptom_entries se 
       JOIN symptoms s ON se.symptom_id = s.id 
       WHERE se.id = $1`,
      [req.params.id]
    );

    res.json({ message: 'Entry updated successfully', entry: updatedRes.rows[0] });
  } catch (err) {
    console.error('[Update entry error]:', err);
    sendError(res, 500, 'Failed to update entry');
  }
});

// DELETE /api/entries/:id - Delete entry
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const del = await query('DELETE FROM symptom_entries WHERE id = $1 AND user_id = $2', [
      req.params.id,
      req.user.id
    ]);
    if (del.rowCount === 0) {
      return sendError(res, 404, 'Entry not found');
    }
    res.json({ message: 'Entry deleted successfully' });
  } catch (err) {
    console.error('[Delete entry error]:', err);
    sendError(res, 500, 'Failed to delete entry');
  }
});

// POST /api/entries/:id/attachments - Upload photo/document
router.post(
  '/:id/attachments',
  authenticateToken,
  upload.single('file'),
  upload.verifyFileSignature,
  async (req, res) => {
    try {
      if (!req.file) {
        return sendError(res, 400, 'No file uploaded');
      }

      // Verify entry belongs to user
      const check = await query('SELECT id FROM symptom_entries WHERE id = $1 AND user_id = $2', [
        req.params.id,
        req.user.id
      ]);
      if (check.rows.length === 0) {
        return sendError(res, 404, 'Symptom entry not found');
      }

      const fileUrl = `/uploads/${req.file.filename}`;
      const insertRes = await query(
        `INSERT INTO attachments (entry_id, file_url, file_name, file_type, size_bytes)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [req.params.id, fileUrl, req.file.originalname, req.file.mimetype, req.file.size]
      );

      let created = insertRes.rows[0];
      if (!created) {
        const fetchA = await query(
          'SELECT * FROM attachments WHERE entry_id = $1 ORDER BY id DESC LIMIT 1',
          [req.params.id]
        );
        created = fetchA.rows[0];
      }

      res.status(201).json({ message: 'File attached successfully', attachment: created });
    } catch (err) {
      console.error('[Attachment upload error]:', err);
      sendError(res, 500, 'Failed to upload attachment');
    }
  }
);

// GET /api/entries/:id/attachments/:attachmentId/file - SEC-16: the only
// way to read an attachment's bytes. Ownership is checked through the
// parent entry, not just the attachment row, so a patient can never read
// another patient's file even by guessing an attachment id. There is no
// static /uploads mount any more (see src/index.js) -- this route is it.
router.get('/:id/attachments/:attachmentId/file', authenticateToken, async (req, res) => {
  try {
    const entryCheck = await query(
      'SELECT id FROM symptom_entries WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (entryCheck.rows.length === 0) {
      return sendError(res, 404, 'Attachment not found');
    }

    const attRes = await query('SELECT * FROM attachments WHERE id = $1 AND entry_id = $2', [
      req.params.attachmentId,
      req.params.id
    ]);
    const attachment = attRes.rows[0];
    if (!attachment) {
      return sendError(res, 404, 'Attachment not found');
    }

    // file_url is always "/uploads/<name>" (see upload.js); resolve it
    // against the uploads directory itself so a crafted file_url could
    // never be used to read a path outside it.
    const fileName = path.basename(attachment.file_url);
    const absolutePath = path.join(UPLOADS_DIR, fileName);
    if (!absolutePath.startsWith(UPLOADS_DIR) || !require('fs').existsSync(absolutePath)) {
      return sendError(res, 404, 'Attachment file is missing');
    }

    res.setHeader('Content-Type', attachment.file_type || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(attachment.file_name || fileName)}"`
    );
    res.sendFile(absolutePath);
  } catch (err) {
    console.error('[Attachment download error]:', err);
    sendError(res, 500, 'Failed to retrieve attachment');
  }
});

module.exports = router;
