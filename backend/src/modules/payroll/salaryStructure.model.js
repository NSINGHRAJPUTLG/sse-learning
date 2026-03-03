const mongoose = require('mongoose');

const salaryStructureSchema = new mongoose.Schema(
  {
    companyId: { type: String, required: true, index: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    basic: { type: Number, required: true, min: 0 },
    hra: { type: Number, default: 0, min: 0 },
    allowances: { type: Number, default: 0, min: 0 },
    bonus: { type: Number, default: 0, min: 0 },
    deductions: { type: Number, default: 0, min: 0 },
    taxPercentage: { type: Number, default: 0, min: 0, max: 100 },
    effectiveFrom: { type: Date, required: true },
  },
  { timestamps: true }
);

salaryStructureSchema.index({ companyId: 1, employeeId: 1 }, { unique: true });

const SalaryStructure = mongoose.models.SalaryStructure || mongoose.model('SalaryStructure', salaryStructureSchema);

module.exports = SalaryStructure;
