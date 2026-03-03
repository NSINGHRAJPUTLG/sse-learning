const bcrypt = require('bcrypt');
const ApiError = require('../../utils/ApiError');
const logger = require('../../utils/logger');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../../utils/token');
const { User, LoginAudit } = require('./auth.model');

const SALT_ROUNDS = 12;

function canCreateRole(creatorRole, targetRole) {
  if (creatorRole === 'SUPER_ADMIN') {
    return ['HR_ADMIN', 'MANAGER', 'EMPLOYEE'].includes(targetRole);
  }

  if (creatorRole === 'HR_ADMIN') {
    return ['MANAGER', 'EMPLOYEE'].includes(targetRole);
  }

  return false;
}

function sanitizeUser(user) {
  const plain = typeof user.toObject === 'function' ? user.toObject() : { ...user };
  delete plain.password;
  delete plain.refreshToken;
  return plain;
}

async function registerUser(data, actor) {
  if (!actor || !actor.role) {
    // Bootstrap flow: allow creating the first user in a company as SUPER_ADMIN only.
    const companyHasUsers = await User.exists({ companyId: data.companyId });
    if (companyHasUsers) {
      throw new ApiError(401, 'Bootstrap already completed for this company. Login is required to register users');
    }

    if (data.role !== 'SUPER_ADMIN') {
      throw new ApiError(401, 'First user for a company must be SUPER_ADMIN');
    }
  } else {
    if (actor.companyId !== data.companyId) {
      throw new ApiError(403, 'Cannot create users for another company');
    }

    if (!canCreateRole(actor.role, data.role)) {
      throw new ApiError(403, 'You are not allowed to create this role');
    }
  }

  const exists = await User.findOne({ companyId: data.companyId, email: data.email }).lean();
  if (exists) {
    throw new ApiError(409, 'User already exists');
  }

  const password = await bcrypt.hash(data.password, SALT_ROUNDS);
  const user = await User.create({
    companyId: data.companyId,
    email: data.email,
    password,
    role: data.role,
    isActive: data.isActive ?? true,
  });

  return sanitizeUser(user);
}

async function login(email, password, companyId, context = {}) {
  const user = await User.findOne({ companyId, email }).select('+password +refreshToken');
  if (!user) {
    throw new ApiError(401, 'Invalid credentials');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'User is inactive');
  }

  const matched = await bcrypt.compare(password, user.password);
  if (!matched) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const tokenPayload = {
    userId: String(user._id),
    role: user.role,
    companyId: user.companyId,
    email: user.email,
  };

  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  user.refreshToken = refreshToken;
  user.lastLogin = new Date();
  await user.save();

  await LoginAudit.create({
    userId: user._id,
    ip: context.ip,
    userAgent: context.userAgent,
    loginAt: new Date(),
  });

  logger.info({ userId: String(user._id), companyId: user.companyId }, 'User login successful');

  return { accessToken, refreshToken, user: sanitizeUser(user) };
}

async function refreshToken(token) {
  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch (error) {
    throw new ApiError(401, 'Invalid refresh token');
  }

  const user = await User.findOne({
    _id: decoded.userId,
    companyId: decoded.companyId,
    isActive: true,
  }).select('+refreshToken');

  if (!user || !user.refreshToken || user.refreshToken !== token) {
    throw new ApiError(401, 'Refresh token mismatch');
  }

  const payload = {
    userId: String(user._id),
    role: user.role,
    companyId: user.companyId,
    email: user.email,
  };

  const newAccessToken = generateAccessToken(payload);
  const newRefreshToken = generateRefreshToken(payload);

  user.refreshToken = newRefreshToken;
  await user.save();

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

async function logout(userId, companyId) {
  await User.updateOne({ _id: userId, companyId }, { $unset: { refreshToken: '' } });
}

async function getMe(userId, companyId) {
  const user = await User.findOne({ _id: userId, companyId }).lean();
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  return sanitizeUser(user);
}

module.exports = {
  registerUser,
  login,
  refreshToken,
  logout,
  getMe,
};
