/**
 * Security Middleware Configuration
 * Helmet, Rate Limiting, Input Validation
 */

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';

/**
 * Helmet configuration for security headers
 */
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
});

/**
 * Rate limiting configurations
 */

// General API rate limiter
// Looser in non-production to avoid blocking local testing / dashboards
export const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  max:
    process.env.NODE_ENV === 'production'
      ? parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 300
      : parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 2000,
  message: {
    error: 'Too many requests',
    message: 'Rate limit exceeded. Please try again later.',
    statusCode: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip throttling in local/dev to prevent UX breakage while testing
  skip: () => process.env.NODE_ENV !== 'production',
});

// Strict limiter for authentication endpoints (5 attempts per 15 minutes)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: 'Too many authentication attempts',
    message: 'Too many login attempts. Please try again after 15 minutes.',
    statusCode: 429,
  },
  skipSuccessfulRequests: true,
});

// Resume upload limiter (10 uploads per hour)
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    error: 'Upload limit exceeded',
    message: 'Too many uploads. Please try again later.',
    statusCode: 429,
  },
});

/**
 * Input validation middleware factory
 * Returns middleware that validates and sanitizes input
 */
export const validate = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    // Format errors
    const formattedErrors = errors.array().map(err => ({
      field: err.path,
      message: err.msg,
      value: err.value,
    }));

    return res.status(400).json({
      error: 'Validation failed',
      message: 'Invalid input data',
      statusCode: 400,
      errors: formattedErrors,
    });
  };
};

/**
 * Common validation rules
 */

// Resume upload validation
export const validateResumeUpload = [
  body('userId').optional().isString().trim().notEmpty().withMessage('User ID must be a non-empty string'),
];

// User registration validation
export const validateUserRegistration = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
  body('name').trim().notEmpty().withMessage('Name is required'),
];

// User login validation
export const validateUserLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

// Quiz submission validation
export const validateQuizSubmission = [
  body('quizId').isString().trim().notEmpty().withMessage('Quiz ID is required'),
  body('answers').isArray({ min: 1 }).withMessage('Answers array is required'),
  body('answers.*.questionId').isString().withMessage('Question ID must be a string'),
  body('answers.*.selectedAnswer').isString().withMessage('Selected answer must be a string'),
];

// Interview submission validation
export const validateInterviewSubmission = [
  body('sessionId').isString().trim().notEmpty().withMessage('Session ID is required'),
  body('answers').isArray({ min: 1 }).withMessage('Answers array is required'),
];

// Job search validation
export const validateJobSearch = [
  body('query').optional().isString().trim(),
  body('location').optional().isString().trim(),
  body('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
];

// Skill verification validation
export const validateSkillVerification = [
  body('resumeId').isString().trim().notEmpty().withMessage('Resume ID is required'),
  body('skill').isString().trim().notEmpty().withMessage('Skill name is required'),
  body('verified').isBoolean().withMessage('Verified must be a boolean'),
];

/**
 * Sanitization utilities
 */
export const sanitizeUserInput = (input) => {
  if (typeof input !== 'string') return input;
  
  // Remove HTML tags
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/[<>]/g, '')
    .trim();
};

/**
 * CSRF Protection middleware (for future implementation)
 */
export const csrfProtection = (req, res, next) => {
  // TODO: Implement CSRF token validation
  // For now, just pass through
  next();
};
