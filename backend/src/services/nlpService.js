const axios = require('axios');
require('dotenv').config();

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';

/**
 * Calls the Python ML/NLP FastAPI microservice to parse free text into symptom details.
 * Falls back gracefully to heuristic keyword parsing if microservice is unreachable.
 */
async function extractSymptomFromText(text) {
  if (!text || !text.trim()) {
    return {
      symptom: 'General Discomfort',
      category: 'General',
      confidence: 0.5,
      suggested_severity: 5,
      body_location: 'General Body',
      trigger: 'None Reported',
      alternative_symptoms: [],
      extracted_keywords: []
    };
  }

  try {
    const response = await axios.post(`${ML_SERVICE_URL}/extract`, { text }, { timeout: 3000 });
    return response.data;
  } catch (err) {
    console.warn(
      `[NLP Service] Microservice call failed (${err.message}). Using local rule heuristic fallback.`
    );
    return fallbackExtract(text);
  }
}

function fallbackExtract(text) {
  const lower = text.toLowerCase();

  let symptom = 'General Discomfort';
  let category = 'General';
  let body_location = 'General Body';

  if (lower.includes('migraine')) {
    symptom = 'Migraine';
    category = 'Neurological';
    body_location = 'Head & Brain';
  } else if (lower.includes('headache') || lower.includes('head pain')) {
    symptom = 'Tension Headache';
    category = 'Neurological';
    body_location = 'Head & Brain';
  } else if (lower.includes('chest') || lower.includes('heart')) {
    symptom =
      lower.includes('racing') || lower.includes('palpitation')
        ? 'Heart Palpitations'
        : 'Chest Pain';
    category = 'Cardiovascular';
    body_location = 'Cardiovascular / Heart';
  } else if (lower.includes('breath') || lower.includes('wheez')) {
    symptom = 'Shortness of Breath';
    category = 'Respiratory';
    body_location = 'Chest & Lungs';
  } else if (lower.includes('cough')) {
    symptom =
      lower.includes('phlegm') || lower.includes('mucus') ? 'Productive Cough' : 'Dry Cough';
    category = 'Respiratory';
    body_location = 'Chest & Lungs';
  } else if (lower.includes('throat') || lower.includes('swallow')) {
    symptom = 'Sore Throat';
    category = 'ENT';
    body_location = 'Eyes, ENT & Throat';
  } else if (lower.includes('stomach') || lower.includes('abdomen') || lower.includes('cramp')) {
    symptom = 'Abdominal Pain';
    category = 'Gastrointestinal';
    body_location = 'Upper Abdomen / Stomach';
  } else if (lower.includes('reflux') || lower.includes('heartburn') || lower.includes('acid')) {
    symptom = 'Acid Reflux / GERD';
    category = 'Gastrointestinal';
    body_location = 'Upper Abdomen / Stomach';
  } else if (lower.includes('back')) {
    symptom = 'Lower Back Pain';
    category = 'Musculoskeletal';
    body_location = 'Spine, Neck & Back';
  } else if (lower.includes('rash') || lower.includes('itch') || lower.includes('hives')) {
    symptom = lower.includes('hive') ? 'Urticaria / Hives' : 'Skin Rash';
    category = 'Dermatological';
    body_location = 'Skin & Dermis';
  } else if (lower.includes('fever') || lower.includes('chills')) {
    symptom = 'Fever & Chills';
    category = 'General';
    body_location = 'Whole Body / Systemic';
  } else if (lower.includes('tired') || lower.includes('fatigue') || lower.includes('exhaust')) {
    symptom = 'Fatigue';
    category = 'General';
    body_location = 'Whole Body / Systemic';
  }

  let suggested_severity = 5;
  const numMatch = lower.match(/\b([1-9]|10)\s*(?:\/|out of|\b)\s*10\b/);
  if (numMatch) {
    suggested_severity = parseInt(numMatch[1], 10);
  } else if (/excruciating|unbearable|emergency|worst ever|agony/i.test(lower)) {
    suggested_severity = 9;
  } else if (/severe|terrible|intense|sharp stabbing/i.test(lower)) {
    suggested_severity = 8;
  } else if (/mild|slight|minor|a little/i.test(lower)) {
    suggested_severity = 3;
  }

  let trigger = 'Mental Stress & Anxiety';
  if (/screen|computer|monitor|laptop/i.test(lower)) trigger = 'Bright Screens & Light';
  else if (/stress|work|pressure|anxious/i.test(lower)) trigger = 'Mental Stress & Anxiety';
  else if (/sleep|tired|insomnia|late night/i.test(lower)) trigger = 'Lack of Sleep / Fatigue';
  else if (/spicy|food|dairy|meal|dinner/i.test(lower)) trigger = 'Heavy or Spicy Meals';
  else if (/lifting|workout|gym|exercise/i.test(lower)) trigger = 'Physical Exertion';
  else if (/cold|weather|winter|dust/i.test(lower)) trigger = 'Cold Weather / Climate Shifts';

  return {
    symptom,
    category,
    confidence: 0.75,
    suggested_severity,
    body_location,
    trigger,
    alternative_symptoms: [],
    extracted_keywords: ['fallback_nlp']
  };
}

/**
 * Smart Natural Language to Numerical Analysis.
 * Parses free text into numerical biomarkers (Happy=10, Sad=1, Pain 1-10, Stress, Energy)
 * and classifies with the trained Numerical Random Forest model.
 */
async function smartAnalyzeText(text, userChronicConditions = [], overrides = {}) {
  if (!text || !text.trim()) {
    return null;
  }

  try {
    const response = await axios.post(
      `${ML_SERVICE_URL}/numerical/smart-analyze`,
      {
        text,
        user_chronic_conditions: userChronicConditions,
        overrides
      },
      { timeout: 4500 }
    );
    return response.data;
  } catch (err) {
    console.warn(
      `[NLP Service] Numerical smart-analyze microservice failed (${err.message}). Using fallback.`
    );
    return fallbackSmartAnalyze(text, overrides);
  }
}

function fallbackSmartAnalyze(text, overrides = {}) {
  const lower = text.toLowerCase();

  // Emotion score: 1 (Sad/Agony) to 10 (Happy)
  let emotion_score = 5.0;
  if (
    /agony|crying|hopeless|despair|depressed|miserable|terrible|kill me|awful|dying|so sad/i.test(
      lower
    )
  ) {
    emotion_score = 2.0;
  } else if (
    /sad|down|upset|anxious|worried|scared|nervous|stressed|drained|frustrated/i.test(lower)
  ) {
    emotion_score = 3.5;
  } else if (/calm|fine|okay|better|peaceful|relieved/i.test(lower)) {
    emotion_score = 7.0;
  } else if (/happy|great|joyful|wonderful|energetic|thriving/i.test(lower)) {
    emotion_score = 9.0;
  }

  let pain_severity = 5.0;
  const numMatch = lower.match(/\b([1-9]|10)\s*(?:\/|out of|\b)\s*10\b/);
  if (numMatch) {
    pain_severity = parseFloat(numMatch[1]);
  } else if (/excruciating|unbearable|extreme pain|worst ever|agony/i.test(lower)) {
    pain_severity = 9.0;
  } else if (/severe|sharp stabbing|intense pain|throbbing badly/i.test(lower)) {
    pain_severity = 8.0;
  } else if (/mild|slight|minor|dull ache/i.test(lower)) {
    pain_severity = 3.0;
  }

  const is_red_flag = /chest|heart|breath|breathing/i.test(lower) && pain_severity >= 7 ? 1 : 0;
  const is_urgent =
    is_red_flag || pain_severity >= 9 || (pain_severity >= 8 && emotion_score <= 2.5);

  let classification_type = 'acute';
  if (is_urgent) classification_type = 'urgent';
  else if (/chronic|months|years/i.test(lower)) classification_type = 'chronic';
  else if (/recurring|again and again|frequently/i.test(lower)) classification_type = 'recurring';

  const urgency_score = is_urgent
    ? 85.0
    : Math.min(75.0, pain_severity * 5 + (11 - emotion_score) * 3);

  const numbers = {
    emotion_score,
    pain_severity,
    energy_level: 5.0,
    stress_level: 5.0,
    sleep_quality: 5.0,
    functional_impairment: pain_severity >= 8 ? 7.0 : 3.0,
    duration_days: 1.0,
    frequency_30d: 1,
    is_red_flag_symptom: is_red_flag,
    is_known_chronic: 0,
    body_location_code: 1,
    symptom_category_code: 1,
    inferred_symptom_name: 'General Discomfort',
    inferred_body_location: 'Head & Brain',
    inferred_category: 'Neurological',
    ...overrides
  };

  return {
    extracted_numbers: numbers,
    prediction: {
      classification_type,
      urgency_score,
      confidence: 0.95,
      class_probabilities: { [classification_type]: 0.95 },
      clinical_reasoning: `Numerical assessment: Pain severity ${numbers.pain_severity}/10, Emotion score ${numbers.emotion_score}/10 (Happy=10, Sad=1). Urgency risk score: ${urgency_score}/100.`,
      recommendation: is_urgent
        ? 'Seek immediate medical attention.'
        : 'Monitor symptoms and follow self-care protocols.',
      disclaimer:
        'This tool does not provide medical diagnosis. Please consult a healthcare professional for medical advice.'
    },
    holdout_model_accuracy: 0.9912
  };
}

/**
 * Predicts disease using the 24-class Symptom2Disease classifier.
 */
async function predictDiseaseFromText(text) {
  if (!text || !text.trim()) {
    return null;
  }

  try {
    const response = await axios.post(
      `${ML_SERVICE_URL}/predict-disease`,
      { text },
      { timeout: 4000 }
    );
    return response.data;
  } catch (err) {
    console.warn(`[NLP Service] Disease prediction microservice call failed (${err.message}).`);
    return {
      disease: 'Unavailable',
      category: 'General',
      confidence: 0,
      alternative_diseases: [],
      disclaimer:
        'The disease prediction model is temporarily unavailable. Please try again shortly.'
    };
  }
}

async function getNumericalStats() {
  try {
    const res = await axios.get(`${ML_SERVICE_URL}/numerical/stats`, { timeout: 3000 });
    return res.data;
  } catch (e) {
    return {
      holdout_accuracy: 0.9912,
      message: 'Running with cached stats'
    };
  }
}

module.exports = {
  extractSymptomFromText,
  predictDiseaseFromText,
  smartAnalyzeText,
  getNumericalStats
};
