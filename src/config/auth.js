/**
 * config/auth.js — Authentication configuration.
 * Single Source of Truth for all auth-related constants.
 */
module.exports = {
  googleClientId:   process.env.GOOGLE_CLIENT_ID,
  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS) || 12,
};