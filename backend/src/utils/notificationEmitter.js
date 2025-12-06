/**
 * Event-driven notification system
 */

import { EventEmitter } from 'events';
import emailService from '../services/emailService.js';
import smsService from '../services/smsService.js';
import { logger } from './logger.js';
import { NotificationTypes } from '../services/notificationService.js';

class NotificationEmitter extends EventEmitter {}
const notificationEvents = new NotificationEmitter();

// Event types
const EVENTS = {
  APPLICATION: {
    SUBMITTED: 'application.submitted',
    STATUS_CHANGED: 'application.statusChanged',
    WITHDRAWN: 'application.withdrawn',
  },
  INTERVIEW: {
    SCHEDULED: 'interview.scheduled',
    REMINDER: 'interview.reminder',
    RESCHEDULED: 'interview.rescheduled',
    CANCELLED: 'interview.cancelled',
    COMPLETED: 'interview.completed',
  },
  OFFER: {
    EXTENDED: 'offer.extended',
    ACCEPTED: 'offer.accepted',
    DECLINED: 'offer.declined',
    EXPIRED: 'offer.expired',
  },
  JOB: {
    MATCH_FOUND: 'job.matchFound',
    CLOSING_SOON: 'job.closingSoon',
    REOPENED: 'job.reopened',
  },
};

/**
 * Notification templates
 */
const getNotificationTemplate = (eventType, data, baseUrl) => {
  const templates = {
    [EVENTS.APPLICATION.SUBMITTED]: {
      title: 'Application Submitted',
      message: `Your application for ${data.jobTitle} at ${data.company} has been submitted successfully.`,
      type: NotificationTypes.APPLICATION_STATUS,
      priority: 'medium',
      actionUrl: `${baseUrl}/applications/${data.applicationId}`,
    },
    [EVENTS.APPLICATION.STATUS_CHANGED]: {
      title: 'Application Status Update',
      message: `Your application for ${data.jobTitle} status changed to ${data.status}.`,
      type: NotificationTypes.APPLICATION_STATUS,
      priority: getStatusPriority(data.status),
      actionUrl: `${baseUrl}/applications/${data.applicationId}`,
    },
    [EVENTS.INTERVIEW.SCHEDULED]: {
      title: 'Interview Scheduled',
      message: `${data.interviewType} interview scheduled for ${data.jobTitle} on ${new Date(data.scheduledAt).toLocaleString()}.`,
      type: NotificationTypes.INTERVIEW_SCHEDULED,
      priority: 'high',
      actionUrl: `${baseUrl}/interviews/${data.interviewId}`,
    },
    [EVENTS.INTERVIEW.REMINDER]: {
      title: 'Interview Reminder',
      message: `Your ${data.interviewType} interview for ${data.jobTitle} is in ${data.hoursUntil} hours.`,
      type: NotificationTypes.REMINDER,
      priority: 'high',
      actionUrl: `${baseUrl}/interviews/${data.interviewId}`,
    },
    [EVENTS.OFFER.EXTENDED]: {
      title: 'Job Offer Received',
      message: `Congratulations! You received an offer from ${data.company} for ${data.jobTitle}.`,
      type: NotificationTypes.OFFER_RECEIVED,
      priority: 'high',
      actionUrl: `${baseUrl}/offers/${data.applicationId}`,
    },
    [EVENTS.JOB.MATCH_FOUND]: {
      title: 'New Job Match',
      message: `We found a new job that matches your profile: ${data.jobTitle} at ${data.company}.`,
      type: NotificationTypes.JOB_MATCH,
      priority: 'medium',
      actionUrl: `${baseUrl}/jobs/${data.jobId}`,
    },
  };

  return templates[eventType] || {
    title: 'Notification',
    message: 'You have a new notification.',
    type: NotificationTypes.SYSTEM,
    priority: 'low',
  };
};

const getStatusPriority = (status) => {
  const priorityMap = {
    shortlisted: 'high',
    interview_scheduled: 'high',
    offer_extended: 'high',
    rejected: 'medium',
    withdrawn: 'medium',
  };
  return priorityMap[status] || 'medium';
};

/**
 * Emit application events
 */
const emitApplicationEvent = (eventType, applicationData) => {
  notificationEvents.emit(eventType, applicationData);
};

/**
 * Emit interview events
 */
const emitInterviewEvent = (eventType, interviewData) => {
  notificationEvents.emit(eventType, interviewData);
};

/**
 * Emit offer events
 */
const emitOfferEvent = (eventType, offerData) => {
  notificationEvents.emit(eventType, offerData);
};

/**
 * Emit job events
 */
const emitJobEvent = (eventType, jobData) => {
  notificationEvents.emit(eventType, jobData);
};

/**
 * Register notification handler
 */
const registerNotificationHandler = (eventType, handler) => {
  notificationEvents.on(eventType, handler);
};

/**
 * Initialize notification listeners
 */
const initializeNotificationListeners = (Notification, User) => {
  logger.info('🔔 Initializing notification listeners...');

  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  // Handle application submitted (candidate acknowledgement)
  notificationEvents.on(EVENTS.APPLICATION.SUBMITTED, async (data) => {
    try {
      const template = getNotificationTemplate(EVENTS.APPLICATION.SUBMITTED, data, baseUrl);

      await Notification.createNotification({
        userId: data.userId,
        title: template.title,
        message: template.message,
        type: template.type,
        priority: template.priority,
        metadata: {
          applicationId: data.applicationId,
          jobTitle: data.jobTitle,
          company: data.company,
        },
        actionUrl: template.actionUrl,
      });

      const user = await User.findById(data.userId).select('email name notificationPreferences');
      if (user && user.notificationPreferences?.email !== false) {
        const dashboardLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/applications/${data.applicationId}`;
        try {
          await emailService.sendApplicationStatusEmail(user.email, {
            candidateName: user.name || 'there',
            jobTitle: data.jobTitle,
            companyName: data.company,
            status: 'APPLIED',
            message: `We received your application${data.matchScore ? ` (match score ${data.matchScore}%)` : ''}.`,
            dashboardLink,
          });
        } catch (emailError) {
          logger.error('Application submitted email failed:', emailError);
        }
      }
    } catch (error) {
      logger.error('Failed to process application submitted notification:', error);
    }
  });
  
  // Handle application status changes
  notificationEvents.on(EVENTS.APPLICATION.STATUS_CHANGED, async (data) => {
    try {
      const template = getNotificationTemplate(EVENTS.APPLICATION.STATUS_CHANGED, data, baseUrl);
      
      // Create in-app notification
      await Notification.createNotification({
        userId: data.userId,
        title: template.title,
        message: template.message,
        type: template.type,
        priority: template.priority,
        metadata: {
          applicationId: data.applicationId,
          status: data.status,
          jobTitle: data.jobTitle,
          company: data.company,
        },
        actionUrl: template.actionUrl,
      });

      // Get user for email/phone
      const user = await User.findById(data.userId).select('email phone name notificationPreferences');
      
      if (user) {
        const dashboardLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/applications/${data.applicationId}`;
        
        // Send email notification
        if (user.notificationPreferences?.email !== false) {
          try {
            await emailService.sendApplicationStatusEmail(user.email, {
              candidateName: user.name,
              jobTitle: data.jobTitle,
              companyName: data.company,
              status: data.status,
              message: data.additionalMessage,
              dashboardLink
            });
          } catch (emailError) {
            logger.error('Email notification failed:', emailError);
          }
        }

        // Send SMS for critical status changes (SHORTLISTED, REJECTED)
        if (user.phone && ['SHORTLISTED', 'REJECTED'].includes(data.status) && user.notificationPreferences?.sms !== false) {
          try {
            await smsService.sendSMS({
              to: user.phone,
              type: data.status === 'SHORTLISTED' ? 'APPLICATION_SHORTLISTED' : null,
              message: data.status === 'REJECTED' ? `Hi ${user.name}! Your application for ${data.jobTitle} status: ${data.status}. Check email for details.` : null,
              data: { candidateName: user.name, jobTitle: data.jobTitle, companyName: data.company }
            });
          } catch (smsError) {
            logger.error('SMS notification failed:', smsError);
          }
        }
      }
    } catch (error) {
      logger.error('Failed to create notification:', error);
    }
  });

  // Handle interview scheduled
  notificationEvents.on(EVENTS.INTERVIEW.SCHEDULED, async (data) => {
    try {
      const template = getNotificationTemplate(EVENTS.INTERVIEW.SCHEDULED, data, baseUrl);
      
      // Create in-app notification
      await Notification.createNotification({
        userId: data.userId,
        title: template.title,
        message: template.message,
        type: template.type,
        priority: template.priority,
        metadata: {
          interviewId: data.interviewId,
          jobTitle: data.jobTitle,
          company: data.company,
        },
        actionUrl: template.actionUrl,
      });

      // Get user for email/phone
      const user = await User.findById(data.userId).select('email phone name notificationPreferences');
      
      if (user) {
        const dashboardLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/interviews/${data.interviewId}`;
        
        // Send interview scheduled email
        if (user.notificationPreferences?.email !== false) {
          try {
            await emailService.sendInterviewScheduledEmail(user.email, {
              candidateName: user.name,
              jobTitle: data.jobTitle,
              companyName: data.company,
              interviewDate: data.scheduledAt,
              interviewTime: data.interviewTime,
              interviewType: data.interviewType,
              dashboardLink
            });
          } catch (emailError) {
            logger.error('Interview email failed:', emailError);
          }
        }

        // Send SMS notification
        if (user.phone && user.notificationPreferences?.sms !== false) {
          try {
            await smsService.sendInterviewScheduledSMS(user.phone, {
              candidateName: user.name,
              jobTitle: data.jobTitle,
              companyName: data.company,
              interviewDate: data.scheduledAt,
              interviewTime: data.interviewTime
            });
          } catch (smsError) {
            logger.error('Interview SMS failed:', smsError);
          }
        }
      }
    } catch (error) {
      logger.error('Failed to create interview notification:', error);
    }
  });

  // Handle offer extended
  notificationEvents.on(EVENTS.OFFER.EXTENDED, async (data) => {
    try {
      const template = getNotificationTemplate(EVENTS.OFFER.EXTENDED, data, baseUrl);
      
      // Create in-app notification
      await Notification.createNotification({
        userId: data.userId,
        title: template.title,
        message: template.message,
        type: template.type,
        priority: template.priority,
        metadata: {
          applicationId: data.applicationId,
          salary: data.salary,
          joinDate: data.joinDate,
        },
        actionUrl: template.actionUrl,
      });

      // Get user for email/phone
      const user = await User.findById(data.userId).select('email phone name notificationPreferences');
      
      if (user) {
        const dashboardLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/offers/${data.applicationId}`;
        
        // Send offer email with details
        if (user.notificationPreferences?.email !== false) {
          try {
            await emailService.sendOfferExtendedEmail(user.email, {
              candidateName: user.name,
              jobTitle: data.jobTitle,
              companyName: data.company,
              salary: data.salary,
              joinDate: data.joinDate,
              expiryDate: data.expiryDate,
              offerLetter: data.offerLetter,
              dashboardLink
            });
          } catch (emailError) {
            logger.error('Offer email failed:', emailError);
          }
        }

        // Send SMS notification for offer
        if (user.phone && user.notificationPreferences?.sms !== false) {
          try {
            await smsService.sendOfferExtendedSMS(user.phone, {
              candidateName: user.name,
              jobTitle: data.jobTitle,
              companyName: data.company
            });
          } catch (smsError) {
            logger.error('Offer SMS failed:', smsError);
          }
        }
      }
    } catch (error) {
      logger.error('Failed to create offer notification:', error);
    }
  });

  // Handle job matches
  notificationEvents.on(EVENTS.JOB.MATCH_FOUND, async (data) => {
    try {
      const template = getNotificationTemplate(EVENTS.JOB.MATCH_FOUND, data, baseUrl);
      
      await Notification.createNotification({
        userId: data.userId,
        title: template.title,
        message: template.message,
        type: template.type,
        priority: template.priority,
        metadata: {
          jobId: data.jobId,
          jobTitle: data.jobTitle,
          company: data.company,
        },
        actionUrl: template.actionUrl,
      });
    } catch (error) {
      logger.error('Failed to create job match notification:', error);
    }
  });

  logger.info('✅ Notification listeners initialized successfully');
};

export {
  EVENTS,
  notificationEvents,
  emitApplicationEvent,
  emitInterviewEvent,
  emitOfferEvent,
  emitJobEvent,
  registerNotificationHandler,
  initializeNotificationListeners,
  getNotificationTemplate,
};

export default {
  EVENTS,
  notificationEvents,
  emitApplicationEvent,
  emitInterviewEvent,
  emitOfferEvent,
  emitJobEvent,
  registerNotificationHandler,
  initializeNotificationListeners,
  getNotificationTemplate,
};
