// Structured JSON logging with request-id correlation (OBS-1). Redacts
// anything that could be a secret or health content, so neither ever lands
// in a log line even if a call site passes a full request/response object.
const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      'req.body.password',
      'req.body.currentPassword',
      'req.body.newPassword',
      'req.body.description',
      'req.body.freeText',
      'req.body.notes',
      'req.body.symptoms',
      'password',
      'password_hash',
      'token',
      'accessToken',
      'refreshToken',
      'jwtSecret',
      '*.password',
      '*.password_hash',
      '*.token'
    ],
    censor: '[REDACTED]'
  },
  formatters: {
    level(label) {
      return { level: label };
    }
  },
  timestamp: pino.stdTimeFunctions.isoTime
});

module.exports = logger;
