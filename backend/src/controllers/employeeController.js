const Employee     = require('../models/Employee')
const User         = require('../models/User')
const { ok, created, fail } = require('../utils/response')
const { getFileUrl } = require('../config/storage')
const auditLog     = require('../utils/auditLog')
const { query }    = require('../config/db')

// ── Credential generators ──────────────────────────────────────────────────
// Username: firstname.lastname + 2-digit number  e.g. "john.doe01"
const generateUsername = async (firstName, lastName) => {
  const base = `${firstName.toLowerCase().replace(/\s+/g, '')}.${lastName.toLowerCase().replace(/\s+/g, '')}`
  let suffix = 1
  while (true) {
    const candidate = `${base}${String(suffix).padStart(2, '0')}`
    const { rows } = await query(`SELECT id FROM users WHERE username = $1`, [candidate])
    if (!rows.length) return candidate
    suffix++
  }
}

// Password: Capitalize(first4) + random 4-digit + special char
const generatePassword = (firstName) => {
  const part1 = firstName.charAt(0).toUpperCase() + firstName.slice(1, 4).toLowerCase()
  const part2 = Math.floor(1000 + Math.random() * 9000)           // 4 digits
  const specials = '!@#$%^&*'
  const part3 = specials[Math.floor(Math.random() * specials.length)]
  return `${part1}${part2}${part3}`
}

// GET /api/employees
const getAll = async (req, res, next) => {
  try {
    const { department_id, work_mode, status, search } = req.query
    const employees = await Employee.findAll({ department_id, work_mode, status, search })
    return ok(res, employees)
  } catch (err) { next(err) }
}

// GET /api/employees/my
const getMyProfile = async (req, res, next) => {
  try {
    const employee = await Employee.findByUserId(req.user.id)
    if (!employee) return fail(res, 'Employee profile not found', 404)

    // Include verification docs if available
    const { rows: verRows } = await query(
      `SELECT photo_url, aadhaar_url, marks_10th_url, marks_12th_url,
              degree_marksheet_url, degree_url, diploma_marksheet_url,
              diploma_cert_url, experience_letter_url, relieving_letter_url,
              education_type, has_experience
       FROM employee_verifications WHERE employee_id=$1 LIMIT 1`,
      [employee.id]
    )
    const verification = verRows[0] || null
    return ok(res, { ...employee, ...( verification || {}) })
  } catch (err) { next(err) }
}

// GET /api/employees/:id
const getById = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id)
    if (!employee) return fail(res, 'Employee not found', 404)
    return ok(res, employee)
  } catch (err) { next(err) }
}

// POST /api/employees
const create = async (req, res, next) => {
  try {
    const {
      user_id, employee_id, first_name, last_name, email,
      phone, department_id, designation, manager_id,
      join_date, work_mode, salary, location,
    } = req.body

    if (!first_name || !last_name) return fail(res, 'First name and last name are required', 400)

    // Use admin-provided username & password, or auto-generate if not provided
    let username      = req.body.username?.trim()
    let plainPassword = req.body.password

    if (!username) {
      username = await generateUsername(first_name, last_name)
    } else {
      // Check username not already taken
      const { rows: existing } = await query(`SELECT id FROM users WHERE username = $1`, [username])
      if (existing.length) return fail(res, `Username "${username}" is already taken. Please choose a different one.`, 409)
    }

    if (!plainPassword || plainPassword.length < 6) {
      if (!req.body.password) {
        plainPassword = generatePassword(first_name) // fallback auto-generate
      } else {
        return fail(res, 'Password must be at least 6 characters', 400)
      }
    }

    // Hash password with bcryptjs
    const bcrypt = require('bcryptjs')
    const hash   = await bcrypt.hash(plainPassword, 12)

    // Use a transaction — if employee create fails, user is also rolled back
    const client = await require('../config/db').pool.connect()
    let emp
    try {
      await client.query('BEGIN')

      // Create user login account
      const { rows: userRows } = await client.query(
        `INSERT INTO users (name, email, username, password_hash, role, is_first_login, is_active)
         VALUES ($1, $2, $3, $4, 'employee', true, true)
         RETURNING id`,
        [`${first_name} ${last_name}`, email || '', username, hash]
      )
      const newUserId = userRows[0].id

      // Create employee profile
      const empId = employee_id || `EMP${String(newUserId).padStart(4, '0')}`
      const { rows: empRows } = await client.query(
        `INSERT INTO employees
           (user_id, employee_id, first_name, last_name, email, phone,
            department_id, designation, manager_id, join_date, work_mode, salary, location)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         RETURNING *`,
        [
          user_id || newUserId,
          empId,
          first_name,
          last_name,
          email         || null,
          phone         || null,
          department_id ? parseInt(department_id) : null,
          designation   || null,
          manager_id    ? parseInt(manager_id)    : null,
          join_date     || null,
          (work_mode    || 'office').toLowerCase(),
          salary        ? parseFloat(salary)      : null,
          location      || null,
        ]
      )
      emp = empRows[0]

      await client.query('COMMIT')
    } catch (txErr) {
      await client.query('ROLLBACK')
      client.release()
      throw txErr
    }
    client.release()

    await auditLog(req.user.id, 'CREATE_EMPLOYEE', 'employee', emp.id)

    // Return employee + plain credentials (admin shows these to employee)
    return created(res, {
      employee:    emp,
      credentials: { username, password: plainPassword },
    }, 'Employee created')
  } catch (err) { next(err) }
}

// GET /api/employees/verify-documents/check-id?company_id=  (check duplicate company ID)
const checkCompanyId = async (req, res, next) => {
  try {
    const { company_id } = req.query
    if (!company_id) return ok(res, { exists: false })

    const { rows } = await query(
      `SELECT ev.id FROM employee_verifications ev
       JOIN employees e ON ev.employee_id = e.id
       JOIN users u ON e.user_id = u.id
       WHERE ev.company_provided_id = $1
         AND u.id != $2`,
      [company_id, req.user.id]
    )
    return ok(res, { exists: rows.length > 0 })
  } catch (err) { next(err) }
}
const verifyDocuments = async (req, res, next) => {
  try {
    const {
      full_name, dob, gender,
      company_id, department, designation,
      contact_number, alternate_number,
      address_line1, address_line2, city, state, pincode,
      has_experience, education_type,
      bank_account_name, bank_account_number, bank_ifsc_code, bank_branch,
    } = req.body

    // ── Helper: extract saved file URL by field name ──────────────────────
    const fileUrl = (fieldName) => {
      const files = req.files?.[fieldName]
      if (!files || !files.length) return null
      return getFileUrl('documents', files[0].filename)
    }

    // ── File URLs from uploaded documents ─────────────────────────────────
    const photoUrl              = fileUrl('photo')
    const aadhaarUrl            = fileUrl('aadhaar_card')
    const marks10thUrl          = fileUrl('marks_10th')
    const marks12thUrl          = fileUrl('marks_12th')
    const degreeMarksheetUrl    = fileUrl('degree_marksheet')
    const degreeCertUrl         = fileUrl('degree_certificate')
    const diplomaMarksheetUrl   = fileUrl('diploma_marksheet')
    const diplomaCertUrl        = fileUrl('diploma_certificate')
    const experienceLetterUrl   = fileUrl('experience_letter')
    const relievingLetterUrl    = fileUrl('relieving_letter')

    // ── Find employee record ───────────────────────────────────────────────
    const employee = await Employee.findByUserId(req.user.id)

    if (employee) {
      // Update employees table — name, phone, designation, location
      const parts      = (full_name || '').trim().split(' ')
      const first_name = parts[0] || employee.first_name
      const last_name  = parts.slice(1).join(' ') || employee.last_name

      const updatePayload = {
        first_name,
        last_name,
        phone:       contact_number || employee.phone,
        designation: designation    || employee.designation,
        location:    city && state ? `${city}, ${state}` : employee.location,
      }
      // Update avatar_url if photo was uploaded
      if (photoUrl) updatePayload.avatar_url = photoUrl

      await Employee.update(employee.id, updatePayload)

      // Save all verification data including document URLs
      await query(
        `INSERT INTO employee_verifications
           (employee_id, dob, gender, company_provided_id, department,
            contact_number, alternate_number,
            address_line1, address_line2, city, state, pincode,
            has_experience,
            photo_url, aadhaar_url,
            education_type,
            marks_10th_url, marks_12th_url,
            degree_marksheet_url, degree_url,
            diploma_marksheet_url, diploma_cert_url,
            experience_letter_url, relieving_letter_url,
            bank_account_name, bank_account_number, bank_ifsc_code, bank_branch,
            verified_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,
                 $14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,
                 $25,$26,$27,$28,NOW())
         ON CONFLICT (employee_id) DO UPDATE SET
           dob=$2, gender=$3, company_provided_id=$4, department=$5,
           contact_number=$6, alternate_number=$7,
           address_line1=$8, address_line2=$9, city=$10, state=$11, pincode=$12,
           has_experience=$13,
           photo_url        = COALESCE($14, employee_verifications.photo_url),
           aadhaar_url      = COALESCE($15, employee_verifications.aadhaar_url),
           education_type=$16,
           marks_10th_url   = COALESCE($17, employee_verifications.marks_10th_url),
           marks_12th_url   = COALESCE($18, employee_verifications.marks_12th_url),
           degree_marksheet_url = COALESCE($19, employee_verifications.degree_marksheet_url),
           degree_url       = COALESCE($20, employee_verifications.degree_url),
           diploma_marksheet_url = COALESCE($21, employee_verifications.diploma_marksheet_url),
           diploma_cert_url = COALESCE($22, employee_verifications.diploma_cert_url),
           experience_letter_url = COALESCE($23, employee_verifications.experience_letter_url),
           relieving_letter_url  = COALESCE($24, employee_verifications.relieving_letter_url),
           bank_account_name=$25, bank_account_number=$26,
           bank_ifsc_code=$27, bank_branch=$28,
           verified_at=NOW()`,
        [
          employee.id, dob, gender, company_id, department || null,
          contact_number, alternate_number || null,
          address_line1, address_line2 || null, city, state, pincode,
          has_experience === 'yes',
          photoUrl, aadhaarUrl,
          education_type || null,
          marks10thUrl, marks12thUrl,
          degreeMarksheetUrl, degreeCertUrl,
          diplomaMarksheetUrl, diplomaCertUrl,
          experienceLetterUrl, relievingLetterUrl,
          bank_account_name || null, bank_account_number || null,
          bank_ifsc_code || null, bank_branch || null,
        ]
      )

      await Employee.updateProfileCompletion(employee.id)
      await auditLog(req.user.id, 'VERIFY_DOCUMENTS', 'employee', employee.id)
    }

    // Mark first login done
    await query(`UPDATE users SET is_first_login=false, updated_at=NOW() WHERE id=$1`, [req.user.id])

    return ok(res, null, 'Documents verified successfully')
  } catch (err) { next(err) }
}

// PUT /api/employees/my  — employee updates their own editable fields
const updateMyProfile = async (req, res, next) => {
  try {
    const employee = await Employee.findByUserId(req.user.id)
    if (!employee) return fail(res, 'Employee profile not found', 404)

    // Only allow employee to edit these safe fields
    const { phone, location, bio } = req.body
    const allowed = {}
    if (phone    !== undefined) allowed.phone    = phone    || null
    if (location !== undefined) allowed.location = location || null
    if (bio      !== undefined) allowed.bio      = bio      || null

    if (!Object.keys(allowed).length)
      return fail(res, 'No editable fields provided', 400)

    const emp = await Employee.update(employee.id, allowed)
    await Employee.updateProfileCompletion(employee.id)
    await auditLog(req.user.id, 'UPDATE_MY_PROFILE', 'employee', employee.id)
    return ok(res, emp, 'Profile updated')
  } catch (err) { next(err) }
}

// PUT /api/employees/:id
const update = async (req, res, next) => {
  try {
    const emp = await Employee.update(req.params.id, req.body)
    if (!emp) return fail(res, 'Employee not found', 404)
    await Employee.updateProfileCompletion(emp.id)
    await auditLog(req.user.id, 'UPDATE_EMPLOYEE', 'employee', emp.id)
    return ok(res, emp, 'Employee updated')
  } catch (err) { next(err) }
}

// POST /api/employees/:id/avatar
const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) return fail(res, 'No file uploaded', 400)
    const url = getFileUrl('avatars', req.file.filename)
    const emp = await Employee.update(req.params.id, { avatar_url: url })
    await Employee.updateProfileCompletion(emp.id)
    return ok(res, { avatar_url: url }, 'Avatar uploaded')
  } catch (err) { next(err) }
}

// DELETE /api/employees/:id
const remove = async (req, res, next) => {
  try {
    const { id } = req.params
    // Get user_id before deleting
    const { rows } = await query(`SELECT user_id FROM employees WHERE id = $1`, [id])
    if (!rows.length) return fail(res, 'Employee not found', 404)
    const userId = rows[0].user_id

    // Delete related data
    await query(`DELETE FROM employee_verifications WHERE employee_id = $1`, [id])
    await query(`DELETE FROM employees WHERE id = $1`, [id])
    if (userId) await query(`DELETE FROM users WHERE id = $1`, [userId])

    await auditLog(req.user.id, 'DELETE_EMPLOYEE', 'employee', id)
    return ok(res, null, 'Employee deleted')
  } catch (err) { next(err) }
}

// GET /api/employees/team  (manager gets their reportees)
const getTeam = async (req, res, next) => {
  try {
    const employee = await Employee.findByUserId(req.user.id)
    if (!employee) return fail(res, 'Manager profile not found', 404)
    const team = await Employee.findByManager(employee.id)
    return ok(res, team)
  } catch (err) { next(err) }
}

module.exports = { getAll, getById, getMyProfile, updateMyProfile, create, update, uploadAvatar, getTeam, verifyDocuments, remove, checkCompanyId }
