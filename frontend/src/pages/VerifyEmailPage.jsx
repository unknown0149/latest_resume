import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import OTPInput from '../components/auth/OTPInput';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { authService } from '../services/auth.service';
import { toast } from 'react-hot-toast';

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get('email');

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  // Redirect if no email
  useEffect(() => {
    if (!email) {
      navigate('/register');
    }
  }, [email, navigate]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleVerify = async (e) => {
    e?.preventDefault();
    
    if (otp.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authService.verifyEmail(email, otp);
      
      if (response.token) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('refreshToken', response.refreshToken);
      }

      toast.success('Email verified successfully! 🎉');
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Verification failed');
      setOtp(''); // Clear OTP on error
      toast.error(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;

    setResending(true);
    setError('');

    try {
      await authService.resendVerification(email);
      toast.success('Verification code sent!');
      setCooldown(60); // 60 second cooldown
    } catch (err) {
      setError(err.message || 'Failed to resend code');
      toast.error(err.message || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  // Auto-submit when 6 digits entered
  useEffect(() => {
    if (otp.length === 6 && !loading) {
      handleVerify();
    }
  }, [otp]);

  return (
    <div className="page-shell min-h-screen flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="card-base rounded-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-[var(--rg-bg-muted)] rounded-full flex items-center justify-center mb-4 border border-[var(--rg-border)]">
              <svg className="w-8 h-8 text-[var(--rg-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-[var(--rg-text-primary)] mb-2">
              Verify Your Email
            </h1>
            <p className="text-[var(--rg-text-secondary)]">
              We've sent a 6-digit code to
            </p>
            <p className="text-[var(--rg-accent)] font-semibold mt-1">
              {email}
            </p>
          </div>

          {/* OTP Input */}
          <form onSubmit={handleVerify} className="space-y-6">
            <div>
              <OTPInput
                value={otp}
                onChange={setOtp}
                disabled={loading}
                error={!!error}
              />
              {error && (
                <p className="mt-2 text-sm text-red-600 text-center">
                  {error}
                </p>
              )}
            </div>

            {/* Verify Button */}
            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full py-3 px-4 btn-primary rounded-lg text-white"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <LoadingSpinner size="small" />
                  <span className="ml-2">Verifying...</span>
                </span>
              ) : (
                'Verify Email'
              )}
            </button>
          </form>

          {/* Resend Section */}
          <div className="mt-6 text-center">
            <p className="text-sm text-[var(--rg-text-secondary)] mb-2">
              Didn't receive the code?
            </p>
            <button
              onClick={handleResend}
              disabled={resending || cooldown > 0}
              className="text-[var(--rg-accent)] font-semibold hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resending ? (
                'Sending...'
              ) : cooldown > 0 ? (
                `Resend in ${cooldown}s`
              ) : (
                'Resend Code'
              )}
            </button>
          </div>

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
          <p>💡 Tip: Code expires in 10 minutes</p>
          <p className="mt-1">Check your spam folder if you don't see it</p>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
