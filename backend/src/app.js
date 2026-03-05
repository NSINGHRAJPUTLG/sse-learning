const express = require('express');
const cors = require('cors');
const pinoHttp = require('pino-http');
const env = require('./config/env');
const logger = require('./config/logger');
const securityMiddleware = require('./middleware/security');
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');
const apiRoutes = require('./routes');
require('./modules/notifications/notification.events');
const auditMiddleware = require('./modules/audit/audit.middleware');

const app = express();
app.disable('x-powered-by'); 

app.use(
  cors({
    origin: env.corsOrigin === '*' ? true : env.corsOrigin.split(','),
    credentials: true,
  })
);
app.use(pinoHttp({ logger }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
securityMiddleware(app);
app.use(auditMiddleware);

app.get('/health', (req, res) => {
  res.status(200).json({ success: true, data: { status: 'OK' }, message: 'Service healthy' });
});

app.use('/api', apiRoutes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
