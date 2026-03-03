const { sendResponse } = require('../utils/response');

function validate(schema, key = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[key]);
    if (!result.success) {
      return sendResponse(res, {
        statusCode: 400,
        success: false,
        message: 'Validation failed',
        data: { issues: result.error.issues },
      });
    }
    req[key] = result.data;
    next();
  };
}

module.exports = validate;
