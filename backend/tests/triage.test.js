// TEST-1: boundary unit tests for the triage engine. Each test exercises a
// threshold at the value that should (or should not) cross it, not just a
// value safely inside/outside the range, since off-by-one errors in a
// clinical-safety rule are exactly the kind of bug that matters here.
const { classifySymptomEntry } = require('../src/services/classificationEngine');

// userId: null skips the recurring-pattern DB lookup entirely (see the
// engine's own `if (userId)` guard), which is what lets every tier below
// except the recurring-pattern tests run as pure, DB-free unit tests.
const base = { userId: null, userChronicConditions: [] };

describe('TRIAGE-2: Urgent / Emergency boundaries', () => {
  it('chest pain at severity 7 is urgent (>= threshold)', async () => {
    const r = await classifySymptomEntry({ ...base, symptomName: 'Chest Pain', severity: 7 });
    expect(r.classification_type).toBe('urgent');
    expect(r.rule_id).toBe('URGENT_CHEST_PAIN');
    expect(r.requires_emergency_notice).toBe(true);
  });

  it('chest pain at severity 6 is NOT urgent (just below threshold)', async () => {
    const r = await classifySymptomEntry({ ...base, symptomName: 'Chest Pain', severity: 6 });
    expect(r.classification_type).not.toBe('urgent');
  });

  it('respiratory distress at severity 7 is urgent', async () => {
    const r = await classifySymptomEntry({ ...base, symptomName: 'Shortness of Breath', severity: 7 });
    expect(r.classification_type).toBe('urgent');
    expect(r.rule_id).toBe('URGENT_RESPIRATORY_DISTRESS');
  });

  it('respiratory distress at severity 6 is NOT urgent', async () => {
    const r = await classifySymptomEntry({ ...base, symptomName: 'Shortness of Breath', severity: 6 });
    expect(r.classification_type).not.toBe('urgent');
  });

  it('severe headache at severity 9 is urgent', async () => {
    const r = await classifySymptomEntry({ ...base, symptomName: 'Migraine', severity: 9, emotionScore: 5 });
    expect(r.classification_type).toBe('urgent');
    expect(r.rule_id).toBe('URGENT_SEVERE_HEADACHE');
  });

  it('headache at severity 8 is NOT urgent via the headache rule', async () => {
    const r = await classifySymptomEntry({ ...base, symptomName: 'Migraine', severity: 8, emotionScore: 5 });
    expect(r.classification_type).not.toBe('urgent');
  });

  it('high fever at severity 9 is urgent', async () => {
    const r = await classifySymptomEntry({ ...base, symptomName: 'Fever & Chills', severity: 9, emotionScore: 5 });
    expect(r.classification_type).toBe('urgent');
    expect(r.rule_id).toBe('URGENT_HIGH_FEVER');
  });

  it('fever at severity 8 is NOT urgent via the fever rule', async () => {
    const r = await classifySymptomEntry({ ...base, symptomName: 'Fever & Chills', severity: 8, emotionScore: 5 });
    expect(r.classification_type).not.toBe('urgent');
  });

  it('any symptom at maximum severity (10) is urgent regardless of type', async () => {
    const r = await classifySymptomEntry({ ...base, symptomName: 'Lower Back Pain', severity: 10, emotionScore: 5 });
    expect(r.classification_type).toBe('urgent');
  });

  it('every urgent result carries the triage engine version and a rule id', async () => {
    const r = await classifySymptomEntry({ ...base, symptomName: 'Chest Pain', severity: 7 });
    expect(r.triage_version).toBeTruthy();
    expect(r.rule_id).toBeTruthy();
  });
});

describe('TRIAGE-3: Chronic Care boundaries', () => {
  it('duration of exactly 90 days is chronic (>= threshold)', async () => {
    const startedAt = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const r = await classifySymptomEntry({ ...base, symptomName: 'Joint Pain', severity: 4, startedAt, endedAt: new Date().toISOString(), emotionScore: 5 });
    expect(r.classification_type).toBe('chronic');
    expect(r.rule_id).toBe('CHRONIC_LONG_DURATION');
  });

  it('duration of 89 days is NOT chronic via the duration rule', async () => {
    const startedAt = new Date(Date.now() - 89 * 24 * 60 * 60 * 1000).toISOString();
    const r = await classifySymptomEntry({ ...base, symptomName: 'Joint Pain', severity: 4, startedAt, endedAt: new Date().toISOString(), emotionScore: 5 });
    expect(r.classification_type).not.toBe('chronic');
  });

  it('a symptom matching a known chronic condition is chronic regardless of duration', async () => {
    const r = await classifySymptomEntry({
      ...base,
      symptomName: 'Asthma',
      severity: 3,
      emotionScore: 5,
      userChronicConditions: ['Asthma']
    });
    expect(r.classification_type).toBe('chronic');
    expect(r.rule_id).toBe('CHRONIC_KNOWN_CONDITION');
  });

  it('urgent takes precedence over chronic when both match (TRIAGE-8)', async () => {
    const startedAt = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString();
    const r = await classifySymptomEntry({
      ...base,
      symptomName: 'Chest Pain',
      severity: 10,
      startedAt,
      endedAt: new Date().toISOString(),
      userChronicConditions: ['Chest Pain']
    });
    expect(r.classification_type).toBe('urgent');
  });
});

describe('TRIAGE-5: Routine Acute boundary', () => {
  it('an isolated, short-duration, low-severity entry is routine acute', async () => {
    const r = await classifySymptomEntry({ ...base, symptomName: 'Common Cold', severity: 3, emotionScore: 6 });
    expect(r.classification_type).toBe('acute');
    expect(r.rule_id).toBe('ROUTINE_ACUTE');
    expect(r.requires_emergency_notice).toBe(false);
  });
});

describe('TRIAGE-4: Recurring Pattern (requires a real user/DB)', () => {
  it('is reachable via the module without throwing when userId is provided but has no history', async () => {
    // Exercises the DB-query branch itself (userId truthy) against whatever
    // dev database this test run has, without asserting a specific tier --
    // a full DB-backed recurrence fixture belongs with the Phase 6
    // integration suite (TEST-2/TEST-3), not this unit-level boundary file.
    const r = await classifySymptomEntry({ ...base, userId: 999999999, symptomName: 'Nonexistent Symptom XYZ', severity: 3, emotionScore: 6 });
    expect(['acute', 'recurring', 'chronic', 'urgent']).toContain(r.classification_type);
  });
});
