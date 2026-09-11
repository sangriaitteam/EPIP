/**
 * Integration tests — Auth API routes
 */
const request = require('supertest')
const bcrypt  = require('bcryptjs')

jest.mock('../../src/config/db',      () => ({ query: jest.fn() }))
jest.mock('../../src/utils/auditLog', () => jest.fn())
jest.mock('../../src/models/User',    () => ({
  findById:      jest.fn(),
  findByEmail:   jest.fn(),
  findByUsername: jest.fn(),
  verifyPassword: jest.fn(),
}))
jest.mock('../../src/models/Employee', () => ({
  findByUserId: jest.fn(),
}))

const app      = require('../../src/app')
const User     = require('../../src/models/User')
const Employee = require('../../src/models/Employee')

// Default: no employee profile
beforeEach(() => {
  jest.clearAllMocks()
  Employee.findByUserId.mockResolvedValue(null)
})

const makeUser = async (overrides = {}) => ({
  id: 1, name: 'Test', email: 'test@example.com',
  username: 'testuser',
  password_hash: await bcrypt.hash('Password@123', 10),
  role: 'employee', is_active: true, is_first_login: false,
  ...overrides,
})

describe('POST /api/auth/login', () => {
  it('returns 400/422 when credentials missing', async () => {
    const res = await request(app).post('/api/auth/login').send({})
    expect([400, 422]).toContain(res.status)
    expect(res.body.success).toBe(false)
  })

  it('returns 401 for unknown user', async () => {
    User.findByEmail.mockResolvedValue(null)
    User.findByUsername.mockResolvedValue(null)

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'nobody', password: 'any' })

    expect(res.status).toBe(401)
  })

  it('returns 200 + token on valid credentials', async () => {
    const user = await makeUser()
    User.findByUsername.mockResolvedValue(user)
    // verifyPassword is on the real User object — mock it to return true
    User.verifyPassword.mockResolvedValue(true)

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser', password: 'Password@123' })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toHaveProperty('token')
    expect(res.body.data).toHaveProperty('user')
  })

  it('returns 401 for wrong password', async () => {
    const user = await makeUser()
    User.findByUsername.mockResolvedValue(user)
    User.verifyPassword.mockResolvedValue(false)

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser', password: 'WrongPass!1' })

    expect(res.status).toBe(401)
  })

  it('returns 401 for deactivated account', async () => {
    const user = await makeUser({ is_active: false })
    User.findByUsername.mockResolvedValue(user)

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser', password: 'Password@123' })

    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
  })

  it('returns 401/403 when wrong role tab used', async () => {
    const user = await makeUser({ role: 'employee' })
    User.findByUsername.mockResolvedValue(user)

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser', password: 'Password@123', expectedRole: 'hr' })

    expect([401, 403]).toContain(res.status)
  })
})

describe('GET /api/auth/me', () => {
  it('returns 401 without Authorization header', async () => {
    const res = await request(app).get('/api/auth/me')
    expect(res.status).toBe(401)
  })

  it('returns 401 with invalid token', async () => {
    User.findById.mockResolvedValue(null)

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.token.here')

    expect(res.status).toBe(401)
  })
})

describe('GET /api/auth/health', () => {
  it('returns 404 for non-existent route', async () => {
    const res = await request(app).get('/api/auth/nonexistent')
    expect(res.status).toBe(404)
  })
})
