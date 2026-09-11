/**
 * Unit tests — goalService
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the api module
vi.mock('../../services/api', () => ({
  api: {
    get:    vi.fn(),
    post:   vi.fn(),
    put:    vi.fn(),
    patch:  vi.fn(),
    delete: vi.fn(),
  },
}))

import { api } from '../../services/api'
import { goalService } from '../../services/goalService'

beforeEach(() => vi.clearAllMocks())

describe('goalService.getMy()', () => {
  it('returns goals array on success', async () => {
    api.get.mockResolvedValue({ success: true, data: [{ id: 1, title: 'Goal A' }] })
    const result = await goalService.getMy()
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Goal A')
  })

  it('returns [] on API failure', async () => {
    api.get.mockResolvedValue({ success: false, message: 'Server error' })
    const result = await goalService.getMy()
    expect(result).toEqual([])
  })

  it('returns [] on network error', async () => {
    api.get.mockRejectedValue(new Error('Network error'))
    const result = await goalService.getMy().catch(() => [])
    expect(result).toEqual([])
  })
})

describe('goalService.create()', () => {
  it('returns created goal on success', async () => {
    const newGoal = { id: 5, title: 'New Goal', type: 'quarterly' }
    api.post.mockResolvedValue({ success: true, data: newGoal })
    const result = await goalService.create({ title: 'New Goal', type: 'quarterly' })
    expect(result).toEqual(newGoal)
    expect(api.post).toHaveBeenCalledWith('/goals', expect.objectContaining({ title: 'New Goal' }))
  })

  it('returns null on failure', async () => {
    api.post.mockResolvedValue({ success: false })
    const result = await goalService.create({ title: 'Bad Goal' })
    expect(result).toBeNull()
  })
})

describe('goalService.update()', () => {
  it('updates goal and returns updated data', async () => {
    const updated = { id: 1, completion_percent: 75 }
    api.put.mockResolvedValue({ success: true, data: updated })
    const result = await goalService.update(1, { completion_percent: 75 })
    expect(result.completion_percent).toBe(75)
    expect(api.put).toHaveBeenCalledWith('/goals/1', { completion_percent: 75 })
  })

  it('returns null on failure', async () => {
    api.put.mockResolvedValue({ success: false })
    const result = await goalService.update(1, {})
    expect(result).toBeNull()
  })
})

describe('goalService.delete()', () => {
  it('returns true on success', async () => {
    api.delete.mockResolvedValue({ success: true })
    const result = await goalService.delete(1)
    expect(result).toBe(true)
  })

  it('returns false on failure', async () => {
    api.delete.mockResolvedValue({ success: false })
    const result = await goalService.delete(999)
    expect(result).toBe(false)
  })
})

describe('goalService.approve()', () => {
  it('returns approved goal', async () => {
    const approved = { id: 1, approval_status: 'approved' }
    api.patch.mockResolvedValue({ success: true, data: approved })
    const result = await goalService.approve(1)
    expect(result.approval_status).toBe('approved')
  })
})
