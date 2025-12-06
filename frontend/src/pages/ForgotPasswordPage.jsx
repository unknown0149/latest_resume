import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      toast.error('Please enter your email');
      return;
    }

    setLoading(true);

    try {
      await authService.forgotPassword(email);
      setCodeSent(true);
      toast.success('Reset code sent to your email!');
      
      // Navigate to reset password page with email
      setTimeout(() => {
        navigate(`/reset-password?email=${encodeURIComponent(email)}`);
      }, 1500);
    } catch (err) {
      toast.error(err.message || 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell min-h-screen flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="card-base p-8 rounded-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-[var(--rg-bg-muted)] rounded-full flex items-center justify-center mb-4 border border-[var(--rg-border)]">
              <svg className="w-8 h-8 text-[var(--rg-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-[var(--rg-text-primary)] mb-2">
              Forgot Password?
            </h1>
            <p className="text-[var(--rg-text-secondary)]">
              No worries! Enter your email and we'll send you a reset code
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[var(--rg-text-primary)] mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading || codeSent}
                placeholder="your.email@example.com"
                className="w-full px-4 py-3 border border-[var(--rg-border)] rounded-lg bg-[var(--rg-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--rg-accent)] focus:border-transparent disabled:bg-[var(--rg-bg-muted)] disabled:cursor-not-allowed"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || codeSent}
              className="w-full py-3 px-4 btn-primary rounded-lg text-white"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <LoadingSpinner size="small" />
                  <span className="ml-2">Sending Code...</span>
                </span>
              ) : (
                'Send Reset Code'
              )}
            </button>
          </form>

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/login')}
              className="text-sm text-[var(--rg-text-secondary)] hover:text-[var(--rg-text-primary)]"
            >
              ← Back to Login
            </button>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center text-sm text-[var(--rg-text-secondary)]">
          <p>💡 Remember your password?</p>
          <button
            onClick={() => navigate('/login')}
            className="text-[var(--rg-accent)] font-semibold hover:brightness-110 mt-1"
          >
            Sign in here
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
