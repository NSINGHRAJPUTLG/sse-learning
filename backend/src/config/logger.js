const pino = require('pino');
const env = require('./env');

const logger = pino({
  level: env.logLevel,
  transport:
    env.nodeEnv === 'development'
      ? {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard' },
        }
      : undefined,
  redact: ['req.headers.authorization', 'password', 'refreshToken'],
});

module.exports = logger;
