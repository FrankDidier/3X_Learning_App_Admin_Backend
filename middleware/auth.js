const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');

/**
 * Protect routes - Middleware to verify user authentication
 */
exports.protect = async (req, res, next) => {
  let token;

  // Check if token exists in Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Get token from header
    token = req.headers.authorization.split(' ')[1];
  }
  // Check if token is missing
  if (!token) {
    return ApiResponse.error(
      res,
      '未授权，请登录',
      401,
      'UNAUTHORIZED'
    );
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find the user by ID and add to request object
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return ApiResponse.error(
        res,
        '用户不存在或令牌无效',
        401,
        'INVALID_TOKEN'
      );
    }

    // Check if user is active
    if (!user.isActive) {
      return ApiResponse.error(
        res,
        '此账户已被禁用',
        403,
        'ACCOUNT_DISABLED'
      );
    }

    // Add user data to request
    req.user = user;
    next();
  } catch (err) {
    // Handle JWT errors
    if (err.name === 'JsonWebTokenError') {
      return ApiResponse.error(
        res,
        '无效的令牌',
        401,
        'INVALID_TOKEN'
      );
    }
    if (err.name === 'TokenExpiredError') {
      return ApiResponse.error(
        res,
        '令牌已过期，请重新登录',
        401,
        'TOKEN_EXPIRED'
      );
    }

    return ApiResponse.error(
      res,
      '未授权，请登录',
      401,
      'UNAUTHORIZED'
    );
  }
};

/**
 * Authorize roles - Middleware to restrict route access by role
 * @param  {...String} roles - Roles allowed to access the route
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    // Check if user has required role
    if (!roles.includes(req.user.role)) {
      return ApiResponse.error(
        res,
        '无权执行此操作',
        403,
        'FORBIDDEN'
      );
    }
    next();
  };
};

/**
 * Middleware to check if user is the owner of a resource
 * @param {Model} model - Mongoose model to check ownership against
 * @param {String} paramId - Request parameter containing the resource ID
 * @param {String} ownerField - Field name in the model that represents the owner (default: 'user')
 */
exports.checkOwnership = (model, paramId = 'id', ownerField = 'user') => {
  return async (req, res, next) => {
    try {
      // Get resource ID from request parameters
      const resourceId = req.params[paramId];
      
      // Find the resource
      const resource = await model.findById(resourceId);
      
      // Check if resource exists
      if (!resource) {
        return ApiResponse.error(res, '资源不存在', 404, 'NOT_FOUND');
      }
      
      // Admin can access all resources
      if (req.user.role === 'admin') {
        return next();
      }
      
      // Check if the user is the owner of the resource
      const ownerId = resource[ownerField] ? resource[ownerField].toString() : null;
      
      if (ownerId !== req.user.id) {
        return ApiResponse.error(res, '无权访问此资源', 403, 'FORBIDDEN');
      }
      
      // If ownership is verified, continue
      next();
    } catch (err) {
      next(err);
    }
  };
};