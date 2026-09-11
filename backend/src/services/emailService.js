const nodemailer = require('nodemailer')

/**
 * Create a fresh transporter each time so .env changes take effect
 * without restarting the server (lazy creation).
 */
const createTransporter = () =>
  nodemailer.createTransport({
    host:   process.env.SMTP_HOST || 'smtp.gmail.com',
    port:   parseInt(process.env.SMTP_PORT) || 587,
    secure: false,                  // TLS via STARTTLS on port 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,    // allow self-signed certs in dev
    },
  })

const FROM = () =>
  `"EPIP Platform" <${process.env.SMTP_USER || 'noreply@epip.com'}>`

/**
 * Core send helper.
 * Falls back to console.log when SMTP credentials are not set.
 */
const send = async ({ to, subject, html }) => {
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  // No credentials — log and return (dev / test mode)
  if (!user || !pass) {
    console.log(`[EMAIL - no SMTP config] To: ${to} | Subject: ${subject}`)
    return
  }

  try {
    const transporter = createTransporter()
    const info = await transporter.sendMail({
      from:    FROM(),
      to,
      subject,
      html,
    })
    console.log(`[EMAIL OK] To: ${to} | MessageId: ${info.messageId}`)
  } catch (err) {
    // Log full error so we can diagnose (auth failure, network, etc.)
    console.error(`[EMAIL ERROR] To: ${to} | Subject: ${subject}`)
    console.error(`  Code: ${err.code} | Response: ${err.response || err.message}`)
  }
}

// ── Templates ──────────────────────────────────────────────────────────────

const sendReviewReminder = (to, { employee_name, cycle, due_date }) =>
  send({
    to,
    subject: `Performance Review Due — ${cycle}`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:auto">
        <h2 style="color:#6366f1">Performance Review Reminder</h2>
        <p>Hi <strong>${employee_name}</strong>,</p>
        <p>Your <strong>${cycle}</strong> performance review is due by <strong>${due_date}</strong>.</p>
        <p>Please log in to EPIP to complete your self-assessment.</p>
        <p style="color:#888">— EPIP Team</p>
      </div>`,
  })

const sendTaskAssigned = (to, { title, due_date, assigner }) =>
  send({
    to,
    subject: `New Task Assigned: ${title}`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:auto">
        <h2 style="color:#6366f1">New Task Assigned</h2>
        <p>You have been assigned a new task by <strong>${assigner}</strong>:</p>
        <p style="font-size:18px"><strong>${title}</strong></p>
        <p>Due: ${due_date || 'No due date'}</p>
        <p>Log in to EPIP to view details.</p>
        <p style="color:#888">— EPIP Team</p>
      </div>`,
  })

const sendReviewComplete = (to, review) =>
  send({
    to,
    subject: `Performance Review Completed — ${review.cycle}`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:auto">
        <h2 style="color:#6366f1">Your Performance Review is Complete</h2>
        <p>Your <strong>${review.cycle}</strong> performance review has been submitted.</p>
        <p>Overall Score: <strong>${review.overall_score}/100</strong></p>
        <p>Log in to EPIP to view the full review.</p>
        <p style="color:#888">— EPIP Team</p>
      </div>`,
  })

const sendGoalApproved = (to, { goal_title }) =>
  send({
    to,
    subject: `Goal Approved: ${goal_title}`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:auto">
        <h2 style="color:#6366f1">Goal Approved ✅</h2>
        <p>Your goal <strong>"${goal_title}"</strong> has been approved by your manager.</p>
        <p style="color:#888">— EPIP Team</p>
      </div>`,
  })

const sendWelcome = (to, { name, role, temp_password }) =>
  send({
    to,
    subject: 'Welcome to EPIP — Your Account is Ready',
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:auto">
        <h2 style="color:#6366f1">Welcome to EPIP, ${name}! 🎉</h2>
        <p>Your account has been created with role: <strong>${role}</strong></p>
        <p>Temporary password: <strong style="font-size:18px;letter-spacing:2px">${temp_password}</strong></p>
        <p style="color:#e11d48">Please change your password after first login.</p>
        <p style="color:#888">— EPIP Team</p>
      </div>`,
  })

module.exports = {
  send,
  sendReviewReminder,
  sendTaskAssigned,
  sendReviewComplete,
  sendGoalApproved,
  sendWelcome,
}
