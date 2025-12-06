/**
 * Notification Routes
 * Handle notification retrieval, marking as read, and deletion
 */

import express from 'express';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from '../services/notificationService.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/notifications
 * Get all notifications for the authenticated user
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit, unreadOnly } = req.query;

    const result = await getUserNotifications(userId, {
      limit: limit ? parseInt(limit) : 20,
      unreadOnly: unreadOnly === 'true',
    });

    res.json(result);
  } catch (error) {
    logger.error('Failed to get notifications:', error);
    res.status(500).json({
      error: 'Failed to retrieve notifications',
      message: error.message,
    });
  }
});

/**
 * PUT /api/notifications/:id/read
 * Mark a notification as read
 */
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const notificationId = req.params.id;

    const result = await markNotificationAsRead(notificationId, userId);

    res.json(result);
  } catch (error) {
    logger.error('Failed to mark notification as read:', error);
    res.status(500).json({
      error: 'Failed to mark notification as read',
      message: error.message,
    });
  }
});

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read
 */
router.put('/read-all', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;

    const result = await markAllNotificationsAsRead(userId);

    res.json(result);
  } catch (error) {
    logger.error('Failed to mark all notifications as read:', error);
    res.status(500).json({
      error: 'Failed to mark all notifications as read',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const notificationId = req.params.id;

    const result = await deleteNotification(notificationId, userId);

    res.json(result);
  } catch (error) {
    logger.error('Failed to delete notification:', error);
    res.status(500).json({
      error: 'Failed to delete notification',
      message: error.message,
    });
  }
});

export default router;
