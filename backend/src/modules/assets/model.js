const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema(
  {
    companyId: { type: String, required: true, index: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    assetName: { type: String, required: true },
    serialNumber: { type: String, required: true, index: true },
    assignedDate: { type: Date, required: true },
    returnedDate: { type: Date },
    status: { type: String, enum: ['ASSIGNED', 'RETURNED', 'LOST', 'DAMAGED'], default: 'ASSIGNED', index: true },
  },
  { timestamps: true }
);

assetSchema.index({ companyId: 1, serialNumber: 1 }, { unique: true });

module.exports = mongoose.model('Asset', assetSchema);
