const jwt  = require('jsonwebtoken')
const User = require('../models/User')

const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization
    if (!header || !header.startsWith('Bearer '))
      return res.status(401).json({ success: false, message: 'No token provided' })

    const token = header.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    const user = await User.findById(decoded.id)
    if (!user)
      return res.status(401).json({ success: false, message: 'User not found' })
    if (!user.is_active)
      return res.status(401).json({ success: false, message: 'Account deactivated' })

    req.user = user
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError')
      return res.status(401).json({ success: false, message: 'Token expired' })
    if (err.name === 'JsonWebTokenError')
      return res.status(401).json({ success: false, message: 'Invalid token' })
    next(err)
  }
}

module.exports = { authenticate }
