const ApiError = require('../utils/ApiError');

function roleMiddleware(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, 'You do not have permission for this action'));
    }

    return next();
  };
}

module.exports = roleMiddleware;
