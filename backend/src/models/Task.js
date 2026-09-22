const db = require('../config/db')

const Task = {
  async create({ title, description, assigned_to, assigned_by, priority = 'medium', due_date, tags = [], project_id = null, project_name = null, source = 'hr' }) {
    const { rows } = await db.query(
      `INSERT INTO tasks
         (title, description, assigned_to, assigned_by, priority, due_date, tags, project_id, project_name, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [title, description, assigned_to, assigned_by, priority, due_date, tags, project_id, project_name, source]
    )
    return rows[0]
  },

  async findById(id) {
    const { rows } = await db.query(
      `SELECT t.*,
              a.first_name || ' ' || a.last_name AS assigned_to_name,
              b.first_name || ' ' || b.last_name AS assigned_by_name
       FROM tasks t
       LEFT JOIN employees a ON t.assigned_to = a.id
       LEFT JOIN employees b ON t.assigned_by = b.id
       WHERE t.id = $1`, [id]
    )
    return rows[0] || null
  },

  async findByEmployee(employee_id, { status, priority, month, year } = {}) {
    // Default to current month/year
    const now = new Date()
    const m   = month ? parseInt(month) : now.getMonth() + 1   // 1-12
    const y   = year  ? parseInt(year)  : now.getFullYear()

    // Month start (inclusive) and end (exclusive)
    const monthStart = `${y}-${String(m).padStart(2,'0')}-01`
    const monthEnd   = m === 12
      ? `${y + 1}-01-01`
      : `${y}-${String(m + 1).padStart(2,'0')}-01`

    let q = `
      SELECT t.*,
             b.first_name || ' ' || b.last_name AS assigned_by_name,
             b.avatar_url                        AS assigned_by_avatar,
             t.project_name,
             t.source
      FROM tasks t
      LEFT JOIN employees b ON t.assigned_by = b.id
      WHERE t.assigned_to = $1
        AND t.created_at >= $2
        AND t.created_at <  $3`
    const params = [employee_id, monthStart, monthEnd]

    if (status)   { params.push(status);   q += ` AND t.status = $${params.length}` }
    if (priority) { params.push(priority); q += ` AND t.priority = $${params.length}` }

    q += ` ORDER BY
             CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
             t.due_date ASC NULLS LAST`
    const { rows } = await db.query(q, params)
    return rows
  },

  async findByManager(manager_id, filters = {}) {
    let q = `
      SELECT t.*,
             a.first_name || ' ' || a.last_name AS assigned_to_name
      FROM tasks t
      JOIN employees a ON t.assigned_to = a.id
      WHERE t.assigned_by = $1`
    const params = [manager_id]
    if (filters.status)   { params.push(filters.status);   q += ` AND t.status = $${params.length}` }
    if (filters.priority) { params.push(filters.priority); q += ` AND t.priority = $${params.length}` }
    q += ` ORDER BY t.created_at DESC`
    const { rows } = await db.query(q, params)
    return rows
  },

  async updateStatus(id, status, pct) {
    const completion = pct !== undefined ? pct : (status === 'done' ? 100 : undefined)
    const { rows } = await db.query(
      `UPDATE tasks SET status = $1,
         completion_percent = COALESCE($2, completion_percent),
         updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [status, completion ?? null, id]
    )
    return rows[0] || null
  },

  async update(id, fields) {
    const allowed = ['title', 'description', 'priority', 'status', 'due_date', 'completion_percent', 'tags']
    const sets = []; const vals = []
    Object.entries(fields).forEach(([k, v]) => {
      if (allowed.includes(k)) { vals.push(v); sets.push(`${k} = $${vals.length}`) }
    })
    if (!sets.length) return null
    vals.push(id)
    const { rows } = await db.query(
      `UPDATE tasks SET ${sets.join(', ')}, updated_at = NOW()
       WHERE id = $${vals.length} RETURNING *`, vals
    )
    return rows[0] || null
  },

  async delete(id) {
    await db.query(`DELETE FROM tasks WHERE id = $1`, [id])
  },

  async addComment(task_id, author_id, content) {
    const { rows } = await db.query(
      `INSERT INTO task_comments (task_id, author_id, content)
       VALUES ($1, $2, $3) RETURNING *`,
      [task_id, author_id, content]
    )
    // bump comment count
    await db.query(`UPDATE tasks SET comments_count = comments_count + 1 WHERE id = $1`, [task_id])
    return rows[0]
  },

  async getComments(task_id) {
    const { rows } = await db.query(
      `SELECT tc.*, e.first_name || ' ' || e.last_name AS author_name, e.avatar_url
       FROM task_comments tc
       JOIN employees e ON tc.author_id = e.id
       WHERE tc.task_id = $1
       ORDER BY tc.created_at ASC`, [task_id]
    )
    return rows
  },

  async findByProject(project_id) {
    const { rows } = await db.query(
      `SELECT t.*,
              a.first_name || ' ' || a.last_name AS assigned_to_name,
              a.avatar_url AS assigned_to_avatar,
              b.first_name || ' ' || b.last_name AS assigned_by_name
       FROM tasks t
       LEFT JOIN employees a ON t.assigned_to = a.id
       LEFT JOIN employees b ON t.assigned_by = b.id
       WHERE t.project_id = $1
       ORDER BY t.created_at ASC`,
      [project_id]
    )
    return rows
  },
}

module.exports = Task
