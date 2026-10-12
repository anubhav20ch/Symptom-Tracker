// Centralized environment validation (AUTH-10, SEC-7). The server refuses to
// start if a required variable is missing or a secret is too weak, so a
// misconfigured deployment fails loudly at boot rather than silently running
// with an insecure default.
require('dotenv').config();

const MIN_JWT_SECRET_LENGTH = 32;

function fail(messages) {
  console.error('[CONFIG] Refusing to start — invalid environment configuration:');
  messages.forEach((m) => console.error(`  - ${m}`));
  process.exit(1);
}

function validateEnv() {
  const errors = [];

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.trim().length === 0) {
    errors.push(
      "JWT_SECRET is not set. Generate one with: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\""
    );
  } else if (jwtSecret.length < MIN_JWT_SECRET_LENGTH) {
    errors.push(
      `JWT_SECRET is only ${jwtSecret.length} characters; it must be at least ${MIN_JWT_SECRET_LENGTH}.`
    );
  } else if (/REPLACE_ME/i.test(jwtSecret)) {
    errors.push(
      'JWT_SECRET still contains the .env.example placeholder value — generate a real secret.'
    );
  }

  if (process.env.NODE_ENV === 'production' && process.env.SEED_DEMO === 'true') {
    errors.push(
      'SEED_DEMO=true is not permitted when NODE_ENV=production (seeded accounts use known passwords).'
    );
  }

  const port = process.env.PORT;
  if (port && (!/^\d+$/.test(port) || Number(port) <= 0 || Number(port) > 65535)) {
    errors.push(`PORT "${port}" is not a valid port number.`);
  }

  if (errors.length > 0) {
    fail(errors);
  }

  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: Number(process.env.PORT) || 5000,
    jwtSecret,
    databaseUrl: process.env.DATABASE_URL,
    mlServiceUrl: process.env.ML_SERVICE_URL || 'http://localhost:8001',
    logLevel: process.env.LOG_LEVEL || 'info',
    seedDemo: process.env.SEED_DEMO === 'true',
    corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean)
  };
}

module.exports = { validateEnv, MIN_JWT_SECRET_LENGTH };
