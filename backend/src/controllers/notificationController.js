const Notification = require('../models/Notification')
const { ok, fail } = require('../utils/response')

// GET /api/notifications
const getAll = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20
    const notifs = await Notification.findByUser(req.user.id, {
      unread_only: req.query.unread_only === 'true',
      limit,
    })
    return ok(res, notifs)
  } catch (err) { next(err) }
}

// PATCH /api/notifications/:id/read
const markRead = async (req, res, next) => {
  try {
    await Notification.markRead(req.params.id, req.user.id)
    return ok(res, null, 'Notification marked as read')
  } catch (err) { next(err) }
}

// PATCH /api/notifications/read-all
const markAllRead = async (req, res, next) => {
  try {
    await Notification.markAllRead(req.user.id)
    return ok(res, null, 'All notifications marked as read')
  } catch (err) { next(err) }
}

// GET /api/notifications/count
const unreadCount = async (req, res, next) => {
  try {
    const count = await Notification.unreadCount(req.user.id)
    return ok(res, { unread_count: count })
  } catch (err) { next(err) }
}

module.exports = { getAll, markRead, markAllRead, unreadCount }
