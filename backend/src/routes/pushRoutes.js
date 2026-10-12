const express = require('express');
const router = express.Router();
const { sendError } = require('../utils/apiError');
const { query } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { VAPID_PUBLIC_KEY, pushEnabled } = require('../services/pushService');

// GET /api/push/vapid-public-key - the frontend needs this to call
// PushManager.subscribe(); it is safe to expose publicly.
router.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY || null, enabled: pushEnabled });
});

// POST /api/push/subscribe - store a browser's push subscription so the
// backend scheduler can wake it up for a medicine alarm later.
router.post('/subscribe', authenticateToken, async (req, res) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return sendError(res, 400, 'A valid push subscription object is required');
    }

    // Delete-then-insert rather than an upsert, so the exact same code path
    // works unmodified whether the dual-mode DB layer is on Postgres or the
    // translated SQLite dialect.
    await query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
    await query(
      'INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES ($1, $2, $3, $4)',
      [req.user.id, endpoint, keys.p256dh, keys.auth]
    );

    res
      .status(201)
      .json({
        message:
          'Push subscription registered — alarms will now reach this device even if the tab is closed.'
      });
  } catch (err) {
    console.error('[Push subscribe error]:', err);
    sendError(res, 500, 'Failed to register push subscription');
  }
});

// POST /api/push/unsubscribe
router.post('/unsubscribe', authenticateToken, async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) return sendError(res, 400, 'Endpoint is required');
    await query('DELETE FROM push_subscriptions WHERE endpoint = $1 AND user_id = $2', [
      endpoint,
      req.user.id
    ]);
    res.json({ message: 'Push subscription removed' });
  } catch (err) {
    sendError(res, 500, 'Failed to remove push subscription');
  }
});

module.exports = router;
