import React, { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Crown, Users, Building2 } from 'lucide-react'
import axiosInstance from '../services/api'

const PricingPage = () => {
  const [plans, setPlans] = useState([]);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    fetchPlansAndSubscription();
  }, []);

  const fetchPlansAndSubscription = async () => {
    try {
      const [plansRes, subRes] = await Promise.all([
        axiosInstance.get('/subscriptions/plans'),
        axiosInstance.get('/subscriptions/current'),
      ]);
      
      setPlans(plansRes.data.plans);
      setCurrentSubscription(subRes.data.subscription);
    } catch (error) {
      console.error('Error fetching pricing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleSubscribe = async (planId) => {
    if (planId === 'free') {
      await handleFreePlan();
      return;
    }

    setProcessingPayment(true);
    
    try {
      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        alert('Failed to load payment gateway. Please try again.');
        return;
      }

      // Create payment order
      const orderRes = await axiosInstance.post('/subscriptions/create-order', {
        planName: planId,
        billingCycle,
      });

      const { order, razorpayKeyId } = orderRes.data;

      // Configure Razorpay payment
      const options = {
        key: razorpayKeyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Resume Career Platform',
        description: `${planId.toUpperCase()} Plan - ${billingCycle}`,
        order_id: order.id,
        handler: async (response) => {
          try {
            // Verify payment on backend
            await axiosInstance.post('/subscriptions/verify-payment', {
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              planName: planId,
              billingCycle,
            });

            alert('Payment successful! Your subscription is now active.');
            await fetchPlansAndSubscription();
          } catch (error) {
            console.error('Payment verification failed:', error);
            alert('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: currentSubscription?.userId?.name || '',
          email: currentSubscription?.userId?.email || '',
        },
        theme: {
          color: '#1f7aec',
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Error initiating payment:', error);
      alert('Failed to initiate payment. Please try again.');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleFreePlan = async () => {
    try {
      await axiosInstance.post('/subscriptions/change-plan', {
        newPlan: 'free',
        billingCycle: 'monthly',
      });
      alert('Switched to Free plan successfully!');
      await fetchPlansAndSubscription();
    } catch (error) {
      console.error('Error switching to free plan:', error);
      alert('Failed to switch plan. Please try again.');
    }
  };

  const getPlanIcon = (planId) => {
    switch (planId) {
      case 'free':
        return null;
      case 'pro':
        return <Crown className="w-6 h-6 text-[var(--rg-accent)]" />;
      case 'team':
        return <Users className="w-6 h-6 text-[var(--rg-accent)]" />;
      case 'enterprise':
        return <Building2 className="w-6 h-6 text-[var(--rg-accent)]" />;
      default:
        return null;
    }
  };

  const formatPrice = (price) => {
    if (price === 0) return 'Free';
    return `₹${price.toLocaleString('en-IN')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--rg-accent)]"></div>
      </div>
    );
  }

  return (
    <div className="page-shell min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-[var(--rg-text-primary)] mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Unlock your career potential with our powerful tools
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center space-x-4">
            <span className={`text-sm ${billingCycle === 'monthly' ? 'font-semibold' : 'text-gray-500'}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-indigo-600"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm ${billingCycle === 'yearly' ? 'font-semibold' : 'text-gray-500'}`}>
              Yearly
              <span className="ml-1 text-green-600 text-xs">(Save 17%)</span>
            </span>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {plans.map((plan) => {
            const isCurrentPlan = currentSubscription?.plan === plan.id;
            const price = billingCycle === 'yearly' ? plan.yearlyPrice : plan.price;

            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl shadow-lg overflow-hidden ${
                  plan.id === 'pro' ? 'ring-2 ring-indigo-600' : ''
                }`}
              >
                {/* Popular Badge */}
                {plan.id === 'pro' && (
                  <div className="absolute top-0 right-0 bg-indigo-600 text-white px-3 py-1 text-xs font-semibold rounded-bl-lg">
                    POPULAR
                  </div>
                )}

                <div className="p-6">
                  {/* Plan Header */}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                    {getPlanIcon(plan.id)}
                  </div>

                  {/* Price */}
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-gray-900">
                      {formatPrice(price)}
                    </span>
                    {price > 0 && (
                      <span className="text-gray-500">
                        /{billingCycle === 'yearly' ? 'year' : 'month'}
                      </span>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  {isCurrentPlan ? (
                    <button
                      disabled
                      className="w-full py-3 px-4 bg-gray-300 text-gray-600 rounded-lg font-semibold cursor-not-allowed"
                    >
                      Current Plan
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={processingPayment}
                      className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                        plan.id === 'pro'
                          ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                          : 'bg-gray-900 text-white hover:bg-gray-800'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {processingPayment ? 'Processing...' : plan.id === 'free' ? 'Downgrade' : 'Upgrade Now'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Current Subscription Info */}
        {currentSubscription && (
          <div className="mt-12 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Current Subscription
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Plan</p>
                <p className="text-lg font-semibold text-gray-900">
                  {currentSubscription.plan.toUpperCase()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className="text-lg font-semibold text-green-600">
                  {currentSubscription.status.toUpperCase()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Next Billing</p>
                <p className="text-lg font-semibold text-gray-900">
                  {currentSubscription.nextBillingDate
                    ? new Date(currentSubscription.nextBillingDate).toLocaleDateString()
                    : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* FAQ Section */}
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Frequently Asked Questions
          </h3>
          <div className="max-w-3xl mx-auto space-y-4 text-left">
            <div className="bg-white rounded-lg shadow p-6">
              <h4 className="font-semibold text-gray-900 mb-2">
                Can I change my plan anytime?
              </h4>
              <p className="text-gray-600">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h4 className="font-semibold text-gray-900 mb-2">
                What payment methods do you accept?
              </h4>
              <p className="text-gray-600">
                We accept all major credit/debit cards, UPI, net banking, and wallets through Razorpay.
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h4 className="font-semibold text-gray-900 mb-2">
                Is there a refund policy?
              </h4>
              <p className="text-gray-600">
                Yes, we offer a 7-day money-back guarantee for all paid plans.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
