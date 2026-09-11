/**
 * Seeds the database with demo data matching the frontend mock data
 * Usage: node seeders/run.js
 */
require('dotenv').config()
const { Pool }   = require('pg')
const bcrypt     = require('bcryptjs')

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
})

const hash = (pwd) => bcrypt.hash(pwd, 12)

const seed = async () => {
  const client = await pool.connect()
  try {
    console.log('🌱 Seeding database…')

    // ── Users ──────────────────────────────────────────────────
    const adminHash    = await hash('admin123')
    const hrHash       = await hash('hr123')
    const managerHash  = await hash('manager123')
    const employeeHash = await hash('employee123')

    const { rows: users } = await client.query(`
      INSERT INTO users (name, email, password_hash, role) VALUES
        ('Alex Carter',     'admin@epip.com',    $1, 'admin'),
        ('Sarah Johnson',   'hr@epip.com',       $2, 'hr'),
        ('Michael Chen',    'manager@epip.com',  $3, 'manager'),
        ('Emily Rodriguez', 'employee@epip.com', $4, 'employee')
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
      RETURNING id, email, role
    `, [adminHash, hrHash, managerHash, employeeHash])

    console.log(`✅ ${users.length} users seeded`)

    // ── Departments ────────────────────────────────────────────
    const { rows: depts } = await client.query(`
      INSERT INTO departments (name, color) VALUES
        ('Engineering', '#6366f1'),
        ('Marketing',   '#22c55e'),
        ('HR',          '#f59e0b'),
        ('Sales',       '#ec4899'),
        ('Finance',     '#14b8a6'),
        ('Product',     '#8b5cf6')
      ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
      RETURNING id, name
    `)
    console.log(`✅ ${depts.length} departments seeded`)

    const deptMap = Object.fromEntries(depts.map(d => [d.name, d.id]))
    const userMap = Object.fromEntries(users.map(u => [u.email, u.id]))

    // ── Employees ──────────────────────────────────────────────
    const { rows: emps } = await client.query(`
      INSERT INTO employees
        (user_id, employee_id, first_name, last_name, email, phone,
         department_id, designation, work_mode, location, join_date, profile_completion)
      VALUES
        ($1,  'EMP001', 'Emily',  'Rodriguez', 'emily.r@epip.com',  '+1 555-0101',
         $5,  'Senior Developer',    'hybrid', 'New York',       '2022-03-15', 85),
        ($2,  'EMP002', 'James',  'Walker',    'james.w@epip.com',  '+1 555-0102',
         $5,  'Frontend Developer',  'remote', 'Remote',         '2023-01-10', 70),
        ($3,  'EMP003', 'Priya',  'Sharma',    'priya.s@epip.com',  '+1 555-0103',
         $6,  'Marketing Lead',      'office', 'San Francisco',  '2021-07-20', 92),
        (NULL,'EMP004', 'Daniel', 'Martinez',  'daniel.m@epip.com', '+1 555-0104',
         $7,  'Sales Executive',     'office', 'Chicago',        '2022-11-01', 60),
        (NULL,'EMP005', 'Aisha',  'Okonkwo',   'aisha.o@epip.com',  '+1 555-0105',
         $8,  'Financial Analyst',   'hybrid', 'New York',       '2020-05-12', 95),
        ($4,  'MGR001', 'Michael','Chen',      'michael.c@epip.com','+1 555-0200',
         $5,  'Engineering Manager', 'hybrid', 'New York',       '2020-01-01', 100),
        (NULL,'HR001',  'Sarah',  'Johnson',   'sarah.j@epip.com',  '+1 555-0300',
         $9,  'HR Manager',          'office', 'New York',       '2019-06-01', 100),
        (NULL,'ADM001', 'Alex',   'Carter',    'alex.c@epip.com',   '+1 555-0400',
         $5,  'System Administrator','hybrid', 'New York',       '2018-01-01', 100)
      ON CONFLICT (employee_id) DO NOTHING
      RETURNING id, employee_id, first_name, last_name
    `, [
      userMap['employee@epip.com'],
      userMap['hr@epip.com'],       // james walker — reusing user slot
      userMap['hr@epip.com'],       // priya
      userMap['manager@epip.com'],  // michael
      deptMap['Engineering'],
      deptMap['Marketing'],
      deptMap['Sales'],
      deptMap['Finance'],
      deptMap['HR'],
    ])
    console.log(`✅ ${emps.length} employees seeded`)

    const empMap = Object.fromEntries(emps.map(e => [e.employee_id, e.id]))

    // Set manager_id for engineering team
    if (empMap['EMP001'] && empMap['MGR001']) {
      await client.query(
        `UPDATE employees SET manager_id = $1 WHERE employee_id IN ('EMP001','EMP002')`,
        [empMap['MGR001']]
      )
    }

    // ── Attendance ────────────────────────────────────────────
    if (empMap['EMP001']) {
      await client.query(`
        INSERT INTO attendance (employee_id, date, check_in, check_out, hours_worked, status, work_mode, is_late)
        VALUES
          ($1, CURRENT_DATE,        NOW() - INTERVAL '5 hours', NULL,          5,    'present', 'office', false),
          ($1, CURRENT_DATE - 1,    NOW() - INTERVAL '29 hours', NOW() - INTERVAL '21 hours', 8, 'present', 'hybrid', false),
          ($1, CURRENT_DATE - 2,    NOW() - INTERVAL '53 hours', NOW() - INTERVAL '45 hours', 8, 'present', 'remote', false),
          ($1, CURRENT_DATE - 7,    NULL,  NULL, 0, 'leave', NULL, false)
        ON CONFLICT (employee_id, date) DO NOTHING
      `, [empMap['EMP001']])
    }

    // ── Tasks ─────────────────────────────────────────────────
    if (empMap['EMP001'] && empMap['MGR001']) {
      await client.query(`
        INSERT INTO tasks (title, description, assigned_to, assigned_by, priority, status, due_date, completion_percent, tags)
        VALUES
          ('Implement Dashboard UI',         'Build main employee dashboard',              $1, $2, 'high',   'in_progress', CURRENT_DATE + 4, 65, ARRAY['frontend','ui']),
          ('API Integration for Goals',      'Connect frontend to goals REST API',         $1, $2, 'high',   'todo',        CURRENT_DATE + 9, 0,  ARRAY['backend','api']),
          ('Performance Review Docs',        'Document performance evaluation criteria',   $1, $2, 'medium', 'done',        CURRENT_DATE - 6, 100,ARRAY['docs']),
          ('Fix Attendance Bug',             'Resolve timezone issue in attendance calc',  $1, $2, 'urgent', 'in_progress', CURRENT_DATE + 1, 40, ARRAY['bug','backend']),
          ('Write Unit Tests',               'Write tests for authentication module',      $1, $2, 'low',    'todo',        CURRENT_DATE + 14,0,  ARRAY['testing'])
        ON CONFLICT DO NOTHING
      `, [empMap['EMP001'], empMap['MGR001']])
    }

    // ── Goals ─────────────────────────────────────────────────
    if (empMap['EMP001']) {
      await client.query(`
        INSERT INTO goals
          (employee_id, title, description, type, period, weightage, completion_percent,
           status, due_date, kpi_metric, approval_status)
        VALUES
          ($1,'Complete EPIP Frontend','Deliver all Phase 1 frontend modules',     'quarterly','Q3 2026',30,65,'in_progress',  '2026-09-30','Module delivery count','approved'),
          ($1,'Improve Code Coverage', 'Write tests to achieve 80% code coverage', 'monthly',  'Aug 2026',20,45,'in_progress',  '2026-08-31','Test coverage %',      'approved'),
          ($1,'AWS Certification',     'Renew AWS Developer Associate cert',        'annual',   '2026',    15,10,'not_started',  '2026-12-31','Certification',         'pending'),
          ($1,'Reduce Bug Rate 25%',   'Implement code reviews to reduce bugs',    'quarterly','Q3 2026',25,30,'in_progress',  '2026-09-30','Bugs per sprint',       'approved')
        ON CONFLICT DO NOTHING
      `, [empMap['EMP001']])
    }

    // ── Performance Review ────────────────────────────────────
    if (empMap['EMP001'] && empMap['MGR001']) {
      await client.query(`
        INSERT INTO performance_reviews
          (employee_id, reviewer_id, cycle, type, status, overall_score,
           parameters, manager_comments, submitted_at)
        VALUES ($1, $2, 'Q2 2026', 'quarterly', 'completed', 82,
          '[
            {"name":"Attendance","score":90},{"name":"Task Completion","score":85},
            {"name":"Work Quality","score":88},{"name":"Communication","score":80},
            {"name":"Ownership","score":85},{"name":"Technical Skills","score":92},
            {"name":"Problem Solving","score":88},{"name":"Collaboration","score":78},
            {"name":"Discipline","score":82},{"name":"Goal Achievement","score":70}
          ]'::jsonb,
          'Emily is a strong performer. Recommend for promotion consideration.',
          NOW() - INTERVAL '30 days')
        ON CONFLICT DO NOTHING
      `, [empMap['EMP001'], empMap['MGR001']])
    }

    // ── Self Assessment ───────────────────────────────────────
    if (empMap['EMP001']) {
      await client.query(`
        INSERT INTO self_assessments
          (employee_id, period, achievements, challenges, strengths, weaknesses,
           career_goals, manager_discussion_notes, status, submitted_at)
        VALUES ($1, 'Q2 2026',
          'Successfully led the EPIP frontend module, reducing page load time by 40%.',
          'Balancing multiple high-priority tasks simultaneously.',
          'Technical proficiency, problem-solving, attention to detail',
          'Could improve presentation skills',
          'Aspire to become a Principal Engineer in 2-3 years.',
          'Discussed promotion timeline with manager.',
          'submitted', NOW() - INTERVAL '20 days')
        ON CONFLICT (employee_id, period) DO NOTHING
      `, [empMap['EMP001']])
    }

    // ── Holidays ──────────────────────────────────────────────
    await client.query(`
      INSERT INTO holidays (name, date, type) VALUES
        ('Labor Day',     '2026-09-07', 'national'),
        ('Thanksgiving',  '2026-11-26', 'national'),
        ('Christmas Day', '2026-12-25', 'national'),
        ('New Year''s',   '2027-01-01', 'national'),
        ('Company Day',   '2026-08-14', 'company')
      ON CONFLICT (date) DO NOTHING
    `)

    // ── Shifts ────────────────────────────────────────────────
    await client.query(`
      INSERT INTO shifts (name, start_time, end_time, days) VALUES
        ('Morning Shift',  '09:00', '18:00', 'Mon-Fri'),
        ('Night Shift',    '22:00', '06:00', 'Mon-Fri'),
        ('Flexible Shift', 'Flexible', 'Flexible', 'Mon-Fri')
      ON CONFLICT DO NOTHING
    `)

    console.log('\n🎉 Database seeded successfully!')
    console.log('\nDemo Accounts:')
    console.log('  admin@epip.com    / admin123    (Admin)')
    console.log('  hr@epip.com       / hr123       (HR)')
    console.log('  manager@epip.com  / manager123  (Manager)')
    console.log('  employee@epip.com / employee123 (Employee)')
  } catch (err) {
    console.error('❌ Seeding failed:', err.message)
    console.error(err.stack)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

seed()
