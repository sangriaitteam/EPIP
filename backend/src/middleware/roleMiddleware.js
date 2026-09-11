/**
 * RBAC — restrict access by role
 * Usage: authorize('admin', 'hr')
 */
const authorize = (...roles) => (req, res, next) => {
  if (!req.user)
    return res.status(401).json({ success: false, message: 'Not authenticated' })

  if (!roles.includes(req.user.role))
    return res.status(403).json({
      success: false,
      message: `Access denied. Required role: ${roles.join(' or ')}`
    })

  next()
}

/**
 * Allow employee to access their own resource, or admin/hr/manager to access any
 */
const authorizeOwnerOrRole = (...roles) => (req, res, next) => {
  const isOwner = req.user.employee_id && String(req.user.employee_id) === String(req.params.id)
  if (isOwner || roles.includes(req.user.role)) return next()
  return res.status(403).json({ success: false, message: 'Access denied' })
}

module.exports = { authorize, authorizeOwnerOrRole }
