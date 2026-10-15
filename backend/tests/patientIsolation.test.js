// TEST-2 & TEST-3: Patient Isolation and Doctor Least-Privilege Integration Tests
const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../src/index');
const db = require('../src/config/db');

describe('TEST-2: Multi-Tenant Patient Data Isolation', () => {
  let patient1Token;
  let patient2Token;
  let patient1EntryId;
  let patient1MedId;

  beforeAll(async () => {
    const p1Email = `patient1-${Date.now()}@test.iso`;
    const p2Email = `patient2-${Date.now()}@test.iso`;

    // Register Patient 1
    const p1Res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Patient One',
        email: p1Email,
        password: 'ValidPassword123!',
        accept_terms: true
      });
    expect(p1Res.status).toBe(201);
    patient1Token = p1Res.body.token;

    // Register Patient 2
    const p2Res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Patient Two',
        email: p2Email,
        password: 'ValidPassword123!',
        accept_terms: true
      });
    expect(p2Res.status).toBe(201);
    patient2Token = p2Res.body.token;

    // Patient 1 creates a symptom entry
    const entryRes = await request(app)
      .post('/api/entries')
      .set('Authorization', `Bearer ${patient1Token}`)
      .send({
        symptom_name: 'Migraine Headache',
        severity: 7,
        notes: 'Confidential patient 1 health note',
        body_region_code: 'head_front',
        started_at: new Date().toISOString()
      });
    expect(entryRes.status).toBe(201);
    patient1EntryId = entryRes.body.entry.id;

    // Patient 1 creates a medication
    const medRes = await request(app)
      .post('/api/medications')
      .set('Authorization', `Bearer ${patient1Token}`)
      .send({
        name: 'Sumatriptan',
        dosage: '50mg',
        frequency: 'As needed',
        start_date: '2026-10-15'
      });
    expect(medRes.status).toBe(201);
    patient1MedId = medRes.body.medication.id;
  });

  it('prohibits Patient 2 from reading Patient 1 symptom entry', async () => {
    const res = await request(app)
      .get(`/api/entries/${patient1EntryId}`)
      .set('Authorization', `Bearer ${patient2Token}`);
    expect([403, 404]).toContain(res.status);
    expect(res.body.entry).toBeUndefined();
  });

  it('prohibits Patient 2 from modifying Patient 1 symptom entry', async () => {
    const res = await request(app)
      .put(`/api/entries/${patient1EntryId}`)
      .set('Authorization', `Bearer ${patient2Token}`)
      .send({
        severity: 2,
        notes: 'Malicious modification attempt'
      });
    expect([403, 404]).toContain(res.status);

    // Verify Patient 1 entry was NOT modified
    const checkRes = await request(app)
      .get(`/api/entries/${patient1EntryId}`)
      .set('Authorization', `Bearer ${patient1Token}`);
    expect(checkRes.status).toBe(200);
    expect(checkRes.body.entry.severity).toBe(7);
  });

  it('prohibits Patient 2 from deleting Patient 1 symptom entry', async () => {
    const res = await request(app)
      .delete(`/api/entries/${patient1EntryId}`)
      .set('Authorization', `Bearer ${patient2Token}`);
    expect([403, 404]).toContain(res.status);

    // Verify still exists for Patient 1
    const checkRes = await request(app)
      .get(`/api/entries/${patient1EntryId}`)
      .set('Authorization', `Bearer ${patient1Token}`);
    expect(checkRes.status).toBe(200);
  });

  it('prohibits Patient 2 from linking a follow-up entry to Patient 1 entry', async () => {
    const res = await request(app)
      .post('/api/entries')
      .set('Authorization', `Bearer ${patient2Token}`)
      .send({
        symptom_name: 'Secondary Headache',
        severity: 5,
        body_region_code: 'head_front',
        started_at: new Date().toISOString(),
        follow_up_to_entry_id: patient1EntryId
      });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('INVALID_FOLLOW_UP_ENTRY');
  });

  it('prohibits Patient 2 from querying Patient 1 medication', async () => {
    const res = await request(app)
      .get(`/api/medications/${patient1MedId}`)
      .set('Authorization', `Bearer ${patient2Token}`);
    expect([403, 404]).toContain(res.status);
  });

  it('prohibits Patient 2 from modifying Patient 1 medication', async () => {
    const res = await request(app)
      .put(`/api/medications/${patient1MedId}`)
      .set('Authorization', `Bearer ${patient2Token}`)
      .send({
        name: 'Tampered Med',
        dosage: '1000mg'
      });
    expect([403, 404]).toContain(res.status);
  });
});

describe('TEST-3: Physician Least-Privilege & Lookback Access Control', () => {
  let patientToken;
  let patientId;
  let linkedDoctorToken;
  let linkedDoctorId;
  let unlinkedDoctorToken;
  let unlinkedDoctorId;
  let appointmentId;

  beforeAll(async () => {
    const patEmail = `leastpriv-pat-${Date.now()}@test.iso`;
    const doc1Email = `doctor1-${Date.now()}@test.iso`;
    const doc2Email = `doctor2-${Date.now()}@test.iso`;

    // Create Patient
    const pRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Isolation Patient',
        email: patEmail,
        password: 'ValidPassword123!',
        accept_terms: true
      });
    patientToken = pRes.body.token;
    patientId = pRes.body.user.id;

    // Create Doctor 1 directly
    const passwordHash = await bcrypt.hash('doctor123!', 10);
    const doc1 = await db.query(`
      INSERT INTO doctors (name, email, password_hash, specialty, npi_number)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, ['Dr. Linked One', doc1Email, passwordHash, 'Neurology', `NPI-${Date.now()}`]);
    linkedDoctorId = Number(doc1.rows[0].id);

    // Create Doctor 2
    const doc2 = await db.query(`
      INSERT INTO doctors (name, email, password_hash, specialty, npi_number)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, ['Dr. Unlinked Two', doc2Email, passwordHash, 'Cardiology', `NPI-${Date.now() + 1}`]);
    unlinkedDoctorId = Number(doc2.rows[0].id);

    // Login Doctor 1
    const d1Login = await request(app)
      .post('/api/doctor/login')
      .send({ email: doc1Email, password: 'doctor123!' });
    linkedDoctorToken = d1Login.body.token;

    // Login Doctor 2
    const d2Login = await request(app)
      .post('/api/doctor/login')
      .send({ email: doc2Email, password: 'doctor123!' });
    unlinkedDoctorToken = d2Login.body.token;

    // Book appointment between Patient and Doctor 1
    const futureDate = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const apptRes = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        doctor_id: linkedDoctorId,
        scheduled_at: futureDate,
        reason: 'Neurological evaluation'
      });
    expect(apptRes.status).toBe(201);
    appointmentId = apptRes.body.appointment.id;
  });

  it('allows linked physician to view the scheduled appointment', async () => {
    const res = await request(app)
      .get('/api/doctor/appointments')
      .set('Authorization', `Bearer ${linkedDoctorToken}`);
    expect(res.status).toBe(200);
    const hasAppt = res.body.appointments.some((a) => a.id === appointmentId);
    expect(hasAppt).toBe(true);
  });

  it('denies unlinked physician from viewing the patient appointment', async () => {
    const res = await request(app)
      .get('/api/doctor/appointments')
      .set('Authorization', `Bearer ${unlinkedDoctorToken}`);
    expect(res.status).toBe(200);
    const hasAppt = res.body.appointments.some((a) => a.id === appointmentId);
    expect(hasAppt).toBe(false);
  });

  it('denies unlinked physician from prescribing to patient with no appointment link', async () => {
    const res = await request(app)
      .post('/api/doctor/prescribe')
      .set('Authorization', `Bearer ${unlinkedDoctorToken}`)
      .send({
        patient_id: patientId,
        appointment_id: appointmentId,
        name: 'Restricted Medication',
        dosage: '10mg',
        frequency: 'Daily'
      });
    expect([403, 404]).toContain(res.status);
  });

  it('enforces 180-day lookback window: excludes patient relationships with only lapsed appointments', async () => {
    // Insert an expired appointment from 300 days ago for an unrelated patient
    const lapsedEmail = `lapsed-pat-${Date.now()}@test.iso`;
    const lapsedRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Lapsed Patient',
        email: lapsedEmail,
        password: 'ValidPassword123!',
        accept_terms: true
      });
    const lapsedPatientId = lapsedRes.body.user.id;

    const pastDate = new Date(Date.now() - 300 * 24 * 3600 * 1000).toISOString();
    await db.query(`
      INSERT INTO appointments (user_id, doctor_id, scheduled_at, status, notes)
      VALUES ($1, $2, $3, 'completed', 'Lapsed visit')
    `, [lapsedPatientId, linkedDoctorId, pastDate]);

    // Doctor checks appointment list
    const res = await request(app)
      .get('/api/doctor/appointments')
      .set('Authorization', `Bearer ${linkedDoctorToken}`);
    expect(res.status).toBe(200);

    // The lapsed appointment (300 days ago) should NOT appear under DOC-12 180-day lookback
    const hasLapsed = res.body.appointments.some((a) => a.user_id === lapsedPatientId);
    expect(hasLapsed).toBe(false);
  });
});
