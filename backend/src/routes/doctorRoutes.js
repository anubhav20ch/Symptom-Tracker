const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const { authenticateDoctor } = require('../middleware/auth');
const {
  signAccessToken,
  generateRefreshToken,
  hashToken,
  DOCTOR_REFRESH_COOKIE_NAME,
  DOCTOR_REFRESH_COOKIE_OPTIONS
} = require('../services/tokenService');
const { parsePagination, paginatedResponse } = require('../utils/pagination');
const { sendError } = require('../utils/apiError');

// Physician Portal: doctor accounts are provisioned by the clinic/admin (via
// seed data today, an admin console later) rather than self-registered, so
// there is deliberately no public /doctor/register endpoint.

async function issueDoctorSession(res, doctor) {
  const accessToken = signAccessToken({ id: doctor.id, email: doctor.email, role: 'doctor' });
  const { raw, tokenHash, expiresAt } = generateRefreshToken();

  await query(
    'INSERT INTO doctor_refresh_tokens (doctor_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [doctor.id, tokenHash, expiresAt]
  );

  res.cookie(DOCTOR_REFRESH_COOKIE_NAME, raw, DOCTOR_REFRESH_COOKIE_OPTIONS);
  return accessToken;
}

const DOCTOR_EMAIL_ALIASES = {
  'jennifer@symptomlog.com': 'jennifer.vance@symptomlog.com',
  'dr.vance@symptomlog.com': 'jennifer.vance@symptomlog.com',
  'robert@symptomlog.com': 'robert.sterling@symptomlog.com',
  'dr.sterling@symptomlog.com': 'robert.sterling@symptomlog.com',
  'amelia@symptomlog.com': 'amelia.ferreira@symptomlog.com',
  'dr.ferreira@symptomlog.com': 'amelia.ferreira@symptomlog.com'
};

// POST /api/doctor/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return sendError(res, 400, 'Email and password are required');
    }

    const normalizedEmail = email.toLowerCase().trim();
    let docRes = await query(
      'SELECT id, name, email, password_hash, specialty, npi_number FROM doctors WHERE email = $1',
      [normalizedEmail]
    );

    if (docRes.rows.length === 0 && DOCTOR_EMAIL_ALIASES[normalizedEmail]) {
      docRes = await query(
        'SELECT id, name, email, password_hash, specialty, npi_number FROM doctors WHERE email = $1',
        [DOCTOR_EMAIL_ALIASES[normalizedEmail]]
      );
    }

    if (docRes.rows.length === 0) {
      return sendError(res, 401, 'Invalid email or password');
    }

    const doctor = docRes.rows[0];
    const match = await bcrypt.compare(password, doctor.password_hash);
    if (!match) {
      return sendError(res, 401, 'Invalid email or password');
    }
    delete doctor.password_hash;

    const token = await issueDoctorSession(res, doctor);
    res.json({ message: 'Physician login successful', token, doctor });
  } catch (err) {
    console.error('[Doctor Login Error]:', err);
    sendError(res, 500, 'Login failed due to server error');
  }
});

// POST /api/doctor/refresh
router.post('/refresh', async (req, res) => {
  try {
    const rawToken = req.cookies?.[DOCTOR_REFRESH_COOKIE_NAME];
    if (!rawToken) {
      return sendError(res, 401, 'No refresh token provided');
    }

    const tokenHash = hashToken(rawToken);
    const tokenRes = await query(
      'SELECT id, doctor_id, revoked, expires_at FROM doctor_refresh_tokens WHERE token_hash = $1',
      [tokenHash]
    );

    const storedToken = tokenRes.rows[0];
    const isExpired = !storedToken || new Date(storedToken.expires_at) < new Date();
    const isRevoked = !storedToken || !!storedToken.revoked;

    if (!storedToken || isExpired || isRevoked) {
      res.clearCookie(DOCTOR_REFRESH_COOKIE_NAME, { path: DOCTOR_REFRESH_COOKIE_OPTIONS.path });
      return sendError(res, 401, 'Refresh token invalid or expired, please log in again');
    }

    await query('UPDATE doctor_refresh_tokens SET revoked = $1 WHERE id = $2', [1, storedToken.id]);

    const docRes = await query(
      'SELECT id, name, email, specialty, npi_number FROM doctors WHERE id = $1',
      [storedToken.doctor_id]
    );
    const doctor = docRes.rows[0];
    if (!doctor) {
      return sendError(res, 401, 'Doctor account no longer exists');
    }

    const token = await issueDoctorSession(res, doctor);
    res.json({ message: 'Access token refreshed', token });
  } catch (err) {
    console.error('[Doctor Refresh Error]:', err);
    sendError(res, 500, 'Failed to refresh session');
  }
});

// POST /api/doctor/logout
router.post('/logout', async (req, res) => {
  try {
    const rawToken = req.cookies?.[DOCTOR_REFRESH_COOKIE_NAME];
    if (rawToken) {
      const tokenHash = hashToken(rawToken);
      await query('UPDATE doctor_refresh_tokens SET revoked = $1 WHERE token_hash = $2', [
        1,
        tokenHash
      ]);
    }
    res.clearCookie(DOCTOR_REFRESH_COOKIE_NAME, { path: DOCTOR_REFRESH_COOKIE_OPTIONS.path });
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    sendError(res, 500, 'Failed to log out');
  }
});

// GET /api/doctor/directory - Public, non-sensitive listing so patients can
// pick a registered physician when booking an appointment.
router.get('/directory', async (req, res) => {
  try {
    const result = await query('SELECT id, name, specialty FROM doctors ORDER BY name ASC');
    res.json({ doctors: result.rows });
  } catch (err) {
    sendError(res, 500, 'Failed to fetch doctor directory');
  }
});

// GET /api/doctor/me
router.get('/me', authenticateDoctor, async (req, res) => {
  res.json({ doctor: req.doctor });
});

// GET /api/doctor/appointments - All appointments linked to this doctor's
// account, read-only patient context (name + linked symptom entry details).
router.get('/appointments', authenticateDoctor, async (req, res) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const countResult = await query(
      'SELECT COUNT(*) as total FROM appointments WHERE doctor_id = $1',
      [req.doctor.id]
    );
    const total = parseInt(countResult.rows[0]?.total ?? 0, 10);

    const result = await query(
      `SELECT
        a.*,
        u.name as patient_name,
        u.age as patient_age,
        u.gender as patient_gender,
        se.severity as entry_severity,
        se.description as entry_description,
        se.started_at as entry_started_at,
        s.name as entry_symptom_name
       FROM appointments a
       JOIN users u ON a.user_id = u.id
       LEFT JOIN symptom_entries se ON a.entry_id = se.id
       LEFT JOIN symptoms s ON se.symptom_id = s.id
       WHERE a.doctor_id = $1
       ORDER BY a.scheduled_at DESC
       LIMIT $2 OFFSET $3`,
      [req.doctor.id, limit, offset]
    );
    res.json(paginatedResponse('appointments', result.rows, total, { limit, offset }));
  } catch (err) {
    req.log?.error({ err: err.message }, 'doctor appointments fetch failed');
    sendError(res, 500, 'Failed to fetch appointments');
  }
});

// PATCH /api/doctor/appointments/:id/review - Physician updates status and
// leaves a clinical note visible back to the patient's appointment record.
router.patch('/appointments/:id/review', authenticateDoctor, async (req, res) => {
  try {
    const { status, doctor_review_notes } = req.body;
    if (status && !['scheduled', 'completed', 'cancelled'].includes(status)) {
      return sendError(res, 400, 'Invalid status. Choose scheduled, completed, or cancelled');
    }

    const existing = await query('SELECT id, doctor_id FROM appointments WHERE id = $1', [
      req.params.id
    ]);
    if (existing.rows.length === 0) {
      return sendError(res, 404, 'Appointment not found');
    }

    const appt = existing.rows[0];
    if (appt.doctor_id && appt.doctor_id !== req.doctor.id) {
      return sendError(res, 403, 'This appointment is assigned to another physician');
    }

    await query(
      `UPDATE appointments
       SET status = COALESCE($1, status),
           doctor_review_notes = CASE WHEN $2 IS NOT NULL THEN $2 ELSE doctor_review_notes END,
           doctor_id = COALESCE(doctor_id, $3),
           reviewed_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [
        status || null,
        doctor_review_notes !== undefined ? doctor_review_notes : null,
        req.doctor.id,
        req.params.id
      ]
    );

    const updated = await query('SELECT * FROM appointments WHERE id = $1', [req.params.id]);
    res.json({
      message: `Appointment status updated to ${status || 'current'}`,
      appointment: updated.rows[0]
    });
  } catch (err) {
    console.error('[Doctor review error]:', err);
    sendError(res, 500, 'Failed to submit review');
  }
});

// POST /api/doctor/appointments/:id/prescribe
// Allows physician to prescribe medications & schedule alarms for the patient
// ONLY WHILE THE APPOINTMENT IS ACTIVE. Once completed/cancelled, privileges are revoked.
router.post('/appointments/:id/prescribe', authenticateDoctor, async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const { name, dosage, frequency, duration_days, reminder_time, instructions } = req.body;

    if (!name || !dosage) {
      return sendError(res, 400, 'Medication name and dosage are required');
    }

    const apptRes = await query(
      'SELECT id, user_id, status FROM appointments WHERE id = $1 AND doctor_id = $2',
      [appointmentId, req.doctor.id]
    );

    if (apptRes.rows.length === 0) {
      return sendError(res, 404, 'Appointment not found for this physician');
    }

    const appt = apptRes.rows[0];

    // PRIVILEGE LOCK: If appointment is completed or cancelled, revoke doctor's ability to modify
    if (appt.status !== 'scheduled') {
      return res.status(403).json({
        error: `Prescribing and schedule modification privileges are revoked because this appointment is already closed (Status: ${appt.status}). Only active appointments allow doctor modifications.`
      });
    }

    const durationNum = parseInt(duration_days, 10) || 7;
    const startedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + durationNum * 24 * 60 * 60 * 1000).toISOString();

    // 1. Insert Medication
    const medRes = await query(
      `INSERT INTO medications (user_id, name, dosage, frequency, started_at, ended_at, active, prescribed_by_doctor_id, appointment_id, duration_days, instructions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        appt.user_id,
        name.trim(),
        dosage.trim(),
        frequency || 'Once daily',
        startedAt,
        expiresAt,
        1,
        req.doctor.id,
        appt.id,
        durationNum,
        instructions || `Prescribed by Dr. ${req.doctor.name} for ${durationNum} days.`
      ]
    );

    const createdMed = medRes.rows[0];
    let createdReminder = null;

    // 2. Automatically create patient alarm / schedule if reminder_time provided
    if (reminder_time) {
      const label = `Take ${name} (${dosage}) - Prescribed by Dr. ${req.doctor.name}`;
      const remRes = await query(
        `INSERT INTO reminders (user_id, scheduled_time, active, label, medication_id, reminder_type, expires_at, prescribed_duration_days, sound_alarm, prescribed_by_doctor_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          appt.user_id,
          reminder_time.trim(),
          1,
          label,
          createdMed.id,
          'medication',
          expiresAt,
          durationNum,
          1,
          req.doctor.name
        ]
      );
      createdReminder = remRes.rows[0];
    }

    res.status(201).json({
      message: `Successfully prescribed ${name} for ${durationNum} days with auto-expiring reminder.`,
      medication: createdMed,
      reminder: createdReminder
    });
  } catch (err) {
    console.error('[Doctor Prescribe Error]:', err);
    sendError(res, 500, 'Failed to prescribe medication and schedule reminder');
  }
});

// GET /api/doctor/appointments/:id/prescriptions
router.get('/appointments/:id/prescriptions', authenticateDoctor, async (req, res) => {
  try {
    const medRes = await query(
      `SELECT m.*, r.scheduled_time AS reminder_time, r.active AS reminder_active, r.expires_at AS reminder_expires_at
       FROM medications m
       LEFT JOIN reminders r ON r.medication_id = m.id
       WHERE m.appointment_id = $1 AND m.prescribed_by_doctor_id = $2
       ORDER BY m.created_at DESC`,
      [req.params.id, req.doctor.id]
    );
    res.json({ medications: medRes.rows });
  } catch (err) {
    sendError(res, 500, 'Failed to fetch prescriptions');
  }
});

module.exports = router;
