const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { sendError } = require('../utils/apiError');
const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { verifyCsrf } = require('../middleware/csrf');
const { recordAudit } = require('../utils/auditLog');
const { sendMail } = require('../services/mailService');
const {
  validateBody,
  registerSchema,
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  timezoneSchema
} = require('../middleware/validate');
const {
  signAccessToken,
  generateRefreshToken,
  hashToken,
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_OPTIONS,
  generateCsrfToken,
  CSRF_COOKIE_NAME,
  CSRF_COOKIE_OPTIONS
} = require('../services/tokenService');

// AUTH-16/17: 5 failed attempts within a 15-minute window locks the account
// for 30 minutes. last_failed_login_at anchors the rolling window: a failure
// older than the window resets the counter instead of accumulating forever.
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000;

// PRIV-1: bump this when the Terms of Service / Privacy Policy text
// materially changes, so `consents` keeps an accurate record of which
// version of the terms a given registration actually accepted.
const CONSENT_VERSION = '1.0';

// Issues a new access token + rotatable refresh token for a user, storing
// only the refresh token's hash and delivering the raw value as an
// HttpOnly, SameSite cookie so it is inaccessible to client-side JS (XSS-safe).
// Also issues the paired, readable CSRF cookie (SEC-13).
async function issueSession(res, user) {
  const accessToken = signAccessToken({ id: user.id, email: user.email, role: 'patient' });
  const { raw, tokenHash, expiresAt } = generateRefreshToken();

  await query('INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)', [
    user.id,
    tokenHash,
    expiresAt
  ]);

  res.cookie(REFRESH_COOKIE_NAME, raw, REFRESH_COOKIE_OPTIONS);
  res.cookie(CSRF_COOKIE_NAME, generateCsrfToken(), CSRF_COOKIE_OPTIONS);
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

    // PRIV-1: consent is recorded as part of account creation itself --
    // before any symptom/health data can exist for this user, since the
    // account row above is the first thing that has to exist for any of
    // that data to be insertable at all.
    await query(
      'INSERT INTO consents (user_id, consent_version) VALUES ($1, $2)',
      [user.id, CONSENT_VERSION]
    );

    const token = await issueSession(res, user);
    await recordAudit({ actorType: 'patient', actorId: user.id, action: 'account_registered', requestId: req.id });

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
      `SELECT id, name, email, password_hash, age, gender, chronic_conditions, dark_mode, timezone,
              failed_login_attempts, last_failed_login_at, locked_until, created_at
       FROM users WHERE email = $1`,
      [normalizedEmail]
    );

    // Fallback for demo aliases if not found directly
    if (userRes.rows.length === 0 && DEMO_EMAIL_ALIASES[normalizedEmail]) {
      userRes = await query(
        `SELECT id, name, email, password_hash, age, gender, chronic_conditions, dark_mode, timezone,
                failed_login_attempts, last_failed_login_at, locked_until, created_at
         FROM users WHERE email = $1`,
        [DEMO_EMAIL_ALIASES[normalizedEmail]]
      );
    }

    if (userRes.rows.length === 0) {
      await recordAudit({ actorType: 'patient', action: 'login_failed', requestId: req.id, metadata: { reason: 'no_such_account' } });
      return sendError(res, 401, 'Invalid email or password');
    }

    const user = userRes.rows[0];

    // AUTH-16/17: reject outright while locked, without touching the counter.
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      await recordAudit({ actorType: 'patient', actorId: user.id, action: 'login_blocked_locked', requestId: req.id });
      return sendError(res, 423, 'This account is temporarily locked due to repeated failed sign-in attempts. Try again later.', {
        code: 'ACCOUNT_LOCKED'
      });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      const now = Date.now();
      const windowExpired =
        !user.last_failed_login_at || now - new Date(user.last_failed_login_at).getTime() > LOCKOUT_WINDOW_MS;
      const nextCount = windowExpired ? 1 : (user.failed_login_attempts || 0) + 1;
      const shouldLock = nextCount >= LOCKOUT_THRESHOLD;

      await query(
        'UPDATE users SET failed_login_attempts = $1, last_failed_login_at = $2, locked_until = $3 WHERE id = $4',
        [nextCount, new Date().toISOString(), shouldLock ? new Date(now + LOCKOUT_DURATION_MS).toISOString() : null, user.id]
      );

      await recordAudit({
        actorType: 'patient',
        actorId: user.id,
        action: shouldLock ? 'account_locked' : 'login_failed',
        requestId: req.id,
        metadata: { attempt: nextCount }
      });

      if (shouldLock) {
        return sendError(res, 423, 'This account is temporarily locked due to repeated failed sign-in attempts. Try again later.', {
          code: 'ACCOUNT_LOCKED'
        });
      }
      return sendError(res, 401, 'Invalid email or password');
    }

    // Successful login resets the lockout counter.
    await query('UPDATE users SET failed_login_attempts = 0, last_failed_login_at = NULL, locked_until = NULL WHERE id = $1', [
      user.id
    ]);

    delete user.password_hash;
    delete user.failed_login_attempts;
    delete user.last_failed_login_at;
    delete user.locked_until;
    try {
      if (typeof user.chronic_conditions === 'string')
        user.chronic_conditions = JSON.parse(user.chronic_conditions);
    } catch (e) {
      user.chronic_conditions = [];
    }

    const token = await issueSession(res, user);
    await recordAudit({ actorType: 'patient', actorId: user.id, action: 'login_success', requestId: req.id });

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
router.post('/refresh', verifyCsrf(CSRF_COOKIE_NAME), async (req, res) => {
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

    // AUTH-19: a token that is already revoked but still gets presented has
    // been replayed -- either stolen and used after the legitimate rotation,
    // or copied and used twice. Either way, the right response is to burn
    // every session this account has, not just this one token.
    if (storedToken && storedToken.revoked) {
      await query('UPDATE refresh_tokens SET revoked = $1 WHERE user_id = $2', [1, storedToken.user_id]);
      await recordAudit({
        actorType: 'patient',
        actorId: storedToken.user_id,
        action: 'refresh_token_reuse_detected',
        requestId: req.id
      });
      res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_OPTIONS.path });
      res.clearCookie(CSRF_COOKIE_NAME, { path: CSRF_COOKIE_OPTIONS.path });
      return sendError(res, 401, 'This session was already used elsewhere and has been revoked for safety. Please log in again.', {
        code: 'REFRESH_REUSE_DETECTED'
      });
    }

    const isExpired = !storedToken || new Date(storedToken.expires_at) < new Date();
    if (!storedToken || isExpired) {
      res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_OPTIONS.path });
      res.clearCookie(CSRF_COOKIE_NAME, { path: CSRF_COOKIE_OPTIONS.path });
      return sendError(res, 401, 'Refresh token invalid or expired, please log in again');
    }

    // Rotate: revoke the used token so it can never be replayed.
    await query('UPDATE refresh_tokens SET revoked = $1 WHERE id = $2', [1, storedToken.id]);

    const userRes = await query(
      'SELECT id, name, email, age, gender, chronic_conditions, dark_mode, timezone FROM users WHERE id = $1',
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
router.post('/logout', verifyCsrf(CSRF_COOKIE_NAME), async (req, res) => {
  try {
    const rawToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (rawToken) {
      const tokenHash = hashToken(rawToken);
      const tokenRes = await query('SELECT user_id FROM refresh_tokens WHERE token_hash = $1', [tokenHash]);
      await query('UPDATE refresh_tokens SET revoked = $1 WHERE token_hash = $2', [1, tokenHash]);
      if (tokenRes.rows[0]) {
        await recordAudit({ actorType: 'patient', actorId: tokenRes.rows[0].user_id, action: 'logout', requestId: req.id });
      }
    }
    res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_OPTIONS.path });
    res.clearCookie(CSRF_COOKIE_NAME, { path: CSRF_COOKIE_OPTIONS.path });
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

// AUTH-18: profile time zone, used for reminder scheduling and every date
// display for this patient (see REM-8).
router.put('/timezone', authenticateToken, validateBody(timezoneSchema), async (req, res) => {
  try {
    const { timezone } = req.body;
    await query('UPDATE users SET timezone = $1 WHERE id = $2', [timezone, req.user.id]);
    res.json({ message: 'Time zone updated', timezone });
  } catch (err) {
    sendError(res, 500, 'Failed to update time zone');
  }
});

// AUTH-15: change password while authenticated. Requires the current
// password so a hijacked, still-logged-in session can't silently lock the
// real owner out by swapping the password.
router.put('/password', authenticateToken, validateBody(changePasswordSchema), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userRes = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const row = userRes.rows[0];
    if (!row) {
      return sendError(res, 401, 'User no longer exists');
    }

    const match = await bcrypt.compare(currentPassword, row.password_hash);
    if (!match) {
      return sendError(res, 401, 'Current password is incorrect');
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, req.user.id]);

    // A password change invalidates every existing session but the one that
    // just authenticated this request, closing off a stolen-session window.
    await query('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = $1', [req.user.id]);

    await recordAudit({ actorType: 'patient', actorId: req.user.id, action: 'password_changed', requestId: req.id });
    res.json({ message: 'Password changed successfully. Please log in again on your other devices.' });
  } catch (err) {
    console.error('[Change Password Error]:', err);
    sendError(res, 500, 'Failed to change password');
  }
});

// AUTH-13/AUTH-14: request a password reset link. Always responds with the
// same message regardless of whether the email exists, so this endpoint
// cannot be used to enumerate registered accounts.
router.post('/forgot-password', validateBody(forgotPasswordSchema), async (req, res) => {
  const genericResponse = {
    message: 'If an account exists for that email, a password reset link has been sent.'
  };
  try {
    const { email } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    const userRes = await query('SELECT id, name, email FROM users WHERE email = $1', [normalizedEmail]);
    const user = userRes.rows[0];

    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

      await query(
        'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
        [user.id, tokenHash, expiresAt]
      );

      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${rawToken}`;
      await sendMail({
        to: user.email,
        subject: 'Reset your SymptomLog password',
        text: `A password reset was requested for your account. If this was you, use the link below within one hour:\n\n${resetUrl}\n\nIf you did not request this, you can ignore this message.`
      });
      await recordAudit({ actorType: 'patient', actorId: user.id, action: 'password_reset_requested', requestId: req.id });
    }

    res.json(genericResponse);
  } catch (err) {
    console.error('[Forgot Password Error]:', err);
    // Still return the generic response -- a server error here must not
    // reveal more than "something went wrong" to an unauthenticated caller.
    res.json(genericResponse);
  }
});

// AUTH-13: consume a password reset token.
router.post('/reset-password', validateBody(resetPasswordSchema), async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const tokenHash = hashToken(token);

    const tokenRes = await query(
      'SELECT id, user_id, used, expires_at FROM password_reset_tokens WHERE token_hash = $1',
      [tokenHash]
    );
    const storedToken = tokenRes.rows[0];
    const isExpired = !storedToken || new Date(storedToken.expires_at) < new Date();
    const isUsed = !storedToken || !!storedToken.used;

    if (!storedToken || isExpired || isUsed) {
      return sendError(res, 400, 'This reset link is invalid or has expired. Request a new one.', {
        code: 'RESET_TOKEN_INVALID'
      });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash = $1, failed_login_attempts = 0, locked_until = NULL WHERE id = $2', [
      newHash,
      storedToken.user_id
    ]);
    await query('UPDATE password_reset_tokens SET used = 1 WHERE id = $1', [storedToken.id]);
    // A successful reset is itself a credential compromise response: revoke
    // every existing session so a stolen-but-not-yet-used refresh token
    // can't outlive the password it was issued under.
    await query('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = $1', [storedToken.user_id]);

    await recordAudit({ actorType: 'patient', actorId: storedToken.user_id, action: 'password_reset_completed', requestId: req.id });
    res.json({ message: 'Password reset successfully. Please log in with your new password.' });
  } catch (err) {
    console.error('[Reset Password Error]:', err);
    sendError(res, 500, 'Failed to reset password');
  }
});

module.exports = router;
