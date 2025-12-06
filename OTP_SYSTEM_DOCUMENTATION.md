# OTP Verification System - Complete Implementation

## 📋 Overview

Complete OTP (One-Time Password) verification system integrated into the Resume Analyzer application, supporting:

- ✅ **Email Verification** on registration
- ✅ **Two-Factor Authentication (2FA)** for login
- ✅ **Password Reset** with OTP
- ✅ **Resend OTP** functionality
- ✅ **Rate Limiting** (60-second cooldown)
- ✅ **Auto-expire** (10 minutes)
- ✅ **Attempt Limiting** (3 attempts max)

---

## 🏗️ Architecture

### Backend Components

#### 1. **OTP Service** (`backend/src/services/otpService.js`)
- Generates 6-digit random OTPs
- Stores OTPs in memory (use Redis for production)
- Handles email delivery via `emailService`
- Validates OTPs with attempt tracking
- Auto-cleanup expired OTPs

**Key Functions:**
```javascript
sendEmailVerificationOTP(email, userName)
verifyEmailOTP(email, otp)
send2FAOTP(email, userName)
verify2FAOTP(email, otp)
sendPasswordResetOTP(email, userName)
verifyPasswordResetOTP(email, otp)
getOTPStats() // For monitoring
```

#### 2. **Auth Routes** (`backend/src/routes/auth.routes.js`)
New endpoints added:

```
POST /api/auth/register          # Creates user, sends verification OTP
POST /api/auth/verify-email      # Verifies OTP, returns token
POST /api/auth/resend-verification # Resends verification OTP
POST /api/auth/login             # Supports optional 2FA OTP
POST /api/auth/forgot-password   # Sends password reset OTP
POST /api/auth/reset-password    # Resets password with OTP
POST /api/auth/enable-2fa        # Enables 2FA (requires auth)
POST /api/auth/disable-2fa       # Disables 2FA (requires auth)
```

#### 3. **User Model** (`backend/src/models/User.js`)
Updated schema:
```javascript
isEmailVerified: Boolean  // Tracks email verification status
preferences: {
  twoFactorEnabled: Boolean  // 2FA toggle
}
```

### Frontend Components

#### 1. **OTPInput Component** (`frontend/src/components/auth/OTPInput.jsx`)
Reusable 6-digit OTP input with:
- Auto-focus next input
- Keyboard navigation (arrows, backspace)
- Paste support (entire code)
- Visual feedback (error states)
- Mobile-friendly

#### 2. **Pages**

**VerifyEmailPage** (`frontend/src/pages/VerifyEmailPage.jsx`)
- Displays after registration
- 6-digit OTP input
- Resend button with cooldown
- Auto-submit on 6 digits

**ForgotPasswordPage** (`frontend/src/pages/ForgotPasswordPage.jsx`)
- Email input
- Sends reset OTP
- Redirects to reset page

**ResetPasswordPage** (`frontend/src/pages/ResetPasswordPage.jsx`)
- OTP verification
- New password input
- Password strength indicator
- Confirm password validation

**TwoFactorModal** (`frontend/src/components/auth/TwoFactorModal.jsx`)
- Modal for 2FA verification
- Auto-submit on 6 digits
- Cancel/verify actions

#### 3. **Auth Service** (`frontend/src/services/auth.service.js`)
API wrapper functions:
```javascript
register(name, email, password)
verifyEmail(email, otp)
resendVerification(email)
login(email, password, otp)
forgotPassword(email)
resetPassword(email, otp, newPassword)
enable2FA()
disable2FA()
```

#### 4. **Routes** (`frontend/src/App.jsx`)
New routes added:
```jsx
/verify-email?email=...
/forgot-password
/reset-password?email=...
```

---

## 🔐 Security Features

### OTP Configuration
```javascript
OTP_LENGTH = 6              // 6-digit code
OTP_EXPIRY_MINUTES = 10     // 10-minute expiration
MAX_ATTEMPTS = 3            // 3 verification attempts
RESEND_COOLDOWN_SECONDS = 60 // 60-second cooldown
```

### Email Templates
Professional HTML emails with:
- Branded header (gradient)
- Large OTP display
- Expiration warning
- Security notes
- Mobile-responsive

### Rate Limiting
- **Cooldown Period:** 60 seconds between OTP requests
- **Max Attempts:** 3 failed verification attempts
- **Auto-Cleanup:** Expired OTPs removed every 5 minutes

### Validation
- OTP must be exactly 6 digits
- Email verified before login allowed
- Password strength requirements enforced
- Token refresh on password change

---

## 📝 User Flows

### 1. Registration Flow
```
User registers
  ↓
System creates unverified account
  ↓
Email sent with OTP
  ↓
User redirected to /verify-email
  ↓
User enters OTP
  ↓
System verifies OTP
  ↓
Account marked as verified
  ↓
User logged in with token
```

### 2. Login Flow (with 2FA)
```
User enters credentials
  ↓
System validates password
  ↓
If 2FA enabled → Send OTP
  ↓
User enters OTP
  ↓
System verifies OTP
  ↓
User logged in
```

### 3. Password Reset Flow
```
User clicks "Forgot Password"
  ↓
User enters email
  ↓
System sends reset OTP
  ↓
User redirected to /reset-password
  ↓
User enters OTP + new password
  ↓
System verifies OTP
  ↓
Password updated
  ↓
User redirected to login
```

---

## 🧪 Testing

### Test Script: `backend/test-otp-system.js`

Comprehensive test suite covering:

1. **Registration & Email Verification**
   - Register new user
   - Receive OTP via email
   - Verify email with OTP
   - Get auth token

2. **Normal Login**
   - Login without 2FA
   - Receive token

3. **Enable 2FA**
   - Toggle 2FA setting
   - Verify preference saved

4. **Login with 2FA**
   - Trigger 2FA OTP
   - Verify OTP
   - Complete login

5. **Password Reset**
   - Request reset OTP
   - Verify OTP
   - Change password
   - Login with new password
   - Restore original password

6. **Resend Verification**
   - Test resend cooldown
   - Verify new OTP sent

### Running Tests

```bash
# Start backend server
cd backend
npm run dev

# In another terminal, run test script
node test-otp-system.js
```

**Interactive Test:**
The script will:
1. Automatically call APIs
2. Prompt you to enter OTPs from your email
3. Display color-coded results
4. Show summary at the end

---

## 🚀 Deployment Checklist

### Environment Variables
```env
# Email Configuration (REQUIRED)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password  # Get from Google Account settings

# JWT Configuration
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d

# Node Environment
NODE_ENV=production
```

### Production Recommendations

#### 1. **Use Redis for OTP Storage**
Replace in-memory Map with Redis:
```javascript
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

const storeOTP = async (key, otp, metadata) => {
  await redis.setex(key, OTP_EXPIRY_MINUTES * 60, JSON.stringify({
    otp,
    ...metadata
  }));
};
```

#### 2. **Add Rate Limiting**
Use `express-rate-limit`:
```javascript
import rateLimit from 'express-rate-limit';

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many OTP requests, please try again later'
});

router.post('/resend-verification', otpLimiter, ...);
```

#### 3. **Enable SMS Fallback**
For critical accounts, send OTP via SMS (already integrated with `smsService`):
```javascript
await smsService.sendOTP(user.phone, otp);
```

#### 4. **Add Audit Logging**
Log all OTP events:
```javascript
await AuditLog.create({
  userId: user._id,
  action: 'OTP_SENT',
  resource: 'AUTH',
  details: { purpose: 'email-verification', email }
});
```

#### 5. **Monitor OTP Stats**
Track OTP usage:
```javascript
router.get('/admin/otp-stats', requireAdmin, (req, res) => {
  const stats = otpService.getOTPStats();
  res.json(stats);
});
```

---

## 🔧 Configuration

### OTP Settings
Edit `backend/src/services/otpService.js`:

```javascript
// Change OTP length
const OTP_LENGTH = 8; // 8-digit OTP

// Change expiry time
const OTP_EXPIRY_MINUTES = 15; // 15 minutes

// Change max attempts
const MAX_ATTEMPTS = 5; // 5 attempts

// Change cooldown
const RESEND_COOLDOWN_SECONDS = 120; // 2 minutes
```

### Email Templates
Customize HTML templates in `otpService.js`:

```javascript
await emailService.sendEmail({
  to: email,
  subject: 'Your Custom Subject',
  html: `
    <!-- Your custom HTML here -->
    <div style="font-size: 32px; font-weight: bold; color: #667eea;">
      ${otp}
    </div>
  `
});
```

---

## 📊 Monitoring

### Key Metrics to Track

1. **OTP Delivery Rate**
   - Total OTPs sent
   - Failed deliveries
   - Average delivery time

2. **Verification Success Rate**
   - Successful verifications
   - Failed attempts
   - Expired OTPs

3. **User Behavior**
   - Resend frequency
   - Time to verification
   - Drop-off rates

### Sample Monitoring Code
```javascript
const metrics = {
  otpsSent: 0,
  otpsVerified: 0,
  otpsFailed: 0,
  otpsExpired: 0
};

// Increment on events
metrics.otpsSent++;
metrics.otpsVerified++;
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. **Emails Not Sending**
**Problem:** OTPs not delivered
**Solutions:**
- Check SMTP credentials in `.env`
- Verify Gmail app password (not account password)
- Check spam/junk folder
- Ensure 2FA enabled on Gmail
- Check `emailService` logs

#### 2. **OTP Already Expired**
**Problem:** OTP expires before user enters
**Solutions:**
- Increase `OTP_EXPIRY_MINUTES`
- Check server time sync
- Verify timezone settings

#### 3. **Too Many Attempts**
**Problem:** User locked out after 3 attempts
**Solutions:**
- Request new OTP (resets attempts)
- Increase `MAX_ATTEMPTS`
- Add admin override

#### 4. **Cooldown Too Long**
**Problem:** Users can't resend quickly
**Solutions:**
- Reduce `RESEND_COOLDOWN_SECONDS`
- Add admin bypass
- Show countdown timer

#### 5. **2FA Modal Not Showing**
**Problem:** Frontend doesn't detect 2FA requirement
**Solutions:**
- Check API response: `requires2FA: true`
- Verify `preferences.twoFactorEnabled` in User model
- Check login logic in `useAuth` hook

---

## 📚 API Documentation

### POST /api/auth/register
Register new user with email verification.

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "Test@123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful! Check email for verification code.",
  "requiresVerification": true,
  "email": "john@example.com"
}
```

### POST /api/auth/verify-email
Verify email with OTP.

**Request:**
```json
{
  "email": "john@example.com",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "user": { ... },
  "token": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

### POST /api/auth/resend-verification
Resend verification OTP.

**Request:**
```json
{
  "email": "john@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Verification code sent to your email"
}
```

### POST /api/auth/login
Login with optional 2FA.

**Request (First attempt):**
```json
{
  "email": "john@example.com",
  "password": "Test@123"
}
```

**Response (2FA enabled):**
```json
{
  "success": true,
  "requires2FA": true,
  "message": "Login code sent to your email"
}
```

**Request (With OTP):**
```json
{
  "email": "john@example.com",
  "password": "Test@123",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "user": { ... },
  "token": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

### POST /api/auth/forgot-password
Request password reset OTP.

**Request:**
```json
{
  "email": "john@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Reset code sent to your email"
}
```

### POST /api/auth/reset-password
Reset password with OTP.

**Request:**
```json
{
  "email": "john@example.com",
  "otp": "123456",
  "newPassword": "NewTest@456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successful. Please log in with your new password."
}
```

### POST /api/auth/enable-2fa
Enable two-factor authentication.

**Headers:**
```
Authorization: Bearer eyJhbGc...
```

**Response:**
```json
{
  "success": true,
  "message": "Two-factor authentication enabled"
}
```

### POST /api/auth/disable-2fa
Disable two-factor authentication.

**Headers:**
```
Authorization: Bearer eyJhbGc...
```

**Response:**
```json
{
  "success": true,
  "message": "Two-factor authentication disabled"
}
```

---

## ✅ Features Completed

### Backend
- [x] OTP Service (generation, storage, validation)
- [x] Email templates (verification, 2FA, reset)
- [x] Auth routes (8 new endpoints)
- [x] User model updates (isEmailVerified, twoFactorEnabled)
- [x] Rate limiting (cooldown)
- [x] Attempt limiting (3 attempts)
- [x] Auto-expiry (10 minutes)
- [x] Auto-cleanup (expired OTPs)

### Frontend
- [x] OTPInput component
- [x] VerifyEmailPage
- [x] ForgotPasswordPage
- [x] ResetPasswordPage
- [x] TwoFactorModal
- [x] Auth service (API wrapper)
- [x] Routes (3 new routes)
- [x] RegisterPage integration
- [x] LoginPage integration (2FA ready)

### Testing
- [x] Comprehensive test script
- [x] Interactive OTP input
- [x] All flows tested (6 tests)
- [x] Color-coded output
- [x] Summary report

### Documentation
- [x] Complete README
- [x] API documentation
- [x] Deployment checklist
- [x] Troubleshooting guide
- [x] Configuration guide

---

## 🎯 Next Steps

### Optional Enhancements

1. **SMS OTP Support**
   - Already integrated with `smsService`
   - Add SMS fallback option
   - Let users choose email/SMS

2. **Backup Codes**
   - Generate 10 single-use codes
   - Store hashed in User model
   - Allow login if OTP unavailable

3. **Remember Device**
   - Set cookie on successful 2FA
   - Skip 2FA for 30 days on trusted devices

4. **Admin OTP Override**
   - Allow admins to verify users manually
   - Audit log all overrides

5. **OTP Analytics Dashboard**
   - Visual metrics
   - Success/failure rates
   - Delivery times

---

## 📞 Support

For issues or questions:
1. Check the Troubleshooting section
2. Review API documentation
3. Run test script: `node backend/test-otp-system.js`
4. Check logs in `backend/logs/`

---

**Built with ❤️ for CareerBoost AI**

*Last Updated: December 2025*
