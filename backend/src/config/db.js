const mongoose = require('mongoose');
const env = require('./env');
const logger = require('./logger');

async function connectDb() {
  try {
    console.log('env.mongoUri',env.mongoUri)
    await mongoose.connect(env.mongoUri, {
      maxPoolSize: env.mongoPoolSize,
      minPoolSize: 5,
      autoIndex: env.nodeEnv !== 'production',
    });
    logger.info('MongoDB connected');
  } catch (error) {
    logger.error('MongoDB connection failed:', error,env.mongoUri);
    throw error;
  }
}

module.exports = { connectDb };
