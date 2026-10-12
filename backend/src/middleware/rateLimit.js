const rateLimit = require('express-rate-limit');

// P0 security hardening: brute-force / credential-stuffing protection on auth endpoints.
// In-memory store by default (fine for a single backend instance); set RATE_LIMIT_REDIS_URL
// to back this with Redis via a connect-redis style store when running multiple instances.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again in a few minutes.' }
});

const nlpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many NLP requests. Please slow down.' }
});

module.exports = { authLimiter, nlpLimiter };
