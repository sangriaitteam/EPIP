const db = require('../config/db')

/**
 * Write a basic audit log entry
 */
const auditLog = async (user_id, action, resource_type, resource_id, details = null) => {
  try {
    await db.query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [user_id, action, resource_type, resource_id, details ? JSON.stringify(details) : null]
    )
  } catch (err) {
    // audit failure should never break the main request
    console.error('Audit log failed:', err.message)
  }
}

module.exports = auditLog
