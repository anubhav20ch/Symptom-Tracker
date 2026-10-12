const { getLocalTimeParts } = require('../src/utils/timezoneClock');

describe('REM-8 time-zone-correct clock', () => {
  it('converts a UTC instant into the correct local date/time for a positive offset', () => {
    const r = getLocalTimeParts('Asia/Kolkata', new Date('2026-10-12T20:30:00Z'));
    expect(r).toEqual({ dateStr: '2026-10-13', timeStr: '02:00' });
  });

  it('converts for a negative offset', () => {
    const r = getLocalTimeParts('America/New_York', new Date('2026-10-12T20:30:00Z'));
    expect(r).toEqual({ dateStr: '2026-10-12', timeStr: '16:30' });
  });

  it('falls back to UTC when no time zone is given', () => {
    const r = getLocalTimeParts(null, new Date('2026-10-12T20:30:00Z'));
    expect(r).toEqual({ dateStr: '2026-10-12', timeStr: '20:30' });
  });

  it('falls back to UTC for an invalid time zone rather than throwing', () => {
    const r = getLocalTimeParts('Not/A_Zone', new Date('2026-10-12T20:30:00Z'));
    expect(r).toEqual({ dateStr: '2026-10-12', timeStr: '20:30' });
  });
});
