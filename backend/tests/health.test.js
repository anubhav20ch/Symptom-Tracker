// Minimal Phase 0 smoke coverage for the infrastructure this phase added:
// the liveness endpoint and the error envelope. The real integration/unit
// test suite (TEST-1 .. TEST-7) is Phase 6 work — this file deliberately
// stays narrow so it doesn't pretend to cover more than it does.
const request = require('supertest');
const app = require('../src/index');

describe('GET /api/health', () => {
  it('always returns 200 with a status field (liveness, no dependency checks)', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });
});

describe('API error envelope (API-1)', () => {
  it('returns { error: { code, message } } for an unknown route', async () => {
    const res = await request(app).get('/api/this-route-does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error.code', 'NOT_FOUND');
    expect(res.body).toHaveProperty('error.message');
  });

  it('returns a structured validation error with field-level details', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: '', email: 'not-an-email', password: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(res.body.error.details)).toBe(true);
    expect(res.body.error.details.length).toBeGreaterThan(0);
  });
});
