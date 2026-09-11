/**
 * Unit tests — Attendance helper functions
 */

// ── calcDays (from leaveController) ──────────────────────────────────────
const calcDays = (start, end) => {
  const s = new Date(start), e = new Date(end)
  return Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1)
}

// ── monthRange (from reportController) ────────────────────────────────────
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const monthRange = (year, month) => {
  const y = parseInt(year), m = parseInt(month)
  const from = `${y}-${String(m).padStart(2,'0')}-01`
  const last  = new Date(y, m, 0).getDate()
  const to    = `${y}-${String(m).padStart(2,'0')}-${String(last).padStart(2,'0')}`
  return { from, to, label: `${MONTHS[m-1]} ${y}` }
}

// ── date formatter ─────────────────────────────────────────────────────────
const fmtDate = (ts) => {
  if (!ts) return '—'
  const d = ts instanceof Date ? ts : new Date(ts)
  return d.toISOString().split('T')[0]
}

describe('calcDays()', () => {
  it('returns 1 for same start and end date', () => {
    expect(calcDays('2026-09-01', '2026-09-01')).toBe(1)
  })

  it('returns correct count for multi-day range', () => {
    expect(calcDays('2026-09-01', '2026-09-05')).toBe(5)
  })

  it('returns minimum 1 even if end < start', () => {
    expect(calcDays('2026-09-05', '2026-09-01')).toBe(1)
  })

  it('handles month boundaries', () => {
    expect(calcDays('2026-01-30', '2026-02-02')).toBe(4)
  })
})

describe('monthRange()', () => {
  it('returns correct from/to for January', () => {
    const { from, to } = monthRange(2026, 1)
    expect(from).toBe('2026-01-01')
    expect(to).toBe('2026-01-31')
  })

  it('returns correct from/to for February (non-leap)', () => {
    const { from, to } = monthRange(2026, 2)
    expect(from).toBe('2026-02-01')
    expect(to).toBe('2026-02-28')
  })

  it('returns correct from/to for February (leap year)', () => {
    const { from, to } = monthRange(2024, 2)
    expect(to).toBe('2024-02-29')
  })

  it('returns correct label', () => {
    const { label } = monthRange(2026, 9)
    expect(label).toBe('September 2026')
  })

  it('pads month with zero', () => {
    const { from } = monthRange(2026, 3)
    expect(from).toBe('2026-03-01')
  })
})

describe('fmtDate()', () => {
  it('returns ISO date string from Date object', () => {
    expect(fmtDate(new Date('2026-09-11T10:30:00Z'))).toBe('2026-09-11')
  })

  it('returns ISO date string from ISO string', () => {
    expect(fmtDate('2026-01-15T00:00:00.000Z')).toBe('2026-01-15')
  })

  it('returns — for null input', () => {
    expect(fmtDate(null)).toBe('—')
  })

  it('returns — for undefined', () => {
    expect(fmtDate(undefined)).toBe('—')
  })
})
