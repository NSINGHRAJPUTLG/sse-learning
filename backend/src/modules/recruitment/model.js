const mongoose = require('mongoose');

const recruitmentSchema = new mongoose.Schema(
  {
    companyId: { type: String, required: true, index: true },
    fullName: { type: String, required: true },
    email: { type: String, required: true, index: true },
    position: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED'],
      default: 'APPLIED',
      index: true,
    },
    source: { type: String },
  },
  { timestamps: true }
);

recruitmentSchema.index({ companyId: 1, email: 1, position: 1 });

module.exports = mongoose.model('Recruitment', recruitmentSchema);
