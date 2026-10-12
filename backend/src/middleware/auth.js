const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { JWT_SECRET } = require('../services/tokenService');
const { sendError } = require('../utils/apiError');

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return sendError(res, 401, 'Access token required');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role && decoded.role !== 'patient') {
      return sendError(res, 403, 'This endpoint requires a patient account');
    }

    const userRes = await query(
      'SELECT id, name, email, age, gender, chronic_conditions, dark_mode, user_tier FROM users WHERE id = $1',
      [decoded.id]
    );

    if (userRes.rows.length === 0) {
      return sendError(res, 401, 'User no longer exists');
    }

    req.user = userRes.rows[0];
    try {
      if (typeof req.user.chronic_conditions === 'string') {
        req.user.chronic_conditions = JSON.parse(req.user.chronic_conditions);
      }
    } catch (e) {
      req.user.chronic_conditions = [];
    }

    next();
  } catch (err) {
    return sendError(res, 403, 'Invalid or expired access token');
  }
}

// Physician Portal auth guard: verifies the JWT carries role=doctor and the
// doctor account still exists, scoping every /api/doctor/* route to that doctor.
async function authenticateDoctor(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return sendError(res, 401, 'Doctor access token required');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'doctor') {
      return sendError(res, 403, 'This endpoint requires a physician account');
    }

    const doctorRes = await query(
      'SELECT id, name, email, specialty, npi_number FROM doctors WHERE id = $1',
      [decoded.id]
    );
    if (doctorRes.rows.length === 0) {
      return sendError(res, 401, 'Doctor account no longer exists');
    }

    req.doctor = doctorRes.rows[0];
    next();
  } catch (err) {
    return sendError(res, 403, 'Invalid or expired doctor access token');
  }
}

// Admin Portal auth guard: verifies the JWT carries role=admin
async function authenticateAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return sendError(res, 401, 'Admin access token required');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') {
      return sendError(res, 403, 'This endpoint requires administrative privileges');
    }

    const adminRes = await query('SELECT id, name, email, role FROM admins WHERE id = $1', [
      decoded.id
    ]);
    if (adminRes.rows.length === 0) {
      return sendError(res, 401, 'Admin account no longer exists');
    }

    req.admin = adminRes.rows[0];
    next();
  } catch (err) {
    return sendError(res, 403, 'Invalid or expired admin access token');
  }
}

// REPORT-5: a report download is permitted for the owning patient OR a
// physician with an active appointment link to that patient -- unlike
// every other guard in this file, which rejects whichever role it isn't
// built for, this one accepts either and lets the route handler apply the
// ownership/appointment-link check itself.
async function authenticatePatientOrDoctor(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return sendError(res, 401, 'Access token required');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.role === 'doctor') {
      const doctorRes = await query(
        'SELECT id, name, email, specialty, npi_number FROM doctors WHERE id = $1',
        [decoded.id]
      );
      if (doctorRes.rows.length === 0) {
        return sendError(res, 401, 'Doctor account no longer exists');
      }
      req.doctor = doctorRes.rows[0];
      return next();
    }

    const userRes = await query(
      'SELECT id, name, email, age, gender, chronic_conditions, dark_mode, user_tier FROM users WHERE id = $1',
      [decoded.id]
    );
    if (userRes.rows.length === 0) {
      return sendError(res, 401, 'User no longer exists');
    }
    req.user = userRes.rows[0];
    next();
  } catch (err) {
    return sendError(res, 403, 'Invalid or expired access token');
  }
}

module.exports = {
  authenticateToken,
  authenticateDoctor,
  authenticateAdmin,
  authenticatePatientOrDoctor,
  JWT_SECRET
};
