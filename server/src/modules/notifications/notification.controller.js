const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const notificationService = require('./notification.service');

const myNotifications = asyncHandler(async (req, res) => {
  const { notifications, unreadCount, meta } = await notificationService.listMyNotifications(
    req.user.id,
    req.query
  );
  return new ApiResponse(200, { notifications, unreadCount, meta }).send(res);
});

const markRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markAsRead(req.params.id, req.user.id);
  return new ApiResponse(200, notification, 'Marked as read').send(res);
});

const markAllRead = asyncHandler(async (req, res) => {
  const count = await notificationService.markAllAsRead(req.user.id);
  return new ApiResponse(200, { count }, 'All notifications marked as read').send(res);
});

module.exports = { myNotifications, markRead, markAllRead };