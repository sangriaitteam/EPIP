/**
 * Integration tests — Attendance API routes
 */
const request = require('supertest')
const jwt     = require('jsonwebtoken')

// ── Must mock BEFORE requiring app ────────────────────────────────────────
jest.mock('../../src/config/db',      () => ({ query: jest.fn() }))
jest.mock('../../src/utils/auditLog', () => jest.fn())
jest.mock('../../src/models/User',    () => ({
  findById: jest.fn(),
  findByEmail: jest.fn(),
  findByUsername: jest.fn(),
}))
jest.mock('../../src/models/Employee', () => ({
  findByUserId: jest.fn(),
  findById:     jest.fn(),
}))

const app      = require('../../src/app')
const db       = require('../../src/config/db')
const User     = require('../../src/models/User')
const Employee = require('../../src/models/Employee')

// ── Shared fixtures ───────────────────────────────────────────────────────
const SECRET      = 'test_secret'
const mockUser    = { id: 1, role: 'employee', name: 'Test', email: 'e@e.com', is_active: true }
const mockHRUser  = { id: 2, role: 'hr',       name: 'HR',   email: 'hr@e.com', is_active: true }
const mockEmployee = { id: 10, user_id: 1, first_name: 'Test', last_name: 'User' }

let empToken, hrToken

beforeAll(() => {
  empToken = jwt.sign({ id: 1, role: 'employee' }, SECRET, { expiresIn: '1h' })
  hrToken  = jwt.sign({ id: 2, role: 'hr' },       SECRET, { expiresIn: '1h' })
})

beforeEach(() => {
  jest.clearAllMocks()
  User.findById.mockImplementation((id) => {
    if (id === 1) return Promise.resolve(mockUser)
    if (id === 2) return Promise.resolve(mockHRUser)
    return Promise.resolve(null)
  })
})

// ─────────────────────────────────────────────────────────────────────────
describe('POST /api/attendance/check-in', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).post('/api/attendance/check-in')
    expect(res.status).toBe(401)
  })

  it('returns 404 if employee profile not found', async () => {
    Employee.findByUserId.mockResolvedValue(null)

    const res = await request(app)
      .post('/api/attendance/check-in')
      .set('Authorization', `Bearer ${empToken}`)
      .send({ work_mode: 'office' })

    expect(res.status).toBe(404)
  })

  it('returns 409 if already checked in today', async () => {
    Employee.findByUserId.mockResolvedValue(mockEmployee)
    // findByDate returns existing record with check_in
    db.query.mockResolvedValueOnce({ rows: [{ id: 5, check_in: new Date() }] })

    const res = await request(app)
      .post('/api/attendance/check-in')
      .set('Authorization', `Bearer ${empToken}`)
      .send({ work_mode: 'office' })

    expect(res.status).toBe(409)
  })
})

describe('POST /api/attendance/check-out', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).post('/api/attendance/check-out')
    expect(res.status).toBe(401)
  })

  it('returns 404 if no check-in record', async () => {
    Employee.findByUserId.mockResolvedValue(mockEmployee)
    // Auto-close pauses
    db.query.mockResolvedValueOnce({ rows: [] })
    // Recalculate pause mins
    db.query.mockResolvedValueOnce({ rows: [] })
    // UPDATE returns nothing
    db.query.mockResolvedValueOnce({ rows: [] })

    const res = await request(app)
      .post('/api/attendance/check-out')
      .set('Authorization', `Bearer ${empToken}`)

    expect(res.status).toBe(404)
  })
})

describe('GET /api/attendance/today', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/attendance/today')
    expect(res.status).toBe(401)
  })

  it('returns not_checked_in when no record', async () => {
    Employee.findByUserId.mockResolvedValue(mockEmployee)
    db.query.mockResolvedValueOnce({ rows: [] }) // findByDate

    const res = await request(app)
      .get('/api/attendance/today')
      .set('Authorization', `Bearer ${empToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ status: 'not_checked_in' })
  })

  it('returns record when checked in today', async () => {
    Employee.findByUserId.mockResolvedValue(mockEmployee)
    const record = { id: 5, check_in: new Date(), date: new Date(), status: 'present' }
    db.query.mockResolvedValueOnce({ rows: [record] })

    const res = await request(app)
      .get('/api/attendance/today')
      .set('Authorization', `Bearer ${empToken}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })
})

describe('GET /api/attendance/today-all (HR only)', () => {
  it('returns 403 for employee role', async () => {
    const res = await request(app)
      .get('/api/attendance/today-all')
      .set('Authorization', `Bearer ${empToken}`)
    expect(res.status).toBe(403)
  })

  it('returns 200 for hr role', async () => {
    db.query.mockResolvedValueOnce({ rows: [] })
    const res = await request(app)
      .get('/api/attendance/today-all')
      .set('Authorization', `Bearer ${hrToken}`)
    expect(res.status).toBe(200)
  })
})

describe('GET /api/attendance/holidays', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/attendance/holidays')
    expect(res.status).toBe(401)
  })

  it('returns holidays list for authenticated user', async () => {
    db.query.mockResolvedValueOnce({ rows: [
      { id: 1, name: 'Diwali', date: '2026-10-20', type: 'national' }
    ]})

    const res = await request(app)
      .get('/api/attendance/holidays')
      .set('Authorization', `Bearer ${empToken}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })
})
