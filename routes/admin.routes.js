const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const ApiResponse = require('../utils/apiResponse');
const Course = require('../models/Course');
const { Parser } = require('json2csv');
const multer = require('multer');
const xlsx = require('xlsx');

const router = express.Router();

// 配置multer用于文件上传
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

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
    // const errors = validationResult(req);
    // if (!errors.isEmpty()) {
    //   return ApiResponse.error(res, errors.array()[0].msg, 400, 'VALIDATION_ERROR');
    // }

    const { username, password } = req.body;
    console.log(username,password,'vvv');
    
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
    // Get total users count
    const totalUsers = await User.countDocuments();
    
    // Get total courses count
    const totalCourses = await Course.countDocuments();
    
    // Get total teachers count
    const totalTeachers = await User.countDocuments({ role: 'teacher' });
    
    // Get total revenue (sum of all course prices)
    const courses = await Course.find({}, 'price');
    const totalRevenue = courses.reduce((sum, course) => sum + (course.price || 0), 0);
    
    // Get total enrollments
    const totalEnrollments = await User.countDocuments({ enrolledCourses: { $exists: true, $ne: [] } });
    
    // Get recent users (last 5)
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name phone role createdAt');
    
    // Get recent enrollments (last 5)
    const recentEnrollments = await User.aggregate([
      { $match: { enrolledCourses: { $exists: true, $ne: [] } } },
      { $sort: { createdAt: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'courses',
          localField: 'enrolledCourses',
          foreignField: '_id',
          as: 'enrolledCourses'
        }
      },
      {
        $project: {
          name: 1,
          'enrolledCourses.title': 1,
          'enrolledCourses.price': 1,
          createdAt: 1
        }
      }
    ]);
    
    // Get revenue data by month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const revenueData = await Course.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { $month: '$createdAt' },
          revenue: { $sum: '$price' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);
    
    // Get enrollment data by category
    const enrollmentData = await Course.aggregate([
      {
        $group: {
          _id: '$category',
          enrollments: { $sum: '$enrollmentCount' }
        }
      }
    ]);
    
    // Format the response
    const stats = {
      totalUsers,
      totalCourses,
      totalTeachers,
      totalRevenue,
      totalEnrollments,
      recentUsers,
      recentEnrollments,
      revenueData: revenueData.map(item => ({
        name: `${item._id}月`,
        revenue: item.revenue
      })),
      enrollmentData: enrollmentData.map(item => ({
        name: item._id,
        enrollments: item.enrollments
      }))
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
    const { page = 1, limit = 10, role, search, sort = 'createdAt', order = 'desc', isActive, region } = req.query;
    
    // Build query
    const query = {};
    
    // Add role filter if provided
    if (role && role !== '') {
      query.role = role;
    }
    
    // Add isActive filter if provided
    if (isActive !== undefined && isActive !== '') {
      query.isActive = isActive === 'true';
    }
    
    // Add region filter if provided
    if (region && region !== '') {
      query.region = region;
    }
    
    // Add search filter if provided
    if (search && search !== '') {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } }
      ];
    }
    
    // For debugging
    console.log('Query conditions:', query);
    
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

// @route   POST /api/admin/users/import
// @desc    Import users from Excel/CSV file
// @access  Private (Admin only)
router.post('/users/import', protect, authorize('admin'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return ApiResponse.error(res, '请上传文件', 400, 'NO_FILE');
    }

    const file = req.file;
    let users = [];
    let importedCount = 0;
    let failedCount = 0;
    let failedRows = [];

    // 根据文件类型解析数据
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      const workbook = xlsx.read(file.buffer, { type: 'buffer' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      users = xlsx.utils.sheet_to_json(worksheet);
    } else if (file.mimetype.includes('excel') || file.originalname.endsWith('.xlsx')) {
      const workbook = xlsx.read(file.buffer, { type: 'buffer' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      users = xlsx.utils.sheet_to_json(worksheet);
    } else {
      return ApiResponse.error(res, '不支持的文件格式', 400, 'INVALID_FILE_TYPE');
    }

    // 验证并导入用户
    for (let i = 0; i < users.length; i++) {
      const row = users[i];
      try {
        // 验证必填字段
        if (!row.name || !row.phone) {
          throw new Error('姓名和手机号不能为空');
        }

        // 验证手机号格式
        if (!/^1[3-9]\d{9}$/.test(row.phone)) {
          throw new Error('手机号格式不正确');
        }

        // 检查手机号是否已存在
        const existingUser = await User.findOne({ phone: row.phone });
        if (existingUser) {
          throw new Error('手机号已存在');
        }

        // 创建新用户
        const newUser = new User({
          name: row.name,
          phone: row.phone,
          password: await bcrypt.hash(row.password || '123456', 10),
          role: ['student', 'teacher', 'supervisor'].includes(row.role) ? row.role : 'student',
          studentId: row.studentId,
          region: row.region || '未指定',
          isActive: row.isActive !== undefined ? row.isActive : true
        });

        await newUser.save();
        importedCount++;

        // 如果是教师，生成推广码
        if (newUser.role === 'teacher') {
          newUser.generatePromotionCode();
          await newUser.save();
        }
      } catch (error) {
        failedCount++;
        failedRows.push({
          row: i + 1,
          error: error.message
        });
      }
    }

    ApiResponse.success(res, {
      importedCount,
      failedCount,
      failedRows,
      total: users.length
    }, `成功导入 ${importedCount} 个用户，失败 ${failedCount} 个`);

  } catch (err) {
    console.error(err);
    ApiResponse.error(res, '导入用户失败', 500, 'IMPORT_ERROR');
  }
});

router.get('/users/export', protect, authorize('admin'), async (req, res) => {
  try {
    // 获取所有用户数据
    const users = await User.find({}, '-password').lean();
    
    // 准备CSV字段
    const fields = [
      { label: 'ID', value: '_id' },
      { label: '姓名', value: 'name' },
      { label: '手机号', value: 'phone' },
      { label: '角色', value: 'role' },
      { label: '学号', value: 'studentId' },
      { label: '地区', value: 'region' },
      { label: '状态', value: 'isActive' },
      { label: '注册时间', value: 'createdAt' }
    ];

    // 创建CSV解析器
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(users);

    // 设置响应头
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=users_export.csv');
    
    // 返回符合前端期望的响应格式
    res.json({
      headers: {
        'content-type': 'text/csv',
        'content-disposition': 'attachment; filename=users_export.csv'
      },
      data: csv
    });
  } catch (err) {
    console.error(err);
    ApiResponse.error(res, '导出用户数据失败', 500, 'EXPORT_ERROR');
  }
});

module.exports = router; 