const User = require('../models/User');
const AppError = require('../utils/AppError');
const { sendSuccess, sendError } = require('../utils/responseHelper');


const getMyProfile = async (req, res, next) => {
  try {
    // Re-fetch to guarantee freshest data (req.user from middleware is fine for
    // most cases but an explicit lean query is cheaper at scale)
    const user = await User.findById(req.user._id);

    if (!user) {
      return next(new AppError('User not found.', 404, 'USER_NOT_FOUND'));
    }

    // Build role-specific dashboard payload
    const dashboard = buildDashboard(user);

    return sendSuccess(res, 200, 'User profile fetched successfully.', {
      profile: user.toPublicJSON(),
      dashboard,
    });
  } catch (err) {
    next(err);
  }
};


const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return next(new AppError('No user found with that ID.', 404, 'USER_NOT_FOUND'));
    }

    return sendSuccess(res, 200, 'User fetched successfully.', {
      profile: user.toPublicJSON(),
    });
  } catch (err) {
    next(err);
  }
};


const getAllUsers = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find().skip(skip).limit(limit).sort('-createdAt'),
      User.countDocuments(),
    ]);

    return sendSuccess(
      res,
      200,
      'Users fetched successfully.',
      { users: users.map((u) => u.toPublicJSON()) },
      { page, limit, total, pages: Math.ceil(total / limit) }
    );
  } catch (err) {
    next(err);
  }
};

//  Helpers

const buildDashboard = (user) => {
  const base = {
    role: user.role,
    lastLogin: user.lastLogin,
    memberSince: user.createdAt,
  };

  if (user.role === 'ADMIN') {
    return {
      ...base,
      permissions: [
        'manage_users',
        'view_all_residents',
        'manage_announcements',
        'view_reports',
      ],
      quickLinks: ['/admin/users', '/admin/reports', '/admin/announcements'],
    };
  }

  // RESIDENT
  return {
    ...base,
    permissions: ['view_own_profile', 'submit_requests', 'view_announcements'],
    quickLinks: ['/resident/requests', '/resident/announcements'],
  };
};

module.exports = { getMyProfile, getUserById, getAllUsers };