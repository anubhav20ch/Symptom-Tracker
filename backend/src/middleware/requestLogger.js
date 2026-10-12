// HTTP request logging with a request id on every line (OBS-1). Replaces
// morgan's plain-text access log. Deliberately logs only method/url/status/
// duration — never the request body — so symptom text, free-text
// descriptions, and other health content never reach the logs.
const { randomUUID } = require('crypto');
const pinoHttp = require('pino-http');
const logger = require('../utils/logger');

const requestLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const existing = req.headers['x-request-id'];
    const id = existing || randomUUID();
    res.setHeader('X-Request-Id', id);
    return id;
  },
  customLogLevel: (req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  serializers: {
    req(req) {
      return { id: req.id, method: req.method, url: req.url };
    },
    res(res) {
      return { statusCode: res.statusCode };
    }
  }
});

module.exports = requestLogger;
