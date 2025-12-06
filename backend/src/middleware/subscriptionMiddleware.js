/**
 * Subscription Middleware
 * Enforces usage limits and plan restrictions
 */

import { checkUsageLimit, trackUsage } from '../services/subscriptionService.js';
import { logger } from '../utils/logger.js';

const resolveUserId = (user = {}) => user._id || user.userId || user.id || null;

/**
 * Check if user can use a feature based on their subscription
 */
export const checkFeatureAccess = (featureKey) => {
  return async (req, res, next) => {
    try {
      const userId = resolveUserId(req.user);
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const limitCheck = await checkUsageLimit(userId, featureKey);
      
      if (!limitCheck.allowed) {
        return res.status(403).json({
          success: false,
          message: `Feature limit reached. You have used ${limitCheck.usage} of ${limitCheck.limit} allowed.`,
          featureKey,
          usage: limitCheck.usage,
          limit: limitCheck.limit,
          upgradeRequired: true,
        });
      }

      // Store limit info in request for later use
      req.featureLimitCheck = limitCheck;
      req.userId = userId;
      next();
    } catch (error) {
      logger.error('Feature access check failed:', error);
      // Allow access on error to avoid blocking users
      next();
    }
  };
};

/**
 * Track feature usage after successful operation
 * Use this middleware AFTER the main handler
 */
export const trackFeatureUsage = (featureKey) => {
  return async (req, res, next) => {
    try {
      const userId = resolveUserId(req.user);
      if (userId) {
        await trackUsage(userId, featureKey);
        logger.info(`Feature usage tracked: ${featureKey} for user ${userId}`);
      }
    } catch (error) {
      logger.error('Feature usage tracking failed:', error);
      // Don't fail the request if tracking fails
    }
    next();
  };
};

/**
 * Require specific subscription plan
 */
export const requirePlan = (minimumPlan) => {
  const planHierarchy = { free: 0, pro: 1, team: 2, enterprise: 3 };
  
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.subscriptionId) {
        return res.status(403).json({
          success: false,
          message: `This feature requires a ${minimumPlan} plan or higher`,
          upgradeRequired: true,
          minimumPlan,
        });
      }

      const subscription = await req.user.populate('subscriptionId');
      const userPlanLevel = planHierarchy[subscription.subscriptionId.plan] || 0;
      const requiredPlanLevel = planHierarchy[minimumPlan] || 0;

      if (userPlanLevel < requiredPlanLevel) {
        return res.status(403).json({
          success: false,
          message: `This feature requires a ${minimumPlan} plan or higher`,
          currentPlan: subscription.subscriptionId.plan,
          requiredPlan: minimumPlan,
          upgradeRequired: true,
        });
      }

      next();
    } catch (error) {
      logger.error('Plan check failed:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to verify subscription',
      });
    }
  };
};

/**
 * Check if user is admin
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.',
    });
  }
  next();
};

/**
 * Check if user is recruiter or admin
 */
export const requireRecruiter = (req, res, next) => {
  if (!req.user || !['recruiter', 'admin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Recruiter or admin privileges required.',
    });
  }
  next();
};

export default {
  checkFeatureAccess,
  trackFeatureUsage,
  requirePlan,
  requireAdmin,
  requireRecruiter,
};
