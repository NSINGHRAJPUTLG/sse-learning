const mongoose = require('mongoose');

const performanceSchema = new mongoose.Schema(
  {
    companyId: { type: String, required: true, index: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    goals: { type: String },
    feedback: { type: String },
    quarter: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

performanceSchema.index({ companyId: 1, employeeId: 1, quarter: 1 });

module.exports = mongoose.model('Performance', performanceSchema);
