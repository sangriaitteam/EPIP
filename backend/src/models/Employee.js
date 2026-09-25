const db = require('../config/db')

const Employee = {
  async create(data) {
    const {
      user_id, employee_id, first_name, last_name, email, phone,
      department_id, designation, manager_id, join_date,
      work_mode = 'office', salary, location,
    } = data
    const { rows } = await db.query(
      `INSERT INTO employees
         (user_id, employee_id, first_name, last_name, email, phone,
          department_id, designation, manager_id, join_date, work_mode, salary, location)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [user_id, employee_id, first_name, last_name, email, phone,
       department_id, designation, manager_id, join_date, work_mode, salary, location]
    )
    return rows[0]
  },

  async findById(id) {
    const { rows } = await db.query(
      `SELECT e.*,
              d.name AS department_name,
              m.first_name || ' ' || m.last_name AS manager_name,
              u.role
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN employees  m ON e.manager_id = m.id
       LEFT JOIN users      u ON e.user_id = u.id
       WHERE e.id = $1`,
      [id]
    )
    return rows[0] || null
  },

  async findByUserId(user_id) {
    const { rows } = await db.query(
      `SELECT e.*, d.name AS department_name
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE e.user_id = $1`,
      [user_id]
    )
    return rows[0] || null
  },

  async findAll({ department_id, work_mode, status, search } = {}) {
    let q = `
      SELECT e.id, e.employee_id, e.first_name, e.last_name, e.email, e.phone,
             e.designation, e.work_mode, e.status, e.join_date, e.profile_completion,
             e.avatar_url, d.name AS department_name,
             m.first_name || ' ' || m.last_name AS manager_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN employees   m ON e.manager_id    = m.id
      WHERE 1=1`
    const params = []
    if (department_id) { params.push(department_id); q += ` AND e.department_id = $${params.length}` }
    if (work_mode)     { params.push(work_mode);     q += ` AND e.work_mode = $${params.length}` }
    if (status)        { params.push(status);        q += ` AND e.status = $${params.length}` }
    if (search) {
      params.push(`%${search}%`)
      q += ` AND (e.first_name ILIKE $${params.length} OR e.last_name ILIKE $${params.length} OR e.email ILIKE $${params.length})`
    }
    q += ` ORDER BY e.created_at DESC`
    const { rows } = await db.query(q, params)
    return rows
  },

  async findByManager(manager_id) {
    const { rows } = await db.query(
      `SELECT e.*, d.name AS department_name
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE e.manager_id = $1 AND e.status = 'active'
       ORDER BY e.first_name`,
      [manager_id]
    )
    return rows
  },

  async update(id, fields) {
    const allowed = [
      'first_name', 'last_name', 'phone', 'department_id', 'designation',
      'manager_id', 'work_mode', 'salary', 'location', 'status', 'avatar_url',
      'profile_completion', 'join_date',
    ]
    const sets = []
    const vals = []
    Object.entries(fields).forEach(([k, v]) => {
      if (allowed.includes(k)) { vals.push(v); sets.push(`${k} = $${vals.length}`) }
    })
    if (!sets.length) return null
    vals.push(id)
    const { rows } = await db.query(
      `UPDATE employees SET ${sets.join(', ')}, updated_at = NOW()
       WHERE id = $${vals.length} RETURNING *`,
      vals
    )
    return rows[0] || null
  },

  async updateProfileCompletion(id) {
    // Fetch employee + verification data together
    const { rows: empRows } = await db.query(
      `SELECT e.*,
              ev.dob, ev.gender, ev.contact_number, ev.address_line1, ev.city,
              ev.has_experience,
              ev.aadhaar_url,
              ev.marks_10th_url, ev.marks_12th_url,
              ev.degree_url, ev.degree_marksheet_url,
              ev.diploma_marksheet_url, ev.diploma_cert_url,
              ev.experience_letter_url, ev.relieving_letter_url,
              ev.bank_account_number,
              ev.verified_at
       FROM employees e
       LEFT JOIN employee_verifications ev ON ev.employee_id = e.id
       WHERE e.id = $1`, [id]
    )
    if (!empRows[0]) return
    const emp = empRows[0]

    // ── Required profile fields (from employees table) ────────────────────
    const requiredFields = [
      { key: 'phone',         val: emp.phone },
      { key: 'designation',   val: emp.designation },
      { key: 'location',      val: emp.location },
      { key: 'avatar_url',    val: emp.avatar_url },
      // From verification
      { key: 'dob',           val: emp.dob },
      { key: 'gender',        val: emp.gender },
      { key: 'contact_number',val: emp.contact_number },
      { key: 'address_line1', val: emp.address_line1 },
      { key: 'city',          val: emp.city },
      { key: 'aadhaar_url',   val: emp.aadhaar_url },
      { key: 'bank_account_number', val: emp.bank_account_number },
    ]

    // ── Optional document fields (tracked as "missing docs") ─────────────
    const optionalDocs = [
      { key: 'marks_10th_url',       val: emp.marks_10th_url },
      { key: 'marks_12th_url',       val: emp.marks_12th_url },
      { key: 'degree_url',           val: emp.degree_url || emp.degree_marksheet_url },
    ]

    // Experience docs — only count if NOT fresher
    const isFresher = emp.has_experience === false || emp.has_experience === null
    if (!isFresher) {
      optionalDocs.push({ key: 'experience_letter_url', val: emp.experience_letter_url })
      optionalDocs.push({ key: 'relieving_letter_url',  val: emp.relieving_letter_url })
    }

    const filledRequired = requiredFields.filter(f => f.val !== null && f.val !== undefined && f.val !== '').length
    const filledOptional = optionalDocs.filter(f => f.val !== null && f.val !== undefined && f.val !== '').length

    // Required fields = 80% weight, optional docs = 20% weight
    const requiredPct = Math.round((filledRequired / requiredFields.length) * 80)
    const optionalPct = optionalDocs.length > 0
      ? Math.round((filledOptional / optionalDocs.length) * 20)
      : 20 // fresher gets full optional % since no exp docs needed

    const pct = Math.min(100, requiredPct + optionalPct)
    await db.query(`UPDATE employees SET profile_completion = $1 WHERE id = $2`, [pct, id])
    return pct
  },

  // Returns list of missing doc keys for the employee
  async getMissingDocs(id) {
    const { rows } = await db.query(
      `SELECT ev.has_experience,
              ev.marks_10th_url, ev.marks_12th_url,
              ev.degree_url, ev.degree_marksheet_url,
              ev.experience_letter_url, ev.relieving_letter_url
       FROM employee_verifications ev
       WHERE ev.employee_id = $1`, [id]
    )
    if (!rows[0]) return []
    const ev = rows[0]

    const missing = []
    if (!ev.marks_10th_url)  missing.push('10th Marks Card')
    if (!ev.marks_12th_url)  missing.push('12th Marks Card')
    if (!ev.degree_url && !ev.degree_marksheet_url) missing.push('Degree Certificate')

    const isFresher = ev.has_experience === false || ev.has_experience === null
    if (!isFresher) {
      if (!ev.experience_letter_url) missing.push('Experience Letter')
      if (!ev.relieving_letter_url)  missing.push('Relieving Letter')
    }

    return missing
  },
}

module.exports = Employee
