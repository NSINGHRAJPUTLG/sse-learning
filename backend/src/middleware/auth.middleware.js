const ApiError = require('../utils/ApiError');
const { verifyAccessToken } = require('../utils/token');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Authorization token is required'));
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

module.exports = authMiddleware;
