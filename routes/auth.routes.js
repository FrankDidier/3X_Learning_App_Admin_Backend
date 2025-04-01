const express = require('express');
const { check, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Mock SMS service for development
const smsVerificationCodes = new Map();

// @route   POST /api/auth/register
// @desc    Register user
// @access  Public
router.post(
  '/register',
  [
    check('name', '请输入姓名').not().isEmpty(),
    check('phone', '请输入有效的手机号码').matches(/^1[3-9]\d{9}$/),
    check('verificationCode', '请输入验证码').not().isEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ApiResponse.error(res, errors.array()[0].msg, 400, 'VALIDATION_ERROR');
    }

    const { name, phone, verificationCode, invitationCode, role = 'student' } = req.body;

    try {
      // Verify SMS code
      const storedCode = smsVerificationCodes.get(phone);
      if (!storedCode || storedCode !== verificationCode) {
        return ApiResponse.error(res, '验证码无效或已过期', 400, 'INVALID_CODE');
      }

      // Check if user already exists
      let user = await User.findOne({ phone });
      if (user) {
        return ApiResponse.error(res, '该手机号已被注册', 400, 'DUPLICATE_PHONE');
      }

      // Create new user
      user = new User({
        name,
        phone,
        password: await bcrypt.hash('123456', 10), // Default password
        role: ['student', 'teacher', 'supervisor'].includes(role) ? role : 'student'
      });

      // Process invitation code if provided
      if (invitationCode) {
        const inviter = await User.findOne({ promotionCode: invitationCode });
        if (inviter) {
          user.invitedBy = inviter._id;
        }
      }

      await user.save();

      // Generate token
      const payload = {
        id: user._id,
        role: user.role
      };

      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: '24h' },
        (err, token) => {
          if (err) throw err;
          ApiResponse.success(res, { 
            token,
            user: {
              id: user._id,
              name: user.name,
              phone: user.phone,
              role: user.role
            }
          }, '注册成功');
        }
      );
    } catch (err) {
      console.error(err);
      ApiResponse.error(res, '服务器错误', 500, 'SERVER_ERROR');
    }
  }
);

// @route   POST /api/auth/send-code
// @desc    Send SMS verification code
// @access  Public
router.post(
  '/send-code',
  [
    check('phone', '请输入有效的手机号码').matches(/^1[3-9]\d{9}$/)
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ApiResponse.error(res, errors.array()[0].msg, 400, 'VALIDATION_ERROR');
    }

    const { phone } = req.body;

    try {
      // Generate a random 6-digit code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store code in memory (in production, use Redis or similar)
      smsVerificationCodes.set(phone, verificationCode);
      
      // Set expiration (5 minutes)
      setTimeout(() => {
        smsVerificationCodes.delete(phone);
      }, 5 * 60 * 1000);
      
      // In production, send SMS through a provider
      console.log(`SMS verification code for ${phone}: ${verificationCode}`);
      
      ApiResponse.success(res, null, '验证码已发送');
    } catch (err) {
      console.error(err);
      ApiResponse.error(res, '发送验证码失败', 500, 'SERVER_ERROR');
    }
  }
);

// @route   POST /api/auth/verify-code
// @desc    Verify SMS code
// @access  Public
router.post(
  '/verify-code',
  [
    check('phone', '请输入有效的手机号码').matches(/^1[3-9]\d{9}$/),
    check('verificationCode', '请输入验证码').not().isEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ApiResponse.error(res, errors.array()[0].msg, 400, 'VALIDATION_ERROR');
    }

    const { phone, verificationCode } = req.body;

    try {
      const storedCode = smsVerificationCodes.get(phone);
      if (!storedCode || storedCode !== verificationCode) {
        return ApiResponse.error(res, '验证码无效或已过期', 400, 'INVALID_CODE');
      }
      
      ApiResponse.success(res, { verified: true }, '验证成功');
    } catch (err) {
      console.error(err);
      ApiResponse.error(res, '服务器错误', 500, 'SERVER_ERROR');
    }
  }
);

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post(
  '/login',
  [
    check('phone', '请输入有效的手机号码').matches(/^1[3-9]\d{9}$/),
    check('verificationCode', '请输入验证码').not().isEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ApiResponse.error(res, errors.array()[0].msg, 400, 'VALIDATION_ERROR');
    }

    const { phone, verificationCode } = req.body;

    try {
      // Verify SMS code
      const storedCode = smsVerificationCodes.get(phone);
      if (!storedCode || storedCode !== verificationCode) {
        return ApiResponse.error(res, '验证码无效或已过期', 400, 'INVALID_CODE');
      }

      // Check if user exists
      const user = await User.findOne({ phone });
      if (!user) {
        return ApiResponse.error(res, '用户不存在', 404, 'USER_NOT_FOUND');
      }

      // Check if user is active
      if (!user.isActive) {
        return ApiResponse.error(res, '账号已被禁用', 401, 'ACCOUNT_DISABLED');
      }

      // Update last login
      user.lastLogin = Date.now();
      await user.save();

      // Generate token
      const payload = {
        id: user._id,
        role: user.role
      };

      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: '24h' },
        (err, token) => {
          if (err) throw err;
          ApiResponse.success(res, { 
            token,
            user: {
              id: user._id,
              name: user.name,
              phone: user.phone,
              role: user.role,
              avatar: user.avatar,
              studentId: user.studentId
            }
          }, '登录成功');
        }
      );
    } catch (err) {
      console.error(err);
      ApiResponse.error(res, '服务器错误', 500, 'SERVER_ERROR');
    }
  }
);

// @route   GET /api/auth/me
// @desc    Get current user's profile
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return ApiResponse.error(res, '用户不存在', 404, 'USER_NOT_FOUND');
    }
    
    ApiResponse.success(res, user, '获取用户资料成功');
  } catch (err) {
    console.error(err);
    ApiResponse.error(res, '服务器错误', 500, 'SERVER_ERROR');
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put(
  '/profile',
  [
    protect,
    check('name', '请输入姓名').optional().not().isEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ApiResponse.error(res, errors.array()[0].msg, 400, 'VALIDATION_ERROR');
    }

    try {
      const { name, avatar, studentId } = req.body;
      
      // Find user
      const user = await User.findById(req.user.id);
      
      if (!user) {
        return ApiResponse.error(res, '用户不存在', 404, 'USER_NOT_FOUND');
      }
      
      // Update fields
      if (name) user.name = name;
      if (avatar) user.avatar = avatar;
      if (studentId) user.studentId = studentId;
      
      await user.save();
      
      ApiResponse.success(res, user, '更新个人资料成功');
    } catch (err) {
      console.error(err);
      ApiResponse.error(res, '服务器错误', 500, 'SERVER_ERROR');
    }
  }
);

// @route   PUT /api/auth/password
// @desc    Change password
// @access  Private
router.put(
  '/password',
  [
    protect,
    check('currentPassword', '请输入当前密码').not().isEmpty(),
    check('newPassword', '请输入新密码').isLength({ min: 6 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ApiResponse.error(res, errors.array()[0].msg, 400, 'VALIDATION_ERROR');
    }

    try {
      const { currentPassword, newPassword } = req.body;
      
      // Find user with password
      const user = await User.findById(req.user.id).select('+password');
      
      if (!user) {
        return ApiResponse.error(res, '用户不存在', 404, 'USER_NOT_FOUND');
      }
      
      // Check current password
      const isMatch = await user.matchPassword(currentPassword);
      if (!isMatch) {
        return ApiResponse.error(res, '当前密码错误', 401, 'INVALID_PASSWORD');
      }
      
      // Update password
      user.password = newPassword;
      await user.save();
      
      ApiResponse.success(res, null, '密码修改成功');
    } catch (err) {
      console.error(err);
      ApiResponse.error(res, '服务器错误', 500, 'SERVER_ERROR');
    }
  }
);

module.exports = router; 