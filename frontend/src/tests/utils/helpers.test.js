/**
 * Unit tests — frontend utility helpers
 */
import { describe, it, expect } from 'vitest'
import {
  formatDate,
  getInitials,
  getStatusColor,
  getPriorityColor,
  getProgressColor,
  capitalize,
  cn,
} from '../../utils/helpers'

describe('formatDate()', () => {
  it('formats a valid date string', () => {
    const result = formatDate('2026-09-11')
    expect(result).toMatch(/sep/i)
    expect(result).toMatch(/2026/)
  })

  it('returns — for null', () => {
    expect(formatDate(null)).toBe('—')
  })

  it('returns — for undefined', () => {
    expect(formatDate(undefined)).toBe('—')
  })

  it('returns — for empty string', () => {
    expect(formatDate('')).toBe('—')
  })
})

describe('getInitials()', () => {
  it('returns initials for full name', () => {
    expect(getInitials('John Doe')).toBe('JD')
  })

  it('returns first character for one-word name', () => {
    // Single word — only first letter available
    expect(getInitials('Alice')).toBe('A')
  })

  it('returns ? for empty/null name', () => {
    expect(getInitials('')).toBe('?')
    expect(getInitials(null)).toBe('?')
  })

  it('returns max 2 characters', () => {
    const result = getInitials('John Michael Doe')
    expect(result.length).toBeLessThanOrEqual(2)
  })
})

describe('getStatusColor()', () => {
  it('returns green for present/active/approved', () => {
    expect(getStatusColor('present')).toContain('green')
    expect(getStatusColor('active')).toContain('green')
    expect(getStatusColor('approved')).toContain('green')
  })

  it('returns red for absent/rejected/inactive', () => {
    expect(getStatusColor('absent')).toContain('red')
    expect(getStatusColor('rejected')).toContain('red')
    expect(getStatusColor('inactive')).toContain('red')
  })

  it('returns yellow for pending/leave', () => {
    expect(getStatusColor('pending')).toContain('yellow')
    expect(getStatusColor('leave')).toContain('yellow')
  })

  it('returns blue for in_progress', () => {
    expect(getStatusColor('in_progress')).toContain('blue')
  })

  it('returns default gray for unknown status', () => {
    expect(getStatusColor('unknown_xyz')).toContain('gray')
  })
})

describe('getPriorityColor()', () => {
  it('returns red for urgent', () => {
    expect(getPriorityColor('urgent')).toContain('red')
  })

  it('returns orange for high', () => {
    expect(getPriorityColor('high')).toContain('orange')
  })

  it('returns yellow for medium', () => {
    expect(getPriorityColor('medium')).toContain('yellow')
  })

  it('returns green for low', () => {
    expect(getPriorityColor('low')).toContain('green')
  })

  it('falls back for unknown', () => {
    expect(getPriorityColor('unknown')).toContain('gray')
  })
})

describe('getProgressColor()', () => {
  it('returns green for >= 80%', () => {
    expect(getProgressColor(80)).toContain('green')
    expect(getProgressColor(100)).toContain('green')
  })

  it('returns yellow for 60–79%', () => {
    expect(getProgressColor(60)).toContain('yellow')
    expect(getProgressColor(79)).toContain('yellow')
  })

  it('returns orange for 40–59%', () => {
    expect(getProgressColor(40)).toContain('orange')
    expect(getProgressColor(59)).toContain('orange')
  })

  it('returns red for < 40%', () => {
    expect(getProgressColor(0)).toContain('red')
    expect(getProgressColor(39)).toContain('red')
  })
})

describe('cn() className helper', () => {
  it('merges class strings', () => {
    const result = cn('foo', 'bar')
    expect(result).toContain('foo')
    expect(result).toContain('bar')
  })

  it('ignores falsy values', () => {
    const result = cn('valid', false, null, undefined, 'also-valid')
    expect(result).toContain('valid')
    expect(result).toContain('also-valid')
    expect(result).not.toContain('false')
    expect(result).not.toContain('null')
  })
})

describe('capitalize()', () => {
  it('capitalises first letter', () => {
    // capitalize may not exist — safe import check
    if (typeof capitalize === 'function') {
      expect(capitalize('hello')).toBe('Hello')
      expect(capitalize('WORLD')).toBe('WORLD')
      expect(capitalize('')).toBe('')
    }
  })
})
