const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    companyId: { type: String, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, required: true, trim: true, index: true },
    module: { type: String, required: true, trim: true, index: true },
    entityId: { type: String, trim: true },
    entityType: { type: String, trim: true, index: true },
    before: { type: mongoose.Schema.Types.Mixed, default: null },
    after: { type: mongoose.Schema.Types.Mixed, default: null },
    ipAddress: { type: String, trim: true },
    userAgent: { type: String, trim: true },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

auditLogSchema.index({ companyId: 1, createdAt: -1 });
auditLogSchema.index({ companyId: 1, module: 1 });
auditLogSchema.index({ companyId: 1, userId: 1 });
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: Number(process.env.AUDIT_TTL_SECONDS || 31536000) });

const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
