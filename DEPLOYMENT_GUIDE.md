# Complete Deployment Guide

This guide covers deploying the Resume Career Platform for production use, including all enterprise features.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Payment Gateway Setup](#payment-gateway-setup)
5. [Docker Deployment](#docker-deployment)
6. [Manual Deployment](#manual-deployment)
7. [SSL/HTTPS Setup](#ssl-https-setup)
8. [Monitoring & Logging](#monitoring--logging)
9. [Scaling Considerations](#scaling-considerations)

---

## Prerequisites

### Required Services
- **MongoDB Atlas** (or self-hosted MongoDB 4.4+)
- **Razorpay Account** (for payments)
- **Google Gemini API Key**
- **Hugging Face API Key**
- **SMTP Server** (Gmail, SendGrid, or Mailgun)
- **Domain Name** (for production)
- **SSL Certificate** (Let's Encrypt recommended)

### Server Requirements
- **Minimum**: 2 CPU cores, 4GB RAM, 40GB storage
- **Recommended**: 4 CPU cores, 8GB RAM, 100GB SSD
- **Operating System**: Ubuntu 20.04+ or Docker-compatible OS

---

## Environment Setup

### 1. Backend Environment Variables

Create `backend/.env` from `.env.template`:

```bash
# Server
PORT=8000
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/resume-platform?retryWrites=true&w=majority

# Security
JWT_SECRET=<generate-with-crypto-random-bytes>
JWT_EXPIRES_IN=7d

# AI Services
GEMINI_API_KEY=your-gemini-api-key
HUGGINGFACE_API_KEY=your-huggingface-api-key

# Payment Gateway (Razorpay)
RAZORPAY_KEY_ID=rzp_live_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxx

# Razorpay Plan IDs (create in dashboard)
RAZORPAY_PLAN_PRO_MONTHLY=plan_xxxxx
RAZORPAY_PLAN_PRO_YEARLY=plan_xxxxx
RAZORPAY_PLAN_TEAM_MONTHLY=plan_xxxxx
RAZORPAY_PLAN_TEAM_YEARLY=plan_xxxxx
RAZORPAY_PLAN_ENTERPRISE_MONTHLY=plan_xxxxx
RAZORPAY_PLAN_ENTERPRISE_YEARLY=plan_xxxxx

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Resume Career Platform

# CORS
CORS_ORIGIN=https://yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 2. Generate JWT Secret

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Database Setup

### MongoDB Atlas Setup

1. **Create Cluster**:
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Create a new cluster (M10+ for production)
   - Choose region close to your server

2. **Create Database User**:
   ```
   Database Access → Add New Database User
   Username: resume_platform
   Password: <strong-password>
   Role: Atlas Admin
   ```

3. **Whitelist IP**:
   ```
   Network Access → Add IP Address
   - For production: Add your server's IP
   - For testing: Allow access from anywhere (0.0.0.0/0)
   ```

4. **Get Connection String**:
   ```
   Clusters → Connect → Connect your application
   Copy the connection string
   Replace <password> with your database password
   ```

### Initialize Database

```bash
cd backend
npm install
node scripts/seedSkillRoadmaps.js
node scripts/generate-seed-embeddings.js
node init-jobs.js
```

---

## Payment Gateway Setup

### Razorpay Configuration

1. **Sign up for Razorpay**:
   - Go to [Razorpay](https://dashboard.razorpay.com/signup)
   - Complete KYC verification
   - Switch to Live mode

2. **Get API Keys**:
   ```
   Settings → API Keys → Generate Live Keys
   Copy Key ID and Key Secret
   ```

3. **Create Subscription Plans**:

   Navigate to: `Settings → Subscriptions → Plans → Create New Plan`

   **Pro Plan (Monthly)**:
   - Plan Name: Pro Monthly
   - Billing Amount: ₹499
   - Billing Interval: Monthly
   - Total count: 12

   **Pro Plan (Yearly)**:
   - Plan Name: Pro Yearly
   - Billing Amount: ₹4,990
   - Billing Interval: Yearly
   - Total count: 1

   **Team Plan (Monthly)**:
   - Plan Name: Team Monthly
   - Billing Amount: ₹1,999
   - Billing Interval: Monthly

   **Enterprise Plan**:
   - Contact Razorpay for custom pricing

4. **Setup Webhooks**:
   ```
   Settings → Webhooks → Add New Webhook
   URL: https://yourdomain.com/api/subscriptions/webhook
   Active Events:
   - subscription.activated
   - subscription.charged
   - subscription.cancelled
   - payment.failed
   Secret: <generate-random-string>
   ```

---

## Docker Deployment

### 1. Build and Run with Docker Compose

```bash
# Clone repository
git clone <your-repo-url>
cd latest_resume

# Copy environment files
cp backend/.env.template backend/.env
cp .env.docker.template .env

# Edit .env files with your credentials
nano backend/.env
nano .env

# Build and start services
docker-compose up -d

# Check logs
docker-compose logs -f

# Services will be available at:
# Frontend: http://localhost:80
# Backend: http://localhost:8000
# MongoDB: localhost:27017
```

### 2. Production Docker Compose

For production, use the optimized docker-compose:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7.0
    restart: always
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_USERNAME}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
    volumes:
      - mongodb_data:/data/db
    networks:
      - app-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    restart: always
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://${MONGO_USERNAME}:${MONGO_PASSWORD}@mongodb:27017/resume-platform?authSource=admin
    ports:
      - "8000:8000"
    depends_on:
      - mongodb
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:8000/health/basic"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    restart: always
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
    networks:
      - app-network

volumes:
  mongodb_data:

networks:
  app-network:
    driver: bridge
```

---

## Manual Deployment

### 1. Install Dependencies

```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install MongoDB (if self-hosting)
# Follow: https://www.mongodb.com/docs/manual/installation/
```

### 2. Backend Deployment

```bash
cd backend
npm install --production
npm run build  # if you have a build step

# Start with PM2
pm2 start src/server.js --name resume-backend
pm2 save
pm2 startup  # Configure auto-start on reboot
```

### 3. Frontend Deployment

```bash
cd frontend
npm install
npm run build

# Serve with Nginx
sudo apt-get install nginx
sudo cp nginx.conf /etc/nginx/sites-available/resume-platform
sudo ln -s /etc/nginx/sites-available/resume-platform /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 4. Nginx Configuration

Create `/etc/nginx/sites-available/resume-platform`:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend
    root /var/www/resume-platform/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header X-XSS-Protection "1; mode=block";
}
```

---

## SSL/HTTPS Setup

### Using Let's Encrypt (Free)

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Generate certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo certbot renew --dry-run
```

---

## Monitoring & Logging

### PM2 Monitoring

```bash
# View logs
pm2 logs resume-backend

# Monitor resources
pm2 monit

# View process status
pm2 status
```

### Application Logs

```bash
# Backend logs
tail -f backend/logs/app.log

# Access logs
tail -f /var/log/nginx/access.log

# Error logs
tail -f /var/log/nginx/error.log
```

### Health Checks

```bash
# Basic health check
curl http://localhost:8000/health/basic

# Full health check
curl http://localhost:8000/health
```

---

## Scaling Considerations

### Horizontal Scaling

1. **Load Balancer**: Use Nginx or AWS ALB
2. **Multiple Backend Instances**:
   ```bash
   pm2 start src/server.js -i 4  # 4 instances
   ```

3. **MongoDB Replica Set**: For high availability

### Caching

Add Redis for:
- Session management
- API response caching
- Queue management

```bash
# Install Redis
sudo apt-get install redis-server

# Update backend to use Redis
npm install ioredis
```

### CDN

Use Cloudflare or AWS CloudFront for:
- Static assets
- Frontend files
- Image optimization

---

## Backup Strategy

### Database Backups

```bash
# Daily MongoDB backups
mongodump --uri="$MONGODB_URI" --out=/backups/$(date +%Y%m%d)

# Automated with cron
0 2 * * * /usr/local/bin/mongodump --uri="$MONGODB_URI" --out=/backups/$(date +\%Y\%m\%d)
```

### File Backups

```bash
# Backup uploads directory
tar -czf /backups/uploads-$(date +%Y%m%d).tar.gz backend/uploads
```

---

## Security Checklist

- [ ] HTTPS enabled with valid SSL certificate
- [ ] Environment variables secured (no hardcoded secrets)
- [ ] MongoDB authentication enabled
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Helmet security headers enabled
- [ ] Regular dependency updates
- [ ] Firewall configured (UFW/iptables)
- [ ] SSH key-based authentication
- [ ] Regular backups automated
- [ ] Monitoring and alerts configured

---

## Troubleshooting

### Common Issues

**MongoDB Connection Failed**:
```bash
# Check MongoDB status
sudo systemctl status mongod

# Check connection string
mongo "$MONGODB_URI"
```

**Payment Gateway Errors**:
- Verify Razorpay keys in production mode
- Check webhook URL is accessible
- Verify plan IDs match

**Email Not Sending**:
- Check SMTP credentials
- Enable "Less secure app access" for Gmail
- Use App Passwords for Gmail

---

## Support

For issues or questions:
- GitHub Issues: [Create Issue](https://github.com/your-repo/issues)
- Email: support@yourdomain.com
- Documentation: https://docs.yourdomain.com
