const mongoose = require('mongoose');

const PAYROLL_STATUSES = ['GENERATED', 'LOCKED', 'PAID'];

const payrollSchema = new mongoose.Schema(
  {
    companyId: { type: String, required: true, index: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    month: { type: Number, required: true, min: 1, max: 12, index: true },
    year: { type: Number, required: true, min: 2000, index: true },
    totalWorkingDays: { type: Number, required: true, min: 0 },
    presentDays: { type: Number, required: true, min: 0 },
    absentDays: { type: Number, required: true, min: 0 },
    overtimeHours: { type: Number, required: true, min: 0 },
    grossSalary: { type: Number, required: true, min: 0 },
    totalDeductions: { type: Number, required: true, min: 0 },
    netSalary: { type: Number, required: true, min: 0 },
    status: { type: String, enum: PAYROLL_STATUSES, default: 'GENERATED', index: true },
    generatedAt: { type: Date, default: Date.now },
    lockedAt: { type: Date },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

payrollSchema.index({ companyId: 1, employeeId: 1, month: 1, year: 1 }, { unique: true });
payrollSchema.index({ companyId: 1, month: 1, year: 1 });
payrollSchema.index({ companyId: 1, status: 1 });

const Payroll = mongoose.models.Payroll || mongoose.model('Payroll', payrollSchema);

module.exports = { Payroll, PAYROLL_STATUSES };
