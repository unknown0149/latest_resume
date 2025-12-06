import React, { useRef, useState, useEffect } from 'react';

/**
 * OTP Input Component
 * Handles 6-digit OTP input with auto-focus and paste support
 */
const OTPInput = ({ length = 6, value = '', onChange, disabled = false, error = false }) => {
  const [otp, setOtp] = useState(Array(length).fill(''));
  const inputRefs = useRef([]);

  // Initialize refs
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  // Update internal state when value prop changes
  useEffect(() => {
    if (value) {
      const otpArray = value.split('').slice(0, length);
      setOtp([...otpArray, ...Array(length - otpArray.length).fill('')]);
    }
  }, [value, length]);

  // Handle input change
  const handleChange = (index, e) => {
    const val = e.target.value;
    
    // Only allow numbers
    if (!/^\d*$/.test(val)) return;

    const newOtp = [...otp];
    newOtp[index] = val.slice(-1); // Take only last character
    setOtp(newOtp);

    // Call onChange with complete OTP
    onChange(newOtp.join(''));

    // Auto-focus next input
    if (val && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle keydown
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        // Move to previous input if current is empty
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle paste
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').replace(/\D/g, '');
    const pastedArray = pastedData.split('').slice(0, length);
    const newOtp = [...pastedArray, ...Array(length - pastedArray.length).fill('')];
    setOtp(newOtp);
    onChange(newOtp.join(''));

    // Focus last filled input or last input
    const focusIndex = Math.min(pastedArray.length, length - 1);
    inputRefs.current[focusIndex]?.focus();
  };

  // Handle focus
  const handleFocus = (index) => {
    inputRefs.current[index]?.select();
  };

  return (
    <div className="otp-input-container">
      <div className="otp-inputs flex justify-center gap-2 sm:gap-3">
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            onFocus={() => handleFocus(index)}
            disabled={disabled}
            className={`
              w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold
              border-2 rounded-lg transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-offset-2
              ${error 
                ? 'border-red-500 focus:ring-red-500' 
                : 'border-gray-300 focus:border-purple-500 focus:ring-purple-500'
              }
              ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
              hover:border-purple-400
            `}
            aria-label={`Digit ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default OTPInput;
