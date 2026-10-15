// Narrow regression coverage for Phase 1 security behavior verified
// manually during implementation (see docs/DECISIONS.md). The full
// integration suite (TEST-1 .. TEST-7) is Phase 6 work.
const request = require('supertest');
const app = require('../src/index');

describe('AUTH-12 password policy', () => {
  it('rejects a password shorter than 10 characters', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', email: 'policytest1@example.com', password: 'short1', accept_terms: true });
    expect(res.status).toBe(400);
    expect(res.body.error.details.some((d) => d.field === 'password')).toBe(true);
  });

  it('rejects a password with no digit', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', email: 'policytest2@example.com', password: 'onlyletters', accept_terms: true });
    expect(res.status).toBe(400);
  });

  it('accepts a password meeting the policy', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', email: `policytest3-${Date.now()}@example.com`, password: 'ValidPass123', accept_terms: true });
    expect(res.status).toBe(201);
  });
});

describe('SEC-13 CSRF on cookie-authenticated endpoints', () => {
  it('rejects /api/auth/refresh with no CSRF header even with a valid-shaped cookie', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', ['symptomlog_refresh_token=whatever']);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_REQUIRED');
  });

  it('rejects /api/auth/logout with no CSRF header', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_REQUIRED');
  });
});

describe('SEC-16 no static file serving', () => {
  it('returns 404, not a file, for the old public /uploads path', async () => {
    const res = await request(app).get('/uploads/anything.png');
    expect(res.status).toBe(404);
  });
});

describe('AUTH-18 time zone validation', () => {
  const { isValidTimeZone } = require('../src/middleware/validate');

  it('accepts a legacy IANA alias not in the canonical enumeration (Asia/Kolkata)', () => {
    expect(isValidTimeZone('Asia/Kolkata')).toBe(true);
  });

  it('rejects a nonsense value', () => {
    expect(isValidTimeZone('Not/A_Zone')).toBe(false);
  });
});
