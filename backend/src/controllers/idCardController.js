const db        = require('../config/db')

// ── Templates ─────────────────────────────────────────────────────────────────

// GET /api/id-cards/templates — list active templates
const getTemplates = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, name, description, design_config, is_active, created_at
       FROM id_card_templates
       WHERE is_active = true
       ORDER BY created_at DESC`
    )
    res.json({ success: true, data: rows })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// GET /api/id-cards/templates/all — list all templates (admin)
const getAllTemplates = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT t.*, u.name AS created_by_name
       FROM id_card_templates t
       LEFT JOIN users u ON u.id = t.created_by
       ORDER BY t.created_at DESC`
    )
    res.json({ success: true, data: rows })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// POST /api/id-cards/templates — create template (admin)
const createTemplate = async (req, res) => {
  try {
    const { name, description, design_config } = req.body
    if (!name) return res.status(400).json({ success: false, message: 'Template name is required' })

    const { rows } = await db.query(
      `INSERT INTO id_card_templates (name, description, design_config, created_by)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, description || null, JSON.stringify(design_config || {}), req.user.id]
    )
    res.status(201).json({ success: true, data: rows[0], message: 'Template created' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// PUT /api/id-cards/templates/:id — update template (admin)
const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params
    const { name, description, design_config, is_active } = req.body

    const { rows } = await db.query(
      `UPDATE id_card_templates
       SET name=$1, description=$2, design_config=$3, is_active=$4, updated_at=NOW()
       WHERE id=$5 RETURNING *`,
      [name, description, JSON.stringify(design_config), is_active, id]
    )
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Template not found' })
    res.json({ success: true, data: rows[0], message: 'Template updated' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// DELETE /api/id-cards/templates/:id — delete template (admin)
const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params
    await db.query(`DELETE FROM id_card_templates WHERE id = $1`, [id])
    res.json({ success: true, message: 'Template deleted' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// ── Employee ID Cards ──────────────────────────────────────────────────────────

// GET /api/id-cards/my — get employee's generated card
const getMyCard = async (req, res) => {
  try {
    const emp = await _getEmpByUserId(req.user.id)
    if (!emp) return res.status(404).json({ success: false, message: 'Employee not found' })

    const { rows } = await db.query(
      `SELECT c.*, t.name AS template_name, t.design_config
       FROM employee_id_cards c
       JOIN id_card_templates t ON t.id = c.template_id
       WHERE c.employee_id = $1
       ORDER BY c.updated_at DESC`,
      [emp.id]
    )
    res.json({ success: true, data: rows })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// POST /api/id-cards/generate — employee generates ID card
const generateCard = async (req, res) => {
  try {
    const emp = await _getEmpByUserId(req.user.id)
    if (!emp) return res.status(404).json({ success: false, message: 'Employee not found' })

    const { template_id, custom_name, custom_designation, custom_emp_id } = req.body
    if (!template_id) return res.status(400).json({ success: false, message: 'Template ID is required' })

    // Handle photo upload if provided
    let photo_url = null
    if (req.file) {
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000'
      photo_url = `${backendUrl}/uploads/${req.file.filename}`
    }

    // Upsert card record
    const { rows } = await db.query(
      `INSERT INTO employee_id_cards
         (employee_id, template_id, custom_name, custom_designation, custom_emp_id, photo_url, generated_at)
       VALUES ($1,$2,$3,$4,$5,$6, NOW())
       ON CONFLICT (employee_id, template_id)
       DO UPDATE SET
         custom_name=$3, custom_designation=$4, custom_emp_id=$5,
         photo_url=COALESCE($6, employee_id_cards.photo_url),
         generated_at=NOW(), updated_at=NOW()
       RETURNING *`,
      [emp.id, template_id, custom_name || emp.first_name + ' ' + emp.last_name,
       custom_designation || emp.designation || 'Employee',
       custom_emp_id || emp.employee_id, photo_url]
    )

    // Fetch with template
    const { rows: full } = await db.query(
      `SELECT c.*, t.name AS template_name, t.design_config
       FROM employee_id_cards c
       JOIN id_card_templates t ON t.id = c.template_id
       WHERE c.id = $1`, [rows[0].id]
    )

    res.json({ success: true, data: full[0], message: 'ID card generated successfully' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// GET /api/id-cards/admin/all — admin gets all generated cards
const getAllCards = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT c.*,
              e.first_name, e.last_name, e.employee_id AS emp_code,
              e.avatar_url, e.designation, e.department_id,
              d.name AS department_name,
              t.name AS template_name, t.design_config
       FROM employee_id_cards c
       JOIN employees e ON e.id = c.employee_id
       LEFT JOIN departments d ON d.id = e.department_id
       JOIN id_card_templates t ON t.id = c.template_id
       ORDER BY c.updated_at DESC`
    )
    res.json({ success: true, data: rows })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// GET /api/id-cards/admin/employee/:empId — get specific employee's card
const getEmployeeCard = async (req, res) => {
  try {
    const { empId } = req.params
    const { rows } = await db.query(
      `SELECT c.*,
              e.first_name, e.last_name, e.employee_id AS emp_code,
              e.avatar_url, e.designation,
              d.name AS department_name,
              t.name AS template_name, t.design_config
       FROM employee_id_cards c
       JOIN employees e ON e.id = c.employee_id
       LEFT JOIN departments d ON d.id = e.department_id
       JOIN id_card_templates t ON t.id = c.template_id
       WHERE c.employee_id = $1
       ORDER BY c.updated_at DESC`,
      [empId]
    )
    res.json({ success: true, data: rows })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// ── Helper ────────────────────────────────────────────────────────────────────
async function _getEmpByUserId(userId) {
  const { rows } = await db.query(
    `SELECT e.*, d.name AS department_name
     FROM employees e
     LEFT JOIN departments d ON d.id = e.department_id
     WHERE e.user_id = $1`, [userId]
  )
  return rows[0] || null
}

module.exports = {
  getTemplates, getAllTemplates, createTemplate, updateTemplate, deleteTemplate,
  getMyCard, generateCard,
}
