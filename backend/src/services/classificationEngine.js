const { query } = require('../config/db');

const MEDICAL_DISCLAIMER =
  'This tool does not provide medical diagnosis. Please consult a healthcare professional for medical advice.';

// TRIAGE-7: this file is the single, versioned triage module. Every
// result carries this version so a later change to the thresholds below
// doesn't silently reinterpret an already-stored historical result.
// Thresholds themselves are unchanged from v1.0/SRS TRIAGE-2..5 -- bumping
// this version is only for a genuine rule change, not routine refactoring.
const TRIAGE_ENGINE_VERSION = '1.0.0';

function getRecommendedSpecialist(symptom, category) {
  const s = (symptom || '').toLowerCase();
  const c = (category || '').toLowerCase();

  if (
    s.includes('chest') ||
    s.includes('heart') ||
    s.includes('hypertension') ||
    c.includes('cardio')
  ) {
    return 'Cardiologist / Emergency Medicine';
  }
  if (
    s.includes('breath') ||
    s.includes('asthma') ||
    s.includes('wheez') ||
    s.includes('lungs') ||
    c.includes('respiratory')
  ) {
    return 'Pulmonologist / Respiratory Specialist';
  }
  if (
    s.includes('headache') ||
    s.includes('migraine') ||
    s.includes('dizz') ||
    s.includes('vertigo') ||
    s.includes('tingling') ||
    c.includes('neuro')
  ) {
    return 'Neurologist';
  }
  if (
    s.includes('stomach') ||
    s.includes('reflux') ||
    s.includes('gerd') ||
    s.includes('ulcer') ||
    s.includes('abdomen') ||
    s.includes('nausea') ||
    s.includes('bowel') ||
    c.includes('gastro')
  ) {
    return 'Gastroenterologist';
  }
  if (
    s.includes('rash') ||
    s.includes('skin') ||
    s.includes('acne') ||
    s.includes('eczema') ||
    s.includes('hive') ||
    s.includes('fungal') ||
    c.includes('dermatology')
  ) {
    return 'Dermatologist';
  }
  if (
    s.includes('throat') ||
    s.includes('sinus') ||
    s.includes('ear') ||
    s.includes('nose') ||
    c.includes('ent')
  ) {
    return 'ENT (Otolaryngologist) Specialist';
  }
  if (
    s.includes('joint') ||
    s.includes('arthritis') ||
    s.includes('back') ||
    s.includes('sciatica') ||
    s.includes('spondylosis') ||
    c.includes('musculoskeletal')
  ) {
    return 'Orthopedist / Rheumatologist';
  }
  if (s.includes('urine') || s.includes('uti') || s.includes('pelvic')) {
    return 'Urologist / Primary Care Physician';
  }
  return 'General Physician / Primary Care Provider';
}

// CLIN-5: self-care guidance is static content, not generated or altered by
// any model -- these strings are a fixed lookup table, picked by keyword
// match, never produced by the ML service or an LLM call. SELF_CARE_LAST_REVIEWED
// and the "pending clinical review" label are what make that static status
// visible to the patient rather than implicit; both are appended to every
// piece of advice this module returns, and bumping the reviewed date (or
// clearing the pending flag once a clinician actually signs off) is the
// only way this text is meant to change, not a code edit to the advice body.
const SELF_CARE_LAST_REVIEWED = '2026-01-15';
const SELF_CARE_PENDING_CLINICAL_REVIEW = true;

function withGovernanceLabel(adviceText) {
  const reviewNote = SELF_CARE_PENDING_CLINICAL_REVIEW
    ? `(Self-care content last reviewed ${SELF_CARE_LAST_REVIEWED} -- pending formal clinical sign-off.)`
    : `(Self-care content last reviewed ${SELF_CARE_LAST_REVIEWED}.)`;
  return `${adviceText} ${reviewNote}`;
}

function getSelfCareAdvice(symptom, category, severity) {
  if (symptom.includes('headache') || symptom.includes('migraine')) {
    return withGovernanceLabel(
      'Self-care: Rest in a calm, dark environment. Stay hydrated, apply a cold or warm compress, and consider appropriate over-the-counter pain relief if needed. If episodes recur frequently, consult a Neurologist.'
    );
  }
  if (symptom.includes('throat') || symptom.includes('cough') || symptom.includes('cold')) {
    return withGovernanceLabel(
      'Self-care: Drink warm fluids with honey/lemon, use saline throat gargles or lozenges, and run a room humidifier. If high fever or severe pain develops, consult an ENT Specialist or General Physician.'
    );
  }
  if (
    symptom.includes('stomach') ||
    symptom.includes('reflux') ||
    symptom.includes('gerd') ||
    symptom.includes('abdomen') ||
    symptom.includes('nausea')
  ) {
    return withGovernanceLabel(
      'Self-care: Eat light, bland meals, avoid acidic/spicy foods, and sip electrolytes. Avoid lying flat immediately after eating. If pain persists or worsens, consult a Gastroenterologist.'
    );
  }
  if (symptom.includes('back') || symptom.includes('joint') || symptom.includes('muscle')) {
    return withGovernanceLabel(
      'Self-care: Apply alternating ice/heat packs for 15-20 minutes, perform gentle mobility stretches, avoid heavy lifting, and rest the affected area. For chronic joint pain, consult an Orthopedist or Rheumatologist.'
    );
  }
  if (
    symptom.includes('rash') ||
    symptom.includes('itch') ||
    symptom.includes('skin') ||
    symptom.includes('acne')
  ) {
    return withGovernanceLabel(
      'Self-care: Keep the skin clean and dry, avoid scratching or harsh scrubbing, use a gentle fragrance-free moisturizer, and avoid known allergens. For persistent rash, consult a Dermatologist.'
    );
  }
  return withGovernanceLabel(
    'Self-care: Monitor symptom progression, prioritize adequate sleep, maintain hydration, and rest. If symptoms worsen or persist beyond 7-10 days, consult a General Physician.'
  );
}

/**
 * Numerical & Rule-based classification engine:
 * Incorporates 10-point emotion scale (1=Sad/Agony, 10=Happy/Serene), pain severity (1-10),
 * energy, stress, and duration.
 */
async function classifySymptomEntry({
  userId,
  symptomName,
  symptomCategory,
  severity,
  startedAt,
  endedAt,
  userChronicConditions = [],
  emotionScore = 5.0,
  energyLevel = 5.0,
  stressLevel = 5.0,
  sleepQuality = 5.0,
  functionalImpairment = 3.0
}) {
  const startDate = new Date(startedAt || new Date());
  const endDate = endedAt ? new Date(endedAt) : new Date();
  const durationDays = Math.max(
    0,
    Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  );

  const lowerName = (symptomName || '').toLowerCase();
  const lowerCategory = (symptomCategory || '').toLowerCase();
  const sev = parseInt(severity, 10) || 5;
  const emotion = parseFloat(emotionScore) || 5.0;
  const stress = parseFloat(stressLevel) || 5.0;
  const specialist = getRecommendedSpecialist(symptomName, symptomCategory);

  // Calculate Urgency Risk Index (0 - 100)
  const isChestPain = lowerName.includes('chest pain') || lowerName.includes('heart');
  const isBreathing =
    lowerName.includes('shortness of breath') ||
    lowerName.includes('difficulty breathing') ||
    lowerName.includes('choking');
  const isRedFlag = isChestPain || isBreathing ? 1 : 0;

  let calculatedUrgencyScore =
    sev * 3.5 + (11 - emotion) * 2.5 + stress * 1.5 + functionalImpairment * 1.5 + isRedFlag * 25.0;
  calculatedUrgencyScore = Math.min(
    100.0,
    Math.max(5.0, Math.round(calculatedUrgencyScore * 0.85))
  );

  // TRIAGE-8: fixed precedence order -- Urgent, then Chronic, then
  // Recurring, then Routine Acute. Each tier below returns immediately on
  // match, so an entry that could match more than one tier (e.g. a chronic
  // migraine logged at severity 9) is always resolved by the highest-
  // precedence match, never the lowest. Do not reorder these checks.

  // 1. Urgent / Emergency (TRIAGE-2)
  const isSevereHeadacheUrgent =
    (lowerName.includes('headache') || lowerName.includes('migraine')) && sev >= 9;
  const isHighFeverUrgent = lowerName.includes('fever') && sev >= 9;
  const isExtremeSeverity = sev === 10;
  const isDistressUrgent = (sev >= 8 && emotion <= 2.5) || (isRedFlag && sev >= 7);

  if (
    (isChestPain && sev >= 7) ||
    (isBreathing && sev >= 7) ||
    isSevereHeadacheUrgent ||
    isHighFeverUrgent ||
    isExtremeSeverity ||
    isDistressUrgent
  ) {
    let reasonDetail = `High-severity (${sev}/10) `;
    let ruleId = 'URGENT_CRITICAL_INTENSITY';
    if (isChestPain) {
      reasonDetail += 'cardiovascular symptom detected.';
      ruleId = 'URGENT_CHEST_PAIN';
    } else if (isBreathing) {
      reasonDetail += 'respiratory distress symptom detected.';
      ruleId = 'URGENT_RESPIRATORY_DISTRESS';
    } else if (isSevereHeadacheUrgent) {
      reasonDetail += 'acute severe neurological pain detected.';
      ruleId = 'URGENT_SEVERE_HEADACHE';
    } else if (isHighFeverUrgent) {
      reasonDetail += 'high fever reported.';
      ruleId = 'URGENT_HIGH_FEVER';
    } else if (isDistressUrgent) {
      reasonDetail += `severe acute pain accompanied by critical emotional distress (Emotion: ${emotion}/10, Stress: ${stress}/10).`;
      ruleId = 'URGENT_SEVERITY_WITH_DISTRESS';
    } else {
      reasonDetail += 'critical symptom intensity reported.';
    }

    return {
      classification_type: 'urgent',
      urgency_score: Math.max(82.0, calculatedUrgencyScore),
      recommended_specialist: specialist,
      // TRIAGE-10: the emergency notice is always part of the urgent
      // recommendation text, never conditional on anything else.
      requires_emergency_notice: true,
      recommendation: `EMERGENCY / URGENT ADVICE: Please seek immediate emergency medical evaluation (Call 108 / 102 or visit nearest ER). Recommended Specialist: ${specialist}. ${reasonDetail} Please do not delay.`,
      reasoning: `Urgent safety rule triggered: ${reasonDetail} High severity score (${sev}/10) and urgency index (${Math.max(82, calculatedUrgencyScore)}/100) indicate immediate medical evaluation.`,
      disclaimer: MEDICAL_DISCLAIMER,
      triage_version: TRIAGE_ENGINE_VERSION,
      rule_id: ruleId
    };
  }

  // 2. Chronic Care (TRIAGE-3)
  const isKnownChronic =
    Array.isArray(userChronicConditions) &&
    userChronicConditions.some(
      (c) => c.toLowerCase().trim() === lowerName || lowerName.includes(c.toLowerCase().trim())
    );
  const isLongDuration = durationDays >= 90;

  if (isKnownChronic || isLongDuration) {
    const reasonText = isKnownChronic
      ? `Symptom matches your diagnosed chronic condition profile ("${symptomName}").`
      : `Symptom duration has persisted for ${durationDays} days (chronic threshold ≥ 90 days).`;

    return {
      classification_type: 'chronic',
      urgency_score: calculatedUrgencyScore,
      recommended_specialist: specialist,
      requires_emergency_notice: false,
      recommendation: `Recommended Specialist: ${specialist}. Follow your personalized care management plan. Track symptom triggers, maintain prescribed maintenance medication, and schedule regular check-ins with your doctor.`,
      reasoning: `Chronic condition rule: ${reasonText}`,
      disclaimer: MEDICAL_DISCLAIMER,
      triage_version: TRIAGE_ENGINE_VERSION,
      rule_id: isKnownChronic ? 'CHRONIC_KNOWN_CONDITION' : 'CHRONIC_LONG_DURATION'
    };
  }

  // 3. Recurring Pattern (TRIAGE-4): 3+ times in rolling 30-day window
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  let pastOccurrences = 0;

  if (userId) {
    try {
      const countRes = await query(
        `SELECT COUNT(*) as count
         FROM symptom_entries se
         JOIN symptoms s ON se.symptom_id = s.id
         WHERE se.user_id = $1
           AND (LOWER(s.name) = $2 OR LOWER(s.name) LIKE $3)
           AND se.started_at >= $4`,
        [userId, lowerName, `%${lowerName}%`, thirtyDaysAgo]
      );
      pastOccurrences = parseInt(countRes.rows[0]?.count || '0', 10);
    } catch (err) {
      console.warn('[ClassificationEngine] Error querying past occurrences:', err.message);
    }
  }

  // Current log makes it pastOccurrences + 1
  if (pastOccurrences >= 2) {
    return {
      classification_type: 'recurring',
      urgency_score: calculatedUrgencyScore,
      recommended_specialist: specialist,
      requires_emergency_notice: false,
      recommendation: `Recommended Specialist: ${specialist}. This is your ${pastOccurrences + 1}th occurrence of "${symptomName}" within the last 30 days. We suggest booking an appointment to investigate underlying causes or adjust preventative therapy.`,
      reasoning: `Recurring pattern rule: Logged ${pastOccurrences + 1} times within a rolling 30-day window (threshold ≥ 3).`,
      disclaimer: MEDICAL_DISCLAIMER,
      triage_version: TRIAGE_ENGINE_VERSION,
      rule_id: 'RECURRING_PATTERN_30D'
    };
  }

  // 4. Routine Acute (TRIAGE-5): duration < 14 days, isolated occurrence
  const selfCareTips = getSelfCareAdvice(lowerName, lowerCategory, sev);
  return {
    classification_type: 'acute',
    urgency_score: Math.min(45.0, calculatedUrgencyScore),
    recommended_specialist: specialist,
    requires_emergency_notice: false,
    recommendation: selfCareTips,
    reasoning: `Acute episode rule: Short duration (${durationDays} days < 14 days) and isolated occurrence. Pain ${sev}/10, Emotion ${emotion}/10. Suitable for self-care and monitoring.`,
    disclaimer: MEDICAL_DISCLAIMER,
    triage_version: TRIAGE_ENGINE_VERSION,
    rule_id: 'ROUTINE_ACUTE',
    // CLIN-5: structured form of the same governance label baked into
    // `recommendation`'s text, so a UI can render the "pending clinical
    // review" badge without parsing free text for it.
    self_care_last_reviewed: SELF_CARE_LAST_REVIEWED,
    self_care_pending_clinical_review: SELF_CARE_PENDING_CLINICAL_REVIEW
  };
}

module.exports = {
  classifySymptomEntry,
  MEDICAL_DISCLAIMER,
  getRecommendedSpecialist,
  getSelfCareAdvice,
  TRIAGE_ENGINE_VERSION,
  SELF_CARE_LAST_REVIEWED,
  SELF_CARE_PENDING_CLINICAL_REVIEW
};
