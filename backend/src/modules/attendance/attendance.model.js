const mongoose = require('mongoose');

const ATTENDANCE_STATUSES = ['PRESENT', 'ABSENT', 'HALF_DAY', 'LATE'];

const attendanceSchema = new mongoose.Schema(
  {
    companyId: { type: String, required: true, index: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    date: { type: Date, required: true, index: true },
    checkIn: { type: Date },
    checkOut: { type: Date, default: null },
    totalHours: { type: Number, default: 0 },
    overtimeHours: { type: Number, default: 0 },
    status: { type: String, enum: ATTENDANCE_STATUSES, default: 'ABSENT', index: true },
    ipAddress: { type: String },
    location: { type: String, trim: true },
  },
  { timestamps: true }
);

attendanceSchema.index({ companyId: 1, employeeId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ companyId: 1, date: 1 });
attendanceSchema.index({ companyId: 1, status: 1 });

const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);

module.exports = { Attendance, ATTENDANCE_STATUSES };
