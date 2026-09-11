/**
 * Unit tests — Middleware (errorHandler, roleMiddleware)
 */

// ── Error handler ─────────────────────────────────────────────────────────
const { errorHandler } = require('../../src/middleware/errorHandler')

const mockReq = () => ({})
const mockRes = () => {
  const res = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json   = jest.fn().mockReturnValue(res)
  return res
}

describe('errorHandler middleware', () => {
  const originalEnv = process.env.NODE_ENV

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
  })

  it('returns 500 for generic errors', () => {
    const err = new Error('Something went wrong')
    const res = mockRes()
    errorHandler(err, mockReq(), res, () => {})
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    )
  })

  it('returns 400 for Multer file size error', () => {
    const err = new Error('File too large')
    err.code = 'LIMIT_FILE_SIZE'
    const res = mockRes()
    errorHandler(err, mockReq(), res, () => {})
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json.mock.calls[0][0].message).toMatch(/file too large/i)
  })

  it('returns 409 for Postgres unique violation (23505)', () => {
    const err = new Error('duplicate key')
    err.code = '23505'
    const res = mockRes()
    errorHandler(err, mockReq(), res, () => {})
    expect(res.status).toHaveBeenCalledWith(409)
  })

  it('returns 400 for Postgres FK violation (23503)', () => {
    const err = new Error('foreign key violation')
    err.code = '23503'
    const res = mockRes()
    errorHandler(err, mockReq(), res, () => {})
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('hides stack in production', () => {
    process.env.NODE_ENV = 'production'
    const err = new Error('Hidden error')
    const res = mockRes()
    errorHandler(err, mockReq(), res, () => {})
    const body = res.json.mock.calls[0][0]
    expect(body.stack).toBeUndefined()
  })
})

// ── Role middleware ────────────────────────────────────────────────────────
const { authorize } = require('../../src/middleware/roleMiddleware')

describe('authorize() middleware', () => {
  it('calls next() when role is allowed', () => {
    const req  = { user: { role: 'hr' } }
    const res  = mockRes()
    const next = jest.fn()
    authorize('hr', 'admin')(req, res, next)
    expect(next).toHaveBeenCalled()
  })

  it('returns 403 when role is not allowed', () => {
    const req  = { user: { role: 'employee' } }
    const res  = mockRes()
    const next = jest.fn()
    authorize('hr', 'admin')(req, res, next)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 when no user in request', () => {
    const req  = {}
    const res  = mockRes()
    const next = jest.fn()
    authorize('hr')(req, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('allows superadmin when admin is in list', () => {
    const req  = { user: { role: 'superadmin' } }
    const res  = mockRes()
    const next = jest.fn()
    authorize('admin', 'superadmin')(req, res, next)
    expect(next).toHaveBeenCalled()
  })
})
