const request = require('supertest');
const app = require('../src/index');

describe('Phase 4: PRIV-1 Consent and Account Privacy', () => {
  it('PRIV-1: rejects registration when accept_terms is missing or false', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Privacy Test',
        email: `noterms-${Date.now()}@example.com`,
        password: 'ValidPass123'
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.some((d) => d.field === 'accept_terms')).toBe(true);
  });

  it('PRIV-1, PRIV-2, PRIV-3, PRIV-4: register with consent, export data, request deletion, and view access log', async () => {
    const email = `privtest-${Date.now()}@example.com`;
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Privacy Full Test',
        email,
        password: 'ValidPass123',
        accept_terms: true
      });
    expect(regRes.status).toBe(201);
    const token = regRes.body.token;

    // PRIV-2: Machine-readable data export
    const exportRes = await request(app)
      .get('/api/account/export')
      .set('Authorization', `Bearer ${token}`);
    expect(exportRes.status).toBe(200);
    expect(exportRes.body.profile).toBeDefined();
    expect(exportRes.body.profile.email).toBe(email);
    expect(exportRes.body.consents).toBeDefined();
    expect(exportRes.body.consents.length).toBeGreaterThan(0);
    expect(exportRes.body.symptom_entries).toEqual([]);

    // PRIV-4: Access log for patient
    const accessRes = await request(app)
      .get('/api/account/access-log')
      .set('Authorization', `Bearer ${token}`);
    expect(accessRes.status).toBe(200);
    expect(accessRes.body.access_log).toBeDefined();

    // PRIV-3: Request deletion
    const delReqRes = await request(app)
      .post('/api/account/deletion-request')
      .set('Authorization', `Bearer ${token}`);
    expect(delReqRes.status).toBe(201);
    expect(delReqRes.body.deletion_request.status).toBe('pending');

    // Query deletion status
    const statusRes = await request(app)
      .get('/api/account/deletion-request')
      .set('Authorization', `Bearer ${token}`);
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.deletion_request.status).toBe('pending');

    // Cancel deletion request
    const cancelRes = await request(app)
      .delete('/api/account/deletion-request')
      .set('Authorization', `Bearer ${token}`);
    expect(cancelRes.status).toBe(200);
  });
});
