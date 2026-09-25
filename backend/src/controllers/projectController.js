const { query } = require('../config/db')
const { ok, created, fail } = require('../utils/response')
const auditLog = require('../utils/auditLog')

// ── GET /api/projects — PM/Admin gets all projects ────────────────────────────
const getAll = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT p.*,
              u.name AS created_by_name,
              COUNT(DISTINCT pm.employee_id)::int AS member_count,
              COUNT(DISTINCT t.id)::int           AS task_count,
              COUNT(DISTINCT CASE WHEN t.status='done' THEN t.id END)::int AS done_count,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id',e.id,'first_name',e.first_name,'last_name',e.last_name,'avatar_url',e.avatar_url
                  )
                ) FILTER (WHERE e.id IS NOT NULL),
                '[]'
              ) AS members
       FROM projects p
       LEFT JOIN users u ON u.id = p.created_by
       LEFT JOIN project_members pm ON pm.project_id = p.id
       LEFT JOIN employees e ON e.id = pm.employee_id
       LEFT JOIN tasks t ON t.project_id = p.id
       GROUP BY p.id, u.name
       ORDER BY p.created_at DESC`
    )
    return ok(res, { projects: rows })
  } catch (err) { next(err) }
}

// ── GET /api/projects/my — employee gets their projects ───────────────────────
const getMy = async (req, res, next) => {
  try {
    // Find employee record for this user
    const { rows: empRows } = await query(
      `SELECT id FROM employees WHERE user_id = $1`, [req.user.id]
    )
    if (!empRows[0]) return ok(res, [])
    const empId = empRows[0].id

    const { rows } = await query(
      `SELECT p.*,
              COUNT(DISTINCT t.id)::int AS task_count,
              COUNT(DISTINCT CASE WHEN t.status='done' THEN t.id END)::int AS done_count,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id',e.id,'first_name',e.first_name,'last_name',e.last_name,'avatar_url',e.avatar_url
                  )
                ) FILTER (WHERE e.id IS NOT NULL),
                '[]'
              ) AS members
       FROM projects p
       JOIN project_members pm ON pm.project_id = p.id AND pm.employee_id = $1
       LEFT JOIN project_members pm2 ON pm2.project_id = p.id
       LEFT JOIN employees e ON e.id = pm2.employee_id
       LEFT JOIN tasks t ON t.project_id = p.id
       GROUP BY p.id
       ORDER BY p.created_at DESC`,
      [empId]
    )
    return ok(res, rows)
  } catch (err) { next(err) }
}

// ── POST /api/projects — create project ───────────────────────────────────────
const create = async (req, res, next) => {
  try {
    const {
      name, description, start_date, deadline,
      status = 'planning', priority = 'medium',
      team_member_ids = [], client, project_manager,
    } = req.body

    if (!name?.trim()) return fail(res, 'Project name is required', 400)

    const { rows } = await query(
      `INSERT INTO projects
         (name, description, start_date, deadline, status, priority,
          client, project_manager, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [name.trim(), description || null, start_date || null, deadline || null,
       status, priority, client || null, project_manager || null, req.user.id]
    )
    const project = rows[0]

    // Add team members
    if (team_member_ids.length) {
      for (const empId of team_member_ids) {
        await query(
          `INSERT INTO project_members (project_id, employee_id)
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [project.id, empId]
        )
      }
    }

    await auditLog(req.user.id, 'CREATE_PROJECT', 'project', project.id)
    return created(res, project, 'Project created')
  } catch (err) { next(err) }
}

// ── PUT /api/projects/:id — update project ────────────────────────────────────
const update = async (req, res, next) => {
  try {
    const { id } = req.params
    const { name, description, start_date, deadline, status, priority, completion_percent, client, project_manager, team_member_ids } = req.body

    const allowed = { name, description, start_date, deadline, status, priority, completion_percent, client, project_manager }
    const sets = []
    const vals = []
    Object.entries(allowed).forEach(([k, v]) => {
      if (v !== undefined) { vals.push(v); sets.push(`${k} = $${vals.length}`) }
    })
    if (!sets.length && !team_member_ids) return fail(res, 'Nothing to update', 400)

    let project = null
    if (sets.length) {
      vals.push(id)
      const { rows } = await query(
        `UPDATE projects SET ${sets.join(', ')}, updated_at=NOW() WHERE id=$${vals.length} RETURNING *`,
        vals
      )
      if (!rows[0]) return fail(res, 'Project not found', 404)
      project = rows[0]
    }

    // Update team members if provided
    if (team_member_ids) {
      await query(`DELETE FROM project_members WHERE project_id=$1`, [id])
      for (const empId of team_member_ids) {
        await query(
          `INSERT INTO project_members (project_id, employee_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
          [id, empId]
        )
      }
    }

    await auditLog(req.user.id, 'UPDATE_PROJECT', 'project', id)
    return ok(res, project, 'Project updated')
  } catch (err) { next(err) }
}

// ── DELETE /api/projects/:id ──────────────────────────────────────────────────
const remove = async (req, res, next) => {
  try {
    const { id } = req.params
    await query(`DELETE FROM project_members WHERE project_id=$1`, [id])
    await query(`DELETE FROM projects WHERE id=$1`, [id])
    await auditLog(req.user.id, 'DELETE_PROJECT', 'project', id)
    return ok(res, null, 'Project deleted')
  } catch (err) { next(err) }
}

module.exports = { getAll, getMy, create, update, remove }
