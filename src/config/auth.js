module.exports={
    jwtSecret:process.env.JWT_SECRET,
    jwtExpiresIn:process.env.JWT_EXPIRES_IN || '7d',
    jwtRefreshSecret:process.env.JWT_REFRESH_SECRET,
    jwtRefreshExpiresIn:process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    googleClientId:process.env.GOOGLE_CLIENT_ID,
    bcryptSaltRounds:parseInt(process.env.BCRYPT_SALT_ROUNDS,10) || 12,
};
