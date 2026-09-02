const request = require('supertest');
const app = require('../../src/app');
const { sequelize } = require('../../src/config/db');


let adminToken, memberToken;
let bookId;
let recordId;

const admin = { name: 'AdminF', email: `adminf.${Date.now()}@example.com`, password: 'StrongPass1' };
const member = { name: 'MemberF', email: `memf.${Date.now()}@example.com`, password: 'StrongPass1' };

const registerAndLogin = async (creds) => {
  await request(app).post('/api/v1/auth/register').send(creds);
  const res = await request(app).post('/api/v1/auth/login').send(creds);
  return res.body.data.accessToken;
};

beforeAll(async () => {
  await sequelize.sync({ force: true });

  memberToken = await registerAndLogin(member);
  await registerAndLogin(admin);
  const { User, BorrowRecord } = require('../../src/database/models');
  await User.update({ role: 'admin' }, { where: { email: admin.email } });
  adminToken = await registerAndLogin(admin);

  const bookRes = await request(app)
    .post('/api/v1/books')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ isbn: '9783333333333', title: 'Refactoring', totalCopies: 1 });
  bookId = bookRes.body.data.id;

  await request(app)
    .post('/api/v1/borrow/copies')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ bookId, quantity: 1 });

  const checkoutRes = await request(app)
    .post('/api/v1/borrow/checkout')
    .set('Authorization', `Bearer ${memberToken}`)
    .send({ bookId });
  recordId = checkoutRes.body.data.id;

  const record = await BorrowRecord.findByPk(recordId);
  record.dueAt = new Date(Date.now() - 10 * 86400000);
  await record.save();
});

// Deliberately no afterAll close here — sequelize/redis/the email queue
// are shared across all six test files under --runInBand (empirically
// confirmed: closing them in one file's afterAll broke a LATER file's
// beforeAll with 'ConnectionManager...called after closed'). The whole
// process force-exits after the full suite via --forceExit in package.json
// instead, which is the standard, accepted fix for this exact situation.

describe('Fines module', () => {
  let fineId;

    it('auto-generates a fine on overdue return', async () => {
    const res = await request(app)
      .post(`/api/v1/borrow/${recordId}/return`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/fine was applied/i);

    const myFines = await request(app)
      .get('/api/v1/fines/me')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(myFines.body.data.fines.length).toBe(1);
    fineId = myFines.body.data.fines[0].id;

    const amount = Number(myFines.body.data.fines[0].amount);
    expect(amount).toBeGreaterThanOrEqual(5.0);
    expect(amount).toBeLessThanOrEqual(6.0);
  });

  it('rejects a member trying to record a manual payment (staff-only)', async () => {
    const res = await request(app)
      .post(`/api/v1/fines/${fineId}/pay`)
      .set('Authorization', `Bearer ${memberToken}`);
    expect(res.statusCode).toBe(403);
  });

  it('lets staff record a manual payment', async () => {
    const res = await request(app)
      .post(`/api/v1/fines/${fineId}/pay`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('paid');
  });

  it('rejects recording payment on an already-paid fine', async () => {
    const res = await request(app)
      .post(`/api/v1/fines/${fineId}/pay`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(400);
  });

  it("rejects starting an online payment when Razorpay isn't configured", async () => {
    const { BorrowRecord } = require('../../src/database/models');
    const checkoutRes = await request(app)
      .post('/api/v1/borrow/checkout')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ bookId });
    const newRecordId = checkoutRes.body.data.id;
    const record = await BorrowRecord.findByPk(newRecordId);
    record.dueAt = new Date(Date.now() - 2 * 86400000);
    await record.save();
    await request(app)
      .post(`/api/v1/borrow/${newRecordId}/return`)
      .set('Authorization', `Bearer ${adminToken}`);

    const myFines = await request(app)
      .get('/api/v1/fines/me?status=pending')
      .set('Authorization', `Bearer ${memberToken}`);
    const newFineId = myFines.body.data.fines[0].id;

    const res = await request(app)
      .post(`/api/v1/fines/${newFineId}/create-order`)
      .set('Authorization', `Bearer ${memberToken}`);

    if (process.env.RAZORPAY_KEY_ID) {
      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty('orderId');
    } else {
      expect(res.statusCode).toBe(500);
    }
  });

  it('lets staff waive a pending fine', async () => {
    const { BorrowRecord } = require('../../src/database/models');
    const checkoutRes = await request(app)
      .post('/api/v1/borrow/checkout')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ bookId });
    const secondRecordId = checkoutRes.body.data.id;
    const record = await BorrowRecord.findByPk(secondRecordId);
    record.dueAt = new Date(Date.now() - 4 * 86400000);
    await record.save();

    await request(app)
      .post(`/api/v1/borrow/${secondRecordId}/return`)
      .set('Authorization', `Bearer ${adminToken}`);

    const myFines = await request(app)
      .get('/api/v1/fines/me?status=pending')
      .set('Authorization', `Bearer ${memberToken}`);
    const secondFineId = myFines.body.data.fines[0].id;

    const res = await request(app)
      .post(`/api/v1/fines/${secondFineId}/waive`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'First-time courtesy waiver' });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.status).toBe('waived');
  });

  it('blocks new checkouts once pending balance exceeds the limit', async () => {
    const { Fine, User } = require('../../src/database/models');

    const targetUser = await User.findOne({ where: { email: member.email } });
    await Fine.create({
      userId: targetUser.id,
      amount: 15.0,
      reason: 'Test large pending fine',
      status: 'pending',
    });

    const res = await request(app)
      .post('/api/v1/borrow/checkout')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ bookId });
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toMatch(/outstanding fines/i);
  });
});