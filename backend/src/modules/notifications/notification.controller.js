const asyncHandler = require('../../utils/asyncHandler');
const { sendResponse } = require('../../utils/response');
const notificationService = require('./notification.service');

const getNotifications = asyncHandler(async (req, res) => {
  const data = await notificationService.getUserNotifications(req.user, req.query);
  return sendResponse(res, {
    success: true,
    message: 'Notifications fetched',
    data,
  });
});

const markRead = asyncHandler(async (req, res) => {
  const data = await notificationService.markAsRead(req.user, req.params.id);
  return sendResponse(res, {
    success: true,
    message: 'Notification marked as read',
    data,
  });
});

const markReadAll = asyncHandler(async (req, res) => {
  const data = await notificationService.markAllAsRead(req.user);
  return sendResponse(res, {
    success: true,
    message: 'All notifications marked as read',
    data,
  });
});

module.exports = {
  getNotifications,
  markRead,
  markReadAll,
};
