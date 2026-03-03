const mongoose = require('mongoose');

const leaveBalanceSchema = new mongoose.Schema(
  {
    companyId: { type: String, required: true, index: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    leaveTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaveType', required: true, index: true },
    totalAllocated: { type: Number, required: true, min: 0 },
    used: { type: Number, default: 0, min: 0 },
    remaining: { type: Number, required: true, min: 0 },
    year: { type: Number, required: true, index: true },
  },
  { timestamps: true }
);

leaveBalanceSchema.index({ companyId: 1, employeeId: 1, leaveTypeId: 1, year: 1 }, { unique: true });

const LeaveBalance = mongoose.models.LeaveBalance || mongoose.model('LeaveBalance', leaveBalanceSchema);

module.exports = LeaveBalance;
