const mongoose = require('mongoose');

const EMPLOYMENT_TYPES = ['FULL_TIME', 'INTERN', 'CONTRACT'];
const EMPLOYEE_STATUSES = ['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED', 'RESIGNED'];

const employeeSchema = new mongoose.Schema(
  {
    companyId: { type: String, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    employeeId: { type: String, required: true, index: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true }, 
    phone: { type: String, trim: true },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'] },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', index: true },
    designation: { type: String, trim: true },
    reportingManagerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', index: true },
    joiningDate: { type: Date, required: true },
    employmentType: { type: String, enum: EMPLOYMENT_TYPES, required: true, index: true },
    status: { type: String, enum: EMPLOYEE_STATUSES, default: 'ACTIVE', index: true },
    address: { type: String, trim: true },
    emergencyContact: { type: String, trim: true },
    salaryStructureId: { type: mongoose.Schema.Types.ObjectId },
  },
  { timestamps: true }
);

employeeSchema.index({ companyId: 1, employeeId: 1 }, { unique: true });
employeeSchema.index({ companyId: 1, departmentId: 1 });
employeeSchema.index({ companyId: 1, status: 1 });
employeeSchema.index({ companyId: 1, reportingManagerId: 1 });

const counterSchema = new mongoose.Schema(
  {
    companyId: { type: String, required: true, unique: true, index: true },
    sequence: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Employee = mongoose.models.Employee || mongoose.model('Employee', employeeSchema);
const Counter = mongoose.models.EmployeeCounter || mongoose.model('EmployeeCounter', counterSchema, 'employee_counters');

module.exports = {
  Employee,
  Counter,
  EMPLOYMENT_TYPES,
  EMPLOYEE_STATUSES,
};
