import pkg from 'nodemailer';
const { createTransport } = pkg;
import { logger } from '../utils/logger.js';

/**
 * Email Service
 * Handles all email notifications using nodemailer
 * Supports HTML templates for professional emails
 */

// Create reusable transporter
let transporter = null;
let emailConfigured = false;

const createEmailTransporter = () => {
  // Check if SMTP credentials are available
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    logger.warn('⚠️  Email service not configured - SMTP credentials missing');
    logger.warn('   Add SMTP_USER and SMTP_PASS to .env to enable email features');
    return null;
  }

  // Production: Use SMTP credentials from environment
  // Development: Use ethereal.email for testing
  if (process.env.NODE_ENV === 'production') {
    return createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Development mode - log emails instead of sending
    return createTransport({
      streamTransport: true,
      newline: 'unix',
      buffer: true
    });
  }
};

// Verify transporter configuration
const verifyTransporter = async () => {
  try {
    transporter = createEmailTransporter();
    
    if (!transporter) {
      return; // Already logged warning in createEmailTransporter
    }

    if (process.env.NODE_ENV === 'production') {
      await transporter.verify();
      logger.info('✅ Email service is ready');
      emailConfigured = true;
    } else {
      logger.info('📧 Email service in development mode (emails will be logged)');
      emailConfigured = true;
    }
  } catch (error) {
    logger.error('❌ Email service configuration error:', error.message);
    logger.warn('   Email features will be disabled. Check your SMTP credentials.');
    transporter = null;
    emailConfigured = false;
  }
};

// Initialize on module load (non-blocking)
verifyTransporter().catch(err => {
  logger.error('Failed to initialize email service:', err.message);
});

/**
 * Base email template with consistent branding
 */
const getEmailTemplate = (title, content, ctaText, ctaLink) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .content { padding: 30px 20px; }
    .content h2 { color: #667eea; margin-top: 0; font-size: 20px; }
    .content p { margin: 15px 0; color: #555; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white !important; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .cta-button:hover { opacity: 0.9; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #eee; }
    .divider { height: 1px; background: #eee; margin: 20px 0; }
    .info-box { background: #f8f9fa; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 CareerBoost AI</h1>
    </div>
    <div class="content">
      ${content}
      ${ctaLink ? `<div style="text-align: center;"><a href="${ctaLink}" class="cta-button">${ctaText || 'View Details'}</a></div>` : ''}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} CareerBoost AI. All rights reserved.</p>
      <p>This is an automated notification. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
};

/**
 * Email Templates
 */

// Application Status Change
const getApplicationStatusEmail = (data) => {
  const { candidateName, jobTitle, companyName, status, message, dashboardLink } = data;
  
  const statusMessages = {
    APPLIED: {
      title: 'Application Received',
      message: `Your application for <strong>${jobTitle}</strong> at ${companyName} has been successfully received.`,
      emoji: '✅'
    },
    SHORTLISTED: {
      title: 'Great News!',
      message: `Congratulations! You've been shortlisted for <strong>${jobTitle}</strong> at ${companyName}.`,
      emoji: '🎉'
    },
    INTERVIEWED: {
      title: 'Interview Scheduled',
      message: `Your interview for <strong>${jobTitle}</strong> at ${companyName} has been scheduled.`,
      emoji: '📅'
    },
    REJECTED: {
      title: 'Application Update',
      message: `Thank you for your interest in <strong>${jobTitle}</strong> at ${companyName}. After careful consideration, we've decided to move forward with other candidates.`,
      emoji: '📋'
    }
  };

  const statusInfo = statusMessages[status] || statusMessages.APPLIED;

  const content = `
    <h2>${statusInfo.emoji} ${statusInfo.title}</h2>
    <p>Hi ${candidateName},</p>
    <p>${statusInfo.message}</p>
    ${message ? `<div class="info-box"><p><strong>Additional Message:</strong><br>${message}</p></div>` : ''}
    <p>Keep track of all your applications in your dashboard.</p>
  `;

  return getEmailTemplate(
    `Application Update - ${jobTitle}`,
    content,
    'View Dashboard',
    dashboardLink
  );
};

// Interview Scheduled
const getInterviewScheduledEmail = (data) => {
  const { candidateName, jobTitle, companyName, interviewDate, interviewTime, interviewType, meetingLink, location, interviewerName, notes, dashboardLink } = data;

  const formattedDate = new Date(interviewDate).toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const content = `
    <h2>📅 Interview Scheduled</h2>
    <p>Hi ${candidateName},</p>
    <p>Your interview for <strong>${jobTitle}</strong> at ${companyName} has been scheduled!</p>
    
    <div class="info-box">
      <p><strong>📆 Date:</strong> ${formattedDate}</p>
      <p><strong>🕐 Time:</strong> ${interviewTime}</p>
      <p><strong>📍 Type:</strong> ${interviewType}</p>
      ${meetingLink ? `<p><strong>🔗 Meeting Link:</strong> <a href="${meetingLink}" style="color: #667eea;">${meetingLink}</a></p>` : ''}
      ${location ? `<p><strong>📍 Location:</strong> ${location}</p>` : ''}
      ${interviewerName ? `<p><strong>👤 Interviewer:</strong> ${interviewerName}</p>` : ''}
    </div>
    
    ${notes ? `<p><strong>Additional Notes:</strong><br>${notes}</p>` : ''}
    
    <p>Good luck! Make sure to:</p>
    <ul>
      <li>Join 5 minutes early</li>
      <li>Test your audio/video beforehand</li>
      <li>Keep your resume handy</li>
      <li>Prepare questions for the interviewer</li>
    </ul>
  `;

  return getEmailTemplate(
    `Interview Scheduled - ${jobTitle}`,
    content,
    'View Interview Details',
    dashboardLink
  );
};

// Offer Extended
const getOfferExtendedEmail = (data) => {
  const { candidateName, jobTitle, companyName, salary, joinDate, offerLetter, expiryDate, dashboardLink } = data;

  const formattedSalary = salary ? `₹${salary.toLocaleString('en-IN')} per annum` : 'As discussed';
  const formattedJoinDate = joinDate ? new Date(joinDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : 'To be confirmed';

  const content = `
    <h2>🎉 Congratulations! Offer Extended</h2>
    <p>Hi ${candidateName},</p>
    <p>We are pleased to extend an offer for the position of <strong>${jobTitle}</strong> at ${companyName}!</p>
    
    <div class="info-box">
      <p><strong>💼 Position:</strong> ${jobTitle}</p>
      <p><strong>💰 Salary:</strong> ${formattedSalary}</p>
      <p><strong>📅 Joining Date:</strong> ${formattedJoinDate}</p>
      ${expiryDate ? `<p><strong>⏰ Offer Valid Until:</strong> ${new Date(expiryDate).toLocaleDateString('en-IN')}</p>` : ''}
    </div>
    
    ${offerLetter ? `<p>Please find the detailed offer letter attached to this email.</p>` : ''}
    
    <p>We're excited to have you join our team! Please review the offer and let us know your decision at your earliest convenience.</p>
  `;

  return getEmailTemplate(
    `Job Offer - ${jobTitle}`,
    content,
    'View Offer Details',
    dashboardLink
  );
};

// Welcome Email (New User Registration)
const getWelcomeEmail = (data) => {
  const { userName, userEmail, dashboardLink } = data;

  const content = `
    <h2>🎉 Welcome to CareerBoost AI!</h2>
    <p>Hi ${userName},</p>
    <p>Thank you for joining CareerBoost AI! We're excited to help you accelerate your career journey.</p>
    
    <div class="info-box">
      <p><strong>Your account is now active!</strong></p>
      <p>Email: ${userEmail}</p>
    </div>
    
    <p><strong>Get started with these steps:</strong></p>
    <ul>
      <li>📄 Upload your resume for AI-powered analysis</li>
      <li>🎯 Get personalized job recommendations</li>
      <li>📊 Track your applications in one place</li>
      <li>💡 Access skill development roadmaps</li>
      <li>🎓 Take AI-generated quizzes to sharpen your skills</li>
    </ul>
    
    <p>Need help? Our support team is here for you!</p>
  `;

  return getEmailTemplate(
    'Welcome to CareerBoost AI',
    content,
    'Go to Dashboard',
    dashboardLink
  );
};

// Interview Reminder (24 hours before)
const getInterviewReminderEmail = (data) => {
  const { candidateName, jobTitle, companyName, interviewDate, interviewTime, meetingLink, dashboardLink } = data;

  const content = `
    <h2>⏰ Interview Reminder</h2>
    <p>Hi ${candidateName},</p>
    <p>This is a friendly reminder about your upcoming interview!</p>
    
    <div class="info-box">
      <p><strong>Position:</strong> ${jobTitle} at ${companyName}</p>
      <p><strong>When:</strong> Tomorrow at ${interviewTime}</p>
      ${meetingLink ? `<p><strong>Join Link:</strong> <a href="${meetingLink}" style="color: #667eea;">${meetingLink}</a></p>` : ''}
    </div>
    
    <p><strong>Quick Checklist:</strong></p>
    <ul>
      <li>✅ Test your internet connection</li>
      <li>✅ Check audio and video</li>
      <li>✅ Review the job description</li>
      <li>✅ Prepare your questions</li>
      <li>✅ Have your resume ready</li>
    </ul>
    
    <p>You've got this! 💪</p>
  `;

  return getEmailTemplate(
    `Interview Reminder - ${jobTitle}`,
    content,
    'View Details',
    dashboardLink
  );
};

/**
 * Send email function
 */
export const sendEmail = async ({ to, subject, html, attachments = [] }) => {
  try {
    if (!emailConfigured || !transporter) {
      logger.warn(`Email not sent (service disabled): ${subject} to ${to}`);
      return { success: false, message: 'Email service not configured' };
    }

    const mailOptions = {
      from: `"CareerBoost AI" <${process.env.SMTP_FROM || 'noreply@careerboost.ai'}>`,
      to,
      subject,
      html,
      attachments
    };

    if (process.env.NODE_ENV === 'production') {
      const info = await transporter.sendMail(mailOptions);
      logger.info(`✅ Email sent: ${info.messageId} to ${to}`);
      return { success: true, messageId: info.messageId };
    } else {
      // Development mode - log email content
      logger.info('📧 [DEV] Email would be sent:', {
        to,
        subject,
        htmlLength: html.length
      });
      return { success: true, messageId: 'dev-mode' };
    }
  } catch (error) {
    logger.error('❌ Email send error:', error);
    throw error;
  }
};

/**
 * High-level email sending functions
 */

export const sendApplicationStatusEmail = async (to, data) => {
  const html = getApplicationStatusEmail(data);
  return sendEmail({
    to,
    subject: `Application Update - ${data.jobTitle}`,
    html
  });
};

export const sendInterviewScheduledEmail = async (to, data) => {
  const html = getInterviewScheduledEmail(data);
  return sendEmail({
    to,
    subject: `Interview Scheduled - ${data.jobTitle}`,
    html
  });
};

export const sendOfferExtendedEmail = async (to, data) => {
  const html = getOfferExtendedEmail(data);
  return sendEmail({
    to,
    subject: `Job Offer - ${data.jobTitle}`,
    html
  });
};

export const sendWelcomeEmail = async (to, data) => {
  const html = getWelcomeEmail(data);
  return sendEmail({
    to,
    subject: 'Welcome to CareerBoost AI! 🚀',
    html
  });
};

export const sendInterviewReminderEmail = async (to, data) => {
  const html = getInterviewReminderEmail(data);
  return sendEmail({
    to,
    subject: `Interview Reminder - ${data.jobTitle}`,
    html
  });
};

export default {
  sendEmail,
  sendApplicationStatusEmail,
  sendInterviewScheduledEmail,
  sendOfferExtendedEmail,
  sendWelcomeEmail,
  sendInterviewReminderEmail
};
