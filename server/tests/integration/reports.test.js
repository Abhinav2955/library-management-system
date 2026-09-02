const request = require('supertest');
const app = require('../../src/app');
const { sequelize } = require('../../src/config/db');


let adminToken, memberToken;
let bookId;

const admin = { name: 'AdminRep', email: `adminrep.${Date.now()}@example.com`, password: 'StrongPass1' };
const member = { name: 'MemberRep', email: `memrep.${Date.now()}@example.com`, password: 'StrongPass1' };

const registerAndLogin = async (creds) => {
  await request(app).post('/api/v1/auth/register').send(creds);
  const res = await request(app).post('/api/v1/auth/login').send(creds);
  return res.body.data.accessToken;
};

beforeAll(async () => {
  await sequelize.sync({ force: true });

  memberToken = await registerAndLogin(member);
  await registerAndLogin(admin);
  const { User } = require('../../src/database/models');
  await User.update({ role: 'admin' }, { where: { email: admin.email } });
  adminToken = await registerAndLogin(admin);

  const bookRes = await request(app)
    .post('/api/v1/books')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ isbn: '9784444444444', title: 'Domain-Driven Design', totalCopies: 1 });
  bookId = bookRes.body.data.id;

  await request(app)
    .post('/api/v1/borrow/copies')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ bookId, quantity: 1 });

  await request(app)
    .post('/api/v1/borrow/checkout')
    .set('Authorization', `Bearer ${memberToken}`)
    .send({ bookId });
});

// Deliberately no afterAll close here — sequelize/redis/the email queue
// are shared across all six test files under --runInBand (empirically
// confirmed: closing them in one file's afterAll broke a LATER file's
// beforeAll with 'ConnectionManager...called after closed'). The whole
// process force-exits after the full suite via --forceExit in package.json
// instead, which is the standard, accepted fix for this exact situation.

describe('Reports module', () => {
  it('rejects report access for a member', async () => {
    const res = await request(app)
      .get('/api/v1/reports/dashboard')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(res.statusCode).toBe(403);
  });

  it('returns a dashboard summary for admin', async () => {
    const res = await request(app)
      .get('/api/v1/reports/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.totalBooks).toBeGreaterThanOrEqual(1);
    expect(res.body.data.activeLoans).toBeGreaterThanOrEqual(1);
  });

  it('returns most-borrowed books including the checked-out title', async () => {
    const res = await request(app)
      .get('/api/v1/reports/top-books')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.some((b) => b.book.id === bookId)).toBe(true);
  });

  it('returns a CSV export for overdue loans', async () => {
    const res = await request(app)
      .get('/api/v1/reports/overdue/export')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
        expect(res.text).toMatch(/"Member Name","Member Email","Book Title","Due Date","Days Overdue"/);
  });

  it('returns fine revenue totals', async () => {
    const res = await request(app)
      .get('/api/v1/reports/fines-revenue')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveProperty('pending');
    expect(res.body.data).toHaveProperty('collected');
  });
});