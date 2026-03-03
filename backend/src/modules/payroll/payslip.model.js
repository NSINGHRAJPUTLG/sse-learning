const mongoose = require('mongoose');

const payslipSchema = new mongoose.Schema(
  {
    payrollId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payroll', required: true, index: true },
    companyId: { type: String, required: true, index: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    breakdown: { type: mongoose.Schema.Types.Mixed, required: true },
    pdfUrl: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

const Payslip = mongoose.models.Payslip || mongoose.model('Payslip', payslipSchema);

module.exports = Payslip;
