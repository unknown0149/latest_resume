import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger.js';

/**
 * WebSocket Service using Socket.io
 * Provides real-time communication for:
 * - Live notifications
 * - Application status updates
 * - Interview reminders
 * - Dashboard analytics updates
 * - Typing indicators
 */

let io = null;
const connectedUsers = new Map(); // userId -> socket.id mapping

/**
 * Initialize WebSocket server
 */
export const initializeWebSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST']
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      socket.userRole = decoded.role || 'candidate';
      
      next();
    } catch (error) {
      logger.error('WebSocket authentication failed:', error);
      next(new Error('Authentication failed'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    const userId = socket.userId;
    connectedUsers.set(userId, socket.id);
    
    logger.info(`✅ WebSocket connected: User ${userId} (${socket.id})`);

    // Join user's personal room
    socket.join(`user:${userId}`);

    // Join role-based room
    socket.join(`role:${socket.userRole}`);

    // Send connection confirmation
    socket.emit('connected', {
      socketId: socket.id,
      userId: userId,
      timestamp: new Date().toISOString()
    });

    // Handle dashboard subscription
    socket.on('subscribe:dashboard', () => {
      socket.join(`dashboard:${userId}`);
      logger.info(`User ${userId} subscribed to dashboard updates`);
    });

    // Handle application tracking subscription
    socket.on('subscribe:applications', (applicationIds) => {
      if (Array.isArray(applicationIds)) {
        applicationIds.forEach(appId => {
          socket.join(`application:${appId}`);
        });
        logger.info(`User ${userId} subscribed to ${applicationIds.length} applications`);
      }
    });

    // Handle interview room subscription
    socket.on('subscribe:interview', (interviewId) => {
      socket.join(`interview:${interviewId}`);
      logger.info(`User ${userId} subscribed to interview ${interviewId}`);
    });

    // Handle typing indicators
    socket.on('typing:start', (data) => {
      socket.to(`application:${data.applicationId}`).emit('user:typing', {
        userId,
        applicationId: data.applicationId,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('typing:stop', (data) => {
      socket.to(`application:${data.applicationId}`).emit('user:stopped-typing', {
        userId,
        applicationId: data.applicationId
      });
    });

    // Handle presence updates
    socket.on('presence:update', (status) => {
      socket.broadcast.emit('user:presence', {
        userId,
        status, // online, away, busy, offline
        timestamp: new Date().toISOString()
      });
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      connectedUsers.delete(userId);
      logger.info(`❌ WebSocket disconnected: User ${userId} (${reason})`);
      
      // Notify others about user going offline
      socket.broadcast.emit('user:offline', {
        userId,
        timestamp: new Date().toISOString()
      });
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error(`WebSocket error for user ${userId}:`, error);
    });
  });

  logger.info('🔌 WebSocket server initialized');
  return io;
};

/**
 * Send notification to specific user
 */
export const sendNotificationToUser = (userId, notification) => {
  if (!io) {
    logger.warn('WebSocket server not initialized');
    return false;
  }

  io.to(`user:${userId}`).emit('notification:new', {
    ...notification,
    timestamp: new Date().toISOString()
  });

  logger.info(`📤 Sent notification to user ${userId}:`, notification.title);
  return true;
};

/**
 * Send application status update
 */
export const sendApplicationUpdate = (userId, applicationId, update) => {
  if (!io) return false;

  // Send to user's personal room
  io.to(`user:${userId}`).emit('application:update', {
    applicationId,
    ...update,
    timestamp: new Date().toISOString()
  });

  // Send to application room (for recruiters)
  io.to(`application:${applicationId}`).emit('application:status-changed', {
    applicationId,
    ...update,
    timestamp: new Date().toISOString()
  });

  logger.info(`📤 Sent application update: ${applicationId} -> ${update.status}`);
  return true;
};

/**
 * Send interview update
 */
export const sendInterviewUpdate = (userId, interviewId, update) => {
  if (!io) return false;

  io.to(`user:${userId}`).emit('interview:update', {
    interviewId,
    ...update,
    timestamp: new Date().toISOString()
  });

  io.to(`interview:${interviewId}`).emit('interview:status-changed', {
    interviewId,
    ...update,
    timestamp: new Date().toISOString()
  });

  logger.info(`📤 Sent interview update: ${interviewId}`);
  return true;
};

/**
 * Send offer update
 */
export const sendOfferUpdate = (userId, applicationId, offer) => {
  if (!io) return false;

  io.to(`user:${userId}`).emit('offer:received', {
    applicationId,
    ...offer,
    timestamp: new Date().toISOString()
  });

  logger.info(`📤 Sent offer update to user ${userId}`);
  return true;
};

/**
 * Send dashboard metrics update
 */
export const sendDashboardUpdate = (userId, metrics) => {
  if (!io) return false;

  io.to(`dashboard:${userId}`).emit('dashboard:metrics', {
    ...metrics,
    timestamp: new Date().toISOString()
  });

  return true;
};

/**
 * Broadcast to all users with specific role
 */
export const broadcastToRole = (role, event, data) => {
  if (!io) return false;

  io.to(`role:${role}`).emit(event, {
    ...data,
    timestamp: new Date().toISOString()
  });

  logger.info(`📢 Broadcast to role ${role}: ${event}`);
  return true;
};

/**
 * Broadcast system announcement
 */
export const broadcastSystemAnnouncement = (announcement) => {
  if (!io) return false;

  io.emit('system:announcement', {
    ...announcement,
    timestamp: new Date().toISOString()
  });

  logger.info('📢 System announcement broadcasted');
  return true;
};

/**
 * Send interview reminder (1 hour before)
 */
export const sendInterviewReminder = (userId, interview) => {
  if (!io) return false;

  io.to(`user:${userId}`).emit('interview:reminder', {
    interviewId: interview._id,
    jobTitle: interview.jobTitle,
    scheduledAt: interview.scheduledAt,
    meetingLink: interview.meetingLink,
    message: 'Your interview starts in 1 hour!',
    timestamp: new Date().toISOString()
  });

  logger.info(`⏰ Sent interview reminder to user ${userId}`);
  return true;
};

/**
 * Check if user is online
 */
export const isUserOnline = (userId) => {
  return connectedUsers.has(userId);
};

/**
 * Get online users count
 */
export const getOnlineUsersCount = () => {
  return connectedUsers.size;
};

/**
 * Get all online users
 */
export const getOnlineUsers = () => {
  return Array.from(connectedUsers.keys());
};

/**
 * Disconnect user
 */
export const disconnectUser = (userId) => {
  const socketId = connectedUsers.get(userId);
  if (socketId && io) {
    const socket = io.sockets.sockets.get(socketId);
    if (socket) {
      socket.disconnect(true);
      logger.info(`Forcefully disconnected user ${userId}`);
      return true;
    }
  }
  return false;
};

/**
 * Get WebSocket server instance
 */
export const getIO = () => io;

export default {
  initializeWebSocket,
  sendNotificationToUser,
  sendApplicationUpdate,
  sendInterviewUpdate,
  sendOfferUpdate,
  sendDashboardUpdate,
  broadcastToRole,
  broadcastSystemAnnouncement,
  sendInterviewReminder,
  isUserOnline,
  getOnlineUsersCount,
  getOnlineUsers,
  disconnectUser,
  getIO
};
