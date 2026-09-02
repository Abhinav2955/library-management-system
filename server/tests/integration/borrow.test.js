const request = require('supertest');
const app = require('../../src/app');
const { sequelize } = require('../../src/config/db');


let adminToken;
let member1Token;
let member2Token;
let bookId;
let borrowRecordId;

const admin = { name: 'Admin2', email: `admin2.${Date.now()}@example.com`, password: 'StrongPass1' };
const member1 = { name: 'Member1', email: `m1.${Date.now()}@example.com`, password: 'StrongPass1' };
const member2 = { name: 'Member2', email: `m2.${Date.now()}@example.com`, password: 'StrongPass1' };

const registerAndLogin = async (creds) => {
  await request(app).post('/api/v1/auth/register').send(creds);
  const res = await request(app).post('/api/v1/auth/login').send(creds);
  return res.body.data.accessToken;
};

beforeAll(async () => {
  await sequelize.sync({ force: true });

  member1Token = await registerAndLogin(member1);
  member2Token = await registerAndLogin(member2);
  adminToken = await registerAndLogin(admin);

  const { User } = require('../../src/database/models');
  await User.update({ role: 'admin' }, { where: { email: admin.email } });
  adminToken = await registerAndLogin(admin);

  const bookRes = await request(app)
    .post('/api/v1/books')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ isbn: '9781111111111', title: 'Designing Data-Intensive Applications', totalCopies: 0 });
  bookId = bookRes.body.data.id;

  await request(app)
    .post('/api/v1/borrow/copies')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ bookId, quantity: 1 });
});

// Deliberately no afterAll close here — sequelize/redis/the email queue
// are shared across all six test files under --runInBand (empirically
// confirmed: closing them in one file's afterAll broke a LATER file's
// beforeAll with 'ConnectionManager...called after closed'). The whole
// process force-exits after the full suite via --forceExit in package.json
// instead, which is the standard, accepted fix for this exact situation.

describe('Borrow module', () => {
  it('checks out the only available copy to member1', async () => {
    const res = await request(app)
      .post('/api/v1/borrow/checkout')
      .set('Authorization', `Bearer ${member1Token}`)
      .send({ bookId });
    expect(res.statusCode).toBe(201);
    expect(res.body.data.status).toBe('active');
    borrowRecordId = res.body.data.id;
  });

  it('rejects a second concurrent checkout of the same (now unavailable) book', async () => {
    const res = await request(app)
      .post('/api/v1/borrow/checkout')
      .set('Authorization', `Bearer ${member2Token}`)
      .send({ bookId });
    expect(res.statusCode).toBe(409);
    expect(res.body.message).toMatch(/no available copies/i);
  });

  it('prevents the same member from double-borrowing the same book', async () => {
    const res = await request(app)
      .post('/api/v1/borrow/checkout')
      .set('Authorization', `Bearer ${member1Token}`)
      .send({ bookId });
    expect(res.statusCode).toBe(409);
  });

  it('lets the member view their own loans', async () => {
    const res = await request(app)
      .get('/api/v1/borrow/me')
      .set('Authorization', `Bearer ${member1Token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.records.length).toBe(1);
  });

  it('allows the member to renew their loan', async () => {
    const res = await request(app)
      .post(`/api/v1/borrow/${borrowRecordId}/renew`)
      .set('Authorization', `Bearer ${member1Token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.renewedCount).toBe(1);
  });

  it('prevents a different member from renewing someone else\'s loan', async () => {
    const res = await request(app)
      .post(`/api/v1/borrow/${borrowRecordId}/renew`)
      .set('Authorization', `Bearer ${member2Token}`);
    expect(res.statusCode).toBe(403);
  });

  it('lets staff mark the book returned, freeing the copy', async () => {
    const res = await request(app)
      .post(`/api/v1/borrow/${borrowRecordId}/return`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('returned');
  });

  it('lets member2 check out the now-available copy', async () => {
    const res = await request(app)
      .post('/api/v1/borrow/checkout')
      .set('Authorization', `Bearer ${member2Token}`)
      .send({ bookId });
    expect(res.statusCode).toBe(201);
  });
});