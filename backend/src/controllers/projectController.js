const { query }    = require('../config/db')
const { ok, created, fail } = require('../utils/response')
const auditLog     = require('../utils/auditLog')

// Valid status values
const VALID_STATUSES = ['planning', 'in_progress', 'review', 'completed', 'on_hold', 'cancelled']

// GET /api/projects — with team members + task counts + real completion %
const getAll = async (req, res, next) => {
  try {
    const { rows: projects } = await query(
      `SELECT p.*,
              u.name AS created_by_name,
              COUNT(DISTINCT t.id)::int                                               AS task_count,
              COUNT(DISTINCT CASE WHEN t.status = 'done' THEN t.id END)::int         AS done_count,
              COALESCE(ROUND(AVG(t.completion_percent)::numeric, 0), 0)::int         AS avg_task_completion
       FROM projects p
       LEFT JOIN users u ON p.created_by = u.id
       LEFT JOIN tasks t ON t.project_id = p.id
       GROUP BY p.id, u.name
       ORDER BY p.created_at DESC`
    )

    const withMembers = await Promise.all(projects.map(async p => {
      const { rows: members } = await query(
        `SELECT pm.employee_id, pm.role,
                e.first_name, e.last_name, e.avatar_url
         FROM project_members pm
         JOIN employees e ON pm.employee_id = e.id
         WHERE pm.project_id = $1`, [p.id]
      )
      // Use average of task completion_percent if tasks exist, else project's own field
      const computedPct = p.task_count > 0
        ? parseInt(p.avg_task_completion) || 0
        : p.completion_percent || 0
      return {
        ...p,
        members,
        task_count:         p.task_count || 0,
        done_count:         p.done_count || 0,
        completion_percent: computedPct,
      }
    }))

    return ok(res, withMembers)
  } catch (err) { next(err) }
}

// POST /api/projects
const create = async (req, res, next) => {
  try {
    const {
      name, description, type,
      client, start_date, deadline,
      project_manager, team_member_ids = [],
      status = 'planning',
    } = req.body

    if (!name?.trim()) return fail(res, 'Project name is required', 400)

    const resolvedStatus = VALID_STATUSES.includes(status) ? status : 'planning'

    const { rows } = await query(
      `INSERT INTO projects
         (name, description, type, client, start_date, deadline,
          project_manager, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        name.trim(),
        description  || null,
        type         || 'pre-production',
        client       || null,
        start_date   || null,
        deadline     || null,
        project_manager || null,
        resolvedStatus,
        req.user.id,
      ]
    )
    const project = rows[0]

    // Assign team members
    if (team_member_ids.length) {
      for (const empId of team_member_ids) {
        await query(
          `INSERT INTO project_members (project_id, employee_id, role)
           VALUES ($1,$2,'member') ON CONFLICT DO NOTHING`,
          [project.id, empId]
        )
      }
    }

    await auditLog(req.user.id, 'CREATE_PROJECT', 'projects', project.id)
    return created(res, { ...project, members: [] }, 'Project created')
  } catch (err) { next(err) }
}

// PUT /api/projects/:id
const update = async (req, res, next) => {
  try {
    const {
      name, description, type,
      client, start_date, deadline,
      project_manager, status, team_member_ids,
    } = req.body

    const resolvedStatus = status
      ? (VALID_STATUSES.includes(status) ? status : null)
      : null

    const { rows } = await query(
      `UPDATE projects SET
         name             = COALESCE($1, name),
         description      = COALESCE($2, description),
         type             = COALESCE($3, type),
         client           = COALESCE($4, client),
         start_date       = COALESCE($5, start_date),
         deadline         = COALESCE($6, deadline),
         project_manager  = COALESCE($7, project_manager),
         status           = COALESCE($8, status),
         updated_at       = NOW()
       WHERE id = $9 RETURNING *`,
      [
        name            || null,
        description     || null,
        type            || null,
        client          || null,
        start_date      || null,
        deadline        || null,
        project_manager || null,
        resolvedStatus,
        req.params.id,
      ]
    )
    if (!rows.length) return fail(res, 'Project not found', 404)

    // Update team members if provided
    if (Array.isArray(team_member_ids)) {
      await query(`DELETE FROM project_members WHERE project_id=$1`, [req.params.id])
      for (const empId of team_member_ids) {
        await query(
          `INSERT INTO project_members (project_id, employee_id, role)
           VALUES ($1,$2,'member') ON CONFLICT DO NOTHING`,
          [req.params.id, empId]
        )
      }
    }

    await auditLog(req.user.id, 'UPDATE_PROJECT', 'projects', req.params.id)
    return ok(res, rows[0], 'Project updated')
  } catch (err) { next(err) }
}

// DELETE /api/projects/:id
const remove = async (req, res, next) => {
  try {
    const { rows } = await query(`DELETE FROM projects WHERE id=$1 RETURNING id`, [req.params.id])
    if (!rows.length) return fail(res, 'Project not found', 404)
    await auditLog(req.user.id, 'DELETE_PROJECT', 'projects', req.params.id)
    return ok(res, null, 'Project deleted')
  } catch (err) { next(err) }
}

// GET /api/projects/my — employee's own projects (member of)
const getMyProjects = async (req, res, next) => {
  try {
    const empId = req.user.employee_id || req.user.id

    // Find all projects where this employee is a member
    const { rows: memberRows } = await query(
      `SELECT pm.project_id
       FROM project_members pm
       JOIN employees e ON pm.employee_id = e.id
       WHERE e.user_id = $1 OR pm.employee_id = $1`,
      [req.user.id]
    )

    if (!memberRows.length) return ok(res, [])

    const projectIds = memberRows.map(r => r.project_id)

    const { rows: projects } = await query(
      `SELECT p.*,
              u.name AS created_by_name,
              COUNT(DISTINCT t.id)::int                                               AS task_count,
              COUNT(DISTINCT CASE WHEN t.status = 'done' THEN t.id END)::int         AS done_count,
              COALESCE(ROUND(AVG(t.completion_percent)::numeric, 0), 0)::int         AS avg_task_completion
       FROM projects p
       LEFT JOIN users u ON p.created_by = u.id
       LEFT JOIN tasks t ON t.project_id = p.id
       WHERE p.id = ANY($1::int[])
       GROUP BY p.id, u.name
       ORDER BY p.created_at DESC`,
      [projectIds]
    )

    const withMembers = await Promise.all(projects.map(async p => {
      const { rows: members } = await query(
        `SELECT pm.employee_id, pm.role,
                e.first_name, e.last_name, e.avatar_url
         FROM project_members pm
         JOIN employees e ON pm.employee_id = e.id
         WHERE pm.project_id = $1`, [p.id]
      )
      const computedPct = p.task_count > 0
        ? parseInt(p.avg_task_completion) || 0
        : p.completion_percent || 0
      return {
        ...p,
        members,
        task_count:         p.task_count || 0,
        done_count:         p.done_count || 0,
        completion_percent: computedPct,
      }
    }))

    return ok(res, withMembers)
  } catch (err) { next(err) }
}

module.exports = { getAll, getMyProjects, create, update, remove }
