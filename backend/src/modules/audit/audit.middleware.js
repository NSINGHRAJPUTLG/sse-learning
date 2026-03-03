const auditService = require('./audit.service');
const logger = require('../../utils/logger');

function auditMiddleware(req, res, next) {
  const entries = [];

  req.audit = (payload) => {
    entries.push({
      ...payload,
      companyId: payload.companyId || req.user?.companyId,
      userId: payload.userId || req.user?.userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  };

  res.on('finish', () => {
    if (res.statusCode >= 400 || entries.length === 0) return;

    setImmediate(async () => {
      for (const entry of entries) {
        try {
          // eslint-disable-next-line no-await-in-loop
          await auditService.logAction(entry);
        } catch (error) {
          logger.error({ error: String(error.message || error) }, 'Audit log write failed');
        }
      }
    });
  });

  next();
}

module.exports = auditMiddleware;
