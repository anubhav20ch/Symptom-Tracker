// Consistent JSON error envelope (API-1): every error response has the
// shape { error: { code, message, details } }. `code` defaults from the
// HTTP status so existing call sites can adopt the envelope without having
// to invent a bespoke code for every message; a specific code can still be
// passed where it adds value.
const STATUS_CODE = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  410: 'GONE',
  413: 'PAYLOAD_TOO_LARGE',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'RATE_LIMITED',
  500: 'INTERNAL_ERROR',
  503: 'SERVICE_UNAVAILABLE'
};

class ApiError extends Error {
  constructor(status, message, { code, details } = {}) {
    super(message);
    this.status = status;
    this.code = code || STATUS_CODE[status] || 'ERROR';
    this.details = details;
  }
}

/**
 * Send a JSON error envelope: { error: { code, message, details? } }.
 * Preferred over building the body by hand so every route stays consistent.
 */
function sendError(res, status, message, { code, details } = {}) {
  const body = {
    error: {
      code: code || STATUS_CODE[status] || 'ERROR',
      message
    }
  };
  if (details !== undefined) {
    body.error.details = details;
  }
  return res.status(status).json(body);
}

module.exports = { ApiError, sendError, STATUS_CODE };
