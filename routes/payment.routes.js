const express = require('express');
const { check, validationResult } = require('express-validator');
const Payment = require('../models/Payment');
const User = require('../models/User');
const Course = require('../models/Course');
const Promotion = require('../models/Promotion');
const ApiResponse = require('../utils/apiResponse');
const { protect, authorize } = require('../middleware/auth');
const paymentService = require('../services/payment.service');

const router = express.Router();

// @route   POST /api/payments/course
// @desc    Process course payment
// @access  Private
router.post(
  '/course',
  [
    protect,
    check('courseId', '请选择课程').not().isEmpty(),
    check('paymentMethod', '请选择支付方式').isIn(['wechat', 'alipay']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ApiResponse.error(res, errors.array()[0].msg, 400, 'VALIDATION_ERROR');
    }

    try {
      const { courseId, paymentMethod, promotionCode } = req.body;
      
      // Check if course exists
      const course = await Course.findById(courseId);
      if (!course) {
        return ApiResponse.error(res, '课程不存在', 404, 'COURSE_NOT_FOUND');
      }
      
      // Check if user is already enrolled
      const user = await User.findById(req.user.id);
      if (user.enrolledCourses.includes(courseId)) {
        return ApiResponse.error(res, '您已购买此课程', 400, 'ALREADY_ENROLLED');
      }
      
      // Calculate payment amount
      let amount = course.discountPrice > 0 ? course.discountPrice : course.price;
      let discountAmount = 0;
      
      // Apply promotion code if provided
      if (promotionCode) {
        const promotion = await Promotion.findOne({ code: promotionCode, isActive: true });
        if (promotion && promotion.isValid()) {
          // Check if promotion is applicable to this course
          const isApplicable = promotion.applicableProducts.length === 0 || 
                              promotion.applicableProducts.includes(courseId);
          
          if (isApplicable) {
            discountAmount = promotion.calculateDiscount(amount);
            amount -= discountAmount;
            
            // Record promotion usage (will be saved after payment confirmation)
            await promotion.recordUsage(req.user.id, amount);
          }
        }
      }
      
      // Create payment record
      const payment = new Payment({
        user: req.user.id,
        amount,
        method: paymentMethod,
        type: 'course',
        courseId,
        status: 'pending',
        promotionCode,
        discountAmount
      });
      
      await payment.save();
      
      // Generate payment QR code
      let paymentResponse;
      if (paymentMethod === 'wechat') {
        paymentResponse = await paymentService.processWeChatPayment(req.user.id, courseId, amount);
      } else {
        paymentResponse = await paymentService.processAlipayPayment(req.user.id, courseId, amount);
      }
      
      // Update payment with transaction ID
      payment.transactionId = paymentResponse.paymentId;
      await payment.save();
      
      ApiResponse.success(
        res, 
        { 
          paymentId: payment._id,
          qrCodeUrl: paymentResponse.qrCodeUrl
        }, 
        '支付二维码生成成功'
      );
    } catch (err) {
      console.error(err);
      ApiResponse.error(res, '处理支付请求失败', 500, 'PAYMENT_ERROR');
    }
  }
);

// @route   GET /api/payments/:id/status
// @desc    Check payment status
// @access  Private
router.get('/:id/status', protect, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    
    if (!payment) {
      return ApiResponse.error(res, '支付记录不存在', 404, 'PAYMENT_NOT_FOUND');
    }
    
    // Check ownership
    if (payment.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return ApiResponse.error(res, '未授权', 401, 'UNAUTHORIZED');
    }
    
    ApiResponse.success(res, { status: payment.status }, '获取支付状态成功');
  } catch (err) {
    console.error(err);
    ApiResponse.error(res, '服务器错误', 500, 'SERVER_ERROR');
  }
});

// @route   POST /api/payments/verify
// @desc    Verify payment using SMS code
// @access  Private (Admin only)
router.post(
  '/verify',
  [
    protect,
    authorize('admin'),
    check('paymentId', '请提供支付ID').not().isEmpty(),
    check('smsCode', '请输入短信验证码').not().isEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ApiResponse.error(res, errors.array()[0].msg, 400, 'VALIDATION_ERROR');
    }

    try {
      const { paymentId, smsCode } = req.body;
      
      // In a real app, verify SMS code with actual SMS service
      // For demo, accept any 6-digit code
      if (!/^\d{6}$/.test(smsCode)) {
        return ApiResponse.error(res, '无效的验证码', 400, 'INVALID_CODE');
      }
      
      const payment = await Payment.findById(paymentId);
      if (!payment) {
        return ApiResponse.error(res, '支付记录不存在', 404, 'PAYMENT_NOT_FOUND');
      }
      
      if (payment.status !== 'pending') {
        return ApiResponse.error(res, '支付状态已更新', 400, 'INVALID_STATUS');
      }
      
      // Mark as SMS verified
      payment.smsVerified = true;
      await payment.save();
      
      ApiResponse.success(res, { verified: true }, '短信验证成功');
    } catch (err) {
      console.error(err);
      ApiResponse.error(res, '服务器错误', 500, 'SERVER_ERROR');
    }
  }
);

// @route   POST /api/payments/:id/complete
// @desc    Complete a payment manually (admin verification)
// @access  Private (Admin only)
router.post(
  '/:id/complete',
  [
    protect,
    authorize('admin')
  ],
  async (req, res) => {
    try {
      const payment = await Payment.findById(req.params.id);
      
      if (!payment) {
        return ApiResponse.error(res, '支付记录不存在', 404, 'PAYMENT_NOT_FOUND');
      }
      
      if (payment.status !== 'pending') {
        return ApiResponse.error(res, '支付状态已更新', 400, 'INVALID_STATUS');
      }
      
      // Verify SMS verification has been done
      if (!payment.smsVerified) {
        return ApiResponse.error(res, '请先进行短信验证', 400, 'SMS_VERIFICATION_REQUIRED');
      }
      
      // Update payment status
      payment.status = 'completed';
      payment.verified = true;
      payment.verifiedBy = req.user.id;
      payment.verificationTime = new Date();
      payment.completedAt = new Date();
      await payment.save();
      
      // Process payment based on type
      if (payment.type === 'course') {
        // Enroll user in course
        await User.findByIdAndUpdate(
          payment.user,
          { $addToSet: { enrolledCourses: payment.courseId } }
        );
        
        // Update course enrollment count
        await Course.findByIdAndUpdate(
          payment.courseId,
          { $inc: { enrollmentCount: 1 } }
        );
      } else if (payment.type === 'membership') {
        // Update user membership
        const user = await User.findById(payment.user);
        user.membershipLevel = payment.packageId;
        
        // Set expiry date (e.g., 1 year from now)
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        user.membershipExpiry = expiryDate;
        
        await user.save();
      }
      
      ApiResponse.success(res, payment, '支付已完成');
    } catch (err) {
      console.error(err);
      ApiResponse.error(res, '服务器错误', 500, 'SERVER_ERROR');
    }
  }
);

// @route   GET /api/payments/history
// @desc    Get payment history for current user
// @access  Private
router.get('/history', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    // Count total documents
    const total = await Payment.countDocuments({ user: req.user.id });
    
    // Fetch payments with pagination
    const payments = await Payment.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('courseId', 'title thumbnail');
    
    ApiResponse.paginate(res, payments, page, limit, total, '获取支付历史成功');
  } catch (err) {
    console.error(err);
    ApiResponse.error(res, '服务器错误', 500, 'SERVER_ERROR');
  }
});

// @route   GET /api/payments/admin/list
// @desc    Get all payments (admin)
// @access  Private (Admin only)
router.get('/admin/list', protect, authorize('admin'), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      method, 
      type,
      startDate,
      endDate,
      userId,
      search
    } = req.query;
    
    // Build query
    const query = {};
    
    // Add filters if provided
    if (status) query.status = status;
    if (method) query.method = method;
    if (type) query.type = type;
    if (userId) query.user = userId;
    
    // Add date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    // Add search filter
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { transactionId: searchRegex },
        { promotionCode: searchRegex }
      ];
    }
    
    // Count total documents
    const total = await Payment.countDocuments(query);
    
    // Fetch payments with pagination
    const payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('user', 'name phone')
      .populate('courseId', 'title')
      .populate('verifiedBy', 'name');
    
    ApiResponse.paginate(res, payments, page, limit, total, '获取支付列表成功');
  } catch (err) {
    console.error(err);
    ApiResponse.error(res, '服务器错误', 500, 'SERVER_ERROR');
  }
});

// @route   GET /api/payments/admin/report
// @desc    Generate payment report
// @access  Private (Admin only)
router.get('/admin/report', protect, authorize('admin'), async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query;
    
    if (!startDate || !endDate) {
      return ApiResponse.error(res, '请提供开始和结束日期', 400, 'MISSING_DATE_RANGE');
    }
    
    const report = await Payment.generateReport(
      new Date(startDate),
      new Date(endDate),
      type
    );
    
    // Calculate summary statistics
    const summary = {
      totalRevenue: 0,
      totalTransactions: 0,
      methodBreakdown: {},
      typeBreakdown: {}
    };
    
    report.forEach(item => {
      summary.totalRevenue += item.totalAmount;
      summary.totalTransactions += item.count;
      
      // Method breakdown
      const method = item._id.method;
      if (!summary.methodBreakdown[method]) {
        summary.methodBreakdown[method] = {
          amount: 0,
          count: 0
        };
      }
      summary.methodBreakdown[method].amount += item.totalAmount;
      summary.methodBreakdown[method].count += item.count;
      
      // Type breakdown
      const itemType = item._id.type;
      if (!summary.typeBreakdown[itemType]) {
        summary.typeBreakdown[itemType] = {
          amount: 0,
          count: 0
        };
      }
      summary.typeBreakdown[itemType].amount += item.totalAmount;
      summary.typeBreakdown[itemType].count += item.count;
    });
    
    ApiResponse.success(
      res, 
      { 
        report,
        summary
      }, 
      '生成报表成功'
    );
  } catch (err) {
    console.error(err);
    ApiResponse.error(res, '服务器错误', 500, 'SERVER_ERROR');
  }
});

// Payment webhook routes for Wechat and Alipay callbacks
router.post('/wechat/notify', (req, res) => {
  // Handle WeChat payment notification
  // This would validate the signature and update payment status
  console.log('WeChat payment notification received');
  res.status(200).send('SUCCESS');
});

router.post('/alipay/notify', (req, res) => {
  // Handle Alipay payment notification
  // This would validate the signature and update payment status
  console.log('Alipay payment notification received');
  res.status(200).send('success');
});

module.exports = router; 