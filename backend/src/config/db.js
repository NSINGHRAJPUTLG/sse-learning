const mongoose = require('mongoose');
const env = require('./env');
const logger = require('./logger');

async function connectDb() {
  await mongoose.connect(env.mongoUri, {
    maxPoolSize: env.mongoPoolSize,
    minPoolSize: 5,
    autoIndex: env.nodeEnv !== 'production',
  });
  logger.info('MongoDB connected');
}

module.exports = { connectDb };
