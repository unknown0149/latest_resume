import winston from 'winston';
import { logger } from '../utils/logger.js';

/**
 * Monitoring & Error Tracking Service
 * Integrates with:
 * - Sentry (error tracking)
 * - Datadog/New Relic (APM)
 * - Custom correlation IDs
 */

let sentryInitialized = false;
let Sentry = null;

/**
 * Initialize Sentry error tracking
 */
export const initializeSentry = async () => {
  try {
    if (!process.env.SENTRY_DSN) {
      logger.info('⚠️ Sentry not configured (SENTRY_DSN not set)');
      return false;
    }

    // Dynamic import for optional dependency
    Sentry = await import('@sentry/node');
    const { ProfilingIntegration } = await import('@sentry/profiling-node');

    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      release: process.env.APP_VERSION || '1.0.0',
      
      // Performance Monitoring
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      
      // Profiling
      profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      integrations: [
        new ProfilingIntegration(),
      ],
      
      // Error filtering
      beforeSend(event, hint) {
        // Don't send errors in development
        if (process.env.NODE_ENV === 'development') {
          console.error('Sentry event (not sent in dev):', event);
          return null;
        }
        
        // Filter out specific errors
        const error = hint.originalException;
        if (error?.message?.includes('ECONNREFUSED')) {
          return null; // Don't track connection errors
        }
        
        return event;
      },
      
      // Ignore certain errors
      ignoreErrors: [
        'ECONNREFUSED',
        'ETIMEDOUT',
        'Network Error',
        'UnauthorizedError',
        'ValidationError'
      ]
    });

    sentryInitialized = true;
    logger.info('✅ Sentry error tracking initialized');
    return true;
  } catch (error) {
    logger.warn('⚠️ Sentry initialization failed:', error.message);
    logger.info('📝 Install Sentry: npm install @sentry/node @sentry/profiling-node');
    return false;
  }
};

/**
 * Create Winston transport for Sentry
 */
export const createSentryTransport = () => {
  if (!sentryInitialized || !Sentry) {
    return null;
  }

  return new winston.transports.Stream({
    stream: {
      write: (message) => {
        try {
          const log = JSON.parse(message);
          
          // Only send errors and critical logs to Sentry
          if (log.level === 'error') {
            Sentry.captureException(new Error(log.message), {
              level: 'error',
              extra: log.metadata || {}
            });
          }
        } catch (error) {
          // Ignore parsing errors
        }
      }
    },
    level: 'error'
  });
};

/**
 * Capture exception in Sentry
 */
export const captureException = (error, context = {}) => {
  if (sentryInitialized && Sentry) {
    Sentry.captureException(error, {
      extra: context,
      tags: {
        service: 'backend',
        ...(context.tags || {})
      }
    });
  }
  
  // Always log to console
  logger.error('Exception captured:', error, context);
};

/**
 * Capture message in Sentry
 */
export const captureMessage = (message, level = 'info', context = {}) => {
  if (sentryInitialized && Sentry) {
    Sentry.captureMessage(message, {
      level,
      extra: context
    });
  }
  
  logger[level]?.(message, context);
};

/**
 * Set user context for error tracking
 */
export const setUserContext = (user) => {
  if (sentryInitialized && Sentry) {
    Sentry.setUser({
      id: user.id || user._id,
      email: user.email,
      username: user.name,
      role: user.role
    });
  }
};

/**
 * Clear user context
 */
export const clearUserContext = () => {
  if (sentryInitialized && Sentry) {
    Sentry.setUser(null);
  }
};

/**
 * Add breadcrumb for debugging
 */
export const addBreadcrumb = (category, message, data = {}) => {
  if (sentryInitialized && Sentry) {
    Sentry.addBreadcrumb({
      category,
      message,
      data,
      level: 'info',
      timestamp: Date.now()
    });
  }
};

/**
 * Generate correlation ID for request tracking
 */
export const generateCorrelationId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Middleware: Add correlation ID to requests
 */
export const correlationIdMiddleware = (req, res, next) => {
  req.correlationId = req.headers['x-correlation-id'] || generateCorrelationId();
  res.setHeader('X-Correlation-ID', req.correlationId);
  
  // Add to Sentry context
  if (sentryInitialized && Sentry) {
    Sentry.setContext('request', {
      correlationId: req.correlationId,
      method: req.method,
      url: req.url,
      ip: req.ip
    });
  }
  
  next();
};

/**
 * Middleware: Sentry request handler
 */
export const sentryRequestHandler = () => {
  if (sentryInitialized && Sentry) {
    return Sentry.Handlers.requestHandler();
  }
  return (req, res, next) => next();
};

/**
 * Middleware: Sentry error handler
 */
export const sentryErrorHandler = () => {
  if (sentryInitialized && Sentry) {
    return Sentry.Handlers.errorHandler();
  }
  return (err, req, res, next) => next(err);
};

/**
 * Performance monitoring: Start transaction
 */
export const startTransaction = (name, op = 'http') => {
  if (sentryInitialized && Sentry) {
    return Sentry.startTransaction({
      name,
      op,
      trimEnd: true
    });
  }
  return null;
};

/**
 * Performance monitoring: End transaction
 */
export const finishTransaction = (transaction) => {
  if (transaction) {
    transaction.finish();
  }
};

/**
 * Datadog/New Relic initialization stub
 */
export const initializeAPM = async () => {
  try {
    // Check for Datadog
    if (process.env.DD_API_KEY) {
      logger.info('✅ Datadog APM detected (configure dd-trace)');
      logger.info('📝 Install: npm install dd-trace');
      // In actual implementation:
      // const tracer = require('dd-trace').init();
    }
    
    // Check for New Relic
    if (process.env.NEW_RELIC_LICENSE_KEY) {
      logger.info('✅ New Relic detected (configure newrelic)');
      logger.info('📝 Install: npm install newrelic');
      // In actual implementation:
      // require('newrelic');
    }

    if (!process.env.DD_API_KEY && !process.env.NEW_RELIC_LICENSE_KEY) {
      logger.info('⚠️ APM not configured (Datadog/New Relic)');
    }
  } catch (error) {
    logger.warn('⚠️ APM initialization warning:', error.message);
  }
};

/**
 * Custom metrics tracking
 */
const metrics = new Map();

export const trackMetric = (name, value, tags = {}) => {
  const key = `${name}:${JSON.stringify(tags)}`;
  
  if (!metrics.has(key)) {
    metrics.set(key, {
      name,
      count: 0,
      sum: 0,
      min: Infinity,
      max: -Infinity,
      tags
    });
  }
  
  const metric = metrics.get(key);
  metric.count++;
  metric.sum += value;
  metric.min = Math.min(metric.min, value);
  metric.max = Math.max(metric.max, value);
  
  // Log significant metrics
  if (metric.count % 100 === 0) {
    logger.info(`Metric [${name}]: avg=${(metric.sum / metric.count).toFixed(2)}, min=${metric.min}, max=${metric.max}, count=${metric.count}`, tags);
  }
};

export const getMetrics = () => {
  return Array.from(metrics.values()).map(m => ({
    name: m.name,
    avg: m.sum / m.count,
    min: m.min,
    max: m.max,
    count: m.count,
    tags: m.tags
  }));
};

export const clearMetrics = () => {
  metrics.clear();
};

/**
 * Health check endpoint for monitoring
 */
export const getMonitoringHealth = () => {
  return {
    sentry: sentryInitialized,
    metricsCollected: metrics.size,
    timestamp: new Date().toISOString()
  };
};

/**
 * Graceful shutdown
 */
export const closeMonitoring = async () => {
  if (sentryInitialized && Sentry) {
    await Sentry.close(2000);
    logger.info('Sentry connection closed');
  }
};

export default {
  initializeSentry,
  createSentryTransport,
  captureException,
  captureMessage,
  setUserContext,
  clearUserContext,
  addBreadcrumb,
  generateCorrelationId,
  correlationIdMiddleware,
  sentryRequestHandler,
  sentryErrorHandler,
  startTransaction,
  finishTransaction,
  initializeAPM,
  trackMetric,
  getMetrics,
  clearMetrics,
  getMonitoringHealth,
  closeMonitoring
};
