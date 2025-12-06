/**
 * Subscription Model
 * Handles user subscriptions, billing, and plan management
 */

import mongoose from 'mongoose';

const LIMIT_KEY_MAP = {
  resumesUploaded: 'resumesPerMonth',
  jobMatchesViewed: 'jobMatchesPerMonth',
  skillVerifications: 'skillVerifications',
  aiAnalysisRuns: 'aiAnalysisRuns'
};

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    index: true,
  },
  plan: {
    type: String,
    enum: ['free', 'pro', 'team', 'enterprise'],
    default: 'free',
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'expired', 'past_due', 'trialing'],
    default: 'active',
    required: true,
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'yearly'],
    default: 'monthly',
  },
  amount: {
    type: Number,
    required: true,
    default: 0,
  },
  currency: {
    type: String,
    default: 'INR',
  },
  // Payment gateway details
  paymentGateway: {
    type: String,
    enum: ['razorpay', 'stripe'],
    default: 'razorpay',
  },
  subscriptionId: String, // Gateway subscription ID
  customerId: String, // Gateway customer ID
  
  // Billing dates
  startDate: {
    type: Date,
    default: Date.now,
  },
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
  trialStart: Date,
  trialEnd: Date,
  cancelledAt: Date,
  
  // Usage tracking
  usage: {
    resumesUploaded: { type: Number, default: 0 },
    jobMatchesViewed: { type: Number, default: 0 },
    skillVerifications: { type: Number, default: 0 },
    aiAnalysisRuns: { type: Number, default: 0 },
  },
  
  // Limits based on plan
  limits: {
    resumesPerMonth: { type: Number, default: 1 },
    jobMatchesPerMonth: { type: Number, default: 5 },
    skillVerifications: { type: Number, default: 2 },
    aiAnalysisRuns: { type: Number, default: 3 },
    teamMembers: { type: Number, default: 1 },
  },
  
  // Invoice details
  lastInvoiceId: String,
  nextBillingDate: Date,
  
  // Metadata
  metadata: {
    type: Map,
    of: String,
  },
}, {
  timestamps: true,
});

// Indexes
subscriptionSchema.index({ userId: 1, status: 1 });
subscriptionSchema.index({ organizationId: 1, status: 1 });
subscriptionSchema.index({ subscriptionId: 1 });

// Check if usage limit exceeded
subscriptionSchema.methods.checkUsageLimit = function(featureKey) {
  const usage = this.usage?.[featureKey] || 0;
  const limitKey = LIMIT_KEY_MAP[featureKey] || featureKey;
  const rawLimit = this.limits?.[limitKey];

  if (this.plan === 'enterprise' || rawLimit === Infinity) {
    return { allowed: true, remaining: Infinity, usage, limit: Infinity };
  }

  const limit = Number.isFinite(rawLimit) ? rawLimit : Infinity;

  if (!Number.isFinite(limit)) {
    return { allowed: true, remaining: Infinity, usage, limit: Infinity };
  }
  
  return {
    allowed: usage < limit,
    remaining: Math.max(0, limit - usage),
    usage,
    limit,
  };
};

// Increment usage
subscriptionSchema.methods.incrementUsage = async function(featureKey) {
  if (!this.usage[featureKey]) {
    this.usage[featureKey] = 0;
  }
  this.usage[featureKey] += 1;
  await this.save();
};

// Reset monthly usage
subscriptionSchema.methods.resetMonthlyUsage = async function() {
  this.usage = {
    resumesUploaded: 0,
    jobMatchesViewed: 0,
    skillVerifications: 0,
    aiAnalysisRuns: 0,
  };
  await this.save();
};

// Check if subscription is active
subscriptionSchema.methods.isActive = function() {
  return this.status === 'active' || this.status === 'trialing';
};

// Get plan details
subscriptionSchema.statics.getPlanDetails = function(planName) {
  const plans = {
    free: {
      name: 'Free',
      price: 0,
      limits: {
        resumesPerMonth: 1,
        jobMatchesPerMonth: 5,
        skillVerifications: 2,
        aiAnalysisRuns: 3,
        teamMembers: 1,
      },
      features: [
        '1 resume upload per month',
        '5 job matches',
        '2 skill verifications',
        'Basic AI analysis',
        'Email support',
      ],
    },
    pro: {
      name: 'Pro',
      price: 499, // INR per month
      yearlyPrice: 4990, // INR per year (2 months free)
      limits: {
        resumesPerMonth: 10,
        jobMatchesPerMonth: 100,
        skillVerifications: 20,
        aiAnalysisRuns: 50,
        teamMembers: 1,
      },
      features: [
        'Unlimited resume uploads',
        'Unlimited job matches',
        'Unlimited skill verifications',
        'Advanced AI recommendations',
        'Learning roadmap',
        'Priority email support',
        'Resume builder',
        'Cover letter generator',
      ],
    },
    team: {
      name: 'Team',
      price: 1999, // INR per month
      yearlyPrice: 19990,
      limits: {
        resumesPerMonth: 100,
        jobMatchesPerMonth: 1000,
        skillVerifications: 200,
        aiAnalysisRuns: 500,
        teamMembers: 10,
      },
      features: [
        'Everything in Pro',
        'Up to 10 team members',
        'Team analytics',
        'Shared workspace',
        'Custom branding',
        'Priority support',
        'Dedicated account manager',
      ],
    },
    enterprise: {
      name: 'Enterprise',
      price: 9999, // INR per month (custom pricing)
      yearlyPrice: 99990,
      limits: {
        resumesPerMonth: Infinity,
        jobMatchesPerMonth: Infinity,
        skillVerifications: Infinity,
        aiAnalysisRuns: Infinity,
        teamMembers: Infinity,
      },
      features: [
        'Everything in Team',
        'Unlimited team members',
        'Custom integrations',
        'SSO (SAML/OAuth)',
        'Dedicated infrastructure',
        'SLA guarantee (99.9% uptime)',
        '24/7 phone support',
        'Custom contracts',
        'On-premise deployment option',
      ],
    },
  };
  
  return plans[planName] || plans.free;
};

const Subscription = mongoose.model('Subscription', subscriptionSchema);

export default Subscription;
