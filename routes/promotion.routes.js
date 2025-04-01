const express = require('express');
const { check, validationResult } = require('express-validator');
const Promotion = require('../models/Promotion');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/promotions
// @desc    Get promotions (with filtering)
// @access  Private (Admin)
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      type, 
      isActive, 
      search, 
      sort = 'createdAt', 
      order = 'desc' 
    } = req.query;
    
    // Build query
    const query = {};
    
    // Add filters if provided
    if (type) query.type = type;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    
    // Add search filter if provided
    if (search) {
      query.$or = [
        { code: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Count total documents
    const total = await Promotion.countDocuments(query);
    
    // Determine sort order
    const sortOrder = order === 'desc' ? -1 : 1;
    
    // Fetch promotions with pagination
    const promotions = await Promotion.find(query)
      .populate('creator', 'name')
      .populate('applicableProducts', 'title')
      .sort({ [sort]: sortOrder })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    ApiResponse.paginate(res, promotions, page, limit, total, '获取推广码列表成功');
  } catch (err) {
    console.error(err);
    ApiResponse.error(res, '服务器错误', 500, 'SERVER_ERROR');
  }
});

// @route   GET /api/promotions/:id
// @desc    Get promotion by ID
// @access  Private (Admin)
router.get('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const promotion = await Promotion.findById(req.params.id)
      .populate('creator', 'name')
      .populate('applicableProducts', 'title')
      .populate('usedBy.user', 'name phone');
    
    if (!promotion) {
      return ApiResponse.error(res, '推广码不存在', 404, 'PROMOTION_NOT_FOUND');
    }
    
    ApiResponse.success(res, promotion, '获取推广码详情成功');
  } catch (err) {
    console.error(err);
    if (err.kind === 'ObjectId') {
      return ApiResponse.error(res, '无效的推广码ID', 400, 'INVALID_ID');
    }
    ApiResponse.error(res, '服务器错误', 500, 'SERVER_ERROR');
  }
});

// @route   POST /api/promotions
// @desc    Create a new promotion
// @access  Private (Admin)
router.post(
  '/',
  [
    protect,
    authorize('admin'),
    check('code', '请输入推广码').not().isEmpty(),
    check('type', '请选择推广类型').isIn(['referral', 'discount', 'gift', 'campaign']),
    check('description', '请输入推广描述').not().isEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ApiResponse.error(res, errors.array()[0].msg, 400, 'VALIDATION_ERROR');
    }

    try {
      const { 
        code, 
        type, 
        description, 
        discountRate, 
        fixedAmount, 
        referralReward,
        startDate,
        endDate,
        maxUses,
        limitPerUser,
        minPurchaseAmount,
        applicableProducts,
        applicablePackages
      } = req.body;

      // Check if promotion code already exists
      const existingPromotion = await Promotion.findOne({ code });
      if (existingPromotion) {
        return ApiResponse.error(res, '该推广码已存在', 400, 'DUPLICATE_CODE');
      }

      // Create new promotion
      const promotion = new Promotion({
        code: code.toUpperCase(),
        creator: req.user.id,
        type,
        description,
        discountRate: discountRate || 0,
        fixedAmount: fixedAmount || 0,
        referralReward: referralReward || 0,
        startDate: startDate || new Date(),
        endDate: endDate || null,
        maxUses: maxUses || 0,
        limitPerUser: limitPerUser || 1,
        minPurchaseAmount: minPurchaseAmount || 0,
        applicableProducts: applicableProducts || [],
        applicablePackages: applicablePackages || []
      });

      await promotion.save();
      
      ApiResponse.success(res, promotion, '创建推广码成功');
    } catch (err) {
      console.error(err);
      ApiResponse.error(res, '服务器错误', 500, 'SERVER_ERROR');
    }
  }
);

// @route   PUT /api/promotions/:id
// @desc    Update a promotion
// @access  Private (Admin)
router.put(
  '/:id',
  [
    protect,
    authorize('admin')
  ],
  async (req, res) => {
    try {
      const promotion = await Promotion.findById(req.params.id);
      
      if (!promotion) {
        return ApiResponse.error(res, '推广码不存在', 404, 'PROMOTION_NOT_FOUND');
      }
      
      const { 
        description, 
        discountRate, 
        fixedAmount, 
        referralReward,
        endDate,
        maxUses,
        limitPerUser,
        minPurchaseAmount,
        applicableProducts,
        applicablePackages,
        isActive
      } = req.body;
      
      // Update fields if provided
      if (description) promotion.description = description;
      if (discountRate !== undefined) promotion.discountRate = discountRate;
      if (fixedAmount !== undefined) promotion.fixedAmount = fixedAmount;
      if (referralReward !== undefined) promotion.referralReward = referralReward;
      if (endDate) promotion.endDate = endDate;
      if (maxUses !== undefined) promotion.maxUses = maxUses;
      if (limitPerUser !== undefined) promotion.limitPerUser = limitPerUser;
      if (minPurchaseAmount !== undefined) promotion.minPurchaseAmount = minPurchaseAmount;
      if (applicableProducts) promotion.applicableProducts = applicableProducts;
      if (applicablePackages) promotion.applicablePackages = applicablePackages;
      if (isActive !== undefined) promotion.isActive = isActive;
      
      await promotion.save();
      
      ApiResponse.success(res, promotion, '更新推广码成功');
    } catch (err) {
      console.error(err);
      if (err.kind === 'ObjectId') {
        return ApiResponse.error(res, '无效的推广码ID', 400, 'INVALID_ID');
      }
      ApiResponse.error(res, '服务器错误', 500, 'SERVER_ERROR');
    }
  }
);

// @route   DELETE /api/promotions/:id
// @desc    Delete a promotion
// @access  Private (Admin)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const promotion = await Promotion.findById(req.params.id);
    
    if (!promotion) {
      return ApiResponse.error(res, '推广码不存在', 404, 'PROMOTION_NOT_FOUND');
    }
    
    // Check if promotion has been used
    if (promotion.currentUses > 0) {
      promotion.isActive = false;
      await promotion.save();
      return ApiResponse.success(res, null, '推广码已停用');
    }
    
    // Delete the promotion
    await promotion.deleteOne();
    
    ApiResponse.success(res, null, '删除推广码成功');
  } catch (err) {
    console.error(err);
    if (err.kind === 'ObjectId') {
      return ApiResponse.error(res, '无效的推广码ID', 400, 'INVALID_ID');
    }
    ApiResponse.error(res, '服务器错误', 500, 'SERVER_ERROR');
  }
});

// @route   GET /api/promotions/verify/:code
// @desc    Verify a promotion code
// @access  Private
router.get('/verify/:code', protect, async (req, res) => {
  try {
    const promotion = await Promotion.findOne({ code: req.params.code.toUpperCase() });
    
    if (!promotion) {
      return ApiResponse.error(res, '推广码不存在', 404, 'PROMOTION_NOT_FOUND');
    }
    
    const isValid = promotion.isValid();
    const userId = req.user.id;
    
    // Check if user has already used this promotion to the limit
    const usageCount = promotion.usedBy.filter(usage => usage.user.toString() === userId).length;
    const canUse = usageCount < promotion.limitPerUser;
    
    ApiResponse.success(res, {
      promotion: {
        code: promotion.code,
        description: promotion.description,
        type: promotion.type,
        discountRate: promotion.discountRate,
        fixedAmount: promotion.fixedAmount
      },
      isValid,
      canUse
    }, '验证推广码成功');
  } catch (err) {
    console.error(err);
    ApiResponse.error(res, '服务器错误', 500, 'SERVER_ERROR');
  }
});

// @route   POST /api/promotions/generate
// @desc    Generate a promotion code for a user
// @access  Private (Teacher)
router.post('/generate', protect, authorize('teacher'), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return ApiResponse.error(res, '用户不存在', 404, 'USER_NOT_FOUND');
    }
    
    // Generate promotion code if not already assigned
    if (!user.promotionCode) {
      user.generatePromotionCode();
      await user.save();
    }
    
    // Check if promotion record exists
    let promotion = await Promotion.findOne({ code: user.promotionCode });
    
    if (!promotion) {
      // Create promotion record
      promotion = new Promotion({
        code: user.promotionCode,
        creator: user._id,
        type: 'referral',
        description: `${user.name}的推广码`,
        referralReward: 5, // Default referral reward amount
        isActive: true
      });
      
      await promotion.save();
    }
    
    ApiResponse.success(res, {
      code: user.promotionCode,
      qrCodeUrl: promotion.qrCodeUrl || null
    }, '生成推广码成功');
  } catch (err) {
    console.error(err);
    ApiResponse.error(res, '服务器错误', 500, 'SERVER_ERROR');
  }
});

// @route   GET /api/promotions/statistics
// @desc    Get promotion statistics
// @access  Private (Admin)
router.get('/statistics', protect, authorize('admin'), async (req, res) => {
  try {
    // Count total promotions
    const totalPromotions = await Promotion.countDocuments();
    
    // Count active promotions
    const activePromotions = await Promotion.countDocuments({ isActive: true });
    
    // Group by type
    const typeStats = await Promotion.aggregate([
      { $group: {
        _id: '$type',
        count: { $sum: 1 }
      }}
    ]);
    
    // Calculate usage statistics
    const promotions = await Promotion.find();
    
    let totalUses = 0;
    let totalRewards = 0;
    
    promotions.forEach(promotion => {
      totalUses += promotion.currentUses;
      if (promotion.type === 'referral') {
        totalRewards += promotion.usedBy.reduce((sum, usage) => sum + (usage.reward || 0), 0);
      }
    });
    
    ApiResponse.success(res, {
      totalPromotions,
      activePromotions,
      typeBreakdown: typeStats.reduce((obj, item) => {
        obj[item._id] = item.count;
        return obj;
      }, {}),
      totalUses,
      totalRewards
    }, '获取推广统计成功');
  } catch (err) {
    console.error(err);
    ApiResponse.error(res, '服务器错误', 500, 'SERVER_ERROR');
  }
});

module.exports = router; 