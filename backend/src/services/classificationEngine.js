const { query } = require('../config/db');

const MEDICAL_DISCLAIMER =
  'This tool does not provide medical diagnosis. Please consult a healthcare professional for medical advice.';

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

function getSelfCareAdvice(symptom, category, severity) {
  if (symptom.includes('headache') || symptom.includes('migraine')) {
    return 'Self-care: Rest in a calm, dark environment. Stay hydrated, apply a cold or warm compress, and consider appropriate over-the-counter pain relief if needed. If episodes recur frequently, consult a Neurologist.';
  }
  if (symptom.includes('throat') || symptom.includes('cough') || symptom.includes('cold')) {
    return 'Self-care: Drink warm fluids with honey/lemon, use saline throat gargles or lozenges, and run a room humidifier. If high fever or severe pain develops, consult an ENT Specialist or General Physician.';
  }
  if (
    symptom.includes('stomach') ||
    symptom.includes('reflux') ||
    symptom.includes('gerd') ||
    symptom.includes('abdomen') ||
    symptom.includes('nausea')
  ) {
    return 'Self-care: Eat light, bland meals, avoid acidic/spicy foods, and sip electrolytes. Avoid lying flat immediately after eating. If pain persists or worsens, consult a Gastroenterologist.';
  }
  if (symptom.includes('back') || symptom.includes('joint') || symptom.includes('muscle')) {
    return 'Self-care: Apply alternating ice/heat packs for 15-20 minutes, perform gentle mobility stretches, avoid heavy lifting, and rest the affected area. For chronic joint pain, consult an Orthopedist or Rheumatologist.';
  }
  if (
    symptom.includes('rash') ||
    symptom.includes('itch') ||
    symptom.includes('skin') ||
    symptom.includes('acne')
  ) {
    return 'Self-care: Keep the skin clean and dry, avoid scratching or harsh scrubbing, use a gentle fragrance-free moisturizer, and avoid known allergens. For persistent rash, consult a Dermatologist.';
  }
  return 'Self-care: Monitor symptom progression, prioritize adequate sleep, maintain hydration, and rest. If symptoms worsen or persist beyond 7-10 days, consult a General Physician.';
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

  // 1. Check Urgent Red-Flag Rules
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
    if (isChestPain) reasonDetail += 'cardiovascular symptom detected.';
    else if (isBreathing) reasonDetail += 'respiratory distress symptom detected.';
    else if (isSevereHeadacheUrgent) reasonDetail += 'acute severe neurological pain detected.';
    else if (isDistressUrgent)
      reasonDetail += `severe acute pain accompanied by critical emotional distress (Emotion: ${emotion}/10, Stress: ${stress}/10).`;
    else reasonDetail += 'critical symptom intensity reported.';

    return {
      classification_type: 'urgent',
      urgency_score: Math.max(82.0, calculatedUrgencyScore),
      recommended_specialist: specialist,
      recommendation: `EMERGENCY / URGENT ADVICE: Please seek immediate emergency medical evaluation (Call 108 / 102 or visit nearest ER). Recommended Specialist: ${specialist}. ${reasonDetail} Please do not delay.`,
      reasoning: `Urgent safety rule triggered: ${reasonDetail} High severity score (${sev}/10) and urgency index (${Math.max(82, calculatedUrgencyScore)}/100) indicate immediate medical evaluation.`,
      disclaimer: MEDICAL_DISCLAIMER
    };
  }

  // 2. Check Chronic Rules
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
      recommendation: `Recommended Specialist: ${specialist}. Follow your personalized care management plan. Track symptom triggers, maintain prescribed maintenance medication, and schedule regular check-ins with your doctor.`,
      reasoning: `Chronic condition rule: ${reasonText}`,
      disclaimer: MEDICAL_DISCLAIMER
    };
  }

  // 3. Check Recurring Rules (3+ times in rolling 30-day window)
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
      recommendation: `Recommended Specialist: ${specialist}. This is your ${pastOccurrences + 1}th occurrence of "${symptomName}" within the last 30 days. We suggest booking an appointment to investigate underlying causes or adjust preventative therapy.`,
      reasoning: `Recurring pattern rule: Logged ${pastOccurrences + 1} times within a rolling 30-day window (threshold ≥ 3).`,
      disclaimer: MEDICAL_DISCLAIMER
    };
  }

  // 4. Acute Rule (duration < 14 days, isolated occurrence)
  const selfCareTips = getSelfCareAdvice(lowerName, lowerCategory, sev);
  return {
    classification_type: 'acute',
    urgency_score: Math.min(45.0, calculatedUrgencyScore),
    recommended_specialist: specialist,
    recommendation: selfCareTips,
    reasoning: `Acute episode rule: Short duration (${durationDays} days < 14 days) and isolated occurrence. Pain ${sev}/10, Emotion ${emotion}/10. Suitable for self-care and monitoring.`,
    disclaimer: MEDICAL_DISCLAIMER
  };
}

module.exports = {
  classifySymptomEntry,
  MEDICAL_DISCLAIMER,
  getRecommendedSpecialist,
  getSelfCareAdvice
};
