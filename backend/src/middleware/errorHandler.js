const env = require('../config/env');
const logger = require('../config/logger');

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  logger.error({ err, path: req.path, method: req.method }, message);

  res.status(statusCode).json({
    success: false,
    data: env.nodeEnv === 'production' ? {} : { details: err.details || err.stack },
    message,
  });
}

module.exports = errorHandler;
