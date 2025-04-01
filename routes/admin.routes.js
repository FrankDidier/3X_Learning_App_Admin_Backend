const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const ApiResponse = require('../utils/apiResponse');

const router = express.Router();

// @route   POST /api/admin/login
// @desc    Admin login
// @access  Public
router.post(
  '/login',
  [
    check('username', '请输入用户名').not().isEmpty(),
    check('password', '请输入密码').not().isEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ApiResponse.error(res, errors.array()[0].msg, 400, 'VALIDATION_ERROR');
    }

    const { username, password } = req.body;

    try {
      // Check if username matches env variable
      if (username !== process.env.ADMIN_USERNAME) {
        return ApiResponse.error(res, '用户名或密码错误', 401, 'INVALID_CREDENTIALS');
      }

      // Check if password matches env variable
      const isMatch = password === process.env.ADMIN_PASSWORD;
      if (!isMatch) {
        return ApiResponse.error(res, '用户名或密码错误', 401, 'INVALID_CREDENTIALS');
      }

      // Create admin user if it doesn't exist already
      let adminUser = await User.findOne({ role: 'admin' });
      
      if (!adminUser) {
        // Create admin user in the database
        adminUser = new User({
          name: '系统管理员',
          phone: '13800000000',
          password: await bcrypt.hash(process.env.ADMIN_PASSWORD, 10),
          role: 'admin'
        });
        
        await adminUser.save();
      }

      // Create JWT payload
      const payload = {
        id: adminUser._id,
        role: 'admin'
      };

      // Sign token
      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: '24h' },
        (err, token) => {
          if (err) throw err;
          ApiResponse.success(res, { token }, '登录成功');
        }
      );
    } catch (err) {
      console.error(err);
      ApiResponse.error(res, '服务器错误', 500, 'SERVER_ERROR');
    }
  }
);

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard data
// @access  Private (Admin only)
router.get('/dashboard', protect, authorize('admin'), async (req, res) => {
  try {
    // Implement dashboard data aggregation logic here
    const stats = {
      userCount: await User.countDocuments(),
      // Add other stats as needed
    };
    
    ApiResponse.success(res, stats, '获取数据成功');
  } catch (err) {
    console.error(err);
    ApiResponse.error(res, '服务器错误', 500, 'SERVER_ERROR');
  }
});

// @route   GET /api/admin/users
// @desc    Get all users
// @access  Private (Admin only)
router.get('/users', protect, authorize('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search, sort = 'createdAt', order = 'desc' } = req.query;
    
    // Build query
    const query = {};
    
    // Add role filter if provided
    if (role) {
      query.role = role;
    }
    
    // Add search filter if provided
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Count total documents
    const total = await User.countDocuments(query);
    
    // Determine sort order
    const sortOrder = order === 'desc' ? -1 : 1;
    
    // Fetch users with pagination
    const users = await User.find(query)
      .sort({ [sort]: sortOrder })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    ApiResponse.paginate(res, users, page, limit, total, '获取用户列表成功');
  } catch (err) {
    console.error(err);
    ApiResponse.error(res, '服务器错误', 500, 'SERVER_ERROR');
  }
});

// @route   POST /api/admin/users
// @desc    Create a new user
// @access  Private (Admin only)
router.post(
  '/users',
  [
    protect,
    authorize('admin'),
    check('name', '请输入姓名').not().isEmpty(),
    check('phone', '请输入有效的手机号码').matches(/^1[3-9]\d{9}$/),
    check('role', '请选择用户角色').isIn(['student', 'teacher', 'supervisor', 'admin']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ApiResponse.error(res, errors.array()[0].msg, 400, 'VALIDATION_ERROR');
    }

    try {
      const { name, phone, password, role, studentId, region } = req.body;

      // Check if phone already exists
      let user = await User.findOne({ phone });
      if (user) {
        return ApiResponse.error(res, '该手机号已被注册', 400, 'DUPLICATE_PHONE');
      }

      // Create new user
      user = new User({
        name,
        phone,
        password: password || '123456', // Default password if not provided
        role,
        studentId,
        region
      });

      await user.save();
      
      // Generate promotion code if role is teacher
      if (role === 'teacher') {
        user.generatePromotionCode();
        await user.save();
      }

      ApiResponse.success(res, user, '创建用户成功');
    } catch (err) {
      console.error(err);
      ApiResponse.error(res, '服务器错误', 500, 'SERVER_ERROR');
    }
  }
);

// @route   PUT /api/admin/users/:id
// @desc    Update a user
// @access  Private (Admin only)
router.put('/users/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { name, phone, role, studentId, region, isActive, membershipLevel } = req.body;

    // Find user by ID
    let user = await User.findById(req.params.id);
    if (!user) {
      return ApiResponse.error(res, '用户不存在', 404, 'USER_NOT_FOUND');
    }

    // Check if phone is being changed and already exists
    if (phone && phone !== user.phone) {
      const existingUser = await User.findOne({ phone });
      if (existingUser) {
        return ApiResponse.error(res, '该手机号已被注册', 400, 'DUPLICATE_PHONE');
      }
    }

    // Update user fields
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (role) user.role = role;
    if (studentId) user.studentId = studentId;
    if (region) user.region = region;
    if (isActive !== undefined) user.isActive = isActive;
    if (membershipLevel) user.membershipLevel = membershipLevel;

    await user.save();

    ApiResponse.success(res, user, '更新用户成功');
  } catch (err) {
    console.error(err);
    ApiResponse.error(res, '服务器错误', 500, 'SERVER_ERROR');
  }
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete a user
// @access  Private (Admin only)
router.delete('/users/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return ApiResponse.error(res, '用户不存在', 404, 'USER_NOT_FOUND');
    }

    await user.deleteOne();
    
    ApiResponse.success(res, null, '删除用户成功');
  } catch (err) {
    console.error(err);
    ApiResponse.error(res, '服务器错误', 500, 'SERVER_ERROR');
  }
});

// Export admin batch import/export routes
router.post('/users/import', protect, authorize('admin'), (req, res) => {
  // Implement batch import logic
  ApiResponse.success(res, null, '批量导入成功');
});

router.get('/users/export', protect, authorize('admin'), (req, res) => {
  // Implement export logic
  ApiResponse.success(res, { url: 'export_url.csv' }, '导出成功');
});

module.exports = router; 