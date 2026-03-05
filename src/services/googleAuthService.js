const {OAuth2Client}=require('google-auth-library');
const {googleClientId}=require('../config/auth');
const AppError=require('../utils/AppError');

const client=new OAuth2Client(googleClientId);

const verifyGoogleToken=async(idToken)=>{
    try{
        const ticket= await client.verifyIdToken({idToken,audience:googleClientId,})

        const payload=ticket.getPayLoad();
        if(!payload){
            throw new AppError('Google token payload is empty.', 401, 'GOOGLE_TOKEN_EMPTY');
        }
        if (!payload.email_verified){
            throw new AppError('Google account email is not verified.', 401, 'GOOGLE_EMAIL_UNVERIFIED');
        }
        return{
            googleId: payload.sub,
            email:payload.email,
            name:payload.name,
        };
    }catch(err){
       if (err.isOperational) throw err;
       throw new AppError('Failed to verify Google token.', 401, 'GOOGLE_TOKEN_INVALID');
  }
};

module.eports={
    verifyGoogleToken,
};