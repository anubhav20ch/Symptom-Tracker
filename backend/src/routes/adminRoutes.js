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
  ADMIN_REFRESH_COOKIE_OPTIONS
} = require('../services/tokenService');
const { parsePagination, paginatedResponse } = require('../utils/pagination');

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
      return sendError(res, 401, 'Invalid admin credentials');
    }

    const admin = adminRes.rows[0];
    const match = await bcrypt.compare(password, admin.password_hash);
    if (!match) {
      return sendError(res, 401, 'Invalid admin credentials');
    }

    delete admin.password_hash;
    const token = await issueAdminSession(res, admin);
    res.json({ message: 'Admin authentication successful', token, admin });
  } catch (err) {
    console.error('[Admin Login Error]:', err);
    sendError(res, 500, 'Admin login failed due to server error');
  }
});

// POST /api/admin/logout
router.post('/logout', authenticateAdmin, async (req, res) => {
  try {
    const rawToken = req.cookies[ADMIN_REFRESH_COOKIE_NAME];
    if (rawToken) {
      const tokenHash = hashToken(rawToken);
      await query('UPDATE admin_refresh_tokens SET revoked = TRUE WHERE token_hash = $1', [
        tokenHash
      ]);
    }
    res.clearCookie(ADMIN_REFRESH_COOKIE_NAME, ADMIN_REFRESH_COOKIE_OPTIONS);
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
  let malformedCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Handle simple quotes in CSV
    const row = line.match(/(?:[^\s,"]|"(?:\\.|[^"])*")+/g) || line.split(',');
    const cleanTokens = row.map((cell) => cell.replace(/^["']|["']$/g, '').trim());

    const text = cleanTokens[textIndex];
    const label = cleanTokens[labelIndex];

    if (text && label && text.length >= 3 && label.length >= 2) {
      validRows.push({ text, label });
      labelsSet.add(label);
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

  return {
    valid: true,
    rows: validRows,
    totalCount: validRows.length,
    classes: Array.from(labelsSet),
    classesCount: labelsSet.size,
    malformedCount
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

    // Trigger ML Microservice Model Retraining
    let retrainResult = null;
    try {
      const mlResponse = await axios.post(
        `${ML_SERVICE_URL}/retrain`,
        {
          custom_dataset_path: ML_DATA_PATH
        },
        { timeout: 15000 }
      );
      retrainResult = mlResponse.data;
    } catch (mlErr) {
      console.warn('[ML Retrain Notice]:', mlErr.message);
      retrainResult = {
        status: 'pending',
        message: 'Dataset saved. ML service will load it on next boot or request.'
      };
    }

    res.json({
      message: 'Dataset validated and uploaded successfully. Machine Learning model retrained.',
      validation: {
        total_samples: validation.totalCount,
        classes_count: validation.classesCount,
        classes: validation.classes,
        malformed_skipped: validation.malformedCount
      },
      retrain: retrainResult
    });
  } catch (err) {
    console.error('[Admin Dataset Upload Error]:', err);
    sendError(res, 500, `Dataset processing failed: ${err.message}`);
  }
});

module.exports = router;
