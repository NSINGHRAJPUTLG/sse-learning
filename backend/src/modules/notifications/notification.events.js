const EventEmitter = require('events');
const { User } = require('../auth/auth.model');
const { Employee } = require('../employee/employee.model');
const notificationService = require('./notification.service');
const logger = require('../../utils/logger');

const notificationEmitter = new EventEmitter();

async function resolveRecipient(payload) {
  if (payload.userId) {
    const user = await User.findOne({ _id: payload.userId, companyId: payload.companyId })
      .select('_id email notificationPreferences')
      .lean();
    return user
      ? {
          userId: user._id,
          email: user.email,
          preferences: user.notificationPreferences || {},
        }
      : null;
  }

  if (payload.employeeId) {
    const employee = await Employee.findOne({ _id: payload.employeeId, companyId: payload.companyId })
      .select('userId')
      .lean();
    if (!employee) return null;

    const user = await User.findOne({ _id: employee.userId, companyId: payload.companyId })
      .select('_id email notificationPreferences')
      .lean();

    return user
      ? {
          userId: user._id,
          email: user.email,
          preferences: user.notificationPreferences || {},
        }
      : null;
  }

  return null;
}

async function dispatchNotification(eventType, payload, title, message, template, templateData = {}) {
  try {
    const recipient = await resolveRecipient(payload);
    if (!recipient) return;

    const preferences = recipient.preferences || {};
    const disabledTypes = preferences.disabledTypes || [];
    const inAppEnabled = preferences.inAppEnabled !== false && !disabledTypes.includes(eventType);
    const emailEnabled = preferences.emailEnabled !== false && !disabledTypes.includes(eventType);

    if (inAppEnabled) {
      await notificationService.createNotification({
        companyId: payload.companyId,
        userId: recipient.userId,
        type: eventType,
        title,
        message,
        metadata: payload.metadata || {},
      });
    }

    if (emailEnabled && recipient.email) {
      await notificationService.sendEmailNotification({
        to: recipient.email,
        subject: title,
        template,
        data: templateData,
      });
    }
  } catch (error) {
    logger.error({ eventType, error: String(error.message || error) }, 'Notification event dispatch failed');
  }
}

notificationEmitter.on('LEAVE_APPROVED', async (payload) => {
  await dispatchNotification(
    'LEAVE_APPROVED',
    payload,
    'Leave Approved',
    'Your leave request has been approved.',
    'LEAVE_APPROVED',
    payload
  );
});

notificationEmitter.on('LEAVE_REJECTED', async (payload) => {
  await dispatchNotification(
    'LEAVE_REJECTED',
    payload,
    'Leave Rejected',
    'Your leave request has been rejected.',
    'LEAVE_REJECTED',
    payload
  );
});

notificationEmitter.on('PAYROLL_GENERATED', async (payload) => {
  await dispatchNotification(
    'PAYROLL_GENERATED',
    payload,
    'Payroll Generated',
    `Payroll for ${payload.month}/${payload.year} has been generated.`,
    'PAYROLL_GENERATED',
    payload
  );
});

notificationEmitter.on('PAYROLL_PAID', async (payload) => {
  await dispatchNotification(
    'PAYROLL_PAID',
    payload,
    'Payroll Paid',
    `Payroll for ${payload.month}/${payload.year} is marked as paid.`,
    'PAYROLL_PAID',
    payload
  );
});

notificationEmitter.on('WELCOME_EMPLOYEE', async (payload) => {
  await dispatchNotification(
    'WELCOME_EMPLOYEE',
    payload,
    'Welcome Onboard',
    'Welcome to the organization.',
    'WELCOME_EMPLOYEE',
    payload
  );
});

notificationEmitter.on('ATTENDANCE_ANOMALY', async (payload) => {
  await dispatchNotification(
    'ATTENDANCE_ANOMALY',
    payload,
    'Attendance Alert',
    `Attendance anomaly detected: ${payload.status}`,
    'ATTENDANCE_ANOMALY',
    payload
  );
});

function emitEvent(eventType, payload) {
  setImmediate(() => notificationEmitter.emit(eventType, payload));
}

module.exports = {
  emitEvent,
  notificationEmitter,
};
