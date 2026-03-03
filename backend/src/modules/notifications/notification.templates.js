function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const templates = {
  LEAVE_APPROVED: (data) => ({
    subject: `Leave Approved: ${escapeHtml(data.leaveType || 'Request')}`,
    html: `<h3>Leave Approved</h3><p>Your leave request from <b>${escapeHtml(data.startDate)}</b> to <b>${escapeHtml(data.endDate)}</b> has been approved.</p>`,
  }),
  LEAVE_REJECTED: (data) => ({
    subject: `Leave Rejected: ${escapeHtml(data.leaveType || 'Request')}`,
    html: `<h3>Leave Rejected</h3><p>Your leave request from <b>${escapeHtml(data.startDate)}</b> to <b>${escapeHtml(data.endDate)}</b> has been rejected.</p>`,
  }),
  PAYROLL_GENERATED: (data) => ({
    subject: `Payroll Generated (${escapeHtml(data.month)}/${escapeHtml(data.year)})`,
    html: `<h3>Payroll Generated</h3><p>Your payroll for ${escapeHtml(data.month)}/${escapeHtml(data.year)} is generated.</p>`,
  }),
  PAYROLL_PAID: (data) => ({
    subject: `Payroll Paid (${escapeHtml(data.month)}/${escapeHtml(data.year)})`,
    html: `<h3>Payroll Paid</h3><p>Your payroll for ${escapeHtml(data.month)}/${escapeHtml(data.year)} has been marked as paid.</p>`,
  }),
  WELCOME_EMPLOYEE: (data) => ({
    subject: `Welcome ${escapeHtml(data.name || 'Employee')}`,
    html: `<h3>Welcome to the company</h3><p>Your employee account has been created successfully.</p>`,
  }),
  ATTENDANCE_ANOMALY: (data) => ({
    subject: `Attendance Alert: ${escapeHtml(data.status || 'Anomaly')}`,
    html: `<h3>Attendance Alert</h3><p>Your attendance status for today is <b>${escapeHtml(data.status)}</b>.</p>`,
  }),
};

function renderTemplate(template, data = {}) {
  const renderer = templates[template];
  if (!renderer) {
    return {
      subject: 'Notification',
      html: '<p>Notification update</p>',
    };
  }
  return renderer(data);
}

module.exports = {
  renderTemplate,
  templates,
};
