/**
 * Complete Catalogue of 24 Identifiable Diseases & Conditions.
 * Trained on the Symptom2Disease dataset with 96.67% holdout accuracy.
 */

export const IDENTIFIABLE_DISEASES = [
  {
    id: 'migraine',
    name: 'Migraine',
    category: 'Neurological',
    specialist: 'Neurologist',
    severityRisk: 'Moderate to High (6-9/10)',
    keySymptoms: ['Throbbing headache', 'Light sensitivity (photophobia)', 'Nausea', 'Visual aura', 'Sound sensitivity'],
    icon: '🧠'
  },
  {
    id: 'hypertension',
    name: 'Hypertension (High Blood Pressure)',
    category: 'Cardiovascular',
    specialist: 'Cardiologist',
    severityRisk: 'High / Critical (7-10/10)',
    keySymptoms: ['Dizziness', 'Chest tightness', 'Occipital headaches', 'Shortness of breath', 'Nosebleeds'],
    icon: '❤️'
  },
  {
    id: 'bronchial_asthma',
    name: 'Bronchial Asthma',
    category: 'Respiratory',
    specialist: 'Pulmonologist / Allergist',
    severityRisk: 'Moderate to High (5-9/10)',
    keySymptoms: ['Wheezing', 'Shortness of breath', 'Chest constriction', 'Nocturnal coughing'],
    icon: '🫁'
  },
  {
    id: 'pneumonia',
    name: 'Pneumonia',
    category: 'Respiratory',
    specialist: 'Pulmonologist / Infectious Disease',
    severityRisk: 'High / Emergency (7-9/10)',
    keySymptoms: ['Productive phlegm cough', 'High fever & chills', 'Sharp pleuritic chest pain', 'Dyspnea', 'Fatigue'],
    icon: '🫁'
  },
  {
    id: 'common_cold',
    name: 'Common Cold',
    category: 'Respiratory',
    specialist: 'General Physician / ENT',
    severityRisk: 'Mild to Moderate (2-4/10)',
    keySymptoms: ['Runny nose / Rhinorrhea', 'Sneezing', 'Sore throat', 'Mild malaise', 'Low-grade fever'],
    icon: '🤧'
  },
  {
    id: 'dengue',
    name: 'Dengue Fever',
    category: 'Infectious Disease',
    specialist: 'Infectious Disease Specialist',
    severityRisk: 'High / Emergency (7-10/10)',
    keySymptoms: ['High sudden fever', 'Severe retro-orbital eye pain', 'Joint & bone pain (breakbone)', 'Skin rash', 'Platelet drop'],
    icon: '🦟'
  },
  {
    id: 'malaria',
    name: 'Malaria',
    category: 'Infectious Disease',
    specialist: 'Infectious Disease Specialist',
    severityRisk: 'High (7-9/10)',
    keySymptoms: ['Cyclical high fever', 'Intense shivering & chills', 'Profuse sweating', 'Nausea', 'Body ache'],
    icon: '🦟'
  },
  {
    id: 'typhoid',
    name: 'Typhoid Fever',
    category: 'Infectious Disease',
    specialist: 'Infectious Disease / Internist',
    severityRisk: 'High (6-8/10)',
    keySymptoms: ['Step-ladder rising fever', 'Abdominal pain', 'Severe weakness', 'Rose spots on trunk', 'Headache'],
    icon: '🌡️'
  },
  {
    id: 'chickenpox',
    name: 'Chickenpox',
    category: 'Infectious Disease',
    specialist: 'Dermatologist / Pediatrician',
    severityRisk: 'Moderate (4-6/10)',
    keySymptoms: ['Itchy fluid-filled blister rash', 'Mild fever', 'Loss of appetite', 'Tiredness'],
    icon: '🔴'
  },
  {
    id: 'gerd',
    name: 'Acid Reflux / GERD',
    category: 'Gastrointestinal',
    specialist: 'Gastroenterologist',
    severityRisk: 'Moderate (4-7/10)',
    keySymptoms: ['Heartburn / Retro-sternal burning', 'Acid regurgitation', 'Difficulty swallowing', 'Post-meal chest discomfort'],
    icon: '🔥'
  },
  {
    id: 'peptic_ulcer',
    name: 'Peptic Ulcer Disease',
    category: 'Gastrointestinal',
    specialist: 'Gastroenterologist',
    severityRisk: 'Moderate to High (5-8/10)',
    keySymptoms: ['Burning epigastric stomach pain', 'Bloating', 'Nausea', 'Pain relieved temporarily by food or antacids'],
    icon: '🩺'
  },
  {
    id: 'jaundice',
    name: 'Jaundice',
    category: 'Hepatic / Digestive',
    specialist: 'Hepatologist / Gastroenterologist',
    severityRisk: 'High (6-9/10)',
    keySymptoms: ['Yellowing of skin and eyes (sclera)', 'Dark urine', 'Pale stool', 'Abdominal pain', 'Pruritus (itching)'],
    icon: '🟡'
  },
  {
    id: 'uti',
    name: 'Urinary Tract Infection (UTI)',
    category: 'General / Urological',
    specialist: 'Urologist / Primary Care',
    severityRisk: 'Moderate (4-7/10)',
    keySymptoms: ['Burning dysuria while urinating', 'Frequent urge to urinate', 'Pelvic cramping', 'Cloudy urine'],
    icon: '💧'
  },
  {
    id: 'diabetes',
    name: 'Diabetes (Type 1 & 2)',
    category: 'Endocrine',
    specialist: 'Endocrinologist',
    severityRisk: 'Chronic High (5-8/10)',
    keySymptoms: ['Excessive thirst (polydipsia)', 'Frequent urination (polyuria)', 'Unexplained weight loss', 'Extreme fatigue', 'Blurred vision'],
    icon: '🩸'
  },
  {
    id: 'arthritis',
    name: 'Arthritis (Osteo / Rheumatoid)',
    category: 'Musculoskeletal',
    specialist: 'Rheumatologist / Orthopedist',
    severityRisk: 'Moderate to Severe (4-8/10)',
    keySymptoms: ['Joint pain and swelling', 'Morning joint stiffness > 30 mins', 'Reduced range of motion', 'Warmth in joints'],
    icon: '🦴'
  },
  {
    id: 'cervical_spondylosis',
    name: 'Cervical Spondylosis',
    category: 'Musculoskeletal',
    specialist: 'Orthopedist / Neurologist',
    severityRisk: 'Moderate (4-7/10)',
    keySymptoms: ['Chronic neck pain and stiffness', 'Radiating shoulder tingling', 'Numbness in fingers', 'Headaches originating at base of skull'],
    icon: '🦴'
  },
  {
    id: 'varicose_veins',
    name: 'Varicose Veins',
    category: 'Cardiovascular',
    specialist: 'Vascular Surgeon / Phlebologist',
    severityRisk: 'Moderate (3-6/10)',
    keySymptoms: ['Enlarged, twisted bulging leg veins', 'Aching heavy leg sensation', 'Swelling in lower legs/ankles', 'Skin discoloration'],
    icon: '🦵'
  },
  {
    id: 'psoriasis',
    name: 'Psoriasis',
    category: 'Dermatology',
    specialist: 'Dermatologist',
    severityRisk: 'Moderate (4-7/10)',
    keySymptoms: ['Thick red skin plaques', 'Silvery-white scales', 'Dry cracked bleeding skin', 'Itching & burning'],
    icon: '🧴'
  },
  {
    id: 'acne',
    name: 'Acne Vulgaris',
    category: 'Dermatology',
    specialist: 'Dermatologist',
    severityRisk: 'Mild to Moderate (2-5/10)',
    keySymptoms: ['Pimples / pustules', 'Blackheads & whiteheads', 'Cystic lesions on face/back', 'Inflamed red blemishes'],
    icon: '✨'
  },
  {
    id: 'impetigo',
    name: 'Impetigo',
    category: 'Dermatology',
    specialist: 'Dermatologist',
    severityRisk: 'Moderate (4-6/10)',
    keySymptoms: ['Honey-colored crusted sores', 'Red sores around nose & mouth', 'Itchy contagious blisters'],
    icon: '🩹'
  },
  {
    id: 'fungal_infection',
    name: 'Fungal Skin Infection (Ringworm / Tinea)',
    category: 'Dermatology',
    specialist: 'Dermatologist',
    severityRisk: 'Mild to Moderate (3-5/10)',
    keySymptoms: ['Circular ring-shaped rash', 'Intense itching', 'Scaling peeling edges', 'Red elevated border'],
    icon: '🍄'
  },
  {
    id: 'allergy',
    name: 'Allergy / Allergic Rhinitis',
    category: 'ENT / Immunological',
    specialist: 'Allergist / Immunologist',
    severityRisk: 'Mild to Severe (2-8/10)',
    keySymptoms: ['Watery itchy eyes', 'Sneezing', 'Nasal congestion', 'Urticaria / Hives flare-up', 'Skin redness'],
    icon: '🌸'
  },
  {
    id: 'drug_reaction',
    name: 'Drug Reaction',
    category: 'Dermatology / Immunological',
    specialist: 'Dermatologist / Emergency Physician',
    severityRisk: 'High / Emergency (6-9/10)',
    keySymptoms: ['Sudden widespread skin eruption', 'Hives / wheals', 'Facial swelling', 'Fever following medication'],
    icon: '💊'
  },
  {
    id: 'hemorrhoids',
    name: 'Hemorrhoids (Dimorphic)',
    category: 'Gastrointestinal',
    specialist: 'Colorectal Specialist / Gastroenterologist',
    severityRisk: 'Moderate (4-7/10)',
    keySymptoms: ['Bright red bleeding during bowel movements', 'Anal itching and irritation', 'Painful swelling or lumps'],
    icon: '🩺'
  }
];

export const DISEASE_CATEGORIES = [
  'All Categories',
  'Neurological',
  'Cardiovascular',
  'Respiratory',
  'Gastrointestinal',
  'Infectious Disease',
  'Dermatology',
  'Endocrine',
  'Musculoskeletal',
  'ENT / Immunological',
  'General / Urological',
  'Hepatic / Digestive'
];
