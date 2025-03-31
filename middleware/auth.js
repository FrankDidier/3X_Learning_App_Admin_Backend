const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');

/**
 * Middleware to protect routes that require authentication
 */
exports.protect = async (req, res, next) => {
  try {
    let token;
    
    // Get token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } 
    // For mobile app that might use cookies
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    
    // Check if token exists
    if (!token) {
      return ApiResponse.error(res, 'Not authorized to access this route', 401, 'AUTH_REQUIRED');
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return ApiResponse.error(res, 'User not found', 401, 'USER_NOT_FOUND');
    }
    
    // Check if user is active
    if (!user.isActive) {
      return ApiResponse.error(res, 'User account is deactivated', 401, 'ACCOUNT_DEACTIVATED');
    }
    
    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return ApiResponse.error(res, 'Invalid token', 401, 'INVALID_TOKEN');
    }
    if (error.name === 'TokenExpiredError') {
      return ApiResponse.error(res, 'Token expired', 401, 'TOKEN_EXPIRED');
    }
    return ApiResponse.error(res, 'Authentication error', 401, 'AUTH_ERROR');
  }
};

/**
 * Middleware to restrict access based on user role
 * @param {...String} roles - Allowed roles
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.error(res, 'User not authenticated', 401, 'AUTH_REQUIRED');
    }
    
    if (!roles.includes(req.user.role)) {
      return ApiResponse.error(
        res, 
        `User role ${req.user.role} is not authorized to access this route`, 
        403, 
        'FORBIDDEN'
      );
    }
    
    next();
  };
};