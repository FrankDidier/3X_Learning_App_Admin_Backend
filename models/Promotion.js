const mongoose = require('mongoose');

const PromotionSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, '请输入推广码'],
    unique: true,
    trim: true,
    uppercase: true
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '请指定创建者']
  },
  type: {
    type: String,
    enum: ['referral', 'discount', 'gift', 'campaign'],
    required: [true, '请选择推广类型']
  },
  description: {
    type: String,
    required: [true, '请输入推广描述']
  },
  discountRate: {
    type: Number,
    min: 0,
    max: 100,
    default: 0   // Percentage discount
  },
  fixedAmount: {
    type: Number,
    default: 0   // Fixed amount discount
  },
  referralReward: {
    type: Number,
    default: 0   // Amount rewarded to referrer
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  maxUses: {
    type: Number,
    default: 0  // 0 means unlimited
  },
  currentUses: {
    type: Number,
    default: 0
  },
  limitPerUser: {
    type: Number,
    default: 1  // How many times a user can use this promotion
  },
  minPurchaseAmount: {
    type: Number,
    default: 0
  },
  applicableProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  applicablePackages: [String],
  isActive: {
    type: Boolean,
    default: true
  },
  usedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    date: {
      type: Date,
      default: Date.now
    },
    amount: Number,  // Purchase amount
    reward: Number   // Reward amount
  }],
  qrCodeUrl: {
    type: String
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

// Update updatedAt on save
PromotionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Check if promotion is valid
PromotionSchema.methods.isValid = function() {
  const now = new Date();
  
  // Check if promotion is active
  if (!this.isActive) return false;
  
  // Check if promotion has started
  if (this.startDate > now) return false;
  
  // Check if promotion has ended
  if (this.endDate && this.endDate < now) return false;
  
  // Check if promotion has reached max uses
  if (this.maxUses > 0 && this.currentUses >= this.maxUses) return false;
  
  return true;
};

// Calculate discount amount
PromotionSchema.methods.calculateDiscount = function(purchaseAmount) {
  if (!this.isValid()) return 0;
  
  // Check minimum purchase amount
  if (purchaseAmount < this.minPurchaseAmount) return 0;
  
  let discountAmount = 0;
  
  // Calculate percentage discount
  if (this.discountRate > 0) {
    discountAmount = (purchaseAmount * this.discountRate) / 100;
  }
  
  // Add fixed amount discount
  discountAmount += this.fixedAmount;
  
  // Ensure discount doesn't exceed purchase amount
  return Math.min(discountAmount, purchaseAmount);
};

// Record promotion usage
PromotionSchema.methods.recordUsage = async function(userId, purchaseAmount) {
  const User = mongoose.model('User');
  const user = await User.findById(userId);
  
  if (!user) throw new Error('用户不存在');
  
  // Check if user has already used this promotion to the limit
  const usageCount = this.usedBy.filter(usage => usage.user.toString() === userId.toString()).length;
  if (usageCount >= this.limitPerUser) {
    throw new Error('已达到使用次数上限');
  }
  
  // Record usage
  this.usedBy.push({
    user: userId,
    date: new Date(),
    amount: purchaseAmount,
    reward: this.referralReward
  });
  
  this.currentUses += 1;
  await this.save();
  
  // Process referral reward if applicable
  if (this.type === 'referral' && this.referralReward > 0) {
    // Logic to credit the reward to the referrer would go here
  }
  
  return true;
};

module.exports = mongoose.model('Promotion', PromotionSchema); 