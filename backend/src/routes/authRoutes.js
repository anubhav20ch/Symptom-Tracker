const express = require('express');
const router = express.Router();
const { sendError } = require('../utils/apiError');
const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { validateBody, registerSchema, loginSchema } = require('../middleware/validate');
const {
  signAccessToken,
  generateRefreshToken,
  hashToken,
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_OPTIONS
} = require('../services/tokenService');

// Issues a new access token + rotatable refresh token for a user, storing
// only the refresh token's hash and delivering the raw value as an
// HttpOnly, SameSite cookie so it is inaccessible to client-side JS (XSS-safe).
async function issueSession(res, user) {
  const accessToken = signAccessToken({ id: user.id, email: user.email, role: 'patient' });
  const { raw, tokenHash, expiresAt } = generateRefreshToken();

  await query('INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)', [
    user.id,
    tokenHash,
    expiresAt
  ]);

  res.cookie(REFRESH_COOKIE_NAME, raw, REFRESH_COOKIE_OPTIONS);
  return accessToken;
}

// Register
router.post('/register', validateBody(registerSchema), async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      age,
      gender,
      chronic_conditions,
      user_tier = 'clinical'
    } = req.body;

    // Check existing
    const existing = await query('SELECT id FROM users WHERE email = $1', [
      email.toLowerCase().trim()
    ]);
    if (existing.rows.length > 0) {
      return sendError(res, 409, 'An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const chronicJson = Array.isArray(chronic_conditions)
      ? JSON.stringify(chronic_conditions)
      : JSON.stringify(chronic_conditions ? [chronic_conditions] : []);

    const userRes = await query(
      `INSERT INTO users (name, email, password_hash, age, gender, chronic_conditions, dark_mode, user_tier)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, name, email, age, gender, chronic_conditions, dark_mode, user_tier, created_at`,
      [
        name.trim(),
        email.toLowerCase().trim(),
        passwordHash,
        age ? parseInt(age, 10) : null,
        gender || null,
        chronicJson,
        0,
        user_tier || 'clinical'
      ]
    );

    let user = userRes.rows[0];
    if (!user) {
      const fetchNew = await query(
        'SELECT id, name, email, age, gender, chronic_conditions, dark_mode, created_at FROM users WHERE email = $1',
        [email.toLowerCase().trim()]
      );
      user = fetchNew.rows[0];
    }

    try {
      if (typeof user.chronic_conditions === 'string')
        user.chronic_conditions = JSON.parse(user.chronic_conditions);
    } catch (e) {
      user.chronic_conditions = [];
    }

    const token = await issueSession(res, user);

    res.status(201).json({
      message: 'Registration successful',
      token,
      user
    });
  } catch (err) {
    console.error('[Auth Register Error]:', err);
    sendError(res, 500, 'Failed to register account');
  }
});

// Demo email alias lookup dictionary
const DEMO_EMAIL_ALIASES = {
  'marcus@symptomlog.com': 'marcus@example.com',
  'marcus@example.com': 'marcus@symptomlog.com',
  'elena@symptomlog.com': 'elena@example.com',
  'elena@example.com': 'elena@symptomlog.com',
  'sarah@symptomlog.com': 'demo@symptomlog.com',
  'sarah.chen@symptomlog.com': 'demo@symptomlog.com',
  'sarah@example.com': 'demo@symptomlog.com',
  'demo@example.com': 'demo@symptomlog.com'
};

// Login
router.post('/login', validateBody(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    let userRes = await query(
      'SELECT id, name, email, password_hash, age, gender, chronic_conditions, dark_mode, created_at FROM users WHERE email = $1',
      [normalizedEmail]
    );

    // Fallback for demo aliases if not found directly
    if (userRes.rows.length === 0 && DEMO_EMAIL_ALIASES[normalizedEmail]) {
      userRes = await query(
        'SELECT id, name, email, password_hash, age, gender, chronic_conditions, dark_mode, created_at FROM users WHERE email = $1',
        [DEMO_EMAIL_ALIASES[normalizedEmail]]
      );
    }

    if (userRes.rows.length === 0) {
      return sendError(res, 401, 'Invalid email or password');
    }

    const user = userRes.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return sendError(res, 401, 'Invalid email or password');
    }

    delete user.password_hash;
    try {
      if (typeof user.chronic_conditions === 'string')
        user.chronic_conditions = JSON.parse(user.chronic_conditions);
    } catch (e) {
      user.chronic_conditions = [];
    }

    const token = await issueSession(res, user);

    res.json({
      message: 'Login successful',
      token,
      user
    });
  } catch (err) {
    console.error('[Auth Login Error]:', err);
    sendError(res, 500, 'Login failed due to server error');
  }
});

// POST /api/auth/refresh - Rotates the refresh token cookie and issues a new
// short-lived access token, without requiring the user to re-enter credentials.
router.post('/refresh', async (req, res) => {
  try {
    const rawToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!rawToken) {
      return sendError(res, 401, 'No refresh token provided');
    }

    const tokenHash = hashToken(rawToken);
    const tokenRes = await query(
      'SELECT id, user_id, revoked, expires_at FROM refresh_tokens WHERE token_hash = $1',
      [tokenHash]
    );

    const storedToken = tokenRes.rows[0];
    const isExpired = !storedToken || new Date(storedToken.expires_at) < new Date();
    const isRevoked = !storedToken || !!storedToken.revoked;

    if (!storedToken || isExpired || isRevoked) {
      res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_OPTIONS.path });
      return sendError(res, 401, 'Refresh token invalid or expired, please log in again');
    }

    // Rotate: revoke the used token so it can never be replayed.
    await query('UPDATE refresh_tokens SET revoked = $1 WHERE id = $2', [1, storedToken.id]);

    const userRes = await query(
      'SELECT id, name, email, age, gender, chronic_conditions, dark_mode FROM users WHERE id = $1',
      [storedToken.user_id]
    );
    const user = userRes.rows[0];
    if (!user) {
      return sendError(res, 401, 'User no longer exists');
    }

    const token = await issueSession(res, user);
    res.json({ message: 'Access token refreshed', token });
  } catch (err) {
    console.error('[Auth Refresh Error]:', err);
    sendError(res, 500, 'Failed to refresh session');
  }
});

// POST /api/auth/logout - Revokes the current refresh token and clears the cookie.
router.post('/logout', async (req, res) => {
  try {
    const rawToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (rawToken) {
      const tokenHash = hashToken(rawToken);
      await query('UPDATE refresh_tokens SET revoked = $1 WHERE token_hash = $2', [1, tokenHash]);
    }
    res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_OPTIONS.path });
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    sendError(res, 500, 'Failed to log out');
  }
});

// Get Current User Profile
router.get('/me', authenticateToken, async (req, res) => {
  res.json({ user: req.user });
});

// Update Profile & Tier
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, age, gender, chronic_conditions, user_tier } = req.body;
    const chronicJson = Array.isArray(chronic_conditions)
      ? JSON.stringify(chronic_conditions)
      : JSON.stringify([]);

    await query(
      `UPDATE users
       SET name = COALESCE($1, name),
           age = COALESCE($2, age),
           gender = COALESCE($3, gender),
           chronic_conditions = COALESCE($4, chronic_conditions),
           user_tier = COALESCE($5, user_tier)
       WHERE id = $6`,
      [name, age ? parseInt(age, 10) : null, gender, chronicJson, user_tier, req.user.id]
    );

    const updated = await query(
      'SELECT id, name, email, age, gender, chronic_conditions, dark_mode, user_tier FROM users WHERE id = $1',
      [req.user.id]
    );
    const user = updated.rows[0];
    try {
      if (typeof user.chronic_conditions === 'string')
        user.chronic_conditions = JSON.parse(user.chronic_conditions);
    } catch (e) {
      user.chronic_conditions = [];
    }

    res.json({ message: 'Profile updated successfully', user });
  } catch (err) {
    console.error('[Update Profile Error]:', err);
    sendError(res, 500, 'Failed to update profile');
  }
});

// Toggle Dark Mode
router.put('/dark-mode', authenticateToken, async (req, res) => {
  try {
    const { darkMode } = req.body;
    const val = darkMode ? 1 : 0;
    await query('UPDATE users SET dark_mode = $1 WHERE id = $2', [val, req.user.id]);
    res.json({ message: 'Dark mode preference saved', darkMode: !!darkMode });
  } catch (err) {
    sendError(res, 500, 'Failed to update dark mode');
  }
});

module.exports = router;
