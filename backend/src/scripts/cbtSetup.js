require('dotenv').config()
const { Pool } = require('pg')

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'epip_db',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD,
})

async function run() {
  // 1. Rename project 28 → CBT
  const r1 = await pool.query(
    "UPDATE projects SET name='CBT', updated_at=NOW() WHERE id=28 RETURNING id, name"
  )
  console.log('Renamed:', r1.rows[0])

  // Update project_name on existing tasks
  await pool.query("UPDATE tasks SET project_name='CBT' WHERE project_id=28")
  console.log('Updated project_name on existing tasks')

  // 2. Add 5 new tasks — assigned_to=29 (Emily, existing pattern)
  const tasks = [
    { title: 'MCT',    priority: 'high'   },
    { title: 'ADCRS',  priority: 'medium' },
    { title: 'ARUDRA', priority: 'medium' },
    { title: 'SDR',    priority: 'high'   },
    { title: '3DTCR',  priority: 'medium' },
  ]

  for (const task of tasks) {
    const r = await pool.query(
      "INSERT INTO tasks(title,project_id,project_name,assigned_by,assigned_to,priority,status,source) VALUES($1,28,'CBT',NULL,29,$2,'todo','project_manager') RETURNING id,title,priority",
      [task.title, task.priority]
    )
    console.log('Added:', r.rows[0])
  }

  console.log('\nDone! Project renamed to CBT + 5 tasks added.')
  await pool.end()
}

run().catch(async (e) => {
  console.error('Error:', e.message)
  await pool.end()
})
