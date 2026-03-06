const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    companyId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    parentDepartmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

departmentSchema.index({ companyId: 1, name: 1 }, { unique: true });
departmentSchema.index({ companyId: 1, parentDepartmentId: 1 });
departmentSchema.index({ companyId: 1, isActive: 1 });

const Department = mongoose.models.Department || mongoose.model('Department', departmentSchema);

module.exports = Department;
 