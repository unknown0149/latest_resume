import { logger } from '../utils/logger.js';

/**
 * SMS Service
 * Handles SMS notifications using Twilio or AWS SNS
 * Supports critical alerts and reminders
 */

/**
 * SMS Provider Configuration
 * Set SMS_PROVIDER in .env to 'twilio' or 'sns'
 */
const SMS_PROVIDER = process.env.SMS_PROVIDER || 'twilio';

/**
 * Twilio Configuration
 */
let twilioClient = null;
if (SMS_PROVIDER === 'twilio' && process.env.TWILIO_ACCOUNT_SID) {
  try {
    const twilio = await import('twilio');
    twilioClient = twilio.default(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    logger.info('✅ Twilio SMS service initialized');
  } catch (error) {
    logger.warn('⚠️ Twilio not configured. Install: npm install twilio');
  }
}

/**
 * AWS SNS Configuration
 */
let snsClient = null;
if (SMS_PROVIDER === 'sns' && process.env.AWS_ACCESS_KEY_ID) {
  try {
    const { SNSClient, PublishCommand } = await import('@aws-sdk/client-sns');
    snsClient = new SNSClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });
    logger.info('✅ AWS SNS SMS service initialized');
  } catch (error) {
    logger.warn('⚠️ AWS SNS not configured. Install: npm install @aws-sdk/client-sns');
  }
}

/**
 * Format phone number to E.164 format
 * Converts Indian numbers to +91XXXXXXXXXX format
 */
const formatPhoneNumber = (phone) => {
  if (!phone) return null;
  
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // If starts with 91 and has 12 digits, add +
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return `+${cleaned}`;
  }
  
  // If 10 digits, assume Indian number
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }
  
  // If already has country code
  if (cleaned.length > 10) {
    return `+${cleaned}`;
  }
  
  return null;
};

/**
 * SMS Templates
 */

const getSMSTemplate = (type, data) => {
  const templates = {
    INTERVIEW_REMINDER: (data) => 
      `Hi ${data.candidateName}! Reminder: Your interview for ${data.jobTitle} at ${data.companyName} is tomorrow at ${data.interviewTime}. ${data.meetingLink ? `Link: ${data.meetingLink}` : ''} Good luck! - CareerBoost AI`,
    
    INTERVIEW_SCHEDULED: (data) =>
      `Hi ${data.candidateName}! Your interview for ${data.jobTitle} at ${data.companyName} is scheduled for ${new Date(data.interviewDate).toLocaleDateString('en-IN')} at ${data.interviewTime}. Check your email for details. - CareerBoost AI`,
    
    OFFER_EXTENDED: (data) =>
      `Congratulations ${data.candidateName}! You have received an offer for ${data.jobTitle} at ${data.companyName}. Check your email for full details. - CareerBoost AI`,
    
    APPLICATION_SHORTLISTED: (data) =>
      `Great news ${data.candidateName}! You've been shortlisted for ${data.jobTitle} at ${data.companyName}. Check your dashboard for next steps. - CareerBoost AI`,
    
    INTERVIEW_STARTING_SOON: (data) =>
      `Hi ${data.candidateName}! Your interview for ${data.jobTitle} starts in 1 hour. ${data.meetingLink ? `Join here: ${data.meetingLink}` : ''} All the best! - CareerBoost AI`,
    
    OFFER_EXPIRING_SOON: (data) =>
      `Hi ${data.candidateName}! Your offer from ${data.companyName} expires in 24 hours. Please respond soon. - CareerBoost AI`,
    
    PASSWORD_RESET: (data) =>
      `Your CareerBoost AI password reset code is: ${data.resetCode}. Valid for 10 minutes. Do not share this code.`,
    
    OTP_VERIFICATION: (data) =>
      `Your CareerBoost AI verification code is: ${data.otp}. Valid for 5 minutes.`,
    
    ACCOUNT_CREATED: (data) =>
      `Welcome to CareerBoost AI, ${data.userName}! Your account has been created successfully. Login to start your career journey!`
  };

  const template = templates[type];
  return template ? template(data) : null;
};

/**
 * Send SMS using Twilio
 */
const sendViaTwilio = async (to, message) => {
  if (!twilioClient) {
    throw new Error('Twilio not configured');
  }

  const result = await twilioClient.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: to
  });

  logger.info(`✅ SMS sent via Twilio: ${result.sid} to ${to}`);
  return { success: true, messageId: result.sid, provider: 'twilio' };
};

/**
 * Send SMS using AWS SNS
 */
const sendViaSNS = async (to, message) => {
  if (!snsClient) {
    throw new Error('AWS SNS not configured');
  }

  const { PublishCommand } = await import('@aws-sdk/client-sns');
  
  const command = new PublishCommand({
    Message: message,
    PhoneNumber: to,
    MessageAttributes: {
      'AWS.SNS.SMS.SMSType': {
        DataType: 'String',
        StringValue: 'Transactional' // Higher priority
      }
    }
  });

  const result = await snsClient.send(command);
  logger.info(`✅ SMS sent via AWS SNS: ${result.MessageId} to ${to}`);
  return { success: true, messageId: result.MessageId, provider: 'sns' };
};

/**
 * Main SMS sending function
 */
export const sendSMS = async ({ to, message, type = null, data = null }) => {
  try {
    // Format phone number
    const formattedPhone = formatPhoneNumber(to);
    if (!formattedPhone) {
      throw new Error(`Invalid phone number format: ${to}`);
    }

    // Get template message if type is provided
    const smsMessage = type && data ? getSMSTemplate(type, data) : message;
    
    if (!smsMessage) {
      throw new Error('SMS message is required');
    }

    // Truncate if too long (SMS limit is 160 characters, but we allow 320 for concatenated)
    const truncatedMessage = smsMessage.length > 320 
      ? smsMessage.substring(0, 317) + '...' 
      : smsMessage;

    // Development mode - log instead of sending
    if (process.env.NODE_ENV !== 'production') {
      logger.info('📱 [DEV] SMS would be sent:', {
        to: formattedPhone,
        message: truncatedMessage,
        length: truncatedMessage.length
      });
      return { success: true, messageId: 'dev-mode', provider: 'dev' };
    }

    // Send via configured provider
    if (SMS_PROVIDER === 'twilio') {
      return await sendViaTwilio(formattedPhone, truncatedMessage);
    } else if (SMS_PROVIDER === 'sns') {
      return await sendViaSNS(formattedPhone, truncatedMessage);
    } else {
      throw new Error(`Unsupported SMS provider: ${SMS_PROVIDER}`);
    }

  } catch (error) {
    logger.error('❌ SMS send error:', error);
    throw error;
  }
};

/**
 * High-level SMS functions for specific use cases
 */

export const sendInterviewReminderSMS = async (phone, data) => {
  return sendSMS({
    to: phone,
    type: 'INTERVIEW_REMINDER',
    data
  });
};

export const sendInterviewScheduledSMS = async (phone, data) => {
  return sendSMS({
    to: phone,
    type: 'INTERVIEW_SCHEDULED',
    data
  });
};

export const sendOfferExtendedSMS = async (phone, data) => {
  return sendSMS({
    to: phone,
    type: 'OFFER_EXTENDED',
    data
  });
};

export const sendShortlistedSMS = async (phone, data) => {
  return sendSMS({
    to: phone,
    type: 'APPLICATION_SHORTLISTED',
    data
  });
};

export const sendInterviewStartingSoonSMS = async (phone, data) => {
  return sendSMS({
    to: phone,
    type: 'INTERVIEW_STARTING_SOON',
    data
  });
};

export const sendOfferExpiringSoonSMS = async (phone, data) => {
  return sendSMS({
    to: phone,
    type: 'OFFER_EXPIRING_SOON',
    data
  });
};

export const sendOTPSMS = async (phone, otp) => {
  return sendSMS({
    to: phone,
    type: 'OTP_VERIFICATION',
    data: { otp }
  });
};

export const sendPasswordResetSMS = async (phone, resetCode) => {
  return sendSMS({
    to: phone,
    type: 'PASSWORD_RESET',
    data: { resetCode }
  });
};

export const sendWelcomeSMS = async (phone, userName) => {
  return sendSMS({
    to: phone,
    type: 'ACCOUNT_CREATED',
    data: { userName }
  });
};

/**
 * Bulk SMS sending with rate limiting
 */
export const sendBulkSMS = async (messages) => {
  const results = [];
  const RATE_LIMIT_DELAY = 100; // 100ms between messages

  for (const msg of messages) {
    try {
      const result = await sendSMS(msg);
      results.push({ ...msg, ...result });
      
      // Rate limiting
      if (messages.length > 1) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
      }
    } catch (error) {
      results.push({ ...msg, success: false, error: error.message });
    }
  }

  return results;
};

export default {
  sendSMS,
  sendInterviewReminderSMS,
  sendInterviewScheduledSMS,
  sendOfferExtendedSMS,
  sendShortlistedSMS,
  sendInterviewStartingSoonSMS,
  sendOfferExpiringSoonSMS,
  sendOTPSMS,
  sendPasswordResetSMS,
  sendWelcomeSMS,
  sendBulkSMS
};
