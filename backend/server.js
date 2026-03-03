const app = require('./src/app');
const env = require('./src/config/env');
const logger = require('./src/config/logger');
const { connectDb } = require('./src/config/db');

async function bootstrap() {
  try {
    await connectDb();
    app.listen(env.port, env.host, () => {
      logger.info(`Server started on ${env.host}:${env.port}`);
    });
  } catch (error) {
    logger.error(error, 'Failed to start server');
    process.exit(1);
  }
}

bootstrap();
