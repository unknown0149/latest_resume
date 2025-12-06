# 📧 EMAIL TEST SETUP INSTRUCTIONS

## 🚀 Quick Setup (5 minutes)

### Step 1: Get Gmail App Password

1. **Go to Google Account Security:**  
   👉 https://myaccount.google.com/security

2. **Enable 2-Step Verification** (if not already enabled)
   - Click "2-Step Verification"
   - Follow the setup process

3. **Generate App Password:**  
   👉 https://myaccount.google.com/apppasswords
   - Select "Mail" as the app
   - Select "Other (Custom name)" and enter "Resume Analyzer"
   - Click "Generate"
   - **COPY the 16-character password** (format: xxxx xxxx xxxx xxxx)

### Step 2: Update .env File

Open `backend/.env` and update these lines:

```env
NODE_ENV=production  # ✅ Already set

# Update these with your credentials:
SMTP_USER=your-actual-email@gmail.com
SMTP_PASS=paste-your-16-char-app-password-here-no-spaces
```

**Example:**
```env
SMTP_USER=devilhunter0149@gmail.com
SMTP_PASS=abcdefghijklmnop
```

### Step 3: Run Test Script

```bash
cd backend
node test-email.js
```

### Step 4: Check Your Email

- Check inbox: **devilhunter0149@gmail.com**
- Check spam folder if not in inbox
- You should receive 5 test emails:
  1. ✉️ Welcome Email
  2. ✉️ Application Status Update (Shortlisted)
  3. ✉️ Interview Scheduled
  4. ✉️ Job Offer Extended
  5. ✉️ Interview Reminder

---

## 🔍 What the Test Will Send

### Email 1: Welcome Email
- Subject: "Welcome to CareerBoost AI! 🚀"
- Content: Welcome message with getting started guide

### Email 2: Application Status
- Subject: "Application Update - Senior Full Stack Developer"
- Content: You've been shortlisted for a position

### Email 3: Interview Scheduled
- Subject: "Interview Scheduled - Senior Full Stack Developer"
- Content: Interview details with meeting link, date, time

### Email 4: Job Offer
- Subject: "Job Offer - Senior Full Stack Developer"
- Content: Salary (₹18 LPA), joining date, offer details

### Email 5: Interview Reminder
- Subject: "Interview Reminder - Senior Full Stack Developer"
- Content: Reminder for tomorrow's interview

---

## 🆘 Troubleshooting

### "Authentication failed"
- ✅ Make sure 2FA is enabled on your Gmail
- ✅ Use App Password, NOT your regular Gmail password
- ✅ Remove all spaces from the app password

### "SMTP connection failed"
- ✅ Check your internet connection
- ✅ Verify SMTP_HOST is `smtp.gmail.com`
- ✅ Verify SMTP_PORT is `587`

### "Emails not received"
- ✅ Check spam/junk folder
- ✅ Wait 1-2 minutes for delivery
- ✅ Check if Gmail has blocked the emails (check Gmail settings)

### "Module not found"
- ✅ Make sure you're in the `backend` directory
- ✅ Run `npm install` to ensure all dependencies are installed

---

## 💡 Alternative: Test Without Gmail Setup

If you don't want to set up Gmail credentials right now, change `.env`:

```env
NODE_ENV=development  # Set to development
```

Then run:
```bash
node test-email.js
```

This will show you what emails WOULD be sent (logged to console) without actually sending them.

---

## ✅ Success Output

When successful, you'll see:

```
🧪 Testing Email Service...

📧 Test 1: Sending Welcome Email...
✅ Welcome email sent successfully!

📧 Test 2: Sending Application Status Email...
✅ Application status email sent successfully!

📧 Test 3: Sending Interview Scheduled Email...
✅ Interview scheduled email sent successfully!

📧 Test 4: Sending Offer Extended Email...
✅ Offer extended email sent successfully!

📧 Test 5: Sending Interview Reminder Email...
✅ Interview reminder email sent successfully!

🎉 All test emails sent successfully!
📬 Check your inbox at: devilhunter0149@gmail.com
```

---

## 🎯 Next Steps After Testing

Once emails are working:

1. ✅ Keep `NODE_ENV=production` for real email sending
2. ✅ The system will automatically send emails when:
   - Application status changes
   - Interviews are scheduled
   - Offers are extended
   - Reminders are due

3. ✅ No code changes needed - it's all automatic!

---

*Need help? Check the terminal output for detailed error messages.*
