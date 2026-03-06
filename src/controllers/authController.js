const authService = require('../services/authService');
const { verifyRefreshToken, generateAccessToken } = require('../services/tokenService');
const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/responseHelper');


const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    const result = await authService.register({ name, email, password, role });

    return sendSuccess(res, 201, 'Account created successfully.', {
      user: result.user,
      tokens: result.tokens,
    });
  } catch (err) {
    next(err);
  }
};


const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });

    // Forward role header (also set in protect middleware for authenticated routes)
    res.setHeader('X-User-Role', result.user.role);

    return sendSuccess(res, 200, 'Login successful.', {
      user: result.user,
      tokens: result.tokens,
    });
  } catch (err) {
    next(err);
  }
};


const googleLogin = async (req, res, next) => {
  try {
    const { idToken } = req.body;
    const result = await authService.googleLogin(idToken);

    res.setHeader('X-User-Role', result.user.role);

    return sendSuccess(
      res,
      result.isNewUser ? 201 : 200,
      result.isNewUser ? 'Account created via Google.' : 'Google login successful.',
      {
        user: result.user,
        tokens: result.tokens,
        isNewUser: result.isNewUser,
      }
    );
  } catch (err) {
    next(err);
  }
};


const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      return sendError(res, 400, 'Refresh token is required.');
    }

    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.sub);

    if (!user || !user.isActive) {
      return sendError(res, 401, 'Invalid refresh token.');
    }

    const accessToken = generateAccessToken({ id: user._id, role: user.role });

    return sendSuccess(res, 200, 'Token refreshed.', {
      accessToken,
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
  } catch (err) {
    next(err);  // ✅ next is available because it's a parameter, not a nested require
  }
};

module.exports = { register, login, googleLogin, refreshToken };