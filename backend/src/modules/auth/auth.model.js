const mongoose = require('mongoose');

const USER_ROLES = ['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER', 'EMPLOYEE'];

const userSchema = new mongoose.Schema(
  {
    companyId: { type: String, required: true, index: true, trim: true },
    email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: USER_ROLES, default: 'EMPLOYEE', index: true },
    isActive: { type: Boolean, default: true, index: true },
    refreshToken: { type: String, select: false },
    lastLogin: { type: Date },
    notificationPreferences: {
      inAppEnabled: { type: Boolean, default: true },
      emailEnabled: { type: Boolean, default: true },
      disabledTypes: [{ type: String, trim: true }],
    },
  },
  { timestamps: true }
);

userSchema.index({ companyId: 1, email: 1 });

const loginAuditSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    ip: { type: String, trim: true },
    userAgent: { type: String, trim: true },
    loginAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model('User', userSchema);
const LoginAudit = mongoose.models.LoginAudit || mongoose.model('LoginAudit', loginAuditSchema);

module.exports = { User, LoginAudit, USER_ROLES };
