# 🔧 Environment Configuration Guide

Complete `.env` configuration for all implemented features.

---

## 📋 Backend Environment Variables

Create `backend/.env` file with the following:

```env
# ========================================
# REQUIRED - Core Configuration
# ========================================

# Server
NODE_ENV=development  # development | production
PORT=8000
BACKEND_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173

# Database
MONGODB_URI=mongodb://localhost:27017/resume-analyzer
# OR MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/resume-analyzer

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars
JWT_EXPIRES_IN=1h

# ========================================
# AI Services (REQUIRED for core features)
# ========================================

# Google Gemini AI
GEMINI_API_KEY=your-gemini-api-key-from-google-ai-studio

# Hugging Face (fallback)
HUGGINGFACE_API_KEY=your-huggingface-api-key

# ========================================
# Email Service (REQUIRED for notifications)
# ========================================

# SMTP Configuration (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
SMTP_FROM=noreply@careerboost.ai

# Gmail App Password: https://myaccount.google.com/apppasswords
# Enable 2FA first, then generate app password

# Alternative: SendGrid
# SMTP_HOST=smtp.sendgrid.net
# SMTP_PORT=587
# SMTP_USER=apikey
# SMTP_PASS=your-sendgrid-api-key

# Alternative: AWS SES
# SMTP_HOST=email-smtp.us-east-1.amazonaws.com
# SMTP_PORT=587
# SMTP_USER=your-aws-smtp-username
# SMTP_PASS=your-aws-smtp-password

# ========================================
# SMS Service (OPTIONAL)
# ========================================

SMS_PROVIDER=twilio  # twilio | sns

# Option 1: Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Option 2: AWS SNS
# AWS_ACCESS_KEY_ID=your-aws-access-key
# AWS_SECRET_ACCESS_KEY=your-aws-secret-key
# AWS_REGION=us-east-1

# ========================================
# OAuth Social Login (OPTIONAL)
# ========================================

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
# Get from: https://console.cloud.google.com/apis/credentials

# LinkedIn OAuth
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
# Get from: https://www.linkedin.com/developers/apps

# GitHub OAuth
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
# Get from: https://github.com/settings/developers

# ========================================
# Redis Caching (OPTIONAL - improves performance)
# ========================================

# Local Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# OR Redis Cloud URL
# REDIS_URL=redis://username:password@host:port

# Redis Cloud: https://redis.com/try-free/

# ========================================
# Monitoring & Error Tracking (OPTIONAL)
# ========================================

# Sentry Error Tracking
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
APP_VERSION=1.0.0
# Get from: https://sentry.io/

# Datadog APM (Optional)
# DD_API_KEY=your-datadog-api-key
# DD_SERVICE=resume-analyzer-backend
# DD_ENV=production

# New Relic APM (Optional)
# NEW_RELIC_LICENSE_KEY=your-new-relic-key
# NEW_RELIC_APP_NAME=Resume Analyzer Backend

# ========================================
# Payment Gateway (REQUIRED for subscriptions)
# ========================================

# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your-razorpay-secret
# Get from: https://dashboard.razorpay.com/app/keys

# ========================================
# File Storage (OPTIONAL - for production)
# ========================================

# AWS S3 (for resume/avatar uploads in production)
# AWS_S3_BUCKET=your-bucket-name
# AWS_ACCESS_KEY_ID=your-access-key
# AWS_SECRET_ACCESS_KEY=your-secret-key
# AWS_REGION=us-east-1

# ========================================
# Rate Limiting & Security
# ========================================

# Rate limiting (requests per window)
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX=5  # Login attempts per window

# CORS
CORS_ORIGIN=http://localhost:5173  # Frontend URL

# ========================================
# Job Scraping (OPTIONAL)
# ========================================

# LinkedIn Job Scraper (if using)
# LINKEDIN_EMAIL=your-linkedin-email
# LINKEDIN_PASSWORD=your-linkedin-password

# Indeed API (if using)
# INDEED_PUBLISHER_ID=your-publisher-id

```

---

## 📱 Frontend Environment Variables

Create `frontend/.env` file:

```env
# Backend API
VITE_API_URL=http://localhost:8000/api

# Razorpay (for payments)
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxx

# Analytics (Optional)
# VITE_GA_TRACKING_ID=G-XXXXXXXXXX  # Google Analytics
# VITE_MIXPANEL_TOKEN=your-mixpanel-token

# Feature Flags (Optional)
VITE_ENABLE_OAUTH=true
VITE_ENABLE_REALTIME=true
VITE_ENABLE_SMS=false
```

---

## 🚀 Quick Start - Minimal Configuration

To get started immediately with core features only:

```env
# backend/.env (MINIMAL)
NODE_ENV=development
PORT=8000
MONGODB_URI=mongodb://localhost:27017/resume-analyzer
JWT_SECRET=change-this-to-a-long-random-string-min-32-characters
GEMINI_API_KEY=your-gemini-api-key
FRONTEND_URL=http://localhost:5173

# Email (use Gmail for testing)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-gmail-app-password
```

```env
# frontend/.env (MINIMAL)
VITE_API_URL=http://localhost:8000/api
```

---

## 📝 How to Get API Keys

### 1. Google Gemini AI (FREE - REQUIRED)
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Create API Key"
3. Copy the key to `GEMINI_API_KEY`

### 2. Gmail SMTP (FREE - for email)
1. Enable 2-Factor Authentication on your Google account
2. Go to [App Passwords](https://myaccount.google.com/apppasswords)
3. Select "Mail" and "Other (Custom name)"
4. Copy the 16-character password to `SMTP_PASS`

### 3. Twilio SMS (FREE TRIAL - optional)
1. Sign up at [Twilio](https://www.twilio.com/try-twilio)
2. Get $15 free credit
3. Copy Account SID, Auth Token, and Phone Number

### 4. Google OAuth (FREE - optional)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable "Google+ API"
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:8000/api/auth/google/callback`

### 5. Razorpay (FREE TEST MODE - required)
1. Sign up at [Razorpay](https://dashboard.razorpay.com/signup)
2. Go to Settings > API Keys
3. Generate Test Keys
4. Copy Key ID and Key Secret

### 6. MongoDB (FREE - required)
**Option A: Local MongoDB**
1. Install MongoDB Community Edition
2. Use: `mongodb://localhost:27017/resume-analyzer`

**Option B: MongoDB Atlas (Cloud - Recommended)**
1. Sign up at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Create a free M0 cluster (512MB)
3. Create database user
4. Whitelist your IP (or use 0.0.0.0/0 for development)
5. Get connection string

### 7. Redis (FREE - optional, for caching)
**Option A: Local Redis**
```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt install redis-server
sudo systemctl start redis
```

**Option B: Redis Cloud**
1. Sign up at [Redis Cloud](https://redis.com/try-free/)
2. Create free 30MB database
3. Copy connection URL

### 8. Sentry (FREE - optional, for monitoring)
1. Sign up at [Sentry](https://sentry.io/signup/)
2. Create a new project (Node.js)
3. Copy the DSN

---

## 🔒 Security Best Practices

### Development vs Production

**Development (.env):**
- Use test API keys
- Enable verbose logging
- Use local databases
- Set `NODE_ENV=development`

**Production (.env):**
- Use production API keys
- Minimal logging
- Use managed databases (MongoDB Atlas, Redis Cloud)
- Set `NODE_ENV=production`
- Never commit .env to git
- Use environment variable management (Railway, Heroku, Vercel)
- Rotate secrets regularly
- Use HTTPS only
- Enable rate limiting strictly

### .gitignore

Ensure `.env` is in `.gitignore`:

```gitignore
# Environment variables
.env
.env.local
.env.production
.env.development

# Sensitive files
*.pem
*.key
secrets/
```

---

## 🧪 Testing Configuration

Create `backend/.env.test` for testing:

```env
NODE_ENV=test
MONGODB_URI=mongodb://localhost:27017/resume-analyzer-test
JWT_SECRET=test-secret-key-do-not-use-in-production
GEMINI_API_KEY=test-key
SMTP_HOST=smtp.ethereal.email  # Ethereal Email for testing
```

---

## 📊 Environment Checklist

### Core Features (Required)
- [ ] MongoDB connection configured
- [ ] JWT secret set (min 32 chars)
- [ ] Gemini API key obtained
- [ ] Frontend/Backend URLs set
- [ ] Email SMTP configured

### User Engagement (Recommended)
- [ ] Email service tested
- [ ] SMS service configured (optional)
- [ ] OAuth providers set up (optional)

### Performance (Recommended)
- [ ] Redis configured for caching

### Production (Before Deploy)
- [ ] All secrets rotated
- [ ] Sentry error tracking configured
- [ ] Rate limits configured
- [ ] CORS origins whitelisted
- [ ] Payment gateway in live mode

---

## 🆘 Troubleshooting

### MongoDB Connection Failed
```bash
# Check if MongoDB is running
mongosh
# OR
brew services list  # macOS
sudo systemctl status mongod  # Linux
```

### Email Not Sending
1. Check Gmail 2FA is enabled
2. Generate new App Password
3. Check spam folder
4. Try Ethereal Email for testing: https://ethereal.email/

### Redis Connection Failed
```bash
# Check if Redis is running
redis-cli ping
# Should return PONG
```

### API Keys Invalid
1. Regenerate keys from respective dashboards
2. Check for extra spaces in .env
3. Restart server after .env changes

---

## 🎯 Recommended Setup Order

1. **Day 1:** Core features (MongoDB + Gemini + JWT + Email)
2. **Day 2:** Test email notifications
3. **Day 3:** Add Redis caching
4. **Day 4:** Configure OAuth (Google first)
5. **Day 5:** Set up SMS (optional)
6. **Day 6:** Add monitoring (Sentry)
7. **Day 7:** Production deployment prep

---

*Last updated: December 4, 2025*
