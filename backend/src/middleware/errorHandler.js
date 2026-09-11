/**
 * Global error handler — must have 4 params for Express to treat it as error middleware
 */
const errorHandler = (err, req, res, next) => {  // eslint-disable-line no-unused-vars
  console.error(`[ERROR] ${req.method} ${req.url}:`, err.message)
  if (process.env.NODE_ENV === 'development') console.error(err.stack)

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE')
    return res.status(400).json({ success: false, message: 'File too large (max 10 MB)' })

  // Postgres unique violation
  if (err.code === '23505')
    return res.status(409).json({ success: false, message: 'Resource already exists' })

  // Postgres FK violation
  if (err.code === '23503')
    return res.status(400).json({ success: false, message: 'Referenced resource not found' })

  const status  = err.statusCode || err.status || 500
  const message = err.message   || 'Internal server error'
  res.status(status).json({ success: false, message })
}

const notFound = (req, res) =>
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.url} not found` })

module.exports = { errorHandler, notFound }
