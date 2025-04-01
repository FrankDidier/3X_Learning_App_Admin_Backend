const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, '请输入姓名'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, '请输入手机号码'],
    unique: true,
    match: [/^1[3-9]\d{9}$/, '请输入有效的手机号码']
  },
  password: {
    type: String,
    required: [true, '请输入密码'],
    minlength: [6, '密码长度不能少于6个字符'],
    select: false
  },
  role: {
    type: String,
    enum: ['admin', 'teacher', 'student', 'supervisor'],
    default: 'student'
  },
  avatar: {
    type: String,
    default: 'default-avatar.png'
  },
  studentId: {
    type: String,
    sparse: true
  },
  region: {
    type: String,
    default: '未指定'
  },
  enrolledCourses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  teachingCourses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  supervisingStudents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  promotionCode: {
    type: String,
    unique: true,
    sparse: true
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  membershipLevel: {
    type: String,
    enum: ['free', 'basic', 'premium', 'vip'],
    default: 'free'
  },
  membershipExpiry: {
    type: Date,
    default: null
  },
  trialUsed: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  learningProgress: {
    type: Map,
    of: {
      courseId: String,
      progress: Number,
      lastActivity: Date
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Set updatedAt on save
UserSchema.pre('save', async function(next) {
  this.updatedAt = Date.now();
  
  // Only hash password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    // Generate salt
    const salt = await bcrypt.genSalt(10);
    // Hash password with salt
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Generate JWT
UserSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// Match password
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate promotion code
UserSchema.methods.generatePromotionCode = function() {
  // Generate a unique code based on user ID and a random string
  const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
  this.promotionCode = `${this._id.toString().substring(0, 5)}${randomStr}`;
  return this.promotionCode;
};

module.exports = mongoose.model('User', UserSchema); 