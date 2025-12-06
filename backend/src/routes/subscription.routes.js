/**
 * Subscription Routes
 * API endpoints for subscription management
 */

import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import Subscription from '../models/Subscription.js';
import * as subscriptionService from '../services/subscriptionService.js';

const router = express.Router();

/**
 * @route GET /api/subscriptions/plans
 * @desc Get all available subscription plans
 * @access Public
 */
router.get('/plans', (req, res) => {
  try {
    const plans = ['free', 'pro', 'team', 'enterprise'].map(planName => ({
      id: planName,
      ...Subscription.getPlanDetails(planName),
    }));
    
    res.json({
      success: true,
      plans,
    });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription plans',
    });
  }
});

/**
 * @route GET /api/subscriptions/current
 * @desc Get current user's subscription
 * @access Private
 */
router.get('/current', authenticate, async (req, res) => {
  try {
    const subscription = await subscriptionService.getUserSubscription(req.user._id);
    const planDetails = Subscription.getPlanDetails(subscription.plan);
    
    res.json({
      success: true,
      subscription: {
        ...subscription.toObject(),
        planDetails,
      },
    });
  } catch (error) {
    console.error('Error fetching current subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription',
    });
  }
});

/**
 * @route POST /api/subscriptions/create-order
 * @desc Create payment order for subscription
 * @access Private
 */
router.post('/create-order', authenticate, async (req, res) => {
  try {
    const { planName, billingCycle } = req.body;
    
    if (!planName || !['pro', 'team', 'enterprise'].includes(planName)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan name',
      });
    }
    
    const order = await subscriptionService.createPaymentOrder(
      req.user._id,
      planName,
      billingCycle || 'monthly'
    );
    
    res.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
      },
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error('Error creating payment order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment order',
    });
  }
});

/**
 * @route POST /api/subscriptions/verify-payment
 * @desc Verify payment and activate subscription
 * @access Private
 */
router.post('/verify-payment', authenticate, async (req, res) => {
  try {
    const { orderId, paymentId, signature, planName, billingCycle } = req.body;
    
    // Verify payment signature
    const isValid = subscriptionService.verifyPaymentSignature(orderId, paymentId, signature);
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature',
      });
    }
    
    // Create/update subscription
    const subscription = await subscriptionService.handleSuccessfulPayment(
      req.user._id,
      planName,
      billingCycle,
      { orderId, paymentId }
    );
    
    res.json({
      success: true,
      message: 'Payment verified successfully',
      subscription,
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment',
    });
  }
});

/**
 * @route POST /api/subscriptions/change-plan
 * @desc Change subscription plan
 * @access Private
 */
router.post('/change-plan', authenticate, async (req, res) => {
  try {
    const { newPlan, billingCycle } = req.body;
    
    if (!newPlan || !['free', 'pro', 'team', 'enterprise'].includes(newPlan)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan name',
      });
    }
    
    const subscription = await subscriptionService.changeSubscriptionPlan(
      req.user._id,
      newPlan,
      billingCycle || 'monthly'
    );
    
    res.json({
      success: true,
      message: 'Subscription plan changed successfully',
      subscription,
    });
  } catch (error) {
    console.error('Error changing subscription plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change subscription plan',
    });
  }
});

/**
 * @route POST /api/subscriptions/cancel
 * @desc Cancel subscription
 * @access Private
 */
router.post('/cancel', authenticate, async (req, res) => {
  try {
    const subscription = await subscriptionService.cancelSubscription(req.user._id);
    
    res.json({
      success: true,
      message: 'Subscription cancelled successfully',
      subscription,
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel subscription',
    });
  }
});

/**
 * @route GET /api/subscriptions/usage
 * @desc Get current usage statistics
 * @access Private
 */
router.get('/usage', authenticate, async (req, res) => {
  try {
    const subscription = await subscriptionService.getUserSubscription(req.user._id);
    
    const usageDetails = {
      resumesUploaded: subscription.checkUsageLimit('resumesUploaded'),
      jobMatchesViewed: subscription.checkUsageLimit('jobMatchesViewed'),
      skillVerifications: subscription.checkUsageLimit('skillVerifications'),
      aiAnalysisRuns: subscription.checkUsageLimit('aiAnalysisRuns'),
    };
    
    res.json({
      success: true,
      usage: usageDetails,
    });
  } catch (error) {
    console.error('Error fetching usage:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch usage statistics',
    });
  }
});

/**
 * @route POST /api/subscriptions/webhook
 * @desc Handle Razorpay webhooks
 * @access Public (but verified)
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const event = req.body;
    
    await subscriptionService.handleWebhook(event, signature);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({
      success: false,
      message: 'Webhook processing failed',
    });
  }
});

/**
 * @route GET /api/subscriptions/analytics
 * @desc Get subscription analytics (Admin only)
 * @access Private (Admin)
 */
router.get('/analytics', authenticate, async (req, res) => {
  try {
    // Admin check
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.',
      });
    }
    
    const analytics = await subscriptionService.getSubscriptionAnalytics();
    
    res.json({
      success: true,
      analytics,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
    });
  }
});

export default router;
