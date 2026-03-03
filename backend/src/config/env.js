const dotenv = require('dotenv');

dotenv.config();

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  host: process.env.HOST || '0.0.0.0',
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hrm',
  mongoPoolSize: Number(process.env.MONGO_POOL_SIZE || 20),
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'change-me-access',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'change-me-refresh',
  jwtAccessTtl: process.env.JWT_ACCESS_TTL || '15m',
  jwtRefreshTtl: process.env.JWT_REFRESH_TTL || '7d',
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 300),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  enableCsrf: (process.env.ENABLE_CSRF || 'false') === 'true',
  cookieSecure: (process.env.COOKIE_SECURE || 'false') === 'true',
  logLevel: process.env.LOG_LEVEL || 'info',
  attendanceFullDayHours: Number(process.env.ATTENDANCE_FULL_DAY_HOURS || 8),
  attendanceHalfDayHours: Number(process.env.ATTENDANCE_HALF_DAY_HOURS || 4),
  attendanceLateHour: Number(process.env.ATTENDANCE_LATE_HOUR || 9),
  attendanceLateMinute: Number(process.env.ATTENDANCE_LATE_MINUTE || 30),
};

module.exports = env;
