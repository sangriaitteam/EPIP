const db = require('../config/db')

const Notification = {
  async create({ user_id, type, title, message, link = null }) {
    const { rows } = await db.query(
      `INSERT INTO notifications (user_id, type, title, message, link)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [user_id, type, title, message, link]
    )
    return rows[0]
  },

  async findByUser(user_id, { unread_only = false } = {}) {
    let q = `SELECT * FROM notifications WHERE user_id = $1`
    if (unread_only) q += ` AND is_read = false`
    q += ` ORDER BY created_at DESC LIMIT 50`
    const { rows } = await db.query(q, [user_id])
    return rows
  },

  async markRead(id, user_id) {
    await db.query(
      `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2`,
      [id, user_id]
    )
  },

  async markAllRead(user_id) {
    await db.query(
      `UPDATE notifications SET is_read = true WHERE user_id = $1`,
      [user_id]
    )
  },

  async unreadCount(user_id) {
    const { rows } = await db.query(
      `SELECT COUNT(*)::int AS cnt FROM notifications WHERE user_id = $1 AND is_read = false`,
      [user_id]
    )
    return rows[0].cnt
  },

  async deleteOld(days = 30) {
    await db.query(
      `DELETE FROM notifications WHERE created_at < NOW() - ($1 || ' days')::interval`,
      [days]
    )
  },
}

module.exports = Notification
