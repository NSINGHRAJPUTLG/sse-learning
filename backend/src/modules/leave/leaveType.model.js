const mongoose = require('mongoose');

const leaveTypeSchema = new mongoose.Schema(
  {
    companyId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    yearlyQuota: { type: Number, required: true, min: 0 },
    carryForwardAllowed: { type: Boolean, default: false },
    requiresApproval: { type: Boolean, default: true },
  },
  { timestamps: true }
);

leaveTypeSchema.index({ companyId: 1, name: 1 }, { unique: true });

const LeaveType = mongoose.models.LeaveType || mongoose.model('LeaveType', leaveTypeSchema);

module.exports = LeaveType;
