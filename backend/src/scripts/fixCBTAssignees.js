/**
 * fixCBTAssignees.js
 * Fix CBT tasks assigned_to — set to Ruthish and Sanmit only
 * Run on Railway: node src/scripts/fixCBTAssignees.js
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
  // 1. Show all employees
  const empRes = await pool.query(
    "SELECT e.id, e.first_name, e.last_name FROM employees e ORDER BY e.id"
  )
  console.log('All employees:', empRes.rows)

  // 2. Find Ruthish and Sanmit
  const ruthish = empRes.rows.find(e =>
    e.first_name.toLowerCase().includes('ruthish')
  )
  const sanmit = empRes.rows.find(e =>
    e.first_name.toLowerCase().includes('sanmit') ||
    e.first_name.toLowerCase().includes('sanmith')
  )

  console.log('Ruthish:', ruthish)
  console.log('Sanmit:', sanmit)

  if (!ruthish) { console.log('Ruthish not found!'); process.exit(1) }
  if (!sanmit)  { console.log('Sanmit not found!'); process.exit(1) }

  // 3. Get CBT project id
  const projRes = await pool.query("SELECT id FROM projects WHERE name='CBT' LIMIT 1")
  if (!projRes.rows.length) { console.log('CBT project not found!'); process.exit(1) }
  const projectId = projRes.rows[0].id
  console.log('CBT project id:', projectId)

  // 4. Get the 5 new tasks (MCT, ADCRS, ARUDRA, SDR, 3DTCR)
  const taskRes = await pool.query(
    "SELECT id, title FROM tasks WHERE project_id=$1 AND title IN ('MCT','ADCRS','ARUDRA','SDR','3DTCR') ORDER BY id",
    [projectId]
  )
  console.log('Tasks to fix:', taskRes.rows)

  // 5. Assign alternately to Ruthish and Sanmit
  for (let i = 0; i < taskRes.rows.length; i++) {
    const task = taskRes.rows[i]
    const assignTo = i % 2 === 0 ? ruthish.id : sanmit.id
    const assignName = i % 2 === 0 ? ruthish.first_name : sanmit.first_name
    await pool.query(
      "UPDATE tasks SET assigned_to=$1, updated_at=NOW() WHERE id=$2",
      [assignTo, task.id]
    )
    console.log(`Updated task "${task.title}" → assigned to ${assignName} (id: ${assignTo})`)
  }

  console.log('\n✅ Done! CBT tasks reassigned to Ruthish and Sanmit.')
  await pool.end()
}

run().catch(async (e) => {
  console.error('Error:', e.message)
  await pool.end()
  process.exit(1)
})
