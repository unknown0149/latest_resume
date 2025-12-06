import crypto from 'crypto';
import { logger } from '../utils/logger.js';
import emailService from './emailService.js';
import smsService from './smsService.js';

/**
 * OTP Service
 * Handles OTP generation, storage, verification, and delivery
 * Supports: Email verification, 2FA login, Password reset
 */

// In-memory OTP storage (use Redis in production for scalability)
const otpStore = new Map();

// OTP Configuration
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 3;
const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Generate random OTP
 */
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Generate unique OTP key
 */
const getOTPKey = (identifier, purpose) => {
  return `otp:${purpose}:${identifier}`;
};

/**
 * Store OTP with metadata
 */
const storeOTP = (key, otp, metadata = {}) => {
  otpStore.set(key, {
    otp,
    createdAt: Date.now(),
    expiresAt: Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000,
    attempts: 0,
    verified: false,
    ...metadata
  });
};

/**
 * Get stored OTP data
 */
const getOTPData = (key) => {
  return otpStore.get(key);
};

/**
 * Delete OTP data
 */
const deleteOTP = (key) => {
  otpStore.delete(key);
};

/**
 * Check if can resend OTP (cooldown period)
 */
const canResend = (key) => {
  const data = getOTPData(key);
  if (!data) return true;
  
  const timeSinceCreation = (Date.now() - data.createdAt) / 1000;
  return timeSinceCreation >= RESEND_COOLDOWN_SECONDS;
};

/**
 * Clean up expired OTPs (run periodically)
 */
const cleanupExpiredOTPs = () => {
  const now = Date.now();
  for (const [key, data] of otpStore.entries()) {
    if (data.expiresAt < now) {
      otpStore.delete(key);
    }
  }
};

// Cleanup every 5 minutes
setInterval(cleanupExpiredOTPs, 5 * 60 * 1000);

/**
 * Generate and send OTP for email verification
 */
export const sendEmailVerificationOTP = async (email, userName) => {
  try {
    const key = getOTPKey(email, 'email-verification');
    
    // Check cooldown
    if (!canResend(key)) {
      const data = getOTPData(key);
      const remainingSeconds = Math.ceil(RESEND_COOLDOWN_SECONDS - (Date.now() - data.createdAt) / 1000);
      throw new Error(`Please wait ${remainingSeconds} seconds before requesting a new OTP`);
    }
    
    // Generate OTP
    const otp = generateOTP();
    
    // Store OTP
    storeOTP(key, otp, { email, purpose: 'email-verification' });
    
    // Send email
    await emailService.sendEmail({
      to: email,
      subject: 'Verify Your Email - CareerBoost AI',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #eee; }
            .otp-box { background: #f8f9fa; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
            .otp-code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
            .warning { color: #dc3545; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚀 CareerBoost AI</h1>
              <p>Email Verification</p>
            </div>
            <div class="content">
              <h2>Hi ${userName || 'there'}!</h2>
              <p>Thank you for registering with CareerBoost AI. Please verify your email address using the OTP below:</p>
              
              <div class="otp-box">
                <p style="margin: 0; font-size: 14px; color: #666;">Your verification code:</p>
                <p class="otp-code">${otp}</p>
              </div>
              
              <p><strong>⏰ This code will expire in ${OTP_EXPIRY_MINUTES} minutes.</strong></p>
              
              <p class="warning">⚠️ If you didn't request this code, please ignore this email.</p>
              
              <p>For security reasons, never share this code with anyone.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} CareerBoost AI. All rights reserved.</p>
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `
    });
    
    logger.info(`Email verification OTP sent to: ${email}`);
    
    return {
      success: true,
      message: 'OTP sent successfully',
      expiresIn: OTP_EXPIRY_MINUTES * 60
    };
  } catch (error) {
    logger.error('Send email verification OTP error:', error);
    throw error;
  }
};

/**
 * Verify email OTP
 */
export const verifyEmailOTP = async (email, otp) => {
  try {
    const key = getOTPKey(email, 'email-verification');
    const data = getOTPData(key);
    
    if (!data) {
      throw new Error('OTP not found or expired. Please request a new one.');
    }
    
    // Check expiry
    if (Date.now() > data.expiresAt) {
      deleteOTP(key);
      throw new Error('OTP has expired. Please request a new one.');
    }
    
    // Check max attempts
    if (data.attempts >= MAX_ATTEMPTS) {
      deleteOTP(key);
      throw new Error('Maximum verification attempts exceeded. Please request a new OTP.');
    }
    
    // Increment attempts
    data.attempts++;
    
    // Verify OTP
    if (data.otp !== otp) {
      const remainingAttempts = MAX_ATTEMPTS - data.attempts;
      throw new Error(`Invalid OTP. ${remainingAttempts} attempt(s) remaining.`);
    }
    
    // Mark as verified and delete
    data.verified = true;
    deleteOTP(key);
    
    logger.info(`Email verified successfully: ${email}`);
    
    return {
      success: true,
      message: 'Email verified successfully'
    };
  } catch (error) {
    logger.error('Verify email OTP error:', error);
    throw error;
  }
};

/**
 * Generate and send OTP for 2FA login
 */
export const send2FAOTP = async (email, userName) => {
  try {
    const key = getOTPKey(email, '2fa-login');
    
    if (!canResend(key)) {
      const data = getOTPData(key);
      const remainingSeconds = Math.ceil(RESEND_COOLDOWN_SECONDS - (Date.now() - data.createdAt) / 1000);
      throw new Error(`Please wait ${remainingSeconds} seconds before requesting a new OTP`);
    }
    
    const otp = generateOTP();
    storeOTP(key, otp, { email, purpose: '2fa-login' });
    
    await emailService.sendEmail({
      to: email,
      subject: 'Your Login Code - CareerBoost AI',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #eee; }
            .otp-box { background: #f8f9fa; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
            .otp-code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
            .warning { color: #dc3545; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 CareerBoost AI</h1>
              <p>Two-Factor Authentication</p>
            </div>
            <div class="content">
              <h2>Hi ${userName || 'there'}!</h2>
              <p>Someone is trying to sign in to your account. Enter this code to continue:</p>
              
              <div class="otp-box">
                <p style="margin: 0; font-size: 14px; color: #666;">Your login code:</p>
                <p class="otp-code">${otp}</p>
              </div>
              
              <p><strong>⏰ This code will expire in ${OTP_EXPIRY_MINUTES} minutes.</strong></p>
              
              <p class="warning">⚠️ If you didn't attempt to log in, please secure your account immediately!</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} CareerBoost AI. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    });
    
    logger.info(`2FA OTP sent to: ${email}`);
    
    return {
      success: true,
      message: 'Login code sent to your email',
      expiresIn: OTP_EXPIRY_MINUTES * 60
    };
  } catch (error) {
    logger.error('Send 2FA OTP error:', error);
    throw error;
  }
};

/**
 * Verify 2FA OTP
 */
export const verify2FAOTP = async (email, otp) => {
  try {
    const key = getOTPKey(email, '2fa-login');
    const data = getOTPData(key);
    
    if (!data) {
      throw new Error('Login code not found or expired. Please request a new one.');
    }
    
    if (Date.now() > data.expiresAt) {
      deleteOTP(key);
      throw new Error('Login code has expired. Please request a new one.');
    }
    
    if (data.attempts >= MAX_ATTEMPTS) {
      deleteOTP(key);
      throw new Error('Maximum verification attempts exceeded. Please try logging in again.');
    }
    
    data.attempts++;
    
    if (data.otp !== otp) {
      const remainingAttempts = MAX_ATTEMPTS - data.attempts;
      throw new Error(`Invalid code. ${remainingAttempts} attempt(s) remaining.`);
    }
    
    data.verified = true;
    deleteOTP(key);
    
    logger.info(`2FA verified successfully: ${email}`);
    
    return {
      success: true,
      message: '2FA verification successful'
    };
  } catch (error) {
    logger.error('Verify 2FA OTP error:', error);
    throw error;
  }
};

/**
 * Generate and send OTP for password reset
 */
export const sendPasswordResetOTP = async (email, userName) => {
  try {
    const key = getOTPKey(email, 'password-reset');
    
    if (!canResend(key)) {
      const data = getOTPData(key);
      const remainingSeconds = Math.ceil(RESEND_COOLDOWN_SECONDS - (Date.now() - data.createdAt) / 1000);
      throw new Error(`Please wait ${remainingSeconds} seconds before requesting a new OTP`);
    }
    
    const otp = generateOTP();
    storeOTP(key, otp, { email, purpose: 'password-reset' });
    
    await emailService.sendEmail({
      to: email,
      subject: 'Password Reset Code - CareerBoost AI',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #eee; }
            .otp-box { background: #f8f9fa; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
            .otp-code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
            .warning { color: #dc3545; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔑 CareerBoost AI</h1>
              <p>Password Reset Request</p>
            </div>
            <div class="content">
              <h2>Hi ${userName || 'there'}!</h2>
              <p>We received a request to reset your password. Use the code below to proceed:</p>
              
              <div class="otp-box">
                <p style="margin: 0; font-size: 14px; color: #666;">Your reset code:</p>
                <p class="otp-code">${otp}</p>
              </div>
              
              <p><strong>⏰ This code will expire in ${OTP_EXPIRY_MINUTES} minutes.</strong></p>
              
              <p class="warning">⚠️ If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} CareerBoost AI. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    });
    
    logger.info(`Password reset OTP sent to: ${email}`);
    
    return {
      success: true,
      message: 'Reset code sent to your email',
      expiresIn: OTP_EXPIRY_MINUTES * 60
    };
  } catch (error) {
    logger.error('Send password reset OTP error:', error);
    throw error;
  }
};

/**
 * Verify password reset OTP
 */
export const verifyPasswordResetOTP = async (email, otp) => {
  try {
    const key = getOTPKey(email, 'password-reset');
    const data = getOTPData(key);
    
    if (!data) {
      throw new Error('Reset code not found or expired. Please request a new one.');
    }
    
    if (Date.now() > data.expiresAt) {
      deleteOTP(key);
      throw new Error('Reset code has expired. Please request a new one.');
    }
    
    if (data.attempts >= MAX_ATTEMPTS) {
      deleteOTP(key);
      throw new Error('Maximum verification attempts exceeded. Please request a new reset code.');
    }
    
    data.attempts++;
    
    if (data.otp !== otp) {
      const remainingAttempts = MAX_ATTEMPTS - data.attempts;
      throw new Error(`Invalid code. ${remainingAttempts} attempt(s) remaining.`);
    }
    
    data.verified = true;
    deleteOTP(key);
    
    logger.info(`Password reset OTP verified: ${email}`);
    
    return {
      success: true,
      message: 'Reset code verified successfully'
    };
  } catch (error) {
    logger.error('Verify password reset OTP error:', error);
    throw error;
  }
};

/**
 * Get OTP statistics (for monitoring)
 */
export const getOTPStats = () => {
  let active = 0;
  let expired = 0;
  const now = Date.now();
  
  for (const data of otpStore.values()) {
    if (data.expiresAt > now) {
      active++;
    } else {
      expired++;
    }
  }
  
  return {
    total: otpStore.size,
    active,
    expired
  };
};

export default {
  sendEmailVerificationOTP,
  verifyEmailOTP,
  send2FAOTP,
  verify2FAOTP,
  sendPasswordResetOTP,
  verifyPasswordResetOTP,
  getOTPStats
};
