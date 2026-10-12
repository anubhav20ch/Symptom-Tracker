// REM-8: reminder due-time comparisons must use the patient's own profile
// time zone (AUTH-18), not server local time -- otherwise a patient in a
// different zone than the server gets their "9:00 AM dose" notification at
// the wrong wall-clock hour for them.
function getLocalTimeParts(timezone, at = new Date()) {
  const tz = timezone || 'UTC';
  let formatter;
  try {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    });
  } catch {
    // An invalid/unsupported zone (shouldn't happen past AUTH-18's own
    // validation, but a defensive fallback beats crashing the scheduler
    // for every other patient's reminders in the same tick) falls back to
    // UTC rather than throwing.
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    });
  }
  const parts = formatter.formatToParts(at).reduce((acc, p) => {
    acc[p.type] = p.value;
    return acc;
  }, {});
  return {
    dateStr: `${parts.year}-${parts.month}-${parts.day}`,
    timeStr: `${parts.hour}:${parts.minute}`
  };
}

module.exports = { getLocalTimeParts };
