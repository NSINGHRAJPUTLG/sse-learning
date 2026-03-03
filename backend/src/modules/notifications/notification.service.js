const mongoose = require('mongoose');
const Notification = require('./notification.model');
const { addEmailJob } = require('./notification.queue');
const { getPagination } = require('../../utils/pagination');
const ApiError = require('../../utils/ApiError');

function sanitizeMetadata(metadata = {}) {
  const raw = JSON.stringify(metadata || {});
  if (raw.length > 4000) {
    throw new ApiError(400, 'Metadata too large');
  }
  return JSON.parse(raw);
}

async function createNotification(data) {
  const payload = {
    companyId: data.companyId,
    userId: data.userId,
    type: data.type,
    title: data.title,
    message: data.message,
    isRead: false,
    metadata: sanitizeMetadata(data.metadata || {}),
  };

  return Notification.create(payload);
}

async function sendEmailNotification(payload) {
  return addEmailJob(payload);
}

async function markAsRead(user, notificationId) {
  if (!mongoose.isValidObjectId(notificationId)) {
    throw new ApiError(400, 'Invalid notification id');
  }

  const updated = await Notification.findOneAndUpdate(
    {
      _id: notificationId,
      companyId: user.companyId,
      userId: user.userId,
    },
    { $set: { isRead: true } },
    { new: true }
  ).lean();

  if (!updated) throw new ApiError(404, 'Notification not found');
  return updated;
}

async function markAllAsRead(user) {
  const result = await Notification.updateMany(
    {
      companyId: user.companyId,
      userId: user.userId,
      isRead: false,
    },
    { $set: { isRead: true } }
  );

  return { modifiedCount: result.modifiedCount || 0 };
}

async function getUserNotifications(user, queryParams = {}) {
  const { page, limit, skip } = getPagination(queryParams);

  const filters = {
    companyId: user.companyId,
    userId: user.userId,
  };

  if (queryParams.unreadOnly === 'true') {
    filters.isRead = false;
  }

  const [items, total] = await Promise.all([
    Notification.find(filters)
      .select('type title message isRead metadata createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments(filters),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

module.exports = {
  createNotification,
  sendEmailNotification,
  markAsRead,
  markAllAsRead,
  getUserNotifications,
};
