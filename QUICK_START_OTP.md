# 🚀 Quick Start Guide - OTP Verification System

## ⚡ Get Started in 5 Minutes

### Step 1: Configure Email (2 minutes)

1. **Get Gmail App Password:**
   - Visit: https://myaccount.google.com/apppasswords
   - Sign in with: `devilhunter0149@gmail.com`
   - Enable 2-Factor Authentication (if not already)
   - Generate app password for "Resume Analyzer"
   - Copy the 16-character password (like: `abcd efgh ijkl mnop`)

2. **Update `.env` file:**
```bash
# Open backend/.env and update these lines:
SMTP_USER=devilhunter0149@gmail.com
SMTP_PASS=abcdefghijklmnop  # Your 16-char app password (no spaces)
NODE_ENV=production
```

### Step 2: Test Backend (2 minutes)

```bash
# Terminal 1: Start backend server
cd backend
npm run dev

# Terminal 2: Run OTP test
cd backend
node test-otp-system.js
```

**What happens:**
- Test will register a user
- Email sent to `devilhunter0149@gmail.com`
- You'll be prompted to enter OTP from email
- All flows tested automatically

### Step 3: Test Frontend (1 minute)

```bash
# Terminal 3: Start frontend
cd frontend
npm run dev
```

**Test flows:**
1. Visit: http://localhost:5173/register
2. Register with your email
3. Check email for OTP
4. Enter OTP on verification page
5. Login successfully!

---

## 📋 What You Get

### For Users:
✅ Secure email verification on signup  
✅ Optional 2FA for login  
✅ Password reset via OTP (no email links!)  
✅ Professional branded emails  
✅ Mobile-friendly interface  

### For Developers:
✅ 8 new API endpoints  
✅ 3 ready-to-use pages  
✅ 2 reusable components  
✅ Complete test suite  
✅ Full documentation  

---

## 🔧 Quick Commands

### Backend
```bash
# Start server
npm run dev

# Run tests
node test-otp-system.js

# Check OTP service
node -e "import('./src/services/otpService.js').then(() => console.log('✅ OK'))"
```

### Frontend
```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 🎯 Test Checklist

### Registration Flow
- [ ] Visit `/register`
- [ ] Fill form and submit
- [ ] Redirected to `/verify-email`
- [ ] Email received with OTP
- [ ] Enter OTP
- [ ] Redirected to dashboard
- [ ] Token stored in localStorage

### Login Flow (No 2FA)
- [ ] Visit `/login`
- [ ] Enter credentials
- [ ] Login successful
- [ ] Redirected to dashboard

### Enable 2FA
- [ ] Go to Settings
- [ ] Click "Enable 2FA"
- [ ] Preference saved
- [ ] Logout

### Login with 2FA
- [ ] Visit `/login`
- [ ] Enter credentials
- [ ] 2FA modal appears
- [ ] Email received with OTP
- [ ] Enter OTP in modal
- [ ] Login successful

### Password Reset
- [ ] Visit `/forgot-password`
- [ ] Enter email
- [ ] Email received with reset code
- [ ] Redirected to `/reset-password`
- [ ] Enter OTP + new password
- [ ] Password updated
- [ ] Redirected to login
- [ ] Login with new password

---

## 🐛 Troubleshooting

### "Emails not sending"
**Fix:** Check `.env` has correct `SMTP_PASS` (Gmail app password, not account password)

### "OTP expired"
**Fix:** OTPs expire in 10 minutes. Request new one with "Resend Code"

### "Invalid OTP"
**Fix:** You have 3 attempts. After that, request new OTP

### "Cooldown active"
**Fix:** Wait 60 seconds between resend requests

### "Test script fails"
**Fix:** 
1. Ensure backend server is running (`npm run dev`)
2. Check `.env` has correct SMTP credentials
3. Check email spam folder for OTPs

---

## 📚 Documentation

**Full Documentation:** See `OTP_SYSTEM_DOCUMENTATION.md` (800+ lines)

**Implementation Summary:** See `OTP_IMPLEMENTATION_SUMMARY.md` (300+ lines)

**Quick Reference:**

### API Endpoints
```
POST /api/auth/register          # Register + send verification OTP
POST /api/auth/verify-email      # Verify email with OTP
POST /api/auth/resend-verification # Resend verification OTP
POST /api/auth/login             # Login (with optional 2FA OTP)
POST /api/auth/forgot-password   # Send password reset OTP
POST /api/auth/reset-password    # Reset password with OTP
POST /api/auth/enable-2fa        # Enable 2FA
POST /api/auth/disable-2fa       # Disable 2FA
```

### Frontend Routes
```
/register          # Registration page
/verify-email      # Email verification page
/login             # Login page (with 2FA support)
/forgot-password   # Forgot password page
/reset-password    # Reset password page
```

---

## 🎉 Success!

Once you see:
- ✅ Emails arriving in inbox
- ✅ OTP verification working
- ✅ Login successful with token

**You're ready for production!**

---

## 🔐 Security Notes

- OTPs expire in 10 minutes
- Maximum 3 verification attempts per OTP
- 60-second cooldown between resends
- Email verification required before login
- 2FA optional but recommended for admin accounts
- All sessions invalidated on password change

---

## 📞 Need Help?

1. Check Troubleshooting section above
2. Read `OTP_SYSTEM_DOCUMENTATION.md`
3. Run test script: `node test-otp-system.js`
4. Check backend logs for errors

---

**System Status:** ✅ **READY TO USE**

*Last Updated: December 2025*
