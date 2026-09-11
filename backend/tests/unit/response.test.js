/**
 * Unit tests — response utility helpers
 */
const { ok, created, fail } = require('../../src/utils/response')

// Mock Express res object
const mockRes = () => {
  const res = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json   = jest.fn().mockReturnValue(res)
  return res
}

describe('response helpers', () => {
  describe('ok()', () => {
    it('sends 200 with success:true', () => {
      const res = mockRes()
      ok(res, { id: 1 }, 'Done')
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        success: true, message: 'Done', data: { id: 1 },
      })
    })

    it('uses default message "Success"', () => {
      const res = mockRes()
      ok(res, null)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Success' })
      )
    })
  })

  describe('created()', () => {
    it('sends 201 with success:true', () => {
      const res = mockRes()
      created(res, { id: 5 }, 'Resource created')
      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith({
        success: true, message: 'Resource created', data: { id: 5 },
      })
    })
  })

  describe('fail()', () => {
    it('sends 400 with success:false by default', () => {
      const res = mockRes()
      fail(res, 'Bad request')
      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Bad request' })
      )
    })

    it('sends custom status code', () => {
      const res = mockRes()
      fail(res, 'Not found', 404)
      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('includes errors array when provided', () => {
      const res = mockRes()
      fail(res, 'Validation failed', 422, [{ field: 'email', msg: 'Invalid' }])
      const body = res.json.mock.calls[0][0]
      expect(body.errors).toBeDefined()
      expect(body.errors).toHaveLength(1)
    })
  })
})
