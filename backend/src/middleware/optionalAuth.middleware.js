const ApiError = require('../utils/ApiError');
const { verifyAccessToken } = require('../utils/token');

function optionalAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return next();

  if (!authHeader.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Invalid authorization header format'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyAccessToken(token);
    req.user = {
      ...decoded,
      userId: decoded.userId || decoded.sub,
      sub: decoded.sub || decoded.userId,
    };
    return next();
  } catch (error) {
    return next(new ApiError(401, 'Invalid or expired access token'));
  }
}

module.exports = optionalAuthMiddleware;
