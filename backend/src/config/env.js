// env.js — validate all required environment variables at startup
// If any critical variable is missing or insecure, the process exits immediately
// rather than failing silently at runtime.

const REQUIRED = [
  'JWT_SECRET',
]

const DB_VARS = [
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
]

const INSECURE_DEFAULTS = [
  'changeme',
  'secret',
  'password',
  'epip2026',
  'epip_super_secret_jwt_key_change_in_production_2026',
  'CHANGE_ME_generate_a_64_byte_random_hex_string',
  'CHANGE_ME_strong_password_here',
]

function validateEnv() {
  const isProduction = process.env.NODE_ENV === 'production'
  const errors   = []
  const warnings = []

  // Check required vars exist
  for (const key of REQUIRED) {
    if (!process.env[key]) {
      errors.push(`Missing required env var: ${key}`)
    }
  }

  // DB vars required only if DATABASE_URL is not set
  if (!process.env.DATABASE_URL) {
    for (const key of DB_VARS) {
      if (!process.env[key]) {
        errors.push(`Missing required env var: ${key}`)
      }
    }
  }

  // In production — extra security checks
  if (isProduction) {
    const jwtSecret = process.env.JWT_SECRET || ''
    const dbPass    = process.env.DB_PASSWORD || ''

    // JWT secret must be at least 32 chars
    if (jwtSecret.length < 32) {
      errors.push('JWT_SECRET must be at least 32 characters in production')
    }

    // Check for insecure defaults
    const lowerJwt = jwtSecret.toLowerCase()
    const lowerDb  = dbPass.toLowerCase()
    for (const insecure of INSECURE_DEFAULTS) {
      if (lowerJwt.includes(insecure.toLowerCase())) {
        errors.push(`JWT_SECRET appears to use an insecure default value — generate a new one`)
        break
      }
      if (lowerDb.includes(insecure.toLowerCase())) {
        errors.push(`DB_PASSWORD appears to use an insecure default value — change it`)
        break
      }
    }

    // SUPERADMIN_EMAILS should be set
    if (!process.env.SUPERADMIN_EMAILS) {
      warnings.push('SUPERADMIN_EMAILS not set — super admin setup will be unavailable')
    }

    // CLIENT_URL should not be localhost in production
    const clientUrl = process.env.CLIENT_URL || ''
    if (clientUrl.includes('localhost') || clientUrl.includes('127.0.0.1')) {
      warnings.push(`CLIENT_URL is "${clientUrl}" — this looks like a local URL, not production`)
    }

    // BACKEND_URL should not be localhost in production
    const backendUrl = process.env.BACKEND_URL || ''
    if (backendUrl.includes('localhost') || backendUrl.includes('127.0.0.1')) {
      warnings.push(`BACKEND_URL is "${backendUrl}" — update to your production domain`)
    }
  }

  // Print warnings
  if (warnings.length) {
    console.warn('\n⚠️  Environment warnings:')
    warnings.forEach(w => console.warn(`   • ${w}`))
  }

  // Print errors and exit if any
  if (errors.length) {
    console.error('\n❌ Environment configuration errors:')
    errors.forEach(e => console.error(`   • ${e}`))
    console.error('\nFix the above issues before starting the server.\n')
    process.exit(1)
  }

  if (!errors.length && !warnings.length) {
    console.log('✅ Environment variables validated')
  }
}

module.exports = { validateEnv }
