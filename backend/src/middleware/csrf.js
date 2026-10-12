const crypto = require('crypto');
const { sendError } = require('../utils/apiError');

// SEC-13: double-submit CSRF check for the cookie-authenticated endpoints
// (refresh/logout). A cross-site attacker can get the browser to send the
// HttpOnly refresh cookie automatically, but cannot read the separate,
// readable CSRF cookie to put its value in the required header -- same-
// origin JS can, which is exactly the distinction this defends.
function verifyCsrf(cookieName) {
  return (req, res, next) => {
    const cookieValue = req.cookies?.[cookieName];
    const headerValue = req.headers['x-csrf-token'];

    if (!cookieValue || !headerValue) {
      return sendError(res, 403, 'Missing CSRF token', { code: 'CSRF_REQUIRED' });
    }

    const a = Buffer.from(String(cookieValue));
    const b = Buffer.from(String(headerValue));
    const valid = a.length === b.length && crypto.timingSafeEqual(a, b);
    if (!valid) {
      return sendError(res, 403, 'Invalid CSRF token', { code: 'CSRF_INVALID' });
    }
    next();
  };
}

module.exports = { verifyCsrf };
