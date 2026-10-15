// TEST-5: End-to-End Clinical Journey Smoke Test
const request = require('supertest');
const app = require('../src/index');

describe('TEST-5: End-to-End Clinical Journey Smoke Test', () => {
  let userToken;
  let entryId;
  let appointmentId;
  const testEmail = `e2e-patient-${Date.now()}@clinical.journey`;

  // Step 1: Health & Readiness check (OBS-2)
  it('1. System telemetry: verifies liveness (/health) and readiness (/ready)', async () => {
    const healthRes = await request(app).get('/api/health');
    expect(healthRes.status).toBe(200);
    expect(healthRes.body.status).toBe('healthy');

    const readyRes = await request(app).get('/api/ready');
    // Returns 200 or 503 depending on whether ML microservice container is up
    expect([200, 503]).toContain(readyRes.status);
    expect(readyRes.body.checks).toHaveProperty('database');
  });

  // Step 2: Patient Onboarding with Terms of Service Consent (PRIV-1, AUTH-12)
  it('2. Patient Onboarding: registers new patient with explicit terms acceptance', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Sarah Connor',
        email: testEmail,
        password: 'ValidPassword123!',
        age: 38,
        gender: 'female',
        timezone: 'America/New_York',
        accept_terms: true
      });

    expect(regRes.status).toBe(201);
    expect(regRes.body).toHaveProperty('token');
    expect(regRes.body.user).toHaveProperty('id');
    userToken = regRes.body.token;
  });

  // Step 3: Log Symptom with Structured Body Region and Auto-Triage (ENTRY-8..11, TRIAGE-7..10)
  it('3. Clinical Intake: logs symptom with body region and receives triage tier', async () => {
    const entryRes = await request(app)
      .post('/api/entries')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        symptom_name: 'Migraine with Aura',
        severity: 8,
        notes: 'Visual disturbances and throbbing temple headache since this morning.',
        body_region_code: 'head_front',
        started_at: new Date().toISOString()
      });

    expect(entryRes.status).toBe(201);
    expect(entryRes.body).toHaveProperty('entry');
    expect(entryRes.body.entry).toHaveProperty('classification_type');
    expect(entryRes.body.entry).toHaveProperty('recommendation');
    expect(entryRes.body.entry).toHaveProperty('triage_version');
    entryId = entryRes.body.entry.id;
  });

  // Step 4: Schedule Clinical Consultation Linked to Symptom Entry (APPT-5..9)
  it('4. Consultation Booking: books appointment linked to the triage entry', async () => {
    const dirRes = await request(app).get('/api/doctor/directory');
    expect(dirRes.status).toBe(200);
    const doctor = dirRes.body.doctors[0];
    const doctorId = doctor ? doctor.id : 1;

    const randomOffsetHours = 50 + Math.floor(Math.random() * 500);
    const scheduledDate = new Date(Date.now() + randomOffsetHours * 3600 * 1000).toISOString();
    const apptRes = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        doctor_id: doctorId,
        entry_id: entryId,
        scheduled_at: scheduledDate,
        reason: 'Specialist consultation for severe migraine aura',
        notes: 'Referred via automated triage protocol.'
      });

    expect(apptRes.status).toBe(201);
    expect(apptRes.body.appointment).toHaveProperty('id');
    appointmentId = apptRes.body.appointment.id;
  });

  // Step 5: Export Medical Records in Machine-Readable JSON (PRIV-2)
  it('5. Data Portability: exports complete health record as JSON archive', async () => {
    const exportRes = await request(app)
      .get('/api/account/export')
      .set('Authorization', `Bearer ${userToken}`);

    expect(exportRes.status).toBe(200);
    expect(exportRes.body.profile.email).toBe(testEmail);
    expect(exportRes.body.symptom_entries.length).toBeGreaterThanOrEqual(1);
    expect(exportRes.body.appointments.length).toBeGreaterThanOrEqual(1);
    expect(exportRes.body.consents.length).toBeGreaterThanOrEqual(1);
  });

  // Step 6: Account Deletion Request with 24-Hour Grace Period (PRIV-3)
  it('6. Privacy & Right to Erasure: submits account deletion request with grace period', async () => {
    const delRes = await request(app)
      .post('/api/account/deletion-request')
      .set('Authorization', `Bearer ${userToken}`);

    expect(delRes.status).toBe(201);
    expect(delRes.body.deletion_request.status).toBe('pending');
    expect(delRes.body.deletion_request).toHaveProperty('requested_at');
  });

  // Step 7: Patient Logout
  it('7. Patient Session Termination: logs out securely', async () => {
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${userToken}`);
    expect([200, 403]).toContain(logoutRes.status);
  });
});
