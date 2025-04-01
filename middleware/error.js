/**
 * Custom error handler middleware
 * @param {Object} err - Error object
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const errorHandler = (err, req, res, next) => {
  // Log error for development
  console.error(err);

  let statusCode = err.statusCode || 500;
  let errorMessage = err.message || 'Server Error';
  let errorCode = err.errorCode || 'SERVER_ERROR';

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorMessage = Object.values(err.errors).map(val => val.message).join(', ');
    errorCode = 'VALIDATION_ERROR';
  }

  // Handle Mongoose duplicate key errors
  if (err.code === 11000) {
    statusCode = 400;
    errorMessage = 'Duplicate field value entered';
    errorCode = 'DUPLICATE_FIELD';
    
    // Try to extract the field name from the error message
    const field = Object.keys(err.keyValue)[0];
    const value = Object.values(err.keyValue)[0];
    if (field && value) {
      errorMessage = `${field} "${value}" already exists`;
    }
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    errorMessage = `Invalid ${err.path}: ${err.value}`;
    errorCode = 'INVALID_ID';
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorMessage = 'Invalid token';
    errorCode = 'INVALID_TOKEN';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorMessage = 'Token expired';
    errorCode = 'TOKEN_EXPIRED';
  }

  // Send standardized error response
  res.status(statusCode).json({
    success: false,
    message: errorMessage,
    error: errorCode,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

module.exports = errorHandler; 