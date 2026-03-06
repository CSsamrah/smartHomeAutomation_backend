const User = require('../models/User');
const AppError = require('../utils/AppError');
const { createTokenPair } = require('./tokenService');
const { verifyGoogleToken } = require('./googleAuthService');

const formatUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  avatar: user.avatar,
  isActive: user.isActive,
  lastLogin: user.lastLogin,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const register = async ({ name, email, password, role }) => {
  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError('An account with this email already exists.', 409, 'EMAIL_TAKEN');
  }

  const user = await User.create({ name, email, password, role });
  const tokens = createTokenPair({ id: user._id, role: user.role });

  console.log(`New user registered: ${user.email} (${user.role})`);

  return { user: formatUser(user), tokens };
};

const login = async ({ email, password }) => {
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
  }

  if (!user.isActive) {
    throw new AppError('Your account has been deactivated. Contact support.', 403, 'ACCOUNT_INACTIVE');
  }

  user.lastLogin = new Date();
  await user.save();

  const tokens = createTokenPair({ id: user._id, role: user.role });

  console.log(`User logged in: ${user.email}`);

  return { user: formatUser(user), tokens };
};

const googleLogin = async (idToken) => {
  const googleProfile = await verifyGoogleToken(idToken);
  const { googleId, email, name, avatar } = googleProfile;

  let isNewUser = false;
  let user = await User.findOne({ email });

  if (user) {
    if (!user.googleId) {
      await User.findByIdAndUpdate(user._id, { googleId, avatar: avatar || user.avatar });
    }
    if (!user.isActive) {
      throw new AppError('Your account has been deactivated. Contact support.', 403, 'ACCOUNT_INACTIVE');
    }
  } else {
    user = await User.create({ name, email, googleId, avatar, role: 'RESIDENT' });
    isNewUser = true;
    console.log(`New Google OAuth user: ${email}`);
  }

  user.lastLogin = new Date();
  await user.save();

  const tokens = createTokenPair({ id: user._id, role: user.role });

  console.log(`Google login: ${email} (${user.role})`);

  return { user: formatUser(user), tokens, isNewUser };
};

module.exports = { register, login, googleLogin };