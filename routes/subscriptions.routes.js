const express = require('express');
const { check, validationResult } = require('express-validator');
const Subscription = require('../models/Subscription');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const ApiResponse = require('../utils/apiResponse');
const { protect, authorize } = require('../middleware/auth');
const paymentService = require('../services/payment.service');

const router = express.Router();

// @route   GET /api/subscriptions/current
// @desc    Get current user's subscription
// @access  Private
router.get('/current', protect, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      user: req.user.id,
      status: 'ACTIVE'
    }).populate('plan');

    if (!subscription) {
      return ApiResponse.error(res, '未找到有效订阅', 404, 'SUBSCRIPTION_NOT_FOUND');
    }

    ApiResponse.success(res, subscription, '获取订阅信息成功');
  } catch (err) {
    console.error(err);
    ApiResponse.error(res, '服务器错误', 500, 'SERVER_ERROR');
  }
});

// @route   GET /api/subscriptions/plans
// @desc    Get all subscription plans
// @access  Public
router.get('/plans', async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({ isActive: true });
    ApiResponse.success(res, plans, '获取订阅计划成功');
  } catch (err) {
    console.error(err);
    ApiResponse.error(res, '服务器错误', 500, 'SERVER_ERROR');
  }
});

// @route   GET /api/subscriptions/plans/:id
// @desc    Get a single subscription plan by ID
// @access  Public
router.get('/plans/:id', async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findById(req.params.id);
    
    if (!plan) {
      return ApiResponse.error(res, '订阅计划不存在', 404, 'PLAN_NOT_FOUND');
    }

    ApiResponse.success(res, plan, '获取订阅计划成功');
  } catch (err) {
    console.error(err);
    ApiResponse.error(res, '服务器错误', 500, 'SERVER_ERROR');
  }
});

// @route   POST /api/subscriptions/plans
// @desc    Create a new subscription plan
// @access  Private (Admin only)
router.post(
  '/plans',
  [
    protect,
    authorize('admin'),
    check('name', '请输入套餐名称').not().isEmpty(),
    check('description', '请输入套餐描述').not().isEmpty(),
    check('price', '请输入套餐价格').isNumeric(),
    check('durationDays', '请输入套餐时长（天）').isNumeric(),
    check('features', '请输入套餐包含的功能').isArray()
  ],
  async (req, res) => {
    // const errors = validationResult(req);
    // if (!errors.isEmpty()) {
    //   return ApiResponse.error(res, errors.array()[0].msg, 400, 'VALIDATION_ERROR');
    // }  
    console.log(req.body,'vv');
    

    try {
      const { name, description, price, durationDays, features } = req.body;

      // Create new subscription plan
      const plan = new SubscriptionPlan({
        name,
        description,
        price,
        durationDays,
        features,
        isActive: true
      });

      await plan.save();

      ApiResponse.success(res, plan, '订阅计划创建成功');
    } catch (err) {
      console.error(err);
      ApiResponse.error(res, '创建订阅计划失败', 500, 'SERVER_ERROR');
    }
  }
);

// @route   POST /api/subscriptions/subscribe
// @desc    Subscribe to a plan
// @access  Private
router.post(
  '/subscribe',
  [
    protect,
    check('planId', '请选择订阅计划').not().isEmpty(),
    check('paymentMethod', '请选择支付方式').isIn(['wechat', 'alipay'])
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ApiResponse.error(res, errors.array()[0].msg, 400, 'VALIDATION_ERROR');
    }

    try {
      const { planId, paymentMethod } = req.body;

      // Check if plan exists
      const plan = await SubscriptionPlan.findById(planId);
      if (!plan || !plan.isActive) {
        return ApiResponse.error(res, '订阅计划不存在或已下架', 404, 'PLAN_NOT_FOUND');
      }

      // Check if user already has an active subscription
      const existingSubscription = await Subscription.findOne({
        user: req.user.id,
        status: 'ACTIVE'
      });

      if (existingSubscription) {
        return ApiResponse.error(res, '您已有有效订阅', 400, 'ACTIVE_SUBSCRIPTION_EXISTS');
      }

      // Calculate expiry date
      const startDate = new Date();
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + plan.durationDays);

      // Create subscription record
      const subscription = new Subscription({
        user: req.user.id,
        plan: planId,
        startDate,
        expiryDate,
        amount: plan.price,
        paymentMethod,
        status: 'ACTIVE'
      });

      await subscription.save();

      // Process payment
      let paymentResponse;
      if (paymentMethod === 'wechat') {
        paymentResponse = await paymentService.processWeChatPayment(req.user.id, planId, plan.price);
      } else {
        paymentResponse = await paymentService.processAlipayPayment(req.user.id, planId, plan.price);
      }

      // Update subscription with transaction ID
      subscription.transactionId = paymentResponse.paymentId;
      await subscription.save();

      ApiResponse.success(
        res,
        {
          subscriptionId: subscription._id,
          qrCodeUrl: paymentResponse.qrCodeUrl
        },
        '订阅创建成功'
      );
    } catch (err) {
      console.error(err);
      ApiResponse.error(res, '处理订阅请求失败', 500, 'SUBSCRIPTION_ERROR');
    }
  }
);

// @route   POST /api/subscriptions/cancel
// @desc    Cancel current subscription
// @access  Private
router.post('/cancel', protect, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      user: req.user.id,
      status: 'ACTIVE'
    });

    if (!subscription) {
      return ApiResponse.error(res, '未找到有效订阅', 404, 'SUBSCRIPTION_NOT_FOUND');
    }

    subscription.status = 'CANCELLED';
    subscription.cancelledAt = new Date();
    await subscription.save();

    ApiResponse.success(res, null, '订阅已取消');
  } catch (err) {
    console.error(err);
    ApiResponse.error(res, '取消订阅失败', 500, 'CANCELLATION_ERROR');
  }
});

module.exports = router; 