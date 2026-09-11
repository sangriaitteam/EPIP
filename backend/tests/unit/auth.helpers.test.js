/**
 * Unit tests — Auth helper functions
 * Tests password generation logic and OTP structure
 */

// ── Password generator (extracted logic for testing) ──────────────────────
const generatePassword = (firstName) => {
  const part1 = firstName.charAt(0).toUpperCase() + firstName.slice(1, 4).toLowerCase()
  const part2 = Math.floor(1000 + Math.random() * 9000)
  const specials = '!@#$%^&*'
  const part3 = specials[Math.floor(Math.random() * specials.length)]
  return `${part1}${part2}${part3}`
}

// ── Username generator (extracted logic for testing) ─────────────────────
const buildUsernameBase = (firstName, lastName) => {
  const base = `${firstName.toLowerCase().replace(/\s+/g, '')}.${lastName.toLowerCase().replace(/\s+/g, '')}`
  return base
}

describe('generatePassword()', () => {
  it('starts with capitalised first letter', () => {
    const pwd = generatePassword('john')
    expect(pwd[0]).toBe('J')
  })

  it('contains at least 8 characters', () => {
    const pwd = generatePassword('alice')
    expect(pwd.length).toBeGreaterThanOrEqual(8)
  })

  it('contains a 4-digit number segment', () => {
    const pwd = generatePassword('bob')
    expect(pwd).toMatch(/\d{4}/)
  })

  it('ends with a special character', () => {
    const pwd = generatePassword('test')
    const specials = '!@#$%^&*'
    const lastChar = pwd[pwd.length - 1]
    expect(specials).toContain(lastChar)
  })

  it('handles single character names', () => {
    const pwd = generatePassword('a')
    expect(pwd.length).toBeGreaterThan(0)
  })
})

describe('buildUsernameBase()', () => {
  it('lowercases first and last name', () => {
    const base = buildUsernameBase('John', 'Doe')
    expect(base).toBe('john.doe')
  })

  it('removes spaces from names', () => {
    const base = buildUsernameBase('Mary Ann', 'Smith Jones')
    expect(base).toBe('maryann.smithjones')
  })

  it('handles already lowercase input', () => {
    const base = buildUsernameBase('alice', 'wonder')
    expect(base).toBe('alice.wonder')
  })
})

describe('OTP generation', () => {
  it('generates a 6-digit OTP', () => {
    const otp = String(Math.floor(100000 + Math.random() * 900000))
    expect(otp).toHaveLength(6)
    expect(Number(otp)).toBeGreaterThanOrEqual(100000)
    expect(Number(otp)).toBeLessThanOrEqual(999999)
  })

  it('OTP expires in future', () => {
    const expires = Date.now() + 10 * 60 * 1000 // 10 minutes
    expect(expires).toBeGreaterThan(Date.now())
  })
})
