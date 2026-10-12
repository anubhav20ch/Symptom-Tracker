// AUTH-14: in development/test, outgoing mail is captured to a local
// outbox instead of being sent anywhere. Production requires a real
// SMTP/API provider configured via SMTP_HOST (not implemented here --
// wiring a specific provider is a deliberate decision left to the
// operator, see docs/DECISIONS.md) and refuses to silently fall back to
// the outbox.
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const OUTBOX_DIR = path.join(__dirname, '../../data');
const OUTBOX_FILE = path.join(OUTBOX_DIR, 'mail-outbox.json');
const MAX_OUTBOX_ENTRIES = 200;

function readOutbox() {
  try {
    if (!fs.existsSync(OUTBOX_FILE)) return [];
    return JSON.parse(fs.readFileSync(OUTBOX_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeOutbox(entries) {
  if (!fs.existsSync(OUTBOX_DIR)) fs.mkdirSync(OUTBOX_DIR, { recursive: true });
  fs.writeFileSync(OUTBOX_FILE, JSON.stringify(entries.slice(-MAX_OUTBOX_ENTRIES), null, 2));
}

async function sendMail({ to, subject, text }) {
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.SMTP_HOST) {
      throw new Error(
        'SMTP_HOST is not configured. A production deployment must configure a real mail ' +
          'provider; it will not silently fall back to the development outbox.'
      );
    }
    // A specific provider integration (nodemailer, a transactional-email
    // API, etc.) is intentionally not wired up here -- see
    // docs/DECISIONS.md for why this is left as a configuration point
    // rather than a hard dependency on one vendor.
    throw new Error('SMTP_HOST is configured but no production mail transport is implemented yet.');
  }

  const entry = { to, subject, text, sentAt: new Date().toISOString() };
  const entries = readOutbox();
  entries.push(entry);
  writeOutbox(entries);
  logger.info({ to, subject }, 'mail captured to dev outbox (not actually sent)');
  return entry;
}

module.exports = { sendMail, readOutbox };
