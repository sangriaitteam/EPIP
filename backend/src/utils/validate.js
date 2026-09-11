const { validationResult } = require('express-validator')
const { fail } = require('./response')

/**
 * Run express-validator checks and return 422 if any fail
 */
const validate = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty())
    return fail(res, 'Validation failed', 422, errors.array())
  next()
}

module.exports = validate
