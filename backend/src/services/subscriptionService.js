/**
 * Subscription Service
 * Handles subscription management, billing, and payment gateway integration
 */

import Subscription from '../models/Subscription.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';

// Initialize Razorpay only if credentials are provided
let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
  console.log('Razorpay payment gateway initialized');
} else {
  console.warn('Razorpay credentials not found - payment features will be disabled');
}

/**
 * Create a new subscription
 */
export const createSubscription = async (userId, planName, billingCycle = 'monthly', organizationId = null) => {
  try {
    if (!razorpay) {
      throw new Error('Payment gateway not configured. Please contact support.');
    }
    
    const planDetails = Subscription.getPlanDetails(planName);
    const amount = billingCycle === 'yearly' ? planDetails.yearlyPrice : planDetails.price;
    
    // Create subscription in database
    const subscription = new Subscription({
      userId,
      organizationId,
      plan: planName,
      billingCycle,
      amount,
      currency: 'INR',
      limits: planDetails.limits,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + (billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000),
    });
    
    // For paid plans, create Razorpay subscription
    if (amount > 0) {
      const razorpaySubscription = await razorpay.subscriptions.create({
        plan_id: process.env[`RAZORPAY_PLAN_${planName.toUpperCase()}_${billingCycle.toUpperCase()}`],
        customer_notify: 1,
        total_count: billingCycle === 'yearly' ? 1 : 12,
        notes: {
          userId: userId.toString(),
          planName,
        },
      });
      
      subscription.subscriptionId = razorpaySubscription.id;
      subscription.status = 'active';
    }
    
    await subscription.save();
    return subscription;
  } catch (error) {
    console.error('Error creating subscription:', error);
    throw error;
  }
};

/**
 * Get user's current subscription
 */
export const getUserSubscription = async (userId) => {
  try {
    let subscription = await Subscription.findOne({ 
      userId, 
      status: { $in: ['active', 'trialing'] } 
    });
    
    // Create free subscription if none exists
    if (!subscription) {
      const planDetails = Subscription.getPlanDetails('free');
      subscription = new Subscription({
        userId,
        plan: 'free',
        status: 'active',
        amount: 0,
        limits: planDetails.limits,
      });
      await subscription.save();
    }
    
    return subscription;
  } catch (error) {
    console.error('Error getting user subscription:', error);
    throw error;
  }
};

/**
 * Upgrade/downgrade subscription
 */
export const changeSubscriptionPlan = async (userId, newPlan, billingCycle = 'monthly') => {
  try {
    const currentSubscription = await getUserSubscription(userId);
    const newPlanDetails = Subscription.getPlanDetails(newPlan);
    const newAmount = billingCycle === 'yearly' ? newPlanDetails.yearlyPrice : newPlanDetails.price;
    
    // Cancel old Razorpay subscription if exists
    if (currentSubscription.subscriptionId) {
      await razorpay.subscriptions.cancel(currentSubscription.subscriptionId);
    }
    
    // Update subscription
    currentSubscription.plan = newPlan;
    currentSubscription.billingCycle = billingCycle;
    currentSubscription.amount = newAmount;
    currentSubscription.limits = newPlanDetails.limits;
    
    // Create new Razorpay subscription for paid plans
    if (newAmount > 0) {
      const razorpaySubscription = await razorpay.subscriptions.create({
        plan_id: process.env[`RAZORPAY_PLAN_${newPlan.toUpperCase()}_${billingCycle.toUpperCase()}`],
        customer_notify: 1,
        total_count: billingCycle === 'yearly' ? 1 : 12,
        notes: {
          userId: userId.toString(),
          planName: newPlan,
        },
      });
      
      currentSubscription.subscriptionId = razorpaySubscription.id;
    }
    
    await currentSubscription.save();
    return currentSubscription;
  } catch (error) {
    console.error('Error changing subscription plan:', error);
    throw error;
  }
};

/**
 * Cancel subscription
 */
export const cancelSubscription = async (userId) => {
  try {
    const subscription = await getUserSubscription(userId);
    
    if (subscription.subscriptionId) {
      await razorpay.subscriptions.cancel(subscription.subscriptionId);
    }
    
    subscription.status = 'cancelled';
    subscription.cancelledAt = new Date();
    await subscription.save();
    
    return subscription;
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    throw error;
  }
};

/**
 * Create Razorpay order for one-time payment
 */
export const createPaymentOrder = async (userId, planName, billingCycle = 'monthly') => {
  try {
    const planDetails = Subscription.getPlanDetails(planName);
    const amount = billingCycle === 'yearly' ? planDetails.yearlyPrice : planDetails.price;
    
    const order = await razorpay.orders.create({
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      receipt: `order_${userId}_${Date.now()}`,
      notes: {
        userId: userId.toString(),
        planName,
        billingCycle,
      },
    });
    
    return order;
  } catch (error) {
    console.error('Error creating payment order:', error);
    throw error;
  }
};

/**
 * Verify Razorpay payment signature
 */
export const verifyPaymentSignature = (orderId, paymentId, signature) => {
  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  
  return generatedSignature === signature;
};

/**
 * Handle successful payment
 */
export const handleSuccessfulPayment = async (userId, planName, billingCycle, paymentDetails) => {
  try {
    // Create or update subscription
    const subscription = await createSubscription(userId, planName, billingCycle);
    
    // Store payment details in metadata
    subscription.metadata = new Map([
      ['lastPaymentId', paymentDetails.paymentId],
      ['lastPaymentDate', new Date().toISOString()],
      ['lastOrderId', paymentDetails.orderId],
    ]);
    
    await subscription.save();
    return subscription;
  } catch (error) {
    console.error('Error handling successful payment:', error);
    throw error;
  }
};

/**
 * Check and enforce usage limits
 */
export const checkUsageLimit = async (userId, featureKey) => {
  try {
    const subscription = await getUserSubscription(userId);
    return subscription.checkUsageLimit(featureKey);
  } catch (error) {
    console.error('Error checking usage limit:', error);
    throw error;
  }
};

/**
 * Track feature usage
 */
export const trackUsage = async (userId, featureKey) => {
  try {
    const subscription = await getUserSubscription(userId);
    await subscription.incrementUsage(featureKey);
    return subscription;
  } catch (error) {
    console.error('Error tracking usage:', error);
    throw error;
  }
};

/**
 * Get subscription analytics
 */
export const getSubscriptionAnalytics = async (organizationId = null) => {
  try {
    const query = organizationId ? { organizationId } : {};
    
    const analytics = await Subscription.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$plan',
          count: { $sum: 1 },
          revenue: { $sum: '$amount' },
          avgUsage: {
            $avg: {
              $add: [
                '$usage.resumesUploaded',
                '$usage.jobMatchesViewed',
                '$usage.skillVerifications',
              ],
            },
          },
        },
      },
      {
        $project: {
          plan: '$_id',
          count: 1,
          revenue: 1,
          avgUsage: { $round: ['$avgUsage', 2] },
        },
      },
    ]);
    
    return analytics;
  } catch (error) {
    console.error('Error getting subscription analytics:', error);
    throw error;
  }
};

/**
 * Webhook handler for Razorpay events
 */
export const handleWebhook = async (event, signature) => {
  try {
    // Verify webhook signature
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(event))
      .digest('hex');
    
    if (signature !== expectedSignature) {
      throw new Error('Invalid webhook signature');
    }
    
    // Handle different event types
    switch (event.event) {
      case 'subscription.activated':
        await handleSubscriptionActivated(event.payload.subscription.entity);
        break;
      case 'subscription.charged':
        await handleSubscriptionCharged(event.payload.payment.entity);
        break;
      case 'subscription.cancelled':
        await handleSubscriptionCancelled(event.payload.subscription.entity);
        break;
      case 'subscription.paused':
        await handleSubscriptionPaused(event.payload.subscription.entity);
        break;
      case 'payment.failed':
        await handlePaymentFailed(event.payload.payment.entity);
        break;
      default:
        console.log(`Unhandled webhook event: ${event.event}`);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error handling webhook:', error);
    throw error;
  }
};

// Webhook event handlers
const handleSubscriptionActivated = async (razorpaySubscription) => {
  const subscription = await Subscription.findOne({ subscriptionId: razorpaySubscription.id });
  if (subscription) {
    subscription.status = 'active';
    await subscription.save();
  }
};

const handleSubscriptionCharged = async (payment) => {
  const subscription = await Subscription.findOne({ subscriptionId: payment.subscription_id });
  if (subscription) {
    subscription.nextBillingDate = new Date(payment.created_at * 1000 + 30 * 24 * 60 * 60 * 1000);
    subscription.lastInvoiceId = payment.invoice_id;
    await subscription.save();
  }
};

const handleSubscriptionCancelled = async (razorpaySubscription) => {
  const subscription = await Subscription.findOne({ subscriptionId: razorpaySubscription.id });
  if (subscription) {
    subscription.status = 'cancelled';
    subscription.cancelledAt = new Date();
    await subscription.save();
  }
};

const handleSubscriptionPaused = async (razorpaySubscription) => {
  const subscription = await Subscription.findOne({ subscriptionId: razorpaySubscription.id });
  if (subscription) {
    subscription.status = 'paused';
    await subscription.save();
  }
};

const handlePaymentFailed = async (payment) => {
  const subscription = await Subscription.findOne({ subscriptionId: payment.subscription_id });
  if (subscription) {
    subscription.status = 'past_due';
    await subscription.save();
  }
};

export default {
  createSubscription,
  getUserSubscription,
  changeSubscriptionPlan,
  cancelSubscription,
  createPaymentOrder,
  verifyPaymentSignature,
  handleSuccessfulPayment,
  checkUsageLimit,
  trackUsage,
  getSubscriptionAnalytics,
  handleWebhook,
};
