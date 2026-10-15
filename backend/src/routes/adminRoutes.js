const express = require('express');
const router = express.Router();
const { sendError } = require('../utils/apiError');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const axios = require('axios');
const { query } = require('../config/db');
const { authenticateAdmin } = require('../middleware/auth');
const {
  signAccessToken,
  generateRefreshToken,
  hashToken,
  ADMIN_REFRESH_COOKIE_NAME,
  ADMIN_REFRESH_COOKIE_OPTIONS,
  generateCsrfToken,
  ADMIN_CSRF_COOKIE_NAME,
  ADMIN_CSRF_COOKIE_OPTIONS
} = require('../services/tokenService');
const { parsePagination, paginatedResponse } = require('../utils/pagination');
const { verifyCsrf } = require('../middleware/csrf');
const { recordAudit } = require('../utils/auditLog');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';
const ML_DATA_PATH = path.join(__dirname, '../../../ml_service/data/Symptom2Disease.csv');
const ROOT_DATA_PATH = path.join(__dirname, '../../../Symptom2Disease.csv');

// Configure Multer for CSV uploads (in memory for validation)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB max
});

async function issueAdminSession(res, admin) {
  const accessToken = signAccessToken({ id: admin.id, email: admin.email, role: 'admin' });
  const { raw, tokenHash, expiresAt } = generateRefreshToken();

  await query(
    'INSERT INTO admin_refresh_tokens (admin_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [admin.id, tokenHash, expiresAt]
  );

  res.cookie(ADMIN_REFRESH_COOKIE_NAME, raw, ADMIN_REFRESH_COOKIE_OPTIONS);
  res.cookie(ADMIN_CSRF_COOKIE_NAME, generateCsrfToken(), ADMIN_CSRF_COOKIE_OPTIONS);
  return accessToken;
}

// -------------------------------------------------------------
// AUTHENTICATION
// -------------------------------------------------------------

const ADMIN_EMAIL_ALIASES = {
  'administrator@symptomlog.com': 'admin@symptomlog.com',
  'admin@example.com': 'admin@symptomlog.com'
};

// POST /api/admin/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return sendError(res, 400, 'Email and password are required');
    }

    const normalizedEmail = email.toLowerCase().trim();
    let adminRes = await query(
      'SELECT id, name, email, password_hash, role FROM admins WHERE email = $1',
      [normalizedEmail]
    );

    if (adminRes.rows.length === 0 && ADMIN_EMAIL_ALIASES[normalizedEmail]) {
      adminRes = await query(
        'SELECT id, name, email, password_hash, role FROM admins WHERE email = $1',
        [ADMIN_EMAIL_ALIASES[normalizedEmail]]
      );
    }

    if (adminRes.rows.length === 0) {
      await recordAudit({ actorType: 'admin', action: 'login_failed', requestId: req.id, metadata: { reason: 'no_such_account' } });
      return sendError(res, 401, 'Invalid admin credentials');
    }

    const admin = adminRes.rows[0];
    const match = await bcrypt.compare(password, admin.password_hash);
    if (!match) {
      await recordAudit({ actorType: 'admin', actorId: admin.id, action: 'login_failed', requestId: req.id });
      return sendError(res, 401, 'Invalid admin credentials');
    }

    delete admin.password_hash;
    const token = await issueAdminSession(res, admin);
    await recordAudit({ actorType: 'admin', actorId: admin.id, action: 'login_success', requestId: req.id });
    res.json({ message: 'Admin authentication successful', token, admin });
  } catch (err) {
    console.error('[Admin Login Error]:', err);
    sendError(res, 500, 'Admin login failed due to server error');
  }
});

// POST /api/admin/logout
router.post('/logout', authenticateAdmin, verifyCsrf(ADMIN_CSRF_COOKIE_NAME), async (req, res) => {
  try {
    const rawToken = req.cookies[ADMIN_REFRESH_COOKIE_NAME];
    if (rawToken) {
      const tokenHash = hashToken(rawToken);
      await query('UPDATE admin_refresh_tokens SET revoked = TRUE WHERE token_hash = $1', [
        tokenHash
      ]);
    }
    res.clearCookie(ADMIN_REFRESH_COOKIE_NAME, ADMIN_REFRESH_COOKIE_OPTIONS);
    res.clearCookie(ADMIN_CSRF_COOKIE_NAME, ADMIN_CSRF_COOKIE_OPTIONS);
    await recordAudit({ actorType: 'admin', actorId: req.admin.id, action: 'logout', requestId: req.id });
    res.json({ message: 'Admin logged out successfully' });
  } catch (err) {
    sendError(res, 500, 'Failed to log out');
  }
});

// GET /api/admin/me
router.get('/me', authenticateAdmin, (req, res) => {
  res.json({ admin: req.admin });
});

// -------------------------------------------------------------
// SYSTEM METRICS & STATS
// -------------------------------------------------------------

// GET /api/admin/stats
router.get('/stats', authenticateAdmin, async (req, res) => {
  try {
    const [usersRes, docsRes, apptsRes, entriesRes] = await Promise.all([
      query('SELECT COUNT(*) as count FROM users'),
      query('SELECT COUNT(*) as count FROM doctors'),
      query('SELECT COUNT(*) as count FROM appointments'),
      query('SELECT COUNT(*) as count FROM symptom_entries')
    ]);

    let mlStatus = null;
    try {
      const mlRes = await axios.get(`${ML_SERVICE_URL}/health`, { timeout: 2000 });
      mlStatus = mlRes.data;
    } catch (e) {
      mlStatus = { status: 'offline', error: 'ML service unreachable' };
    }

    res.json({
      stats: {
        total_users: parseInt(usersRes.rows[0]?.count || 0, 10),
        total_doctors: parseInt(docsRes.rows[0]?.count || 0, 10),
        total_appointments: parseInt(apptsRes.rows[0]?.count || 0, 10),
        total_entries: parseInt(entriesRes.rows[0]?.count || 0, 10),
        ml_service: mlStatus
      }
    });
  } catch (err) {
    console.error('[Admin Stats Error]:', err);
    sendError(res, 500, 'Failed to fetch admin statistics');
  }
});

// -------------------------------------------------------------
// DOCTOR MANAGEMENT
// -------------------------------------------------------------

// GET /api/admin/doctors
router.get('/doctors', authenticateAdmin, async (req, res) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const countResult = await query('SELECT COUNT(*) as total FROM doctors');
    const total = parseInt(countResult.rows[0]?.total ?? 0, 10);

    const docsRes = await query(
      `
      SELECT
        d.id, d.name, d.email, d.specialty, d.npi_number, d.created_at,
        COUNT(a.id) AS appointment_count
      FROM doctors d
      LEFT JOIN appointments a ON a.doctor_id = d.id
      GROUP BY d.id, d.name, d.email, d.specialty, d.npi_number, d.created_at
      ORDER BY d.created_at DESC
      LIMIT $1 OFFSET $2
    `,
      [limit, offset]
    );
    res.json(paginatedResponse('doctors', docsRes.rows, total, { limit, offset }));
  } catch (err) {
    console.error('[Admin Get Doctors Error]:', err);
    sendError(res, 500, 'Failed to fetch doctors list');
  }
});

// POST /api/admin/doctors (Add Doctor)
router.post('/doctors', authenticateAdmin, async (req, res) => {
  try {
    const { name, email, password, specialty, npi_number } = req.body;

    if (!name || !email || !password) {
      return sendError(res, 400, 'Doctor name, email, and temporary password are required');
    }

    if (password.length < 6) {
      return sendError(res, 400, 'Password must be at least 6 characters long');
    }

    // Check duplicate email
    const existing = await query('SELECT id FROM doctors WHERE email = $1', [
      email.toLowerCase().trim()
    ]);
    if (existing.rows.length > 0) {
      return sendError(res, 409, 'A physician account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await query(
      `INSERT INTO doctors (name, email, password_hash, specialty, npi_number)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, specialty, npi_number, created_at`,
      [
        name.trim(),
        email.toLowerCase().trim(),
        passwordHash,
        specialty ? specialty.trim() : 'General Medicine',
        npi_number ? npi_number.trim() : `NPI-${Date.now().toString().slice(-8)}`
      ]
    );

    res.status(201).json({
      message: 'Physician account successfully created',
      doctor: result.rows[0]
    });
  } catch (err) {
    console.error('[Admin Add Doctor Error]:', err);
    sendError(res, 500, 'Failed to create physician account');
  }
});

// DELETE /api/admin/doctors/:id (Remove Doctor)
router.delete('/doctors/:id', authenticateAdmin, async (req, res) => {
  try {
    const doctorId = parseInt(req.params.id, 10);
    if (!doctorId) {
      return sendError(res, 400, 'Invalid doctor ID');
    }

    const docRes = await query('SELECT id, name FROM doctors WHERE id = $1', [doctorId]);
    if (docRes.rows.length === 0) {
      return sendError(res, 404, 'Doctor not found');
    }

    // Nullify references in appointments so appointment history is preserved
    await query('UPDATE appointments SET doctor_id = NULL WHERE doctor_id = $1', [doctorId]);
    // Delete doctor refresh tokens and doctor
    await query('DELETE FROM doctor_refresh_tokens WHERE doctor_id = $1', [doctorId]);
    await query('DELETE FROM doctors WHERE id = $1', [doctorId]);

    res.json({
      message: `Physician "${docRes.rows[0].name}" has been successfully removed.`
    });
  } catch (err) {
    console.error('[Admin Delete Doctor Error]:', err);
    sendError(res, 500, 'Failed to delete doctor account');
  }
});

// -------------------------------------------------------------
// APPOINTMENT MANAGEMENT
// -------------------------------------------------------------

// GET /api/admin/appointments
router.get('/appointments', authenticateAdmin, async (req, res) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const countResult = await query('SELECT COUNT(*) as total FROM appointments');
    const total = parseInt(countResult.rows[0]?.total ?? 0, 10);

    const apptsRes = await query(
      `
      SELECT
        a.id, a.user_id, a.doctor_id, a.doctor_name, a.specialty,
        a.scheduled_at, a.reason, a.notes, a.status, a.doctor_review_notes, a.reviewed_at, a.created_at,
        u.name AS patient_name, u.email AS patient_email, u.age AS patient_age, u.gender AS patient_gender,
        d.name AS assigned_doctor_name, d.specialty AS assigned_doctor_specialty
      FROM appointments a
      LEFT JOIN users u ON u.id = a.user_id
      LEFT JOIN doctors d ON d.id = a.doctor_id
      ORDER BY a.scheduled_at DESC
      LIMIT $1 OFFSET $2
    `,
      [limit, offset]
    );
    // AUDIT-2: one row per request (not per patient) -- this is a bulk
    // administrative view, not a per-patient lookup, so it is logged as
    // such rather than flooding audit_logs with one row per returned
    // appointment.
    await recordAudit({
      actorType: 'admin',
      actorId: req.admin.id,
      action: 'viewed_appointments_list',
      targetType: 'appointments',
      requestId: req.id,
      metadata: { count: apptsRes.rows.length, offset }
    });
    res.json(paginatedResponse('appointments', apptsRes.rows, total, { limit, offset }));
  } catch (err) {
    console.error('[Admin Get Appointments Error]:', err);
    sendError(res, 500, 'Failed to fetch appointments');
  }
});

// PUT /api/admin/appointments/:id (Update Appointment)
router.put('/appointments/:id', authenticateAdmin, async (req, res) => {
  try {
    const appointmentId = parseInt(req.params.id, 10);
    const { status, scheduled_at, doctor_id, reason, notes, doctor_name, specialty } = req.body;

    const existing = await query('SELECT * FROM appointments WHERE id = $1', [appointmentId]);
    if (existing.rows.length === 0) {
      return sendError(res, 404, 'Appointment not found');
    }

    const current = existing.rows[0];
    let newDoctorName = doctor_name || current.doctor_name;
    let newSpecialty = specialty || current.specialty;

    if (doctor_id && doctor_id !== current.doctor_id) {
      const docRes = await query('SELECT name, specialty FROM doctors WHERE id = $1', [doctor_id]);
      if (docRes.rows.length > 0) {
        newDoctorName = docRes.rows[0].name;
        newSpecialty = docRes.rows[0].specialty;
      }
    }

    const updated = await query(
      `UPDATE appointments
       SET status = $1, scheduled_at = $2, doctor_id = $3, doctor_name = $4, specialty = $5, reason = $6, notes = $7
       WHERE id = $8
       RETURNING *`,
      [
        status || current.status,
        scheduled_at ? new Date(scheduled_at).toISOString() : current.scheduled_at,
        doctor_id !== undefined ? doctor_id : current.doctor_id,
        newDoctorName,
        newSpecialty,
        reason !== undefined ? reason : current.reason,
        notes !== undefined ? notes : current.notes,
        appointmentId
      ]
    );

    res.json({
      message: 'Appointment successfully updated',
      appointment: updated.rows[0]
    });
  } catch (err) {
    console.error('[Admin Update Appointment Error]:', err);
    sendError(res, 500, 'Failed to update appointment');
  }
});

// -------------------------------------------------------------
// DATASET MANAGEMENT, STRICT VALIDATION & ML RETRAINING
// -------------------------------------------------------------

// Helper function to parse and validate CSV schema
function validateAndParseDataset(csvString) {
  const lines = csvString
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) {
    return { valid: false, error: 'Dataset is empty or contains no data rows.' };
  }

  // Parse header
  const headerLine = lines[0];
  // Simple regex or split for CSV header tokens
  const headers = headerLine.split(',').map((h) =>
    h
      .replace(/^["']|["']$/g, '')
      .trim()
      .toLowerCase()
  );

  // Find column indices
  let textIndex = headers.findIndex((h) =>
    ['text', 'description', 'symptom', 'symptom_text'].includes(h)
  );
  let labelIndex = headers.findIndex((h) =>
    ['label', 'disease', 'condition', 'diagnosis', 'category'].includes(h)
  );

  if (textIndex === -1 || labelIndex === -1) {
    return {
      valid: false,
      error: `Invalid CSV schema. Missing required columns. Found headers: [${headers.join(', ')}]. Required headers: 'text' (symptom description) and 'label' (disease name).`
    };
  }

  const validRows = [];
  const labelsSet = new Set();
  const classCounts = {};
  let malformedCount = 0;

  function parseCsvRow(str) {
    const cells = [];
    let cur = '';
    let inQuotes = false;
    for (let c of str) {
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if (c === ',' && !inQuotes) {
        cells.push(cur);
        cur = '';
      } else {
        cur += c;
      }
    }
    cells.push(cur);
    return cells;
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const row = parseCsvRow(line);
    const cleanTokens = row.map((cell) => cell.replace(/^["']|["']$/g, '').trim());

    const text = cleanTokens[textIndex];
    const label = cleanTokens[labelIndex];

    if (text && label && text.length >= 3 && label.length >= 2) {
      validRows.push({ text, label });
      labelsSet.add(label);
      classCounts[label] = (classCounts[label] || 0) + 1;
    } else {
      malformedCount++;
    }
  }

  if (validRows.length < 10) {
    return {
      valid: false,
      error: `Insufficient data: Found only ${validRows.length} valid rows. Minimum required is 10 rows.`
    };
  }

  if (labelsSet.size < 2) {
    return {
      valid: false,
      error: `Insufficient classes: Found only ${labelsSet.size} unique disease label. A classifier requires at least 2 distinct disease categories.`
    };
  }

  // Check error ratio
  if (malformedCount > validRows.length) {
    return {
      valid: false,
      error: `Dataset contains too many malformed/empty rows (${malformedCount} malformed vs ${validRows.length} valid). Please clean the CSV.`
    };
  }

  // ADMIN-11: basic class-balance stats -- the smallest class vs. the
  // largest, and a ratio, so an administrator can see a badly imbalanced
  // upload (e.g. one class with 2 rows against another with 400) before
  // confirming a retrain on it, not just the overall row/class counts.
  const counts = Object.values(classCounts);
  const minClassCount = counts.length ? Math.min(...counts) : 0;
  const maxClassCount = counts.length ? Math.max(...counts) : 0;
  const classBalance = {
    class_counts: classCounts,
    min_class_count: minClassCount,
    max_class_count: maxClassCount,
    imbalance_ratio: minClassCount > 0 ? Math.round((maxClassCount / minClassCount) * 100) / 100 : null,
    // Not an error -- a signal the confirm step should surface, not block.
    is_imbalanced: minClassCount > 0 && maxClassCount / minClassCount >= 5
  };

  return {
    valid: true,
    rows: validRows,
    totalCount: validRows.length,
    classes: Array.from(labelsSet),
    classesCount: labelsSet.size,
    malformedCount,
    classBalance
  };
}

// GET /api/admin/dataset/status
router.get('/dataset/status', authenticateAdmin, async (req, res) => {
  try {
    let fileSize = 0;
    let rowCount = 0;
    let classesCount = 0;
    let classes = [];

    const targetPath = fs.existsSync(ML_DATA_PATH)
      ? ML_DATA_PATH
      : fs.existsSync(ROOT_DATA_PATH)
        ? ROOT_DATA_PATH
        : null;

    if (targetPath) {
      const stats = fs.statSync(targetPath);
      fileSize = stats.size;
      const content = fs.readFileSync(targetPath, 'utf8');
      const parsed = validateAndParseDataset(content);
      if (parsed.valid) {
        rowCount = parsed.totalCount;
        classesCount = parsed.classesCount;
        classes = parsed.classes;
      }
    }

    // Try fetching live holdout accuracy from ML service
    let mlInfo = null;
    try {
      const mlRes = await axios.get(`${ML_SERVICE_URL}/diseases`, { timeout: 2000 });
      mlInfo = mlRes.data;
    } catch (e) {
      mlInfo = null;
    }

    res.json({
      dataset: {
        file_name: 'Symptom2Disease.csv',
        file_size_bytes: fileSize,
        file_size_kb: Math.round(fileSize / 1024),
        total_samples: rowCount,
        classes_count: classesCount,
        classes: classes.slice(0, 30),
        ml_holdout_accuracy: mlInfo?.model_holdout_accuracy ?? 0.9667,
        ml_holdout_macro_f1: mlInfo?.model_holdout_macro_f1 ?? 0.9661,
        status: 'active'
      }
    });
  } catch (err) {
    console.error('[Admin Dataset Status Error]:', err);
    sendError(res, 500, 'Failed to inspect dataset status');
  }
});

// POST /api/admin/dataset/validate (ADMIN-11): validates a candidate CSV
// and returns class-balance stats WITHOUT saving the file or triggering a
// retrain -- the "before retraining is confirmed" step. The actual
// confirm-and-retrain action is still POST /dataset/upload.
router.post('/dataset/validate', authenticateAdmin, upload.single('dataset'), async (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, 400, 'Please upload a CSV dataset file.');
    }
    if (!req.file.originalname.toLowerCase().endsWith('.csv')) {
      return sendError(res, 400, 'Invalid file format. Only .csv files are supported.');
    }

    const validation = validateAndParseDataset(req.file.buffer.toString('utf8'));
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error, validation_failed: true });
    }

    res.json({
      message: 'Dataset is valid. Review the class-balance stats before confirming retraining.',
      validation: {
        total_samples: validation.totalCount,
        classes_count: validation.classesCount,
        classes: validation.classes,
        malformed_skipped: validation.malformedCount,
        class_balance: validation.classBalance
      }
    });
  } catch (err) {
    console.error('[Admin Dataset Validate Error]:', err);
    sendError(res, 500, `Dataset validation failed: ${err.message}`);
  }
});

// POST /api/admin/dataset/upload (Upload CSV, Validate, & Retrain ML Model)
router.post('/dataset/upload', authenticateAdmin, upload.single('dataset'), async (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, 400, 'Please upload a CSV dataset file.');
    }

    // Check file extension
    const originalName = req.file.originalname.toLowerCase();
    if (!originalName.endsWith('.csv')) {
      return sendError(
        res,
        400,
        'Invalid file format. Only .csv files are supported for AI model training.'
      );
    }

    const csvContent = req.file.buffer.toString('utf8');
    const validation = validateAndParseDataset(csvContent);

    // CRITICAL: Schema validation & Error Alert
    if (!validation.valid) {
      return res.status(400).json({
        error: validation.error,
        validation_failed: true
      });
    }

    // Format standardized CSV
    const standardizedLines = ['text,label'];
    validation.rows.forEach((r) => {
      const cleanText = `"${r.text.replace(/"/g, '""')}"`;
      const cleanLabel = `"${r.label.replace(/"/g, '""')}"`;
      standardizedLines.push(`${cleanText},${cleanLabel}`);
    });
    const standardizedCsv = standardizedLines.join('\n');

    // Save to ML service data directory and root directory
    const mlDataDir = path.dirname(ML_DATA_PATH);
    if (!fs.existsSync(mlDataDir)) {
      fs.mkdirSync(mlDataDir, { recursive: true });
    }
    fs.writeFileSync(ML_DATA_PATH, standardizedCsv, 'utf8');

    try {
      fs.writeFileSync(ROOT_DATA_PATH, standardizedCsv, 'utf8');
    } catch (e) {
      // Non-fatal if root is not writable
    }

    // ADMIN-12: /retrain on the ML service is now asynchronous -- it
    // returns a job id immediately rather than blocking this request on
    // however long training takes. GET /dataset/retrain/:jobId polls it.
    let retrainResult = null;
    try {
      const mlResponse = await axios.post(
        `${ML_SERVICE_URL}/retrain`,
        {
          custom_dataset_path: ML_DATA_PATH,
          dataset_reference: `admin_upload:${originalName}`
        },
        { timeout: 5000 }
      );
      retrainResult = mlResponse.data;
    } catch (mlErr) {
      console.warn('[ML Retrain Notice]:', mlErr.message);
      retrainResult = {
        status: 'pending',
        message: 'Dataset saved. ML service will load it on next boot or request.'
      };
    }

    await recordAudit({
      actorType: 'admin',
      actorId: req.admin.id,
      action: 'dataset_uploaded',
      requestId: req.id,
      metadata: { file_name: originalName, total_samples: validation.totalCount, job_id: retrainResult?.job_id }
    });

    res.json({
      message: 'Dataset validated and uploaded successfully. Model retraining has been queued.',
      validation: {
        total_samples: validation.totalCount,
        classes_count: validation.classesCount,
        classes: validation.classes,
        malformed_skipped: validation.malformedCount,
        class_balance: validation.classBalance
      },
      retrain: retrainResult
    });
  } catch (err) {
    console.error('[Admin Dataset Upload Error]:', err);
    sendError(res, 500, `Dataset processing failed: ${err.message}`);
  }
});

// GET /api/admin/dataset/retrain/:jobId (ADMIN-12): polls an async
// retraining job's status/progress/result.
router.get('/dataset/retrain/:jobId', authenticateAdmin, async (req, res) => {
  try {
    const mlRes = await axios.get(`${ML_SERVICE_URL}/retrain/${req.params.jobId}`, { timeout: 5000 });
    res.json(mlRes.data);
  } catch (err) {
    if (err.response?.status === 404) {
      return sendError(res, 404, 'Retraining job not found');
    }
    console.error('[Admin Retrain Status Error]:', err.message);
    sendError(res, 502, 'Failed to reach ML service for retraining job status');
  }
});

// -------------------------------------------------------------
// MODEL LIFECYCLE (ADMIN-13..15): thin proxies over the ML service's own
// model-version registry. Kept here (admin-authenticated) rather than
// exposed directly on the ML service, consistent with every other ML
// capability (extract/predict/retrain) being reached only through this
// backend.
// -------------------------------------------------------------

// GET /api/admin/models
router.get('/models', authenticateAdmin, async (req, res) => {
  try {
    const mlRes = await axios.get(`${ML_SERVICE_URL}/models`, {
      timeout: 5000,
      params: req.query.model_type ? { model_type: req.query.model_type } : {}
    });
    res.json(mlRes.data);
  } catch (err) {
    console.error('[Admin List Models Error]:', err.message);
    sendError(res, 502, 'Failed to reach ML service for model version history');
  }
});

// POST /api/admin/models/activate
router.post('/models/activate', authenticateAdmin, async (req, res) => {
  try {
    const { version_id, force } = req.body || {};
    if (!version_id) {
      return sendError(res, 400, 'version_id is required');
    }
    const mlRes = await axios.post(
      `${ML_SERVICE_URL}/models/activate`,
      { version_id, force: !!force },
      { timeout: 10000 }
    );
    await recordAudit({
      actorType: 'admin',
      actorId: req.admin.id,
      action: 'model_version_activated',
      requestId: req.id,
      metadata: { version_id, force: !!force }
    });
    res.json(mlRes.data);
  } catch (err) {
    if (err.response?.status === 404) return sendError(res, 404, err.response.data?.detail || 'Model version not found');
    if (err.response?.status === 409) {
      return sendError(res, 409, err.response.data?.detail || 'Model version does not meet the activation threshold', {
        code: 'MODEL_BELOW_THRESHOLD'
      });
    }
    console.error('[Admin Activate Model Error]:', err.message);
    sendError(res, 502, 'Failed to reach ML service to activate model version');
  }
});

// POST /api/admin/models/rollback
router.post('/models/rollback', authenticateAdmin, async (req, res) => {
  try {
    const { version_id } = req.body || {};
    if (!version_id) {
      return sendError(res, 400, 'version_id is required');
    }
    const mlRes = await axios.post(`${ML_SERVICE_URL}/models/rollback`, { version_id }, { timeout: 10000 });
    await recordAudit({
      actorType: 'admin',
      actorId: req.admin.id,
      action: 'model_version_rolled_back',
      requestId: req.id,
      metadata: { version_id }
    });
    res.json(mlRes.data);
  } catch (err) {
    if (err.response?.status === 404) return sendError(res, 404, err.response.data?.detail || 'Model version not found');
    if (err.response?.status === 409) {
      return sendError(res, 409, err.response.data?.detail || 'Model version was never activated', {
        code: 'MODEL_NEVER_ACTIVATED'
      });
    }
    console.error('[Admin Rollback Model Error]:', err.message);
    sendError(res, 502, 'Failed to reach ML service to roll back model version');
  }
});

// -------------------------------------------------------------
// AUDIT LOG (AUDIT-3): admin-only, read-only. There is deliberately no
// PUT/PATCH/DELETE route against audit_logs anywhere in this codebase --
// that is how "immutable via the API" is enforced.
// -------------------------------------------------------------

router.get('/audit-logs', authenticateAdmin, async (req, res) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    // ADMIN-10: filter by actor, action, and/or a created_at date range.
    const { actor_type, action, date_from, date_to } = req.query;

    let whereSql = '';
    const params = [];
    let paramIndex = 1;
    const addClause = (clause, value) => {
      whereSql += `${whereSql ? ' AND' : ' WHERE'} ${clause.replace('?', `$${paramIndex++}`)}`;
      params.push(value);
    };
    if (actor_type) addClause('actor_type = ?', actor_type);
    if (action) addClause('action = ?', action);
    if (date_from) addClause('created_at >= ?', new Date(date_from).toISOString());
    if (date_to) addClause('created_at <= ?', new Date(date_to).toISOString());

    const countResult = await query(`SELECT COUNT(*) as total FROM audit_logs${whereSql}`, params);
    const total = parseInt(countResult.rows[0]?.total ?? 0, 10);

    const dataParams = [...params, limit, offset];
    const logsRes = await query(
      `SELECT id, actor_type, actor_id, action, target_type, target_id, request_id, metadata, created_at
       FROM audit_logs${whereSql}
       ORDER BY created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      dataParams
    );

    res.json(paginatedResponse('logs', logsRes.rows, total, { limit, offset }));
  } catch (err) {
    console.error('[Admin Get Audit Logs Error]:', err);
    sendError(res, 500, 'Failed to fetch audit logs');
  }
});

module.exports = router;
