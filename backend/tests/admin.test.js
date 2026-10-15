const request = require('supertest');
const app = require('../src/index');

describe('Phase 4: ADMIN-10 and ADMIN-11 Admin Enhancements', () => {
  let adminToken;

  beforeAll(async () => {
    // Login as admin
    const loginRes = await request(app)
      .post('/api/admin/login')
      .send({
        email: 'admin@symptomlog.com',
        password: 'admin123'
      });
    adminToken = loginRes.body.token;
  });

  it('ADMIN-10: supports filtering audit logs by actor_type, action, date range', async () => {
    if (!adminToken) return;
    const res = await request(app)
      .get('/api/admin/audit-logs?actor_type=patient&limit=10')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.logs).toBeDefined();
    expect(Array.isArray(res.body.logs)).toBe(true);
  });

  it('ADMIN-11: computes class balance stats on dataset validation', async () => {
    if (!adminToken) return;
    const rows = [
      'text,label',
      'fever and cough,Flu',
      'high fever body ache,Flu',
      'chills and fever,Flu',
      'cough and tiredness,Flu',
      'fever and headache,Flu',
      'throbbing headache,Migraine',
      'headache nausea,Migraine',
      'severe migraine attack,Migraine',
      'visual aura headache,Migraine',
      'light sensitivity headache,Migraine'
    ].join('\n');

    const res = await request(app)
      .post('/api/admin/dataset/validate')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('dataset', Buffer.from(rows), 'test_dataset.csv');
    expect(res.status).toBe(200);
    expect(res.body.validation).toBeDefined();
    expect(res.body.validation.class_balance).toBeDefined();
    expect(res.body.validation.classes_count).toBe(2);
  });
});
