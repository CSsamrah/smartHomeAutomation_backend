const User=require('../models/User');
const AppError = require('../utils/AppError');
const { createTokenPair } = require('./tokenService');
const { verifyGoogleToken } = require('./googleAuthService');


const register=async({name,email,password,role})=>{
    const existing= await User.findOne({email});
    if(existing){
        throw new AppError('An account with this email already exists.', 409, 'EMAIL_TAKEN');
    }
    const user= await User.create({name,email,password,role});
    const tokens=createTokenPair({id:user._id,role:user.role});
    return {user:user.toPublishJson(), tokens};
};

const login=async({email,password})=>{
    
    const user=User.findOne({email}).select('+password');
    if(!user || !(user.comparePassword(password))){
        throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');

    }
    if(!user.isAxtive){
        throw new AppError('Your account has been deactivated. Contact support.', 403, 'ACCOUNT_INACTIVE');
 
    }
    user.lastLogin=new Date();
    await user.save({validateBeforeSave:false});
    const tokens=createTokenPair({id:user._id,role:user.role});
    return {user:user.toPublicJson(), tokens};
    
};

const googleLogin = async (idToken) => {
  const googleProfile = await verifyGoogleToken(idToken);
  const { googleId, email, name} = googleProfile;

  let isNewUser = false;
  let user = await User.findOne({ email });

  if (user) {
    if (!user.googleId) {
      await User.findByIdAndUpdate(user._id, { googleId });
    }

    if (!user.isActive) {
      throw new AppError('Your account has been deactivated. Contact support.', 403, 'ACCOUNT_INACTIVE');
    }
  } else {
    user = await User.create({ name, email, googleId, role: 'RESIDENT' });
    isNewUser = true;
  }

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  const tokens = createTokenPair({ id: user._id, role: user.role });
  return { user: user.toPublicJSON(), tokens, isNewUser };
};

module.exports = { register, login, googleLogin };
