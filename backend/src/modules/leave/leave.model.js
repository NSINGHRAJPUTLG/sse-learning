const mongoose = require('mongoose');

const LEAVE_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];

const leaveSchema = new mongoose.Schema(
  {
    companyId: { type: String, required: true, index: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    leaveTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaveType', required: true, index: true },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true, index: true },
    totalDays: { type: Number, required: true, min: 1 },
    reason: { type: String, trim: true },
    status: { type: String, enum: LEAVE_STATUSES, default: 'PENDING', index: true },
    appliedAt: { type: Date, default: Date.now },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    managerApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    managerApprovedAt: { type: Date },
  },
  { timestamps: true }
);

leaveSchema.index({ companyId: 1, employeeId: 1 });
leaveSchema.index({ companyId: 1, status: 1 });
leaveSchema.index({ companyId: 1, startDate: 1, endDate: 1 });

const Leave = mongoose.models.Leave || mongoose.model('Leave', leaveSchema);

module.exports = { Leave, LEAVE_STATUSES };
