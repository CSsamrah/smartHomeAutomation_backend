const { verifyAccessToken } = require('../services/tokenService');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { sendError } = require('../utils/responseHelper');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No access token provided.', 401, 'NO_TOKEN');
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    const user = await User.findById(decoded.sub);
    if (!user) {
      throw new AppError('The user belonging to this token no longer exists.', 401, 'USER_NOT_FOUND');
    }

    if (!user.isActive) {
      throw new AppError('Your account has been deactivated.', 403, 'ACCOUNT_INACTIVE');
    }

    req.user = user;
    res.setHeader('X-User-Role', user.role);
    res.setHeader('X-User-Id', user._id.toString());

    next();
  } catch (err) {
    if (err.isOperational) {
      return sendError(res, err.statusCode, err.message);
    }
    console.error('protect middleware error:', err);
    return sendError(res, 500, 'Authentication failed.');
  }
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return sendError(res, 403, `Access denied. Required role(s): ${roles.join(', ')}.`);
    }
    next();
  };
};

module.exports = { protect, restrictTo };