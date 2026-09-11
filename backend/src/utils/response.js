/**
 * Standardised API response helpers
 */
const ok      = (res, data, message = 'Success', status = 200) =>
  res.status(status).json({ success: true,  message, data })

const created = (res, data, message = 'Created') =>
  res.status(201).json({ success: true,  message, data })

const fail    = (res, message = 'Error', status = 400, errors = null) => {
  const body = { success: false, message }
  if (errors) body.errors = errors
  return res.status(status).json(body)
}

module.exports = { ok, created, fail }
