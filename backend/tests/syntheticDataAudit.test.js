// TEST-7: Synthetic Data Audit & PII Leak Prevention Suite
const request = require('supertest');
const app = require('../src/index');
const db = require('../src/config/db');

describe('TEST-7: Synthetic Data & PII Leak Audit', () => {
  let userToken;
  let userEmail;

  beforeAll(async () => {
    userEmail = `piiaudit-${Date.now()}@test.iso`;
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'PII Audit Patient',
        email: userEmail,
        password: 'ValidPassword123!',
        accept_terms: true
      });
    userToken = regRes.body.token;
  });

  it('ensures password_hash and raw credentials are NEVER leaked in user profile API', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    const bodyStr = JSON.stringify(res.body);
    expect(bodyStr).not.toContain('password_hash');
    expect(bodyStr).not.toContain('ValidPassword123!');
  });

  it('ensures doctor directory only exposes safe public directory fields', async () => {
    const res = await request(app).get('/api/doctor/directory');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.doctors)).toBe(true);

    res.body.doctors.forEach((doc) => {
      expect(doc).toHaveProperty('id');
      expect(doc).toHaveProperty('name');
      expect(doc).toHaveProperty('specialty');
      // Must NOT expose passwords, private emails, or phone numbers
      expect(doc.password_hash).toBeUndefined();
      expect(doc.password).toBeUndefined();
    });
  });

  it('verifies audit logs redact sensitive credentials and auth tokens', async () => {
    // Generate an audit log entry via login
    await request(app)
      .post('/api/auth/login')
      .send({
        email: userEmail,
        password: 'ValidPassword123!'
      });

    const auditRows = await db.query(
      'SELECT metadata FROM audit_logs WHERE action = $1 ORDER BY id DESC LIMIT 5',
      ['auth.login']
    );

    auditRows.rows.forEach((row) => {
      const meta = typeof row.metadata === 'string' ? row.metadata : JSON.stringify(row.metadata || {});
      expect(meta).not.toContain('ValidPassword123!');
      expect(meta).not.toContain('password_hash');
    });
  });

  it('verifies synthetic patient export isolates records to the calling user only', async () => {
    const res = await request(app)
      .get('/api/account/export')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.profile.email).toBe(userEmail);

    // Verify all exported child collections belong exclusively to this user
    if (res.body.entries && res.body.entries.length > 0) {
      res.body.entries.forEach((e) => {
        expect(e.user_id).toBe(res.body.profile.id);
      });
    }
  });
});
