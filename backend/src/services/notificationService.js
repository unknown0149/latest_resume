/**
 * Notification Service
 * Handles in-app, email, and push notifications
 */

import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { logger } from '../utils/logger.js';
import nodemailer from 'nodemailer';

/**
 * Email transporter configuration
 * In production, use a service like SendGrid, AWS SES, or similar
 */
let emailTransporter = null;

if (process.env.SMTP_HOST && process.env.SMTP_USER) {
  emailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  logger.info('Email transporter initialized');
} else {
  logger.warn('Email service not configured - notifications will be in-app only');
}

/**
 * Notification types
 */
export const NotificationTypes = {
  QUIZ_COMPLETED: 'quiz_completed',
  INTERVIEW_COMPLETED: 'interview_completed',
  INTERVIEW_SCHEDULED: 'interview_scheduled',
  OFFER_RECEIVED: 'offer_received',
  APPLICATION_STATUS: 'application_status',
  SKILL_VERIFIED: 'skill_verified',
  JOB_MATCH: 'job_match',
  JOB_APPLIED: 'job_applied',
  PROFILE_INCOMPLETE: 'profile_incomplete',
  RESUME_PARSED: 'resume_parsed',
  BADGE_EARNED: 'badge_earned',
  REMINDER: 'reminder',
  SYSTEM: 'system',
};

const notificationTypeValues = Object.values(NotificationTypes);

/**
 * Create a notification
 */
export async function createNotification({
  userId,
  type,
  title,
  message,
  data = {},
  actionUrl = null,
  actionText = 'View Details',
  priority = 'medium',
  sendEmail = false,
}) {
  try {
    if (!notificationTypeValues.includes(type)) {
      throw new Error(`Unsupported notification type: ${type}`);
    }

    // Create in-app notification with generated notificationId helper
    const notification = await Notification.createNotification({
      userId,
      type,
      title,
      message,
      metadata: data,
      actionUrl,
      actionText,
      priority,
      read: false,
      createdAt: new Date(),
    });

    logger.info(`Notification created: ${type} for user ${userId}`);

    // Send email if requested and configured
    if (sendEmail && emailTransporter) {
      await sendEmailNotification(userId, title, message, data, actionUrl, actionText);
    }

    return {
      success: true,
      notification,
    };
  } catch (error) {
    logger.error('Failed to create notification:', error);
    throw error;
  }
}

/**
 * Send email notification
 */
async function sendEmailNotification(userId, title, message, data, actionUrl, actionText) {
  try {
    // Get user email
    const user = await User.findById(userId).select('email name');
    if (!user || !user.email) {
      logger.warn(`User ${userId} has no email, skipping email notification`);
      return;
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@resume-analyzer.com',
      to: user.email,
      subject: title,
      html: generateEmailTemplate(user.name, title, message, data, actionUrl, actionText),
    };

    await emailTransporter.sendMail(mailOptions);
    logger.info(`Email sent to ${user.email}`);
  } catch (error) {
    logger.error('Failed to send email:', error);
    // Don't throw - email failure shouldn't break notification creation
  }
}

/**
 * Generate HTML email template
 */
function generateEmailTemplate(userName, title, message, data, actionUrl, actionText) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 4px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 20px; color: #999; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Resume Intelligence Platform</h1>
        </div>
        <div class="content">
          <h2>Hi ${userName || 'there'},</h2>
          <h3>${title}</h3>
          <p>${message}</p>
          ${actionUrl || data.actionUrl ? `<a href="${actionUrl || data.actionUrl}" class="button">${actionText || 'View Details'}</a>` : ''}
        </div>
        <div class="footer">
          <p>© 2025 Resume Intelligence Platform. All rights reserved.</p>
          <p>You received this email because you have an account with us.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Get notifications for a user
 */
export async function getUserNotifications(userId, { limit = 20, unreadOnly = false } = {}) {
  try {
    const query = { userId };
    if (unreadOnly) {
      query.read = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit);

    const unreadCount = await Notification.countDocuments({ userId, read: false });

    return {
      success: true,
      notifications,
      unreadCount,
    };
  } catch (error) {
    logger.error('Failed to get notifications:', error);
    throw error;
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId, userId) {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { read: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      throw new Error('Notification not found');
    }

    return {
      success: true,
      notification,
    };
  } catch (error) {
    logger.error('Failed to mark notification as read:', error);
    throw error;
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(userId) {
  try {
    const result = await Notification.updateMany(
      { userId, read: false },
      { read: true, readAt: new Date() }
    );

    return {
      success: true,
      modifiedCount: result.modifiedCount,
    };
  } catch (error) {
    logger.error('Failed to mark all notifications as read:', error);
    throw error;
  }
}

/**
 * Delete notification
 */
export async function deleteNotification(notificationId, userId) {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      userId,
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    return {
      success: true,
      message: 'Notification deleted',
    };
  } catch (error) {
    logger.error('Failed to delete notification:', error);
    throw error;
  }
}

/**
 * Send quiz completion notification
 */
export async function notifyQuizCompleted(userId, skillName, score, badge) {
  return createNotification({
    userId,
    type: NotificationTypes.QUIZ_COMPLETED,
    title: '🎯 Quiz Completed!',
    message: `You scored ${score}% on the ${skillName} quiz and earned a ${badge.label}!`,
    data: { skillName, score, badge },
    priority: 'high',
    sendEmail: score >= 70, // Send email for passing scores
  });
}

/**
 * Send job match notification
 */
export async function notifyJobMatch(userId, jobTitle, company, matchScore) {
  return createNotification({
    userId,
    type: NotificationTypes.JOB_MATCH,
    title: '💼 New Job Match!',
    message: `We found a great match: ${jobTitle} at ${company} (${matchScore}% match)`,
    data: { jobTitle, company, matchScore },
    priority: 'normal',
    sendEmail: matchScore >= 80,
  });
}

/**
 * Send profile incomplete reminder
 */
export async function notifyProfileIncomplete(userId, missingItems) {
  return createNotification({
    userId,
    type: NotificationTypes.PROFILE_INCOMPLETE,
    title: '📝 Complete Your Profile',
    message: `Your profile is ${missingItems.completeness}% complete. Add ${missingItems.missing.join(', ')} to improve job matches.`,
    data: { missingItems },
    priority: 'low',
    sendEmail: false,
  });
}

/**
 * Send skill verification notification
 */
export async function notifySkillVerified(userId, skillName, method) {
  return createNotification({
    userId,
    type: NotificationTypes.SKILL_VERIFIED,
    title: '✅ Skill Verified!',
    message: `Your ${skillName} skill has been verified through ${method}.`,
    data: { skillName, method },
    priority: 'high',
    sendEmail: true,
  });
}

/**
 * Send interview scheduled notification
 */
export async function notifyInterviewScheduled(userId, jobTitle, company, interviewDate) {
  return createNotification({
    userId,
    type: 'interview_scheduled',
    title: '📅 Interview Scheduled',
    message: `Your interview for ${jobTitle} at ${company} is scheduled for ${new Date(interviewDate).toLocaleDateString()}.`,
    data: { jobTitle, company, interviewDate },
    priority: 'high',
    sendEmail: true,
  });
}

/**
 * Send offer received notification
 */
export async function notifyOfferReceived(userId, jobTitle, company, salary) {
  return createNotification({
    userId,
    type: 'offer_received',
    title: '🎉 Job Offer Received!',
    message: `Congratulations! You received an offer for ${jobTitle} at ${company}${salary ? ` with a salary of ${salary}` : ''}.`,
    data: { jobTitle, company, salary },
    priority: 'urgent',
    sendEmail: true,
  });
}

/**
 * Send application status update notification
 */
export async function notifyApplicationStatus(userId, jobTitle, company, status) {
  const statusMessages = {
    shortlisted: '🌟 Great news! You\'ve been shortlisted',
    rejected: '❌ Application update',
    interview_scheduled: '📅 Interview scheduled',
  };

  return createNotification({
    userId,
    type: 'application_status',
    title: statusMessages[status] || 'Application Update',
    message: `Your application for ${jobTitle} at ${company} has been ${status.replace('_', ' ')}.`,
    data: { jobTitle, company, status },
    priority: status === 'rejected' ? 'low' : 'normal',
    sendEmail: ['shortlisted', 'interview_scheduled'].includes(status),
  });
}

