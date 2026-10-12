const bcrypt = require('bcryptjs');
const { initDB, query, getDbMode } = require('../config/db');
const { runMigrations } = require('./migrate');

const SYMPTOMS_DATA = [
  { name: 'Migraine', category: 'Neurological' },
  { name: 'Tension Headache', category: 'Neurological' },
  { name: 'Cluster Headache', category: 'Neurological' },
  { name: 'Dizziness / Vertigo', category: 'Neurological' },
  { name: 'Peripheral Neuropathy / Tingling', category: 'Neurological' },
  { name: 'Dry Cough', category: 'Respiratory' },
  { name: 'Productive Cough', category: 'Respiratory' },
  { name: 'Shortness of Breath', category: 'Respiratory' },
  { name: 'Asthma Symptoms', category: 'Respiratory' },
  { name: 'Sore Throat', category: 'ENT' },
  { name: 'Nasal Congestion', category: 'ENT' },
  { name: 'Sinusitis', category: 'ENT' },
  { name: 'Tinnitus', category: 'ENT' },
  { name: 'Chest Pain', category: 'Cardiovascular' },
  { name: 'Heart Palpitations', category: 'Cardiovascular' },
  { name: 'Abdominal Pain', category: 'Gastrointestinal' },
  { name: 'Acid Reflux / GERD', category: 'Gastrointestinal' },
  { name: 'Nausea', category: 'Gastrointestinal' },
  { name: 'Diarrhea', category: 'Gastrointestinal' },
  { name: 'Constipation', category: 'Gastrointestinal' },
  { name: 'Lower Back Pain', category: 'Musculoskeletal' },
  { name: 'Sciatica', category: 'Musculoskeletal' },
  { name: 'Joint Pain', category: 'Musculoskeletal' },
  { name: 'Neck & Shoulder Tension', category: 'Musculoskeletal' },
  { name: 'Muscle Cramps', category: 'Musculoskeletal' },
  { name: 'Skin Rash', category: 'Dermatology' },
  { name: 'Urticaria / Hives', category: 'Dermatology' },
  { name: 'Eczema Flare-up', category: 'Dermatology' },
  { name: 'Sunburn', category: 'Dermatology' },
  { name: 'Fever & Chills', category: 'General' },
  { name: 'Fatigue', category: 'General' },
  { name: 'Insomnia', category: 'Psychological / Sleep' },
  { name: 'Anxiety Episode', category: 'Psychological' }
];

// SEC-17: demo/seed *accounts* (admins, doctors, patients) and their sample
// data are only ever created when SEED_DEMO=true is explicitly set. The
// symptom catalogue below is reference data the app needs to function at
// all (autocomplete, classification vocabulary) and is seeded unconditionally.
async function seedDatabase() {
  console.log('[SEED] Running migrations first...');
  await runMigrations();

  await seedSymptomsCatalogue();

  if (process.env.SEED_DEMO === 'true') {
    await seedDemoAccounts();
  } else {
    console.log('[SEED] SEED_DEMO is not "true" — skipping demo accounts and sample data.');
    console.log(
      '[SEED] Set SEED_DEMO=true (never in production) to create them for local exploration.'
    );
  }
}

async function seedSymptomsCatalogue() {
  const existing = await query('SELECT COUNT(*) as count FROM symptoms');
  const count = parseInt(existing.rows[0]?.count ?? 0, 10);
  if (count > 0) {
    console.log('[SEED] Symptoms catalogue already populated, skipping.');
    return;
  }
  console.log('[SEED] Seeding symptoms catalogue...');
  for (const s of SYMPTOMS_DATA) {
    await query('INSERT INTO symptoms (name, category) VALUES ($1, $2)', [s.name, s.category]);
  }
}

async function seedDemoAccounts() {
  console.log('[SEED] SEED_DEMO=true — clearing existing demo accounts/data for a clean reseed...');
  // Clear in child-to-parent order. The symptoms catalogue itself is left intact.
  await query('DELETE FROM feedback');
  await query('DELETE FROM attachments');
  await query('DELETE FROM appointments');
  await query('DELETE FROM reports');
  await query('DELETE FROM reminders');
  await query('DELETE FROM medications');
  await query('DELETE FROM caregiver_shares');
  await query('DELETE FROM symptom_entries');
  await query('DELETE FROM users');
  await query('DELETE FROM doctor_refresh_tokens');
  await query('DELETE FROM doctors');
  await query('DELETE FROM admin_refresh_tokens');
  await query('DELETE FROM admins');
  await query('DELETE FROM refresh_tokens');

  console.log('[SEED] Seeding Admin Portal administrator accounts...');
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  await query(
    `INSERT INTO admins (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)`,
    ['Chief System Administrator', 'admin@symptomlog.com', adminPasswordHash, 'admin']
  );
  console.log('[SEED] Admin Portal login: admin@symptomlog.com / admin123');

  console.log('[SEED] Seeding Physician Portal demo doctor accounts...');
  const doctorPasswordHash = await bcrypt.hash('doctor123', 10);
  const doc1 = await query(
    `INSERT INTO doctors (name, email, password_hash, specialty, npi_number)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [
      'Dr. Jennifer Vance, MD',
      'jennifer.vance@symptomlog.com',
      doctorPasswordHash,
      'Neurology',
      'NPI-1023456789'
    ]
  );
  const doc2 = await query(
    `INSERT INTO doctors (name, email, password_hash, specialty, npi_number)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [
      'Dr. Robert Sterling, MD',
      'robert.sterling@symptomlog.com',
      doctorPasswordHash,
      'Pulmonology',
      'NPI-1098765432'
    ]
  );
  const doc3 = await query(
    `INSERT INTO doctors (name, email, password_hash, specialty, npi_number)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [
      'Dr. Amelia Ferreira, MD',
      'amelia.ferreira@symptomlog.com',
      doctorPasswordHash,
      'Dermatology',
      'NPI-1076543210'
    ]
  );
  let doctor1Id = doc1.rows[0]?.id;
  let doctor2Id = doc2.rows[0]?.id;
  let doctor3Id = doc3.rows[0]?.id;
  if (!doctor1Id || !doctor2Id || !doctor3Id) {
    const allDoctors = await query('SELECT id, email FROM doctors');
    doctor1Id = allDoctors.rows.find((d) => d.email === 'jennifer.vance@symptomlog.com')?.id;
    doctor2Id = allDoctors.rows.find((d) => d.email === 'robert.sterling@symptomlog.com')?.id;
    doctor3Id = allDoctors.rows.find((d) => d.email === 'amelia.ferreira@symptomlog.com')?.id;
  }
  console.log(
    `[SEED] Created Doctors: Dr. Vance ID=${doctor1Id}, Dr. Sterling ID=${doctor2Id}, Dr. Ferreira ID=${doctor3Id}`
  );
  console.log('[SEED] Physician Portal demo login: jennifer.vance@symptomlog.com / doctor123');
  console.log('[SEED] New demo doctor login: amelia.ferreira@symptomlog.com / doctor123');

  console.log('[SEED] Looking up symptoms catalogue (seeded separately, unconditionally)...');
  const symptomMap = {};
  const allSymp = await query('SELECT id, name FROM symptoms');
  allSymp.rows.forEach((r) => {
    symptomMap[r.name] = r.id;
  });

  console.log('[SEED] Seeding users...');
  const passwordHash = await bcrypt.hash('password123', 10);

  const u1 = await query(
    `INSERT INTO users (name, email, password_hash, age, gender, chronic_conditions, dark_mode)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [
      'Sarah Chen',
      'demo@symptomlog.com',
      passwordHash,
      34,
      'Female',
      JSON.stringify(['Migraine', 'Asthma']),
      1
    ]
  );
  const u2 = await query(
    `INSERT INTO users (name, email, password_hash, age, gender, chronic_conditions, dark_mode)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [
      'Marcus Brody',
      'marcus@symptomlog.com',
      passwordHash,
      52,
      'Male',
      JSON.stringify(['Hypertension', 'Lower Back Pain']),
      0
    ]
  );
  const u3 = await query(
    `INSERT INTO users (name, email, password_hash, age, gender, chronic_conditions, dark_mode)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [
      'Elena Rostova',
      'elena@symptomlog.com',
      passwordHash,
      28,
      'Female',
      JSON.stringify(['Eczema']),
      1
    ]
  );

  let user1Id = u1.rows[0]?.id;
  let user2Id = u2.rows[0]?.id;
  let user3Id = u3.rows[0]?.id;
  if (!user1Id || !user2Id || !user3Id) {
    const allUsers = await query('SELECT id, email FROM users');
    user1Id = allUsers.rows.find((u) => u.email === 'demo@symptomlog.com')?.id;
    user2Id = allUsers.rows.find(
      (u) => u.email === 'marcus@symptomlog.com' || u.email === 'marcus@example.com'
    )?.id;
    user3Id = allUsers.rows.find(
      (u) => u.email === 'elena@symptomlog.com' || u.email === 'elena@example.com'
    )?.id;
  }

  console.log(
    `[SEED] Created Users: Demo User ID=${user1Id}, Marcus ID=${user2Id}, Elena ID=${user3Id}`
  );

  // Helper date offset
  const now = new Date();
  const daysAgo = (days, hours = 0) => {
    const d = new Date(now.getTime() - days * 24 * 60 * 60 * 1000 - hours * 60 * 60 * 1000);
    return d.toISOString();
  };

  console.log('[SEED] Seeding realistic historical symptom entries...');
  const entriesData = [
    // Sarah's Migraine entries (Shows high correlation with 'Poor Sleep' and 'Screen Time' triggers)
    {
      userId: user1Id,
      symptomName: 'Migraine',
      desc: 'Woke up with a throbbing migraine on right temple, throbbing pain with strong light sensitivity.',
      severity: 8,
      location: 'Head / Face',
      trigger: 'Poor Sleep',
      start: daysAgo(2, 4),
      end: daysAgo(2, 0),
      type: 'chronic',
      rec: 'Take prescribed triptan early, rest in a dark quiet room, stay hydrated. Follow your chronic migraine management plan.',
      reason:
        'Chronic pattern detected: User has known chronic condition "Migraine" and has experienced multiple episodes.'
    },
    {
      userId: user1Id,
      symptomName: 'Migraine',
      desc: 'Pounding headache behind right eye after 10-hour screen marathon and high stress.',
      severity: 7,
      location: 'Head / Face',
      trigger: 'Screen Time / Stress',
      start: daysAgo(8, 6),
      end: daysAgo(8, 2),
      type: 'recurring',
      rec: 'Apply cold compress, take acute medication as directed by neurologist, take scheduled screen breaks.',
      reason: 'Recurring episode (3rd occurrence within rolling 30-day window).'
    },
    {
      userId: user1Id,
      symptomName: 'Migraine',
      desc: 'Sharp throbbing migraine starting in the afternoon, sensitive to loud sounds.',
      severity: 7,
      location: 'Head / Face',
      trigger: 'Poor Sleep',
      start: daysAgo(14, 5),
      end: daysAgo(14, 1),
      type: 'recurring',
      rec: 'Rest in quiet environment, hydration, monitor aura symptoms.',
      reason: 'Recurring episode matching established migraine frequency.'
    },
    {
      userId: user1Id,
      symptomName: 'Migraine',
      desc: 'Severe unilateral headache with nausea after late night flight.',
      severity: 8,
      location: 'Head / Face',
      trigger: 'Poor Sleep',
      start: daysAgo(22, 8),
      end: daysAgo(22, 2),
      type: 'recurring',
      rec: 'Medication and dark room rest.',
      reason: 'Recurring migraine pattern in rolling 30-day window.'
    },
    {
      userId: user1Id,
      symptomName: 'Migraine',
      desc: 'Moderate throbbing migraine triggered by lack of sleep.',
      severity: 6,
      location: 'Head / Face',
      trigger: 'Poor Sleep',
      start: daysAgo(35, 4),
      end: daysAgo(35, 1),
      type: 'chronic',
      rec: 'Routine migraine protocol.',
      reason: 'Chronic condition history.'
    },
    {
      userId: user1Id,
      symptomName: 'Migraine',
      desc: 'Aura followed by intense right side migraine.',
      severity: 9,
      location: 'Head / Face',
      trigger: 'Stress',
      start: daysAgo(50, 6),
      end: daysAgo(50, 0),
      type: 'chronic',
      rec: 'Consult neurologist if frequency exceeds 4 per month.',
      reason: 'Chronic migraine tracking.'
    },
    // Sarah's Asthma / Respiratory entries
    {
      userId: user1Id,
      symptomName: 'Asthma Symptoms',
      desc: 'Wheezing and chest tightness after jogging in cold evening air.',
      severity: 6,
      location: 'Chest',
      trigger: 'Cold Air / Exercise',
      start: daysAgo(5, 2),
      end: daysAgo(5, 1),
      type: 'chronic',
      rec: 'Use rescue inhaler (Albuterol 2 puffs), sit upright, warm up respiratory tract.',
      reason: 'Recognized chronic condition "Asthma".'
    },
    {
      userId: user1Id,
      symptomName: 'Asthma Symptoms',
      desc: 'Mild shortness of breath and tickle in lungs due to heavy pollen outdoors.',
      severity: 5,
      location: 'Chest',
      trigger: 'Pollen / Allergens',
      start: daysAgo(18, 3),
      end: daysAgo(18, 2),
      type: 'chronic',
      rec: 'Pre-dose rescue inhaler before outdoor activity, monitor peak flow.',
      reason: 'Chronic condition management.'
    },
    // Sarah's Acid Reflux entries
    {
      userId: user1Id,
      symptomName: 'Acid Reflux / GERD',
      desc: 'Burning sensation in chest and throat after eating spicy Thai food for dinner.',
      severity: 6,
      location: 'Upper Abdomen / Chest',
      trigger: 'Spicy Food',
      start: daysAgo(3, 3),
      end: daysAgo(3, 1),
      type: 'acute',
      rec: 'Elevate head of bed, avoid lying down for 3 hours after eating, consider OTC antacid.',
      reason: 'Acute episode (<14 days duration, isolated trigger).'
    },
    {
      userId: user1Id,
      symptomName: 'Acid Reflux / GERD',
      desc: 'Heartburn and sour burping after greasy late pizza.',
      severity: 5,
      location: 'Upper Abdomen / Chest',
      trigger: 'Spicy / Greasy Food',
      start: daysAgo(11, 4),
      end: daysAgo(11, 2),
      type: 'acute',
      rec: 'Dietary avoidance of late acidic/fatty meals, drink warm water.',
      reason: 'Acute trigger-associated acid reflux.'
    },
    // Sarah's Neck & Shoulder tension
    {
      userId: user1Id,
      symptomName: 'Neck & Shoulder Tension',
      desc: 'Stiff aching trapezius and sore neck after 9 hours at desk without ergonomics.',
      severity: 5,
      location: 'Neck / Shoulders',
      trigger: 'Poor Ergonomics / Posture',
      start: daysAgo(1, 6),
      end: null, // Still active!
      type: 'acute',
      rec: 'Gentle neck stretches, heat pack on trapezius for 15 minutes, adjust monitor height.',
      reason: 'Acute musculoskeletal tension (< 14 days duration).'
    },
    {
      userId: user1Id,
      symptomName: 'Insomnia',
      desc: 'Unable to fall asleep until 3:30 AM due to racing thoughts about project presentation.',
      severity: 6,
      location: 'General Body',
      trigger: 'Stress / High Pressure',
      start: daysAgo(6, 8),
      end: daysAgo(6, 2),
      type: 'acute',
      rec: 'Practice 4-7-8 breathing, limit screen light 1 hour before bed, avoid late caffeine.',
      reason: 'Acute situational sleep disruption.'
    },
    // Marcus's entries (Lower Back Pain chronic + Urgent Chest Pain alert)
    {
      userId: user2Id,
      symptomName: 'Lower Back Pain',
      desc: 'Dull ache in lumbar spine after lifting garden mulch.',
      severity: 6,
      location: 'Lower Back',
      trigger: 'Heavy Lifting',
      start: daysAgo(4, 5),
      end: null, // Active
      type: 'chronic',
      rec: 'Avoid heavy bending, apply alternating ice and heat, perform core physical therapy stretches.',
      reason: 'Chronic condition "Lower Back Pain" marked in profile.'
    },
    {
      userId: user2Id,
      symptomName: 'Chest Pain',
      desc: 'Sudden intense squeezing chest pain with shortness of breath while climbing stairs.',
      severity: 9,
      location: 'Chest',
      trigger: 'Physical Exertion',
      start: daysAgo(12, 2),
      end: daysAgo(12, 1),
      type: 'urgent',
      rec: 'EMERGENCY: Seek immediate medical evaluation or call emergency services (911/112). High severity chest pain with exertion requires urgent rule-out for acute cardiac events.',
      reason:
        'Urgent red-flag rule: Chest pain with severity ≥ 8 constitutes an immediate clinical safety alert.'
    },
    // Elena's Eczema (chronic condition) entries
    {
      userId: user3Id,
      symptomName: 'Eczema Flare-up',
      desc: 'Itchy, inflamed patches on both elbow creases and behind the knees, worse after showering with hot water.',
      severity: 6,
      location: 'Elbows / Knees',
      trigger: 'Hot Water / Dry Air',
      start: daysAgo(3, 5),
      end: null, // Still active
      type: 'chronic',
      rec: 'Apply prescribed topical corticosteroid, switch to lukewarm showers, moisturize within 3 minutes of bathing with fragrance-free emollient.',
      reason:
        'Chronic condition detected: User has known chronic condition "Eczema" with recurring flare pattern.'
    },
    {
      userId: user3Id,
      symptomName: 'Eczema Flare-up',
      desc: 'Red, cracked skin on hands after using a new dish soap at work, mild oozing on two knuckles.',
      severity: 7,
      location: 'Hands',
      trigger: 'Irritant Chemical Exposure',
      start: daysAgo(16, 3),
      end: daysAgo(13, 0),
      type: 'chronic',
      rec: 'Switch to hypoallergenic gloves when washing dishes, apply barrier cream, continue prescribed emollient routine.',
      reason: 'Chronic eczema flare triggered by known irritant exposure.'
    },
    {
      userId: user3Id,
      symptomName: 'Skin Rash',
      desc: 'Small raised bumps on forearm after trying a new laundry detergent, mild itching but no blistering.',
      severity: 4,
      location: 'Forearms',
      trigger: 'New Detergent / Allergen',
      start: daysAgo(27, 2),
      end: daysAgo(25, 0),
      type: 'acute',
      rec: 'Discontinue the new detergent, apply OTC hydrocortisone 1% cream twice daily, monitor for spreading.',
      reason: 'Acute contact-reaction rash (<14 days duration, isolated new-product trigger).'
    },
    {
      userId: user3Id,
      symptomName: 'Anxiety Episode',
      desc: 'Racing heart and tight chest before a big client presentation, lasted about 40 minutes.',
      severity: 5,
      location: 'Chest / General',
      trigger: 'Work Stress',
      start: daysAgo(9, 1),
      end: daysAgo(9, 0),
      type: 'acute',
      rec: 'Practice grounding breathing exercises, limit caffeine before stressful events, consider a short walk to reset.',
      reason: 'Acute situational anxiety episode, isolated stressor.'
    },
    {
      userId: user3Id,
      symptomName: 'Fatigue',
      desc: 'Persistent low energy and heavy eyelids through most of the workday despite 7 hours of sleep.',
      severity: 4,
      location: 'General Body',
      trigger: 'Unknown / Possible Overexertion',
      start: daysAgo(20, 6),
      end: daysAgo(20, 0),
      type: 'acute',
      rec: 'Monitor hydration and iron intake, maintain consistent sleep schedule, revisit if fatigue persists beyond 2 weeks.',
      reason: 'Acute, isolated fatigue episode with no recurring pattern yet.'
    }
  ];

  const createdEntryIds = [];
  for (const entry of entriesData) {
    const sId = symptomMap[entry.symptomName];
    if (!sId) continue;

    const res = await query(
      `INSERT INTO symptom_entries 
       (user_id, symptom_id, description, severity, body_location, trigger, started_at, ended_at, created_at, classification_type, recommendation, reasoning)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
      [
        entry.userId,
        sId,
        entry.desc,
        entry.severity,
        entry.location,
        entry.trigger,
        entry.start,
        entry.end,
        entry.start,
        entry.type,
        entry.rec,
        entry.reason
      ]
    );
    if (res.rows[0]?.id) {
      createdEntryIds.push(res.rows[0].id);
    }
  }

  console.log(`[SEED] Inserted ${entriesData.length} symptom entries.`);

  console.log('[SEED] Seeding medications...');
  await query(
    `INSERT INTO medications (user_id, name, dosage, frequency, started_at, ended_at, active)
     VALUES
     ($1, 'Sumatriptan', '50mg', 'As needed at onset of migraine', $2, NULL, 1),
     ($1, 'Albuterol Inhaler', '90mcg / puff', '2 puffs every 4-6 hours prn', $3, NULL, 1),
     ($1, 'Vitamin D3', '2000 IU', 'Once daily with breakfast', $4, NULL, 1),
     ($1, 'Omeprazole', '20mg', 'Once daily before morning meal (2-week course)', $5, $6, 0),
     ($7, 'Lisinopril', '10mg', 'Once daily in the morning', $8, NULL, 1),
     ($7, 'Ibuprofen', '400mg', 'Twice daily after meals as needed', $9, NULL, 1),
     ($10, 'Cetirizine', '10mg', 'Once daily for itching', $11, NULL, 1),
     ($10, 'Hydrocortisone Cream', '1%', 'Apply to affected areas twice daily during flare-ups', $12, NULL, 1)`,
    [
      user1Id,
      daysAgo(120),
      daysAgo(150),
      daysAgo(90),
      daysAgo(30),
      daysAgo(16),
      user2Id,
      daysAgo(200),
      daysAgo(40),
      user3Id,
      daysAgo(60),
      daysAgo(16)
    ]
  );

  console.log('[SEED] Seeding appointment & earlier doctor-visit history...');
  // entry indices below line up with entriesData's declaration order above:
  // 0-5 Sarah's migraine episodes (most-recent first: 2/8/14/22/35/50 days ago),
  // 6-7 asthma (5/18 days ago), 8-9 acid reflux (3/11 days ago), 10 neck/shoulder,
  // 11 insomnia, 12 Marcus's lower back pain (4 days ago), 13 Marcus's chest pain (12 days ago),
  // 14-15 Elena's eczema flares (3/16 days ago), 16 Elena's skin rash (27 days ago),
  // 17 Elena's anxiety episode (9 days ago), 18 Elena's fatigue (20 days ago).
  // Every appointment below is dated to fall AFTER the entry it references
  // (smaller "days ago" = more recent), so the visit timeline reads as a
  // real reaction to what was logged rather than an impossible visit that
  // predates the symptom it's supposedly about.
  const migraineSevereEpisodeId = createdEntryIds[5] || null; // 50 days ago
  const migraineFlightEpisodeId = createdEntryIds[3] || null; // 22 days ago
  const asthmaPollenEpisodeId = createdEntryIds[7] || null; // 18 days ago
  const refluxPizzaEpisodeId = createdEntryIds[9] || null; // 11 days ago
  const backPainEntryId = createdEntryIds[12] || null; // 4 days ago
  const chestPainEntryId = createdEntryIds[13] || null; // 12 days ago
  const eczemaHandsEpisodeId = createdEntryIds[15] || null; // 16 days ago

  // One insert per appointment row: with this many rows referencing a mix of
  // shared (user_id, doctor_id) and unique (entry_id, date, notes) values,
  // a single multi-row INSERT with hand-numbered $N placeholders is easy to
  // miscount; a row-per-query keeps each statement's parameters unambiguous.
  const appointmentRows = [
    // Sarah: upcoming follow-up
    [
      user1Id,
      null,
      'Dr. Jennifer Vance, MD',
      doctor1Id || null,
      'Neurology',
      new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      'scheduled',
      '6-month migraine review and preventative treatment adjustment.'
    ],

    // Sarah: earlier completed visits regarding issues already logged in her history
    [
      user1Id,
      null,
      'Dr. Jennifer Vance, MD',
      doctor1Id || null,
      'Neurology',
      daysAgo(95),
      'completed',
      'Initial neurology consult for recurring migraines, predating this symptom diary. Diagnosed migraine without aura; started on Sumatriptan 50mg PRN and advised sleep-hygiene and a trigger diary.'
    ],
    [
      user1Id,
      migraineSevereEpisodeId,
      'Dr. Jennifer Vance, MD',
      doctor1Id || null,
      'Neurology',
      daysAgo(47),
      'completed',
      'Follow-up after a severe aura migraine episode with intense right-sided pain. Discussed rising frequency; preventative therapy options reviewed.'
    ],
    [
      user1Id,
      migraineFlightEpisodeId,
      'Dr. Jennifer Vance, MD',
      doctor1Id || null,
      'Neurology',
      daysAgo(18),
      'completed',
      'Follow-up after a severe unilateral headache with nausea following a late-night flight. Reinforced the sleep-hygiene plan and trigger-diary adherence.'
    ],
    [
      user1Id,
      null,
      'Dr. Robert Sterling, MD',
      doctor2Id || null,
      'Pulmonology',
      daysAgo(85),
      'completed',
      'New asthma diagnosis following recurrent exertional wheezing, predating this symptom diary. Albuterol rescue inhaler prescribed; baseline peak flow 410 L/min.'
    ],
    [
      user1Id,
      asthmaPollenEpisodeId,
      'Dr. Robert Sterling, MD',
      doctor2Id || null,
      'Pulmonology',
      daysAgo(14),
      'completed',
      'Follow-up after mild shortness of breath from heavy pollen exposure outdoors. Inhaler technique re-checked; peak flow normal at 420 L/min, no regimen changes.'
    ],
    [
      user1Id,
      refluxPizzaEpisodeId,
      'Dr. Priya Nair, MD',
      null,
      'Gastroenterology',
      daysAgo(8),
      'completed',
      'Consult for recurrent heartburn and sour burping after late, greasy meals. Prescribed Omeprazole 20mg for a 2-week course and dietary modification.'
    ],
    [
      user1Id,
      null,
      'Dr. Priya Nair, MD',
      null,
      'Gastroenterology',
      daysAgo(3),
      'completed',
      'Follow-up after completing the omeprazole course. Symptoms resolved; advised to continue dietary precautions and return only if symptoms recur.'
    ],

    // Marcus: an older unrelated back episode, the current back injury, and the urgent chest-pain episode
    [
      user2Id,
      null,
      'Dr. Daniel Osei, MD',
      null,
      'Orthopedics',
      daysAgo(180),
      'completed',
      'Orthopedic visit for a similar lower-back strain after a previous lifting injury, predating this symptom diary. Managed conservatively with rest, NSAIDs, and physical therapy; fully resolved within six weeks.'
    ],
    [
      user2Id,
      backPainEntryId,
      'Dr. Daniel Osei, MD',
      null,
      'Orthopedics',
      daysAgo(2),
      'completed',
      'Initial evaluation for acute lower back pain after lifting garden mulch. X-ray showed mild lumbar strain, no fracture. Prescribed physical therapy and a short NSAID course.'
    ],
    [
      user2Id,
      chestPainEntryId,
      'Dr. Angela Rossi, MD',
      null,
      'Cardiology',
      daysAgo(11),
      'completed',
      'Urgent cardiology follow-up after exertional chest pain with shortness of breath while climbing stairs. ECG and troponin normal; exercise stress test ordered to rule out ischemia.'
    ],
    [
      user2Id,
      null,
      'Dr. Angela Rossi, MD',
      null,
      'Cardiology',
      daysAgo(5),
      'completed',
      'Stress test results reviewed: no significant ischemia detected. Likely musculoskeletal/exertional strain. Lisinopril continued for blood pressure control; advised a graded return to exercise.'
    ],

    // Elena: dermatology history with the new demo doctor, Dr. Ferreira
    [
      user3Id,
      null,
      'Dr. Amelia Ferreira, MD',
      doctor3Id || null,
      'Dermatology',
      daysAgo(55),
      'completed',
      'Initial dermatology consult for recurring eczema, predating this symptom diary. Diagnosed atopic dermatitis; prescribed hydrocortisone cream and a fragrance-free emollient routine.'
    ],
    [
      user3Id,
      eczemaHandsEpisodeId,
      'Dr. Amelia Ferreira, MD',
      doctor3Id || null,
      'Dermatology',
      daysAgo(12),
      'completed',
      'Follow-up after a hand flare-up with mild oozing caused by irritant exposure at work. Advised hypoallergenic gloves for dishwashing and continued topical steroid as needed.'
    ],
    [
      user3Id,
      null,
      'Dr. Amelia Ferreira, MD',
      doctor3Id || null,
      'Dermatology',
      new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString(),
      'scheduled',
      'Routine 3-month eczema check-in to review flare frequency and adjust maintenance skincare plan.'
    ]
  ];

  for (const row of appointmentRows) {
    await query(
      `INSERT INTO appointments (user_id, entry_id, doctor_name, doctor_id, specialty, scheduled_at, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      row
    );
  }

  console.log('[SEED] Seeding scheduled reminders...');
  await query(
    `INSERT INTO reminders (user_id, scheduled_time, active, label)
     VALUES
     ($1, '09:00', 1, 'Morning Symptom & Energy Check-in'),
     ($1, '20:30', 1, 'Evening Daily Health Reflection'),
     ($2, '08:00', 1, 'Morning Blood Pressure & Pain Log'),
     ($3, '21:00', 1, 'Evening Skincare & Flare-up Check')`,
    [user1Id, user2Id, user3Id]
  );

  console.log('[SEED] Seeding feedback entries...');
  const firstEntryId = createdEntryIds[0] || 1;
  const secondEntryId = createdEntryIds[1] || 2;
  const eczemaEntryId = createdEntryIds[14] || firstEntryId;
  await query(
    `INSERT INTO feedback (entry_id, user_id, was_helpful, comment)
     VALUES
     ($1, $2, 1, 'Very helpful reminder to take the triptan in the dark room early.'),
     ($3, $2, 1, 'Accurately flagged that this was my 3rd episode this month.'),
     ($4, $5, 1, 'Good reminder to switch to lukewarm showers, really helped the itching.')`,
    [firstEntryId, user1Id, secondEntryId, eczemaEntryId, user3Id]
  );

  console.log('[SEED] Seeding sample Caregiver share token...');
  const shareExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await query(
    `INSERT INTO caregiver_shares (user_id, token, expires_at)
     VALUES ($1, 'demo-caregiver-share-sarah-2026', $2)`,
    [user1Id, shareExpiry]
  );

  console.log('----------------------------------------------------');
  console.log('[SEED COMPLETE] SymptomLog database successfully seeded!');
  console.log('Demo Login: demo@symptomlog.com / password123');
  console.log('Other demo patients: marcus@example.com / elena@example.com (password123)');
  console.log('Physician Portal Demo Login: jennifer.vance@symptomlog.com / doctor123');
  console.log('New Demo Doctor Login: amelia.ferreira@symptomlog.com / doctor123');
  console.log('Caregiver Demo Token: demo-caregiver-share-sarah-2026');
  console.log('----------------------------------------------------');
}

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[SEED FAILED]:', err);
      process.exit(1);
    });
}

module.exports = { seedDatabase };
