const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const cookieParser = require('cookie-parser');
const csurf = require('csurf');
const env = require('../config/env');
const xssSanitizer = require('./xssSanitizer');

function securityMiddleware(app) {
  app.use(helmet());
  app.use(compression());
  // app.use(mongoSanitize());
  app.use(xssSanitizer);
  app.use(cookieParser());

  app.use(
    rateLimit({
      windowMs: env.rateLimitWindowMs,
      max: env.rateLimitMax,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  if (env.enableCsrf) {
    app.use(csurf({ cookie: { httpOnly: true, sameSite: 'strict', secure: env.cookieSecure } }));
  }
}

module.exports = securityMiddleware;
