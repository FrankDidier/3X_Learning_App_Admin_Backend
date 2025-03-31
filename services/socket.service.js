const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

let io;

/**
 * Initialize Socket.IO server
 * @param {Object} server - HTTP server instance
 */
exports.initialize = (server) => {
  io = socketIo(server, {
    cors: {
      origin: [
        process.env.FRONTEND_URL,
        process.env.MOBILE_APP_URL,
        'capacitor://localhost',
        'http://localhost',
        'http://localhost:3000',
        'http://localhost:8100'
      ],
      methods: ['GET', 'POST'],
      credentials: true
    }
  });
  
  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error'));
      }
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Fetch user to ensure they still exist and are active
      const user = await User.findById(decoded.id).select('role isActive');
      
      if (!user || !user.isActive) {
        return next(new Error('User not found or inactive'));
      }
      
      socket.userId = decoded.id;
      socket.userRole = user.role;
      next();
    } catch (error) {
      console.error('Socket authentication error:', error.message);
      next(new Error('Authentication error'));
    }
  });
  
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId}, Role: ${socket.userRole}`);
    
    // Join user-specific room
    socket.join(`user:${socket.userId}`);
    
    // Join role-specific room
    socket.join(`role:${socket.userRole}`);
    
    // Handle course enrollment
    socket.on('join-course', (courseId) => {
      if (courseId) {
        socket.join(`course:${courseId}`);
        console.log(`User ${socket.userId} joined course room: ${courseId}`);
      }
    });
    
    // Handle leaving course
    socket.on('leave-course', (courseId) => {
      if (courseId) {
        socket.leave(`course:${courseId}`);
        console.log(`User ${socket.userId} left course room: ${courseId}`);
      }
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
    });
  });
  
  return io;
};

/**
 * Send notification to specific user
 * @param {String} userId - User ID
 * @param {Object} notification - Notification data
 */
exports.notifyUser = (userId, notification) => {
  if (!io) {
    console.error('Socket.IO not initialized');
    return;
  }
  
  io.to(`user:${userId}`).emit('notification', notification);
};

/**
 * Send notification to all users with specific role
 * @param {String} role - User role
 * @param {Object} notification - Notification data
 */
exports.notifyRole = (role, notification) => {
  if (!io) {
    console.error('Socket.IO not initialized');
    return;
  }
  
  io.to(`role:${role}`).emit('notification', notification);
};

/**
 * Broadcast notification to all connected users
 * @param {Object} notification - Notification data
 */
exports.broadcastNotification = (notification) => {
  if (!io) {
    console.error('Socket.IO not initialized');
    return;
  }
  
  io.emit('notification', notification);
};

/**
 * Send notification to all users in a specific course
 * @param {String} courseId - Course ID
 * @param {Object} notification - Notification data
 */
exports.notifyCourse = (courseId, notification) => {
  if (!io) {
    console.error('Socket.IO not initialized');
    return;
  }
  
  io.to(`course:${courseId}`).emit('course-notification', notification);
};

/**
 * Send notification about new course content
 * @param {String} courseId - Course ID
 * @param {Object} contentData - Content data
 */
exports.notifyNewContent = (courseId, contentData) => {
  if (!io) {
    console.error('Socket.IO not initialized');
    return;
  }
  
  io.to(`course:${courseId}`).emit('new-content', contentData);
};

/**
 * Send notification about payment status
 * @param {String} userId - User ID
 * @param {Object} paymentData - Payment data
 */
exports.notifyPaymentStatus = (userId, paymentData) => {
  if (!io) {
    console.error('Socket.IO not initialized');
    return;
  }
  
  io.to(`user:${userId}`).emit('payment-status', paymentData);
};