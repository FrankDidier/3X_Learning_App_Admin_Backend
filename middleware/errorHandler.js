const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  // Default error status and message
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Server Error';
  let errorCode = err.errorCode || 'INTERNAL_SERVER_ERROR';
  
  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    const errors = Object.values(err.errors).map(error => error.message);
    message = errors.join(', ');
  }
  
  // Handle Mongoose duplicate key errors
  if (err.code === 11000) {
    statusCode = 400;
    errorCode = 'DUPLICATE_ERROR';
    message = 'Duplicate field value entered';
  }
  
  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorCode = 'INVALID_TOKEN';
    message = 'Invalid token';
  }
  
  // Handle expired JWT
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorCode = 'TOKEN_EXPIRED';
    message = 'Token expired';
  }

  // Handle file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 400;
    errorCode = 'FILE_TOO_LARGE';
    message = 'File size exceeds the limit';
  }

  // Handle payment processing errors
  if (err.name === 'PaymentError') {
    statusCode = 400;
    errorCode = err.errorCode || 'PAYMENT_ERROR';
    message = err.message || 'Payment processing failed';
  }

  res.status(statusCode).json({
    success: false,
    errorCode,
    message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
};

module.exports = errorHandler;