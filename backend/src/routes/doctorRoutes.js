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
  DOCTOR_REFRESH_COOKIE_OPTIONS,
  generateCsrfToken,
  DOCTOR_CSRF_COOKIE_NAME,
  DOCTOR_CSRF_COOKIE_OPTIONS
} = require('../services/tokenService');
const { parsePagination, paginatedResponse } = require('../utils/pagination');
const { sendError } = require('../utils/apiError');
const { verifyCsrf } = require('../middleware/csrf');
const { recordAudit } = require('../utils/auditLog');

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
  res.cookie(DOCTOR_CSRF_COOKIE_NAME, generateCsrfToken(), DOCTOR_CSRF_COOKIE_OPTIONS);
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
      await recordAudit({ actorType: 'doctor', action: 'login_failed', requestId: req.id, metadata: { reason: 'no_such_account' } });
      return sendError(res, 401, 'Invalid email or password');
    }

    const doctor = docRes.rows[0];
    const match = await bcrypt.compare(password, doctor.password_hash);
    if (!match) {
      await recordAudit({ actorType: 'doctor', actorId: doctor.id, action: 'login_failed', requestId: req.id });
      return sendError(res, 401, 'Invalid email or password');
    }
    delete doctor.password_hash;

    const token = await issueDoctorSession(res, doctor);
    await recordAudit({ actorType: 'doctor', actorId: doctor.id, action: 'login_success', requestId: req.id });
    res.json({ message: 'Physician login successful', token, doctor });
  } catch (err) {
    console.error('[Doctor Login Error]:', err);
    sendError(res, 500, 'Login failed due to server error');
  }
});

// POST /api/doctor/refresh
router.post('/refresh', verifyCsrf(DOCTOR_CSRF_COOKIE_NAME), async (req, res) => {
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

    // AUTH-19: same reuse-detection rule as the patient portal.
    if (storedToken && storedToken.revoked) {
      await query('UPDATE doctor_refresh_tokens SET revoked = $1 WHERE doctor_id = $2', [1, storedToken.doctor_id]);
      await recordAudit({
        actorType: 'doctor',
        actorId: storedToken.doctor_id,
        action: 'refresh_token_reuse_detected',
        requestId: req.id
      });
      res.clearCookie(DOCTOR_REFRESH_COOKIE_NAME, { path: DOCTOR_REFRESH_COOKIE_OPTIONS.path });
      res.clearCookie(DOCTOR_CSRF_COOKIE_NAME, { path: DOCTOR_CSRF_COOKIE_OPTIONS.path });
      return sendError(res, 401, 'This session was already used elsewhere and has been revoked for safety. Please log in again.', {
        code: 'REFRESH_REUSE_DETECTED'
      });
    }

    const isExpired = !storedToken || new Date(storedToken.expires_at) < new Date();
    if (!storedToken || isExpired) {
      res.clearCookie(DOCTOR_REFRESH_COOKIE_NAME, { path: DOCTOR_REFRESH_COOKIE_OPTIONS.path });
      res.clearCookie(DOCTOR_CSRF_COOKIE_NAME, { path: DOCTOR_CSRF_COOKIE_OPTIONS.path });
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
router.post('/logout', verifyCsrf(DOCTOR_CSRF_COOKIE_NAME), async (req, res) => {
  try {
    const rawToken = req.cookies?.[DOCTOR_REFRESH_COOKIE_NAME];
    if (rawToken) {
      const tokenHash = hashToken(rawToken);
      const tokenRes = await query('SELECT doctor_id FROM doctor_refresh_tokens WHERE token_hash = $1', [tokenHash]);
      await query('UPDATE doctor_refresh_tokens SET revoked = $1 WHERE token_hash = $2', [
        1,
        tokenHash
      ]);
      if (tokenRes.rows[0]) {
        await recordAudit({ actorType: 'doctor', actorId: tokenRes.rows[0].doctor_id, action: 'logout', requestId: req.id });
      }
    }
    res.clearCookie(DOCTOR_REFRESH_COOKIE_NAME, { path: DOCTOR_REFRESH_COOKIE_OPTIONS.path });
    res.clearCookie(DOCTOR_CSRF_COOKIE_NAME, { path: DOCTOR_CSRF_COOKIE_OPTIONS.path });
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

// DOC-12: a physician's access to a patient lapses if no appointment
// between them falls within this look-back window -- so GET /appointments
// below only surfaces a patient relationship that is still "current" by
// that measure, not every appointment ever assigned to this doctor no
// matter how old. A patient the doctor still has a recent appointment
// with keeps full history visible; one they haven't seen in over a year
// (and have nothing upcoming with) drops out of the list entirely.
const DOCTOR_ACCESS_LOOKBACK_DAYS = 180;

// GET /api/doctor/appointments - All appointments linked to this doctor's
// account, read-only patient context (name + linked symptom entry details).
router.get('/appointments', authenticateDoctor, async (req, res) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const lookbackCutoff = new Date(
      Date.now() - DOCTOR_ACCESS_LOOKBACK_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();

    const countResult = await query(
      `SELECT COUNT(*) as total FROM appointments a
       WHERE a.doctor_id = $1
         AND (
           a.scheduled_at >= $2
           OR EXISTS (
             SELECT 1 FROM appointments a2
             WHERE a2.doctor_id = a.doctor_id AND a2.user_id = a.user_id AND a2.scheduled_at >= $2
           )
         )`,
      [req.doctor.id, lookbackCutoff]
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
         AND (
           a.scheduled_at >= $4
           OR EXISTS (
             SELECT 1 FROM appointments a2
             WHERE a2.doctor_id = a.doctor_id AND a2.user_id = a.user_id AND a2.scheduled_at >= $4
           )
         )
       ORDER BY a.scheduled_at DESC
       LIMIT $2 OFFSET $3`,
      [req.doctor.id, limit, offset, lookbackCutoff]
    );
    // AUDIT-2: a physician reading patient data, even within their own
    // authorized appointment list, is exactly the access PRIV-4 (Phase 4)
    // will show the patient in their own "who accessed my data" log.
    await Promise.all(
      result.rows.map((row) =>
        recordAudit({
          actorType: 'doctor',
          actorId: req.doctor.id,
          action: 'viewed_patient_appointment',
          targetType: 'user',
          targetId: row.user_id,
          requestId: req.id
        })
      )
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
