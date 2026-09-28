const { query } = require('../config/db')
const { ok, created, fail } = require('../utils/response')
const auditLog = require('../utils/auditLog')

// ── GET /api/projects/:id — single project with full details ─────────────────
const getById = async (req, res, next) => {
  try {
    const { id } = req.params

    // Main project row + members
    const { rows } = await query(
      `SELECT p.*,
              u.name AS created_by_name,
              COUNT(DISTINCT pm.employee_id)::int AS member_count,
              COUNT(DISTINCT t.id)::int           AS task_count,
              COUNT(DISTINCT CASE WHEN t.status='done' THEN t.id END)::int AS done_count,
              COALESCE(
                (SELECT json_agg(
                   json_build_object(
                     'id',e2.id,'first_name',e2.first_name,'last_name',e2.last_name,
                     'avatar_url',e2.avatar_url,'designation',e2.designation,
                     'role', COALESCE(pm2.role,'Member')
                   )
                 )
                 FROM project_members pm2
                 JOIN employees e2 ON e2.id = pm2.employee_id
                 WHERE pm2.project_id = p.id
                ), '[]'
              ) AS members
       FROM projects p
       LEFT JOIN users u ON u.id = p.created_by
       LEFT JOIN project_members pm ON pm.project_id = p.id
       LEFT JOIN tasks t ON t.project_id = p.id
       WHERE p.id = $1
       GROUP BY p.id, u.name`,
      [id]
    )
    if (!rows[0]) return fail(res, 'Project not found', 404)
    const project = rows[0]

    // Tasks for this project
    const { rows: tasks } = await query(
      `SELECT t.*,
              e.first_name || ' ' || e.last_name AS assignee_name,
              e.avatar_url AS assignee_avatar,
              ab.first_name || ' ' || ab.last_name AS assigned_by_name
       FROM tasks t
       LEFT JOIN employees e  ON e.id  = t.assigned_to
       LEFT JOIN employees ab ON ab.id = t.assigned_by
       WHERE t.project_id = $1
       ORDER BY t.created_at DESC`,
      [id]
    )

    // Per-member task stats
    const { rows: memberStats } = await query(
      `SELECT
         e.id, e.first_name, e.last_name, e.avatar_url, e.designation,
         COALESCE(pm.role,'Member') AS role,
         COUNT(t.id)::int                                                  AS total_tasks,
         COUNT(CASE WHEN t.status='done' THEN 1 END)::int                  AS done_tasks
       FROM project_members pm
       JOIN employees e ON e.id = pm.employee_id
       LEFT JOIN tasks t ON t.project_id = $1 AND t.assigned_to = e.id
       WHERE pm.project_id = $1
       GROUP BY e.id, e.first_name, e.last_name, e.avatar_url, e.designation, pm.role
       ORDER BY done_tasks DESC`,
      [id]
    )

    return ok(res, { project, tasks, memberStats })
  } catch (err) { next(err) }
}

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
                (
                  SELECT json_agg(
                    json_build_object(
                      'id',e2.id,'first_name',e2.first_name,'last_name',e2.last_name,'avatar_url',e2.avatar_url
                    )
                  )
                  FROM project_members pm2
                  JOIN employees e2 ON e2.id = pm2.employee_id
                  WHERE pm2.project_id = p.id
                ),
                '[]'
              ) AS members
       FROM projects p
       LEFT JOIN users u ON u.id = p.created_by
       LEFT JOIN project_members pm ON pm.project_id = p.id
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
                (
                  SELECT json_agg(
                    json_build_object(
                      'id',e2.id,'first_name',e2.first_name,'last_name',e2.last_name,'avatar_url',e2.avatar_url
                    )
                  )
                  FROM project_members pm2
                  JOIN employees e2 ON e2.id = pm2.employee_id
                  WHERE pm2.project_id = p.id
                ),
                '[]'
              ) AS members
       FROM projects p
       JOIN project_members pm ON pm.project_id = p.id AND pm.employee_id = $1
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

// ── GET /api/projects/:id/reports — full reports data ────────────────────────
const getReports = async (req, res, next) => {
  try {
    const { id } = req.params
    const { member_id, task_type, status_filter, date_from, date_to } = req.query

    // Date range — default to project lifetime or last 30 days
    const { rows: projRows } = await query(`SELECT start_date, deadline, end_date FROM projects WHERE id=$1`, [id])
    if (!projRows[0]) return fail(res, 'Project not found', 404)
    const proj = projRows[0]
    const from = date_from || proj.start_date || new Date(Date.now() - 30*86400000).toISOString().split('T')[0]
    const to   = date_to   || proj.deadline   || proj.end_date || new Date().toISOString().split('T')[0]

    // Build task filter
    let taskWhere = `t.project_id = $1`
    const taskParams = [id]
    if (member_id && member_id !== 'all') {
      taskParams.push(member_id)
      taskWhere += ` AND t.assigned_to = $${taskParams.length}`
    }
    if (status_filter && status_filter !== 'all') {
      taskParams.push(status_filter)
      taskWhere += ` AND t.status = $${taskParams.length}`
    }

    // All tasks for this project (filtered)
    const { rows: tasks } = await query(
      `SELECT t.id, t.title, t.status, t.priority, t.due_date, t.created_at, t.updated_at,
              t.completion_percent, t.assigned_to,
              e.first_name || ' ' || e.last_name AS assignee_name,
              e.avatar_url AS assignee_avatar
       FROM tasks t
       LEFT JOIN employees e ON e.id = t.assigned_to
       WHERE ${taskWhere}
       ORDER BY t.created_at ASC`,
      taskParams
    )

    // Summary counts
    const total      = tasks.length
    const completed  = tasks.filter(t => t.status === 'done').length
    const inProgress = tasks.filter(t => t.status === 'in_progress').length
    const pending    = tasks.filter(t => t.status === 'todo').length
    const review     = tasks.filter(t => t.status === 'review').length

    // Task completion trend — group tasks by week (created_at date buckets)
    // Build weekly buckets between from and to
    const trendMap = {}
    const startD = new Date(from)
    const endD   = new Date(to)
    // Create weekly labels
    const cur = new Date(startD)
    while (cur <= endD) {
      const label = cur.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
      trendMap[label] = { label, completed: 0, total: 0 }
      cur.setDate(cur.getDate() + 7)
    }

    // Bucket tasks into weeks
    tasks.forEach(t => {
      const d = new Date(t.created_at)
      // Find nearest week start
      const diff = Math.floor((d - startD) / (7 * 86400000))
      const weekStart = new Date(startD)
      weekStart.setDate(weekStart.getDate() + diff * 7)
      const label = weekStart.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
      if (!trendMap[label]) trendMap[label] = { label, completed: 0, total: 0 }
      trendMap[label].total++
      if (t.status === 'done') trendMap[label].completed++
    })
    const trend = Object.values(trendMap)

    // Per-member stats
    const { rows: memberStats } = await query(
      `SELECT
         e.id, e.first_name, e.last_name, e.avatar_url, e.designation,
         COALESCE(pm.role,'Member') AS role,
         COUNT(t.id)::int                                    AS total_tasks,
         COUNT(CASE WHEN t.status='done' THEN 1 END)::int   AS done_tasks
       FROM project_members pm
       JOIN employees e ON e.id = pm.employee_id
       LEFT JOIN tasks t ON t.project_id = $1 AND t.assigned_to = e.id
       WHERE pm.project_id = $1
       GROUP BY e.id, e.first_name, e.last_name, e.avatar_url, e.designation, pm.role
       ORDER BY done_tasks DESC`,
      [id]
    )

    // Generated reports list from DB
    const { rows: reports } = await query(
      `SELECT pr.id, pr.report_name, pr.report_type, pr.created_at, pr.file_url,
              u.name AS generated_by_name,
              e.avatar_url AS generated_by_avatar
       FROM project_reports pr
       LEFT JOIN users u ON u.id = pr.generated_by
       LEFT JOIN employees e ON e.user_id = pr.generated_by
       WHERE pr.project_id = $1
       ORDER BY pr.created_at DESC`,
      [id]
    )

    return ok(res, {
      summary: { total, completed, inProgress, pending, review },
      trend,
      memberStats,
      reports,
      dateRange: { from, to },
    })
  } catch (err) { next(err) }
}

// ── POST /api/projects/:id/reports — generate & store a report ───────────────
const generateReport = async (req, res, next) => {
  try {
    const { id } = req.params
    const { report_name, report_type } = req.body
    if (!report_name || !report_type) return fail(res, 'report_name and report_type required', 400)

    const { rows } = await query(
      `INSERT INTO project_reports (project_id, report_name, report_type, generated_by)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, report_name, report_type, req.user.id]
    )
    return ok(res, rows[0], 'Report generated')
  } catch (err) { next(err) }
}

module.exports = { getAll, getMy, getById, create, update, remove, getReports, generateReport }
