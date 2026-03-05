const { verifyAccessToken } = require('../services/tokenService');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { sendError } = require('../utils/responseHelper');

const protect = async (req, res, next) => {
  try {
    // 1. Extract token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No access token provided.', 401, 'NO_TOKEN');
    }

    const token = authHeader.split(' ')[1];

    // 2. Verify & decode
    const decoded = verifyAccessToken(token);

    // 3. Confirm user still exists and is active
    const user = await User.findById(decoded.sub);
    if (!user) {
      throw new AppError('The user belonging to this token no longer exists.', 401, 'USER_NOT_FOUND');
    }

    if (!user.isActive) {
      throw new AppError('Your account has been deactivated.', 403, 'ACCOUNT_INACTIVE');
    }

    // 4. Attach user to request
    req.user = user;

    // 5. Forward role in response header for downstream services
    res.setHeader('X-User-Role', user.role);
    res.setHeader('X-User-Id', user._id.toString());

    next();
  } catch (err) {
    if (err.isOperational) {
      return sendError(res, err.statusCode, err.message);
    }
    return sendError(res, 500, 'Authentication failed.');
  }
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return sendError(
        res,
        403,
        `Access denied. Required role(s): ${roles.join(', ')}.`
      );
    }
    next();
  };
};

module.exports = { protect, restrictTo };