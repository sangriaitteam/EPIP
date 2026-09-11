// ─── Mock Data for EPIP Phase 1 ──────────────────────────────────────────────
// NOTE: mockUsers passwords are intentionally empty — all login is DB-only
export const mockUsers = []

export const mockDepartments = [
  { id: 1, name: 'Engineering',      head: 'Michael Chen',  employees: 24, color: '#6366f1' },
  { id: 2, name: 'Marketing',        head: 'Lisa Park',     employees: 12, color: '#22c55e' },
  { id: 3, name: 'Human Resources',  head: 'Sarah Johnson', employees: 8,  color: '#f59e0b' },
  { id: 4, name: 'Sales',            head: 'Tom Wilson',    employees: 18, color: '#ec4899' },
  { id: 5, name: 'Finance',          head: 'David Kim',     employees: 10, color: '#14b8a6' },
  { id: 6, name: 'Product',          head: 'Anna Lee',      employees: 15, color: '#8b5cf6' },
]

export const mockEmployees = [
  {
    id: 'EMP001', userId: 4,
    name: 'Emily Rodriguez',   email: 'emily.r@epip.com',   phone: '+1 555-0101',
    department: 'Engineering', designation: 'Senior Developer', manager: 'Michael Chen',
    joinDate: '2022-03-15', status: 'active', location: 'New York',
    workMode: 'hybrid', salary: 95000,
    skills: ['React', 'Node.js', 'PostgreSQL', 'TypeScript'],
    education: [{ degree: 'B.Sc Computer Science', institution: 'NYU', year: 2020 }],
    experience: [{ company: 'TechCorp', role: 'Junior Dev', duration: '2020–2022' }],
    certifications: [{ name: 'AWS Certified Developer', year: 2023 }],
    profileCompletion: 85, avatar: null,
  },
  {
    id: 'EMP002', userId: null,
    name: 'James Walker',      email: 'james.w@epip.com',   phone: '+1 555-0102',
    department: 'Engineering', designation: 'Frontend Developer', manager: 'Michael Chen',
    joinDate: '2023-01-10', status: 'active', location: 'Remote',
    workMode: 'remote', salary: 78000,
    skills: ['Vue.js', 'CSS', 'Figma'],
    education: [{ degree: 'B.Sc Software Engineering', institution: 'MIT', year: 2022 }],
    experience: [], certifications: [],
    profileCompletion: 70, avatar: null,
  },
  {
    id: 'EMP003', userId: null,
    name: 'Priya Sharma',      email: 'priya.s@epip.com',   phone: '+1 555-0103',
    department: 'Marketing',   designation: 'Marketing Lead', manager: 'Lisa Park',
    joinDate: '2021-07-20', status: 'active', location: 'San Francisco',
    workMode: 'office', salary: 72000,
    skills: ['SEO', 'Content Strategy', 'HubSpot'],
    education: [{ degree: 'MBA Marketing', institution: 'Stanford', year: 2021 }],
    experience: [{ company: 'BrandX', role: 'Marketing Exec', duration: '2019–2021' }],
    certifications: [{ name: 'Google Analytics', year: 2022 }],
    profileCompletion: 92, avatar: null,
  },
  {
    id: 'EMP004', userId: null,
    name: 'Daniel Martinez',   email: 'daniel.m@epip.com',  phone: '+1 555-0104',
    department: 'Sales',       designation: 'Sales Executive', manager: 'Tom Wilson',
    joinDate: '2022-11-01', status: 'active', location: 'Chicago',
    workMode: 'office', salary: 65000,
    skills: ['Salesforce', 'CRM', 'Negotiation'],
    education: [{ degree: 'B.Com', institution: 'University of Chicago', year: 2022 }],
    experience: [], certifications: [],
    profileCompletion: 60, avatar: null,
  },
  {
    id: 'EMP005', userId: null,
    name: 'Aisha Okonkwo',     email: 'aisha.o@epip.com',   phone: '+1 555-0105',
    department: 'Finance',     designation: 'Financial Analyst', manager: 'David Kim',
    joinDate: '2020-05-12', status: 'active', location: 'New York',
    workMode: 'hybrid', salary: 82000,
    skills: ['Excel', 'Power BI', 'Financial Modeling'],
    education: [{ degree: 'B.Sc Finance', institution: 'Columbia', year: 2020 }],
    experience: [{ company: 'FinBank', role: 'Analyst Intern', duration: '2019–2020' }],
    certifications: [{ name: 'CFA Level 1', year: 2023 }],
    profileCompletion: 95, avatar: null,
  },
]

export const mockAttendance = [
  { id: 1, employeeId: 'EMP001', date: '2026-08-06', checkIn: '09:02', checkOut: '18:15', breakTime: 45, status: 'present', workMode: 'office', hoursWorked: 8.45, isLate: false, overtime: 0.15 },
  { id: 2, employeeId: 'EMP001', date: '2026-08-05', checkIn: '09:35', checkOut: '18:00', breakTime: 30, status: 'present', workMode: 'hybrid', hoursWorked: 7.92, isLate: true, overtime: 0 },
  { id: 3, employeeId: 'EMP001', date: '2026-08-04', checkIn: '08:55', checkOut: '17:55', breakTime: 60, status: 'present', workMode: 'remote', hoursWorked: 8.0, isLate: false, overtime: 0 },
  { id: 4, employeeId: 'EMP001', date: '2026-08-01', checkIn: null, checkOut: null, breakTime: 0, status: 'leave', workMode: null, hoursWorked: 0, isLate: false, overtime: 0 },
  { id: 5, employeeId: 'EMP002', date: '2026-08-06', checkIn: '09:10', checkOut: '18:05', breakTime: 45, status: 'present', workMode: 'remote', hoursWorked: 8.17, isLate: false, overtime: 0 },
]

export const mockAttendanceSummary = {
  thisMonth: { present: 18, absent: 1, leave: 2, late: 3, overtime: 4.5, attendancePercent: 90 },
  today: { checkIn: '09:02', checkOut: null, workMode: 'office', status: 'present' },
}

export const mockTasks = [
  { id: 1, title: 'Implement Dashboard UI', description: 'Build the main employee dashboard with charts and widgets', assignedTo: 'EMP001', assignedBy: 'EMP003_MGR', priority: 'high', status: 'in_progress', dueDate: '2026-08-10', completionPercent: 65, tags: ['frontend', 'ui'], comments: 2, attachments: 1, createdAt: '2026-07-28' },
  { id: 2, title: 'API Integration for Goals Module', description: 'Connect frontend to goals REST API endpoints', assignedTo: 'EMP001', assignedBy: 'EMP003_MGR', priority: 'high', status: 'todo', dueDate: '2026-08-15', completionPercent: 0, tags: ['backend', 'api'], comments: 0, attachments: 0, createdAt: '2026-08-01' },
  { id: 3, title: 'Performance Review Documentation', description: 'Document performance evaluation criteria', assignedTo: 'EMP001', assignedBy: 'EMP003_MGR', priority: 'medium', status: 'done', dueDate: '2026-07-31', completionPercent: 100, tags: ['docs'], comments: 3, attachments: 2, createdAt: '2026-07-20' },
  { id: 4, title: 'Fix Attendance Bug', description: 'Resolve timezone issue in attendance calculation', assignedTo: 'EMP001', assignedBy: 'EMP003_MGR', priority: 'urgent', status: 'in_progress', dueDate: '2026-08-07', completionPercent: 40, tags: ['bug', 'backend'], comments: 5, attachments: 0, createdAt: '2026-08-03' },
  { id: 5, title: 'Write Unit Tests', description: 'Write unit tests for authentication module', assignedTo: 'EMP002', assignedBy: 'EMP003_MGR', priority: 'low', status: 'todo', dueDate: '2026-08-20', completionPercent: 0, tags: ['testing'], comments: 0, attachments: 0, createdAt: '2026-08-04' },
  { id: 6, title: 'Database Schema Review', description: 'Review and optimize PostgreSQL schema', assignedTo: 'EMP002', assignedBy: 'EMP003_MGR', priority: 'medium', status: 'review', dueDate: '2026-08-12', completionPercent: 80, tags: ['database'], comments: 1, attachments: 0, createdAt: '2026-07-30' },
]

export const mockGoals = [
  { id: 1, employeeId: 'EMP001', title: 'Complete EPIP Frontend', description: 'Deliver all Phase 1 frontend modules', type: 'quarterly', period: 'Q3 2026', weightage: 30, completionPercent: 65, status: 'in_progress', evidence: [], approvalStatus: 'approved', dueDate: '2026-09-30', kpiMetric: 'Module delivery count' },
  { id: 2, employeeId: 'EMP001', title: 'Improve Code Coverage to 80%', description: 'Write tests to achieve 80% code coverage', type: 'monthly', period: 'Aug 2026', weightage: 20, completionPercent: 45, status: 'in_progress', evidence: [], approvalStatus: 'approved', dueDate: '2026-08-31', kpiMetric: 'Test coverage %' },
  { id: 3, employeeId: 'EMP001', title: 'AWS Certification Renewal', description: 'Renew AWS Developer Associate certification', type: 'annual', period: '2026', weightage: 15, completionPercent: 10, status: 'not_started', evidence: [], approvalStatus: 'pending', dueDate: '2026-12-31', kpiMetric: 'Certification obtained' },
  { id: 4, employeeId: 'EMP001', title: 'Reduce Bug Rate by 25%', description: 'Implement code reviews to reduce production bugs', type: 'quarterly', period: 'Q3 2026', weightage: 25, completionPercent: 30, status: 'in_progress', evidence: ['bug_report.pdf'], approvalStatus: 'approved', dueDate: '2026-09-30', kpiMetric: 'Bugs per sprint' },
  { id: 5, employeeId: 'EMP001', title: 'Mentor Junior Developer', description: 'Provide weekly mentoring sessions to James Walker', type: 'quarterly', period: 'Q3 2026', weightage: 10, completionPercent: 80, status: 'in_progress', evidence: [], approvalStatus: 'approved', dueDate: '2026-09-30', kpiMetric: 'Sessions completed' },
]

export const mockDepartmentKPIs = [
  { department: 'Engineering', kpi: 'Sprint Velocity', target: 40, actual: 38, unit: 'points' },
  { department: 'Engineering', kpi: 'Bug Rate',        target: 5,  actual: 7,  unit: 'bugs/sprint' },
  { department: 'Marketing',   kpi: 'Lead Generation', target: 200, actual: 245, unit: 'leads/month' },
  { department: 'Sales',       kpi: 'Revenue Target',  target: 500000, actual: 480000, unit: '$' },
]

export const mockPerformanceReviews = [
  {
    id: 1, employeeId: 'EMP001', reviewerId: 'MGR001',
    cycle: 'Q2 2026', type: 'quarterly', status: 'completed',
    overallScore: 82,
    parameters: [
      { name: 'Attendance',        score: 90, maxScore: 100, comments: 'Excellent punctuality' },
      { name: 'Task Completion',   score: 85, maxScore: 100, comments: 'Consistently delivers on time' },
      { name: 'Work Quality',      score: 88, maxScore: 100, comments: 'High quality output' },
      { name: 'Communication',     score: 80, maxScore: 100, comments: 'Good written and verbal communication' },
      { name: 'Ownership',         score: 85, maxScore: 100, comments: 'Takes initiative' },
      { name: 'Technical Skills',  score: 92, maxScore: 100, comments: 'Strong technical expertise' },
      { name: 'Problem Solving',   score: 88, maxScore: 100, comments: 'Excellent debugging skills' },
      { name: 'Collaboration',     score: 78, maxScore: 100, comments: 'Works well in team' },
      { name: 'Discipline',        score: 82, maxScore: 100, comments: 'Follows processes' },
      { name: 'Goal Achievement',  score: 70, maxScore: 100, comments: '70% goals completed this quarter' },
    ],
    managerComments: 'Emily is a strong performer. Recommend for promotion consideration next cycle.',
    hrComments: 'Approved for Q2 bonus.',
    createdAt: '2026-07-01',
  },
  {
    id: 2, employeeId: 'EMP001', reviewerId: 'MGR001',
    cycle: 'Q1 2026', type: 'quarterly', status: 'completed',
    overallScore: 78,
    parameters: [
      { name: 'Attendance',        score: 88, maxScore: 100, comments: '' },
      { name: 'Task Completion',   score: 80, maxScore: 100, comments: '' },
      { name: 'Work Quality',      score: 82, maxScore: 100, comments: '' },
      { name: 'Communication',     score: 75, maxScore: 100, comments: '' },
      { name: 'Ownership',         score: 78, maxScore: 100, comments: '' },
      { name: 'Technical Skills',  score: 85, maxScore: 100, comments: '' },
      { name: 'Problem Solving',   score: 80, maxScore: 100, comments: '' },
      { name: 'Collaboration',     score: 72, maxScore: 100, comments: '' },
      { name: 'Discipline',        score: 75, maxScore: 100, comments: '' },
      { name: 'Goal Achievement',  score: 65, maxScore: 100, comments: '' },
    ],
    managerComments: 'Good quarter overall.',
    hrComments: '',
    createdAt: '2026-04-02',
  },
]

export const mockSelfAssessment = {
  employeeId: 'EMP001',
  period: 'Q2 2026',
  achievements: 'Successfully led the EPIP frontend module, reducing page load time by 40%. Mentored James on React best practices.',
  challenges: 'Balancing multiple high-priority tasks simultaneously. Need better time management strategies.',
  strengths: 'Technical proficiency, problem-solving, attention to detail',
  weaknesses: 'Could improve presentation skills and stakeholder communication',
  careerGoals: 'Aspire to become a Principal Engineer in 2–3 years. Want to expand into system architecture.',
  managerDiscussionNotes: 'Discussed promotion timeline with manager. Next step: lead a full project independently.',
  status: 'submitted',
  submittedAt: '2026-07-15',
}

export const mockScreenshots = [
  { id: 1, employeeId: 'EMP001', timestamp: '2026-08-06T09:10:00', thumbnail: null, url: null, isEncrypted: true },
  { id: 2, employeeId: 'EMP001', timestamp: '2026-08-06T09:20:00', thumbnail: null, url: null, isEncrypted: true },
  { id: 3, employeeId: 'EMP001', timestamp: '2026-08-06T09:30:00', thumbnail: null, url: null, isEncrypted: true },
  { id: 4, employeeId: 'EMP001', timestamp: '2026-08-06T09:40:00', thumbnail: null, url: null, isEncrypted: true },
  { id: 5, employeeId: 'EMP001', timestamp: '2026-08-06T09:50:00', thumbnail: null, url: null, isEncrypted: true },
  { id: 6, employeeId: 'EMP002', timestamp: '2026-08-06T09:10:00', thumbnail: null, url: null, isEncrypted: true },
]

export const mockNotifications = [
  { id: 1, type: 'review',    title: 'Performance Review Due',       message: 'Q3 2026 performance review is due by August 31.', isRead: false, createdAt: '2026-08-05T10:00:00' },
  { id: 2, type: 'task',      title: 'Task Deadline Approaching',    message: '"Fix Attendance Bug" is due tomorrow.', isRead: false, createdAt: '2026-08-06T08:00:00' },
  { id: 3, type: 'approval',  title: 'Goal Approved',               message: 'Your goal "AWS Certification Renewal" has been approved.', isRead: true, createdAt: '2026-08-04T14:30:00' },
  { id: 4, type: 'system',    title: 'Profile Incomplete',           message: 'Please complete your profile to 100%.', isRead: true, createdAt: '2026-08-01T09:00:00' },
  { id: 5, type: 'review',    title: 'Self-Assessment Reminder',     message: 'Submit your Q3 self-assessment by August 20.', isRead: false, createdAt: '2026-08-06T09:00:00' },
]

export const mockLeaves = [
  { id: 1, employeeId: 'EMP001', type: 'Annual Leave', startDate: '2026-08-01', endDate: '2026-08-01', days: 1, reason: 'Personal', status: 'approved' },
  { id: 2, employeeId: 'EMP001', type: 'Sick Leave', startDate: '2026-07-15', endDate: '2026-07-16', days: 2, reason: 'Flu', status: 'approved' },
  { id: 3, employeeId: 'EMP001', type: 'Annual Leave', startDate: '2026-09-10', endDate: '2026-09-12', days: 3, reason: 'Vacation', status: 'pending' },
]

export const mockHolidays = [
  { id: 1, name: 'Labor Day',        date: '2026-09-07', type: 'national' },
  { id: 2, name: 'Thanksgiving',     date: '2026-11-26', type: 'national' },
  { id: 3, name: 'Christmas Day',    date: '2026-12-25', type: 'national' },
  { id: 4, name: 'New Year\'s Day',  date: '2027-01-01', type: 'national' },
  { id: 5, name: 'Company Day',      date: '2026-08-14', type: 'company'  },
]

export const mockPerformanceChartData = [
  { month: 'Jan', score: 72, target: 75 },
  { month: 'Feb', score: 68, target: 75 },
  { month: 'Mar', score: 75, target: 75 },
  { month: 'Apr', score: 78, target: 75 },
  { month: 'May', score: 80, target: 75 },
  { month: 'Jun', score: 82, target: 75 },
  { month: 'Jul', score: 79, target: 80 },
  { month: 'Aug', score: 84, target: 80 },
]

export const mockAttendanceChartData = [
  { week: 'Week 1', present: 5, late: 0, absent: 0 },
  { week: 'Week 2', present: 4, late: 1, absent: 0 },
  { week: 'Week 3', present: 5, late: 0, absent: 0 },
  { week: 'Week 4', present: 3, late: 2, absent: 0 },
]

export const mockCompanyStats = {
  totalEmployees: 87,
  activeEmployees: 84,
  departments: 6,
  avgPerformanceScore: 79.4,
  attendanceRate: 92.3,
  pendingReviews: 12,
  openTasks: 34,
  goalsAchieved: 68,
}

export const mockTeamOverview = [
  { employee: 'Emily Rodriguez', role: 'Senior Developer', attendance: 95, taskCompletion: 78, performanceScore: 82, status: 'active' },
  { employee: 'James Walker',    role: 'Frontend Developer', attendance: 88, taskCompletion: 65, performanceScore: 74, status: 'active' },
  { employee: 'Raj Patel',       role: 'Backend Developer', attendance: 92, taskCompletion: 85, performanceScore: 80, status: 'active' },
  { employee: 'Lisa Chen',       role: 'QA Engineer',       attendance: 97, taskCompletion: 90, performanceScore: 88, status: 'active' },
  { employee: 'Omar Hassan',     role: 'DevOps Engineer',   attendance: 85, taskCompletion: 72, performanceScore: 76, status: 'active' },
]

export const mockReports = [
  { id: 1, name: 'Monthly Attendance Report – Aug 2026', type: 'attendance', period: 'August 2026', generatedAt: '2026-08-06', size: '245 KB' },
  { id: 2, name: 'Q2 2026 Performance Summary',          type: 'performance', period: 'Q2 2026',    generatedAt: '2026-07-05', size: '1.2 MB' },
  { id: 3, name: 'Task Completion Weekly – W31 2026',    type: 'task',        period: 'Week 31',     generatedAt: '2026-08-02', size: '180 KB' },
  { id: 4, name: 'Department KPI Report – Jul 2026',     type: 'kpi',         period: 'July 2026',   generatedAt: '2026-08-01', size: '560 KB' },
]

export const mockShifts = [
  { id: 1, name: 'Morning Shift',   startTime: '09:00', endTime: '18:00', days: 'Mon–Fri' },
  { id: 2, name: 'Night Shift',     startTime: '22:00', endTime: '06:00', days: 'Mon–Fri' },
  { id: 3, name: 'Flexible Shift',  startTime: 'Flexible', endTime: 'Flexible', days: 'Mon–Fri' },
]
