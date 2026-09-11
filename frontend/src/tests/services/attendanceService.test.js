/**
 * Unit tests — attendanceService
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../services/api', () => ({
  api: {
    get:  vi.fn(),
    post: vi.fn(),
  },
}))

import { api } from '../../services/api'
import { attendanceService } from '../../services/attendanceService'

beforeEach(() => vi.clearAllMocks())

describe('attendanceService.checkIn()', () => {
  it('calls POST /attendance/check-in and returns data', async () => {
    const record = { id: 1, check_in: new Date().toISOString(), status: 'present' }
    api.post.mockResolvedValue({ success: true, data: record })

    const result = await attendanceService.checkIn({ work_mode: 'office' })
    expect(result).toEqual(record)
    expect(api.post).toHaveBeenCalledWith('/attendance/check-in', { work_mode: 'office' })
  })

  it('returns null on failure', async () => {
    api.post.mockResolvedValue({ success: false, message: 'Already checked in' })
    const result = await attendanceService.checkIn({})
    expect(result).toBeNull()
  })
})

describe('attendanceService.checkOut()', () => {
  it('calls POST /attendance/check-out', async () => {
    const record = { id: 1, check_out: new Date().toISOString(), hours_worked: 8 }
    api.post.mockResolvedValue({ success: true, data: record })

    const result = await attendanceService.checkOut()
    expect(result.hours_worked).toBe(8)
    expect(api.post).toHaveBeenCalledWith('/attendance/check-out', {})
  })
})

describe('attendanceService.getToday()', () => {
  it('returns today record', async () => {
    const record = { id: 1, date: '2026-09-11', status: 'present' }
    api.get.mockResolvedValue({ success: true, data: record })

    const result = await attendanceService.getToday()
    expect(result).toEqual(record)
    expect(api.get).toHaveBeenCalledWith('/attendance/today')
  })

  it('returns null on failure', async () => {
    api.get.mockResolvedValue({ success: false })
    const result = await attendanceService.getToday()
    expect(result).toBeNull()
  })
})

describe('attendanceService.getSummary()', () => {
  it('returns summary data', async () => {
    const summary = { present: 10, absent: 2, attendance_percent: 83.3 }
    api.get.mockResolvedValue({ success: true, data: summary })

    const result = await attendanceService.getSummary()
    expect(result.present).toBe(10)
    expect(result.attendance_percent).toBe(83.3)
  })

  it('returns null on failure', async () => {
    api.get.mockResolvedValue({ success: false })
    const result = await attendanceService.getSummary()
    expect(result).toBeNull()
  })
})

describe('attendanceService.getMy()', () => {
  it('returns records array', async () => {
    const records = [{ id: 1, date: '2026-09-01', status: 'present' }]
    api.get.mockResolvedValue({ success: true, data: records })

    const result = await attendanceService.getMy()
    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(1)
  })

  it('returns [] on failure', async () => {
    api.get.mockResolvedValue({ success: false })
    const result = await attendanceService.getMy()
    expect(result).toEqual([])
  })

  it('passes query params', async () => {
    api.get.mockResolvedValue({ success: true, data: [] })
    await attendanceService.getMy({ from: '2026-09-01', to: '2026-09-30' })
    expect(api.get).toHaveBeenCalledWith(
      expect.stringContaining('from=2026-09-01')
    )
  })
})

describe('attendanceService.getWeekly()', () => {
  it('returns weekly breakdown', async () => {
    const weekly = [
      { week: 'Week 1', present: 4, late: 1, absent: 0 },
    ]
    api.get.mockResolvedValue({ success: true, data: weekly })

    const result = await attendanceService.getWeekly(2026, 9)
    expect(result).toHaveLength(1)
    expect(api.get).toHaveBeenCalledWith('/attendance/weekly?year=2026&month=9')
  })

  it('returns [] on failure', async () => {
    api.get.mockResolvedValue({ success: false })
    const result = await attendanceService.getWeekly(2026, 9)
    expect(result).toEqual([])
  })
})
