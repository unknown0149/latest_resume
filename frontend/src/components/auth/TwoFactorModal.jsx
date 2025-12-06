import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import OTPInput from './OTPInput';
import LoadingSpinner from '../ui/LoadingSpinner';

/**
 * 2FA Verification Modal
 * Displays OTP input for two-factor authentication
 */
const TwoFactorModal = ({ isOpen, onClose, email, onVerify, loading = false }) => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setOtp('');
      setError('');
    }
  }, [isOpen]);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }

    setError('');
    await onVerify(otp);
  };

  // Auto-submit when 6 digits entered
  useEffect(() => {
    if (otp.length === 6 && !loading) {
      handleVerify();
    }
  }, [otp]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Two-Factor Authentication">
      <div className="space-y-6">
        {/* Info */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <p className="text-gray-600 mb-2">
            We've sent a 6-digit code to
          </p>
          <p className="text-purple-600 font-semibold">
            {email}
          </p>
        </div>

        {/* OTP Input */}
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

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleVerify}
            disabled={loading || otp.length !== 6}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <LoadingSpinner size="small" />
                <span className="ml-2">Verifying...</span>
              </span>
            ) : (
              'Verify'
            )}
          </button>
        </div>

        {/* Help Text */}
        <p className="text-xs text-center text-gray-500">
          💡 Code expires in 10 minutes
        </p>
      </div>
    </Modal>
  );
};

export default TwoFactorModal;
