const cron = require('node-cron');
const { query } = require('../config/db');
const { recordAudit } = require('../utils/auditLog');

// PRIV-5/PRIV-3/PRIV-6: a single scheduled job that (1) actually performs
// account deletion once a request has sat past its grace window, letting
// PRIV-6's existing ON DELETE CASCADE foreign keys do the cross-table
// cleanup, and (2) purges data past its own retention period -- expired/
// revoked caregiver share links and old audit log rows. Runs hourly:
// these are all low-frequency, non-time-critical cleanups, unlike the
// minute-level reminder scheduler.

const ACCOUNT_DELETION_GRACE_HOURS = 24;
// A caregiver link past its own expiry (or explicitly revoked) is already
// unusable (CARE-5) -- this just stops keeping the row (and its access
// log, via ON DELETE CASCADE) around indefinitely once it's unambiguously
// dead, rather than deleting it the instant it expires (which would erase
// CARE-4's "list every link, active or not" history too aggressively).
const CAREGIVER_SHARE_PURGE_AFTER_DAYS = 90;
// AUDIT-3 requires audit_logs to be immutable via the API (no UPDATE/DELETE
// route); this job is a deliberate, documented exception running outside
// the API, not a loophole in that rule.
const AUDIT_LOG_RETENTION_DAYS = 400;

async function processPendingDeletions() {
  const cutoffIso = new Date(Date.now() - ACCOUNT_DELETION_GRACE_HOURS * 60 * 60 * 1000).toISOString();

  let due;
  try {
    due = await query(
      "SELECT id, user_id, user_email FROM deletion_requests WHERE status = 'pending' AND requested_at <= $1",
      [cutoffIso]
    );
  } catch (err) {
    console.error('[RetentionJob] Failed to query pending deletion requests:', err.message);
    return;
  }

  for (const req of due.rows) {
    try {
      if (req.user_id) {
        // PRIV-6: deletes the user row; every table with a FK to users(id)
        // is ON DELETE CASCADE (see docs/DECISIONS.md), so this one
        // statement is what cascades the deletion everywhere else.
        await query('DELETE FROM users WHERE id = $1', [req.user_id]);
      }
      await query(
        "UPDATE deletion_requests SET status = 'completed', completed_at = $1 WHERE id = $2",
        [new Date().toISOString(), req.id]
      );
      await recordAudit({
        actorType: 'system',
        action: 'account_deletion_completed',
        targetType: 'user',
        targetId: req.user_id,
        metadata: { user_email: req.user_email }
      });
    } catch (err) {
      console.error(`[RetentionJob] Failed to process deletion request ${req.id}:`, err.message);
    }
  }
}

async function purgeExpiredCaregiverShares() {
  const cutoffIso = new Date(
    Date.now() - CAREGIVER_SHARE_PURGE_AFTER_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();
  try {
    await query(
      'DELETE FROM caregiver_shares WHERE revoked = TRUE OR expires_at < $1',
      [cutoffIso]
    );
  } catch (err) {
    console.error('[RetentionJob] Failed to purge expired caregiver shares:', err.message);
  }
}

async function purgeOldAuditLogs() {
  const cutoffIso = new Date(Date.now() - AUDIT_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  try {
    await query('DELETE FROM audit_logs WHERE created_at < $1', [cutoffIso]);
  } catch (err) {
    console.error('[RetentionJob] Failed to purge old audit logs:', err.message);
  }
}

async function runRetentionSweep() {
  await processPendingDeletions();
  await purgeExpiredCaregiverShares();
  await purgeOldAuditLogs();
}

function startRetentionJob() {
  cron.schedule('0 * * * *', () => {
    runRetentionSweep().catch((err) => console.error('[RetentionJob] Unexpected error:', err));
  });
  console.log('[RetentionJob] Started — running the privacy/retention sweep every hour.');
}

module.exports = {
  startRetentionJob,
  runRetentionSweep,
  ACCOUNT_DELETION_GRACE_HOURS,
  CAREGIVER_SHARE_PURGE_AFTER_DAYS,
  AUDIT_LOG_RETENTION_DAYS
};
