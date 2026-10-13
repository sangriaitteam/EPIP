/**
 * seedCBTTasks.js
 * Seeds CBT project tasks in production Railway DB
 * Run: node src/scripts/seedCBTTasks.js
 */

require('dotenv').config()
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || undefined,
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'epip_db',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD,
  ssl:      process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
})

async function run() {
  console.log('Connecting to DB...')

  // 1. Find CBT project (try by name, or any project)
  const projRes = await pool.query(
    "SELECT id, name FROM projects WHERE name ILIKE '%CBT%' OR name ILIKE '%3D%' ORDER BY id LIMIT 1"
  )

  if (!projRes.rows.length) {
    const all = await pool.query('SELECT id, name FROM projects ORDER BY id')
    console.log('No CBT/3D project found. All projects:', all.rows)
    process.exit(1)
  }

  const project = projRes.rows[0]
  console.log('Using project:', project)

  // 2. Rename to CBT if not already
  if (project.name !== 'CBT') {
    await pool.query("UPDATE projects SET name='CBT', updated_at=NOW() WHERE id=$1", [project.id])
    await pool.query("UPDATE tasks SET project_name='CBT' WHERE project_id=$1", [project.id])
    console.log('Renamed to CBT')
  }

  // 3. Get any valid employee id (for assigned_to)
  const empRes = await pool.query('SELECT id FROM employees LIMIT 1')
  if (!empRes.rows.length) { console.log('No employees found!'); process.exit(1) }
  const empId = empRes.rows[0].id
  console.log('Using employee id:', empId)

  // 4. Check existing tasks
  const existRes = await pool.query(
    "SELECT COUNT(*) FROM tasks WHERE project_id=$1 AND title IN ('MCT','ADCRS','ARUDRA','SDR','3DTCR')",
    [project.id]
  )
  if (parseInt(existRes.rows[0].count) >= 5) {
    console.log('Tasks already exist! Count:', existRes.rows[0].count)
    process.exit(0)
  }

  // 5. Insert 5 tasks
  const tasks = [
    { title: 'MCT',    priority: 'high'   },
    { title: 'ADCRS',  priority: 'medium' },
    { title: 'ARUDRA', priority: 'medium' },
    { title: 'SDR',    priority: 'high'   },
    { title: '3DTCR',  priority: 'medium' },
  ]

  for (const task of tasks) {
    const r = await pool.query(
      "INSERT INTO tasks(title,project_id,project_name,assigned_by,assigned_to,priority,status,source) VALUES($1,$2,'CBT',NULL,$3,$4,'todo','project_manager') RETURNING id,title,priority",
      [task.title, project.id, empId, task.priority]
    )
    console.log('Added:', r.rows[0])
  }

  console.log('\n✅ Done! 5 tasks added to CBT project.')
  await pool.end()
}

run().catch(async (e) => {
  console.error('Error:', e.message)
  await pool.end()
  process.exit(1)
})
