const Screenshot = require('../models/Screenshot')
const Employee   = require('../models/Employee')
const { ok, created, fail } = require('../utils/response')
const { getFileUrl } = require('../config/storage')
const auditLog   = require('../utils/auditLog')

// POST /api/screenshots/my  (employee uploads their own screenshot)
const uploadMy = async (req, res, next) => {
  try {
    if (!req.file) return fail(res, 'No screenshot file', 400)
    const employee = await Employee.findByUserId(req.user.id)
    if (!employee) return fail(res, 'Employee profile not found', 404)

    const file_url = getFileUrl('screenshots', req.file.filename)
    const screenshot = await Screenshot.create({
      employee_id: employee.id,
      file_path:   req.file.path,
      file_url,
    })
    return created(res, screenshot, 'Screenshot saved')
  } catch (err) { next(err) }
}

// POST /api/screenshots/upload  (called by scheduler or manual trigger)
const upload = async (req, res, next) => {
  try {
    if (!req.file) return fail(res, 'No screenshot file', 400)
    const employee_id = req.body.employee_id || req.query.employee_id
    if (!employee_id) return fail(res, 'employee_id required', 400)

    const file_url  = getFileUrl('screenshots', req.file.filename)
    const screenshot = await Screenshot.create({
      employee_id,
      file_path: req.file.path,
      file_url,
    })
    return created(res, screenshot, 'Screenshot saved')
  } catch (err) { next(err) }
}

// GET /api/screenshots/employee/:id
const getByEmployee = async (req, res, next) => {
  try {
    await auditLog(req.user.id, 'VIEW_SCREENSHOTS', 'employee', req.params.id)
    const { date, limit } = req.query
    const shots = await Screenshot.findByEmployee(req.params.id, { date, limit })
    return ok(res, shots)
  } catch (err) { next(err) }
}

// GET /api/screenshots  (HR/Manager view all)
const getAll = async (req, res, next) => {
  try {
    const { date, department_id, limit } = req.query
    const shots = await Screenshot.findAll({ date, department_id, limit })
    return ok(res, shots)
  } catch (err) { next(err) }
}

// GET /api/screenshots/count/today/:employeeId
const countToday = async (req, res, next) => {
  try {
    const cnt = await Screenshot.countToday(req.params.employeeId)
    return ok(res, { count: cnt })
  } catch (err) { next(err) }
}

module.exports = { uploadMy, upload, getByEmployee, getAll, countToday }
