const request = require('supertest');
const app = require('../../src/app');
const { sequelize } = require('../../src/config/db');

const testUser = {
  name: 'Test User',
  email: `test.${Date.now()}@example.com`,
  password: 'StrongPass1',
};

beforeAll(async () => {
  await sequelize.sync({ force: true }); // wipe & rebuild schema on the test DB
});

afterAll(async () => {
  await sequelize.close();
});

describe('Auth flow', () => {
  it('registers a new user', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(testUser);
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(testUser.email);
    expect(res.body.data.passwordHash).toBeUndefined(); // never leak the hash
  });

  it('rejects duplicate registration', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(testUser);
    expect(res.statusCode).toBe(409);
  });

  it('rejects login with wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testUser.email, password: 'WrongPass1' });
    expect(res.statusCode).toBe(401);
  });

  it('logs in with correct credentials and sets a refresh cookie', async () => {
    const res = await request(app).post('/api/v1/auth/login').send(testUser);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.headers['set-cookie'][0]).toMatch(/lms_refresh_token/);
  });

  it('rejects protected route without a token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.statusCode).toBe(401);
  });

  it('returns the current user with a valid access token', async () => {
    const loginRes = await request(app).post('/api/v1/auth/login').send(testUser);
    const { accessToken } = loginRes.body.data;

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.email).toBe(testUser.email);
  });
});
