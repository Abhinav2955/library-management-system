const request = require('supertest');
const app = require('../../src/app');
const { sequelize } = require('../../src/config/db');


let adminToken;
let m1Token, m2Token, m3Token;
let bookId;

const admin = { name: 'AdminR', email: `adminr.${Date.now()}@example.com`, password: 'StrongPass1' };
const m1 = { name: 'R1', email: `r1.${Date.now()}@example.com`, password: 'StrongPass1' };
const m2 = { name: 'R2', email: `r2.${Date.now()}@example.com`, password: 'StrongPass1' };
const m3 = { name: 'R3', email: `r3.${Date.now()}@example.com`, password: 'StrongPass1' };

const registerAndLogin = async (creds) => {
  await request(app).post('/api/v1/auth/register').send(creds);
  const res = await request(app).post('/api/v1/auth/login').send(creds);
  return res.body.data.accessToken;
};

beforeAll(async () => {
  await sequelize.sync({ force: true });

  m1Token = await registerAndLogin(m1);
  m2Token = await registerAndLogin(m2);
  m3Token = await registerAndLogin(m3);
  await registerAndLogin(admin);

  const { User } = require('../../src/database/models');
  await User.update({ role: 'admin' }, { where: { email: admin.email } });
  adminToken = await registerAndLogin(admin);

  const bookRes = await request(app)
    .post('/api/v1/books')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ isbn: '9782222222222', title: 'The Pragmatic Programmer', totalCopies: 0 });
  bookId = bookRes.body.data.id;

  await request(app)
    .post('/api/v1/borrow/copies')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ bookId, quantity: 1 });

  await request(app)
    .post('/api/v1/borrow/checkout')
    .set('Authorization', `Bearer ${m1Token}`)
    .send({ bookId });
});

// Deliberately no afterAll close here — sequelize/redis/the email queue
// are shared across all six test files under --runInBand (empirically
// confirmed: closing them in one file's afterAll broke a LATER file's
// beforeAll with 'ConnectionManager...called after closed'). The whole
// process force-exits after the full suite via --forceExit in package.json
// instead, which is the standard, accepted fix for this exact situation.

describe('Reservation queue', () => {
  it('lets m2 reserve the unavailable book, at position 1', async () => {
    const res = await request(app)
      .post('/api/v1/reservations')
      .set('Authorization', `Bearer ${m2Token}`)
      .send({ bookId });
    expect(res.statusCode).toBe(201);
    expect(res.body.data.status).toBe('waiting');
  });

  it('lets m3 reserve behind m2, at position 2', async () => {
    const res = await request(app)
      .post('/api/v1/reservations')
      .set('Authorization', `Bearer ${m3Token}`)
      .send({ bookId });
    expect(res.statusCode).toBe(201);

    const listRes = await request(app)
      .get('/api/v1/reservations/me')
      .set('Authorization', `Bearer ${m3Token}`);
    expect(listRes.body.data.reservations[0].queuePosition).toBe(2);
  });

  it('rejects a duplicate reservation from the same member', async () => {
    const res = await request(app)
      .post('/api/v1/reservations')
      .set('Authorization', `Bearer ${m2Token}`)
      .send({ bookId });
    expect(res.statusCode).toBe(409);
  });

  it('blocks m1 from renewing while a queue exists', async () => {
    const loans = await request(app)
      .get('/api/v1/borrow/me')
      .set('Authorization', `Bearer ${m1Token}`);
    const recordId = loans.body.data.records[0].id;

    const res = await request(app)
      .post(`/api/v1/borrow/${recordId}/renew`)
      .set('Authorization', `Bearer ${m1Token}`);
    expect(res.statusCode).toBe(400);
  });

  it('cascades the returned copy to m2 (first in line), not straight to available', async () => {
    const loans = await request(app)
      .get('/api/v1/borrow/me')
      .set('Authorization', `Bearer ${m1Token}`);
    const recordId = loans.body.data.records[0].id;

    await request(app)
      .post(`/api/v1/borrow/${recordId}/return`)
      .set('Authorization', `Bearer ${adminToken}`);

    const m3Attempt = await request(app)
      .post('/api/v1/borrow/checkout')
      .set('Authorization', `Bearer ${m3Token}`)
      .send({ bookId });
    expect(m3Attempt.statusCode).toBe(409);

    const m2List = await request(app)
      .get('/api/v1/reservations/me')
      .set('Authorization', `Bearer ${m2Token}`);
    expect(m2List.body.data.reservations[0].status).toBe('ready');
  });

  it('lets m2 check out their held copy directly', async () => {
    const res = await request(app)
      .post('/api/v1/borrow/checkout')
      .set('Authorization', `Bearer ${m2Token}`)
      .send({ bookId });
    expect(res.statusCode).toBe(201);
  });

  it('lets m3 cancel their reservation', async () => {
    const list = await request(app)
      .get('/api/v1/reservations/me')
      .set('Authorization', `Bearer ${m3Token}`);
    const reservationId = list.body.data.reservations[0].id;

    const res = await request(app)
      .post(`/api/v1/reservations/${reservationId}/cancel`)
      .set('Authorization', `Bearer ${m3Token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('cancelled');
  });
});