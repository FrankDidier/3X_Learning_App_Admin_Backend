const Payment = require('../models/Payment');
const Course = require('../models/Course');
const User = require('../models/User');
const wechatPay = require('../utils/wechatPay');
const alipay = require('../utils/alipay');
const { generateQRCode } = require('../utils/qrcode');

// Process WeChat payment
exports.processWeChatPayment = async (userId, courseId, amount) => {
  try {
    // Create payment record
    const payment = await Payment.create({
      user: userId,
      course: courseId,
      amount,
      method: 'wechat',
      status: 'pending'
    });
    
    // Generate WeChat payment URL
    const paymentUrl = await wechatPay.createPayment({
      outTradeNo: payment._id.toString(),
      totalFee: Math.round(amount * 100), // Convert to cents
      body: 'Course Payment',
      notifyUrl: `${process.env.API_URL}/api/payments/wechat/notify`
    });
    
    // Generate QR code
    const qrCodeUrl = await generateQRCode(paymentUrl);
    
    return {
      paymentId: payment._id,
      qrCodeUrl
    };
  } catch (error) {
    console.error('WeChat payment error:', error);
    throw new Error('Failed to process WeChat payment');
  }
};

// Process Alipay payment
exports.processAlipayPayment = async (userId, courseId, amount) => {
  try {
    // Create payment record
    const payment = await Payment.create({
      user: userId,
      course: courseId,
      amount,
      method: 'alipay',
      status: 'pending'
    });
    
    // Generate Alipay payment URL
    const paymentUrl = await alipay.createPayment({
      outTradeNo: payment._id.toString(),
      totalAmount: amount.toFixed(2),
      subject: 'Course Payment',
      notifyUrl: `${process.env.API_URL}/api/payments/alipay/notify`
    });
    
    // Generate QR code
    const qrCodeUrl = await generateQRCode(paymentUrl);
    
    return {
      paymentId: payment._id,
      qrCodeUrl
    };
  } catch (error) {
    console.error('Alipay payment error:', error);
    throw new Error('Failed to process Alipay payment');
  }
};

// Verify payment status
exports.verifyPaymentStatus = async (paymentId) => {
  try {
    const payment = await Payment.findById(paymentId);
    
    if (!payment) {
      throw new Error('Payment not found');
    }
    
    return {
      status: payment.status
    };
  } catch (error) {
    console.error('Payment verification error:', error);
    throw new Error('Failed to verify payment status');
  }
};

// Complete payment and enroll student
exports.completePayment = async (paymentId) => {
  try {
    const payment = await Payment.findById(paymentId);
    
    if (!payment || payment.status !== 'pending') {
      throw new Error('Invalid payment or payment already processed');
    }
    
    // Update payment status
    payment.status = 'completed';
    payment.completedAt = new Date();
    await payment.save();
    
    // Enroll student in course
    const user = await User.findById(payment.user);
    const course = await Course.findById(payment.course);
    
    if (!user || !course) {
      throw new Error('User or course not found');
    }
    
    // Add course to user's enrolled courses if not already enrolled
    if (!user.enrolledCourses.includes(course._id)) {
      user.enrolledCourses.push(course._id);
      await user.save();
    }
    
    // Increment course enrollment count
    course.enrollmentCount = (course.enrollmentCount || 0) + 1;
    await course.save();
    
    return { success: true };
  } catch (error) {
    console.error('Payment completion error:', error);
    throw new Error('Failed to complete payment');
  }
};