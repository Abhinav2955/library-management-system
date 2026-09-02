const request = require('supertest');
const app = require('../../src/app');
const { sequelize } = require('../../src/config/db');


let memberToken;
let adminToken;
let createdBookId;

const admin = { name: 'Admin', email: `admin.${Date.now()}@example.com`, password: 'StrongPass1' };
const member = { name: 'Member', email: `member.${Date.now()}@example.com`, password: 'StrongPass1' };

beforeAll(async () => {
  await sequelize.sync({ force: true });

  await request(app).post('/api/v1/auth/register').send(member);
  const memberLogin = await request(app).post('/api/v1/auth/login').send(member);
  memberToken = memberLogin.body.data.accessToken;

  await request(app).post('/api/v1/auth/register').send(admin);
  const { User } = require('../../src/database/models');
  await User.update({ role: 'admin' }, { where: { email: admin.email } });
  const adminLogin = await request(app).post('/api/v1/auth/login').send(admin);
  adminToken = adminLogin.body.data.accessToken;
});

// Deliberately no afterAll close here — sequelize/redis/the email queue
// are shared across all six test files under --runInBand (empirically
// confirmed: closing them in one file's afterAll broke a LATER file's
// beforeAll with 'ConnectionManager...called after closed'). The whole
// process force-exits after the full suite via --forceExit in package.json
// instead, which is the standard, accepted fix for this exact situation.

describe('Books module', () => {
  it('rejects book creation without authentication', async () => {
    const res = await request(app).post('/api/v1/books').send({ isbn: '111', title: 'X' });
    expect(res.statusCode).toBe(401);
  });

  it('rejects book creation from a member (RBAC)', async () => {
    const res = await request(app)
      .post('/api/v1/books')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ isbn: '9780000000001', title: 'Clean Architecture', totalCopies: 3 });
    expect(res.statusCode).toBe(403);
  });

  it('allows an admin to create a book', async () => {
    const res = await request(app)
      .post('/api/v1/books')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        isbn: '9780000000001',
        title: 'Clean Architecture',
        description: 'A craftsman guide to software structure and design.',
        totalCopies: 3,
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.data.availableCopies).toBe(3);
    createdBookId = res.body.data.id;
  });

  it('rejects a duplicate ISBN', async () => {
    const res = await request(app)
      .post('/api/v1/books')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isbn: '9780000000001', title: 'Duplicate', totalCopies: 1 });
    expect(res.statusCode).toBe(409);
  });

  it('lets anyone browse the catalog without auth', async () => {
    const res = await request(app).get('/api/v1/books');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.books.length).toBeGreaterThan(0);
    expect(res.body.data.meta).toHaveProperty('totalPages');
  });

  it('paginates results', async () => {
    const res = await request(app).get('/api/v1/books?page=1&limit=1');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.books.length).toBe(1);
    expect(res.body.data.meta.limit).toBe(1);
  });

  it('finds the book via full-text search', async () => {
    const res = await request(app).get('/api/v1/books?search=architecture');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.books.some((b) => b.id === createdBookId)).toBe(true);
  });

  it('updates a book as admin', async () => {
    const res = await request(app)
      .put(`/api/v1/books/${createdBookId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Clean Architecture (2nd Edition)' });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.title).toBe('Clean Architecture (2nd Edition)');
  });

  it('soft-deletes a book as admin', async () => {
    const res = await request(app)
      .delete(`/api/v1/books/${createdBookId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);

    const getRes = await request(app).get(`/api/v1/books/${createdBookId}`);
    expect(getRes.statusCode).toBe(404);
  });
});