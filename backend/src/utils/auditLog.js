// AUDIT-1/AUDIT-2: append-only audit trail. There is deliberately no
// update/delete function here (AUDIT-3) -- the only way to affect this
// table from the API is to add a row.
const { query } = require('../config/db');
const logger = require('./logger');

async function recordAudit({ actorType, actorId = null, action, targetType = null, targetId = null, requestId = null, metadata = null }) {
  try {
    await query(
      `INSERT INTO audit_logs (actor_type, actor_id, action, target_type, target_id, request_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [actorType, actorId, action, targetType, targetId, requestId, metadata ? JSON.stringify(metadata) : null]
    );
  } catch (err) {
    // Audit logging must never take down the request it is observing.
    logger.error({ err: err.message, action }, 'failed to write audit log entry');
  }
}

module.exports = { recordAudit };
