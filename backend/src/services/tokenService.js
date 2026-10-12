const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// No insecure fallback: a missing JWT_SECRET must fail loudly at startup
// rather than silently signing tokens with a value anyone can read in this
// source file. Set a strong random value in backend/.env before running.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error(
    'JWT_SECRET is missing or too short. Set a random 32+ character value in backend/.env ' +
      "(e.g. run: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\")"
  );
}
const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || '15m';
const REFRESH_TOKEN_TTL_DAYS = parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || '30', 10);
const REFRESH_COOKIE_NAME = 'symptomlog_refresh_token';
const DOCTOR_REFRESH_COOKIE_NAME = 'symptomlog_doctor_refresh_token';

function signAccessToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

// Refresh tokens are high-entropy random strings. Only their SHA-256 hash is
// ever persisted, so a stolen database dump can't be replayed as a live session.
function generateRefreshToken() {
  const raw = crypto.randomBytes(48).toString('hex');
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(
    Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();
  return { raw, tokenHash, expiresAt };
}

function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

// COOKIE_SECURE should be 'true' once the app is served over HTTPS (it must
// stay 'false' for plain-HTTP local/Docker development, since browsers drop
// Secure cookies on non-TLS origins).
const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true';

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: COOKIE_SECURE,
  sameSite: COOKIE_SECURE ? 'strict' : 'lax',
  path: '/api/auth',
  maxAge: REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
};

const DOCTOR_REFRESH_COOKIE_OPTIONS = {
  ...REFRESH_COOKIE_OPTIONS,
  path: '/api/doctor'
};

const ADMIN_REFRESH_COOKIE_NAME = 'symptomlog_admin_refresh_token';
const ADMIN_REFRESH_COOKIE_OPTIONS = {
  ...REFRESH_COOKIE_OPTIONS,
  path: '/api/admin'
};

module.exports = {
  JWT_SECRET,
  signAccessToken,
  generateRefreshToken,
  hashToken,
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_OPTIONS,
  DOCTOR_REFRESH_COOKIE_NAME,
  DOCTOR_REFRESH_COOKIE_OPTIONS,
  ADMIN_REFRESH_COOKIE_NAME,
  ADMIN_REFRESH_COOKIE_OPTIONS
};
