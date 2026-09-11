/**
 * Integration tests — Goals API routes
 */
const request = require('supertest')
const jwt     = require('jsonwebtoken')

jest.mock('../../src/config/db',      () => ({ query: jest.fn() }))
jest.mock('../../src/utils/auditLog', () => jest.fn())
jest.mock('../../src/models/User',    () => ({
  findById:      jest.fn(),
  findByEmail:   jest.fn(),
  findByUsername: jest.fn(),
}))
jest.mock('../../src/models/Employee', () => ({
  findByUserId: jest.fn(),
  findById:     jest.fn(),
}))
jest.mock('../../src/models/Goal', () => ({
  findByEmployee:   jest.fn(),
  findByDepartment: jest.fn(),
  findById:         jest.fn(),
  create:           jest.fn(),
  update:           jest.fn(),
  approve:          jest.fn(),
  uploadEvidence:   jest.fn(),
  delete:           jest.fn(),
}))
jest.mock('../../src/models/Notification', () => ({
  create: jest.fn(),
}))

const app      = require('../../src/app')
const User     = require('../../src/models/User')
const Employee = require('../../src/models/Employee')
const Goal     = require('../../src/models/Goal')

const SECRET       = 'test_secret'
const mockUser     = { id: 1, role: 'employee', name: 'Test', email: 'e@e.com', is_active: true }
const mockHRUser   = { id: 2, role: 'hr',       name: 'HR',   email: 'hr@e.com', is_active: true }
const mockEmployee = { id: 10, user_id: 1, first_name: 'Test', last_name: 'User', manager_id: null }
const mockGoal = {
  id: 1, employee_id: 10, title: 'Increase sales', type: 'quarterly',
  period: 'Q3-2026', weightage: 20, completion_percent: 0,
  status: 'not_started', approval_status: 'pending',
}

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
describe('GET /api/goals/my', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/goals/my')
    expect(res.status).toBe(401)
  })

  it('returns empty array when no goals', async () => {
    Employee.findByUserId.mockResolvedValue(mockEmployee)
    Goal.findByEmployee.mockResolvedValue([])

    const res = await request(app)
      .get('/api/goals/my')
      .set('Authorization', `Bearer ${empToken}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data).toHaveLength(0)
  })

  it('returns goals list', async () => {
    Employee.findByUserId.mockResolvedValue(mockEmployee)
    Goal.findByEmployee.mockResolvedValue([mockGoal])

    const res = await request(app)
      .get('/api/goals/my')
      .set('Authorization', `Bearer ${empToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data[0].title).toBe('Increase sales')
  })
})

describe('POST /api/goals', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).post('/api/goals').send({ title: 'Goal' })
    expect(res.status).toBe(401)
  })

  it('returns 404 when employee profile not found', async () => {
    Employee.findByUserId.mockResolvedValue(null)

    const res = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${empToken}`)
      .send({ title: 'New Goal', type: 'quarterly', weightage: 10 })

    expect(res.status).toBe(404)
  })

  it('creates goal successfully', async () => {
    Employee.findByUserId.mockResolvedValue(mockEmployee)
    Goal.create.mockResolvedValue(mockGoal)

    const res = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${empToken}`)
      .send({ title: 'Increase sales', type: 'quarterly', weightage: 20 })

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.title).toBe('Increase sales')
  })
})

describe('PUT /api/goals/:id', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).put('/api/goals/1').send({})
    expect(res.status).toBe(401)
  })

  it('returns 404 when goal not found', async () => {
    Goal.update.mockResolvedValue(null)

    const res = await request(app)
      .put('/api/goals/999')
      .set('Authorization', `Bearer ${empToken}`)
      .send({ completion_percent: 50 })

    expect(res.status).toBe(404)
  })

  it('updates goal successfully', async () => {
    const updated = { ...mockGoal, completion_percent: 50, status: 'in_progress' }
    Goal.update.mockResolvedValue(updated)

    const res = await request(app)
      .put('/api/goals/1')
      .set('Authorization', `Bearer ${empToken}`)
      .send({ completion_percent: 50, status: 'in_progress' })

    expect(res.status).toBe(200)
    expect(res.body.data.completion_percent).toBe(50)
  })
})

describe('DELETE /api/goals/:id', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).delete('/api/goals/1')
    expect(res.status).toBe(401)
  })

  it('deletes goal and returns 200', async () => {
    Goal.delete.mockResolvedValue(undefined)

    const res = await request(app)
      .delete('/api/goals/1')
      .set('Authorization', `Bearer ${empToken}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })
})

describe('GET /api/goals/employee/:id', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/goals/employee/10')
    expect(res.status).toBe(401)
  })

  it('returns goals for specific employee (HR access)', async () => {
    Goal.findByEmployee.mockResolvedValue([mockGoal])

    const res = await request(app)
      .get('/api/goals/employee/10')
      .set('Authorization', `Bearer ${hrToken}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })
})
