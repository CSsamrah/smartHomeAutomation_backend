const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const{bcryptSaltRounds}=require('../config/auth');

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // never returned in queries by default
    },
    googleId:{
      type:String,
      select:false, //internal, not exposed
    },
    role: {
      type: String,
      enum: ['ADMIN', 'RESIDENT'],
      default: 'RESIDENT',
    },
    isActive:{
      type:Boolean,
      default:true,
    },
    lastLogin:{
      type:Date,
      default:null,
    },
  },
  { timestamps: true,
    toJSON: {
      virtuals: true, // this includes virtual fields that you want to dynamically add in a response
      transform(_, ret) {
        delete ret.__v;  // deleting version ,googleId from the response
        delete ret.googleId;
        return ret;
      },
    },
   }
);

//hook to hash password before saving
UserSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return;
  this.password = await bcrypt.hash(this.password, bcryptSaltRounds);
});

//instance methods
UserSchema.methods.comparePassword=async function(candidatePassword){
  return bcrypt.compare(candidatePassword,this.password);
};

UserSchema.methods.toPublicJson=function(){
  return{
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    isActive: this.isActive,
    lastLogin: this.lastLogin,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  }
}


module.exports = mongoose.model('User', UserSchema);
