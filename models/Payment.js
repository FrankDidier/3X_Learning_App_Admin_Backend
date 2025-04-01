const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '请指定用户']
  },
  amount: {
    type: Number,
    required: [true, '请指定支付金额']
  },
  currency: {
    type: String,
    default: 'CNY'
  },
  method: {
    type: String,
    enum: ['wechat', 'alipay', 'bank_transfer', 'other'],
    required: [true, '请选择支付方式']
  },
  type: {
    type: String,
    enum: ['course', 'subscription', 'membership', 'other'],
    required: [true, '请选择业务类型']
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'pending'
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  },
  packageId: {
    type: String
  },
  transactionId: {
    type: String,
    unique: true,
    sparse: true
  },
  paymentProof: {
    type: String,  // URL to payment proof document
  },
  verified: {
    type: Boolean,
    default: false
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verificationTime: {
    type: Date
  },
  smsVerified: {
    type: Boolean,
    default: false
  },
  description: {
    type: String
  },
  promotionCode: {
    type: String
  },
  discountAmount: {
    type: Number,
    default: 0
  },
  notes: {
    type: String
  },
  refundReason: {
    type: String
  },
  completedAt: {
    type: Date
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
PaymentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Create index for abnormal payment detection
PaymentSchema.index({ user: 1, createdAt: -1 });

// Detect duplicate payments
PaymentSchema.statics.findDuplicates = async function(userId, amount, timeWindowMinutes = 30) {
  const timeWindow = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
  
  return this.find({
    user: userId,
    amount: amount,
    createdAt: { $gte: timeWindow },
    status: { $ne: 'failed' }
  }).sort({ createdAt: -1 });
};

// Generate payment report
PaymentSchema.statics.generateReport = async function(startDate, endDate, type = null) {
  const match = {
    createdAt: {
      $gte: startDate,
      $lte: endDate
    },
    status: 'completed'
  };
  
  if (type) {
    match.type = type;
  }
  
  const report = await this.aggregate([
    { $match: match },
    { $group: {
      _id: {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
        day: { $dayOfMonth: '$createdAt' },
        method: '$method',
        type: '$type'
      },
      totalAmount: { $sum: '$amount' },
      count: { $sum: 1 }
    }},
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
  ]);
  
  return report;
};

module.exports = mongoose.model('Payment', PaymentSchema); 