import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import OTPInput from '../components/auth/OTPInput';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { authService } from '../services/auth.service';
import { toast } from 'react-hot-toast';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get('email');

  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Redirect if no email
  useEffect(() => {
    if (!email) {
      navigate('/forgot-password');
    }
  }, [email, navigate]);

  // Calculate password strength
  useEffect(() => {
    if (!newPassword) {
      setPasswordStrength(0);
      return;
    }

    let strength = 0;
    if (newPassword.length >= 8) strength += 25;
    if (newPassword.length >= 12) strength += 15;
    if (/[a-z]/.test(newPassword)) strength += 15;
    if (/[A-Z]/.test(newPassword)) strength += 15;
    if (/[0-9]/.test(newPassword)) strength += 15;
    if (/[^a-zA-Z0-9]/.test(newPassword)) strength += 15;

    setPasswordStrength(Math.min(strength, 100));
  }, [newPassword]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (otp.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }

    if (!newPassword) {
      setError('Please enter a new password');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await authService.resetPassword(email, otp, newPassword);
      toast.success('Password reset successful! 🎉');
      
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err) {
      setError(err.message || 'Password reset failed');
      toast.error(err.message || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  const getStrengthColor = () => {
    if (passwordStrength < 40) return 'bg-red-500';
    if (passwordStrength < 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthText = () => {
    if (passwordStrength < 40) return 'Weak';
    if (passwordStrength < 70) return 'Good';
    return 'Strong';
  };

  return (
    <div className="page-shell min-h-screen flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="card-base rounded-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-[var(--rg-bg-muted)] rounded-full flex items-center justify-center mb-4 border border-[var(--rg-border)]">
              <svg className="w-8 h-8 text-[var(--rg-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-[var(--rg-text-primary)] mb-2">
              Reset Password
            </h1>
            <p className="text-[var(--rg-text-secondary)]">
              Enter the code sent to
            </p>
            <p className="text-[var(--rg-accent)] font-semibold mt-1">
              {email}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* OTP Input */}
            <div>
              <label className="block text-sm font-medium text-[var(--rg-text-primary)] mb-3">
                Verification Code
              </label>
              <OTPInput
                value={otp}
                onChange={setOtp}
                disabled={loading}
                error={!!error && error.includes('code')}
              />
            </div>

            {/* New Password */}
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-[var(--rg-text-primary)] mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  id="newPassword"
                  type={showPasswords ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                  placeholder="Enter new password"
                  className="w-full px-4 py-3 border border-[var(--rg-border)] rounded-lg bg-[var(--rg-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--rg-accent)] focus:border-transparent disabled:bg-[var(--rg-bg-muted)]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--rg-text-secondary)] hover:text-[var(--rg-text-primary)]"
                >
                  {showPasswords ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {newPassword && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[var(--rg-text-secondary)]">Password Strength:</span>
                    <span className={`text-xs font-semibold ${passwordStrength < 40 ? 'text-red-600' : passwordStrength < 70 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {getStrengthText()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-300 ${getStrengthColor()}`}
                      style={{ width: `${passwordStrength}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-[var(--rg-text-primary)] mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type={showPasswords ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                placeholder="Confirm new password"
                className="w-full px-4 py-3 border border-[var(--rg-border)] rounded-lg bg-[var(--rg-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--rg-accent)] focus:border-transparent disabled:bg-[var(--rg-bg-muted)]"
                required
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="mt-1 text-sm text-red-600">Passwords do not match</p>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || otp.length !== 6 || !newPassword || newPassword !== confirmPassword}
              className="w-full py-3 px-4 btn-primary rounded-lg text-white"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <LoadingSpinner size="small" />
                  <span className="ml-2">Resetting Password...</span>
                </span>
              ) : (
                'Reset Password'
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
          <p>💡 Tip: Use a strong password with letters, numbers, and symbols</p>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
