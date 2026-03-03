const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../src/app');
const env = require('../src/config/env');
const { setupDatabase, teardownDatabase, clearDatabase, seedUser } = require('./helpers');
const { User } = require('../src/modules/auth/auth.model');

describe('Auth module', () => {
  beforeAll(setupDatabase);
  afterAll(teardownDatabase);
  beforeEach(clearDatabase);

  test('login returns tokens and hides password', async () => {
    const { rawPassword } = await seedUser({ role: 'SUPER_ADMIN' });

    const loginRes = await request(app).post('/api/auth/login').send({
      companyId: 'company-test',
      email: 'admin@example.com',
      password: rawPassword,
    });

    expect(loginRes.statusCode).toBe(200);
    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body.data.accessToken).toBeTruthy();
    expect(loginRes.body.data.refreshToken).toBeTruthy();
    expect(loginRes.body.data.user.password).toBeUndefined();

    const decoded = jwt.verify(loginRes.body.data.accessToken, env.jwtAccessSecret);
    expect(decoded.userId).toBeTruthy();
  });

  test('SUPER_ADMIN can register HR_ADMIN', async () => {
    const { rawPassword } = await seedUser({ role: 'SUPER_ADMIN' });

    const loginRes = await request(app).post('/api/auth/login').send({
      companyId: 'company-test',
      email: 'admin@example.com',
      password: rawPassword,
    });

    const registerRes = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${loginRes.body.data.accessToken}`)
      .send({
        companyId: 'company-test',
        email: 'hr@example.com',
        password: 'Password123!',
        role: 'HR_ADMIN',
      });

    expect(registerRes.statusCode).toBe(201);
    expect(registerRes.body.data.email).toBe('hr@example.com');
  });

  test('HR_ADMIN cannot register SUPER_ADMIN', async () => {
    const { rawPassword } = await seedUser({ role: 'HR_ADMIN' });

    const loginRes = await request(app).post('/api/auth/login').send({
      companyId: 'company-test',
      email: 'admin@example.com',
      password: rawPassword,
    });

    const registerRes = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${loginRes.body.data.accessToken}`)
      .send({
        companyId: 'company-test',
        email: 'sadmin@example.com',
        password: 'Password123!',
        role: 'SUPER_ADMIN',
      });

    expect(registerRes.statusCode).toBe(403);
  });

  test('refresh issues new tokens and logout clears refresh token', async () => {
    const { user, rawPassword } = await seedUser({ role: 'SUPER_ADMIN' });

    const loginRes = await request(app).post('/api/auth/login').send({
      companyId: 'company-test',
      email: 'admin@example.com',
      password: rawPassword,
    });

    const refreshRes = await request(app).post('/api/auth/refresh').send({
      refreshToken: loginRes.body.data.refreshToken,
    });

    expect(refreshRes.statusCode).toBe(200);
    expect(refreshRes.body.data.accessToken).toBeTruthy();

    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${loginRes.body.data.accessToken}`)
      .send({});

    expect(logoutRes.statusCode).toBe(200);

    const stored = await User.findById(user._id).select('+refreshToken').lean();
    expect(stored.refreshToken).toBeUndefined();
  });

  test('/me requires auth', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
  });
});
