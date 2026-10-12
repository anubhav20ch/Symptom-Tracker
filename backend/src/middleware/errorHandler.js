const { ApiError, sendError } = require('../utils/apiError');

function notFoundHandler(req, res) {
  return sendError(res, 404, 'Endpoint not found');
}

// Final error-handling middleware (API-1). Normalizes every error — thrown
// ApiErrors and anything unexpected — into the same JSON envelope. Logs the
// full error server-side (via req.log, which carries the request id) but
// never leaks internals to the client in production (SEC-9), and never logs
// the request body, so health content never reaches the log.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const log = req.log || require('../utils/logger');

  if (err instanceof ApiError) {
    log.warn({ err: { message: err.message, code: err.code } }, 'request failed');
    return sendError(res, err.status, err.message, { code: err.code, details: err.details });
  }

  log.error({ err: { message: err.message, stack: err.stack } }, 'unhandled server error');

  const message =
    process.env.NODE_ENV === 'production'
      ? 'Internal Server Error'
      : err.message || 'Internal Server Error';

  return sendError(res, 500, message);
}

module.exports = { notFoundHandler, errorHandler };
