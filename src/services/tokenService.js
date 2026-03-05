const jwt=require('jsonwebtoken')
const {jwtSecret,jwtExpiresIn, jwtRefreshSecret, jwtRefreshExpiresIn}=require('../config/auth');

const generateAccessToken=(payload)=>{
    return jwt.sign({sub:payload.id, role:payload.role},jwtSecret,{expiresIn:jwtExpiresIn,issuer:'smartHome'})
}

const generateRefreshToken=(payload)=>{
    return jwt.sign({sub:payload.id},jwtRefreshSecret,{expiresIn:jwtRefreshExpiresIn,issuer:'smartHome'})
};

const verifyAccessToken=(token)=>{
    try{
        return jwt.verify(token,jwtSecret,{issuer:'smartHome'});
    }
    catch(err){
        if(err.name=='TokenExpiredError'){
            throw new AppError('Access token expired. Please log in again.', 401, 'TOKEN_EXPIRED');
        }
        throw new AppError('Invalid access token', 401, 'TOKEN_INVALID');
    }
};

const verifyRefreshToken=(token)=>{
    try{
    return jwt.verify(token,jwtRefreshSecret,{issuer:'smartHome'});
    }
    catch(err){
        if(err.name=='TokenExpiredError'){
            throw new AppError('Refresh token expired. Please log in again.', 401, 'REFRESH_TOKEN_EXPIRED');
        }
        throw new AppError('Invalid refresh token', 401, 'REFRESH_TOKEN_INVALID');
    }
};

const createTokenPair=(user)=>({
    accessToken:generateAccessToken(user),
    refreshToken:generateRefreshToken(user), 
    expiresIn:jwtExpiresIn,   
});

module.exports={
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    createTokenPair,
};