import dotenv from 'dotenv';
import emailService from './src/services/emailService.js';

// Load environment variables
dotenv.config();

/**
 * Test Email Sending
 * This script tests all email templates
 */

const testEmail = async () => {
  console.log('🧪 Testing Email Service...\n');
  
  const testRecipient = 'devilhunter0149@gmail.com';
  
  try {
    // Test 1: Welcome Email
    console.log('📧 Test 1: Sending Welcome Email...');
    await emailService.sendWelcomeEmail(testRecipient, {
      userName: 'Test User',
      userEmail: testRecipient,
      dashboardLink: 'http://localhost:5173/dashboard'
    });
    console.log('✅ Welcome email sent successfully!\n');
    
    // Wait 2 seconds between emails
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 2: Application Status Email
    console.log('📧 Test 2: Sending Application Status Email...');
    await emailService.sendApplicationStatusEmail(testRecipient, {
      candidateName: 'Test User',
      jobTitle: 'Senior Full Stack Developer',
      companyName: 'TechCorp Industries',
      status: 'SHORTLISTED',
      message: 'Your profile impressed our hiring team! We would like to move forward with your application.',
      dashboardLink: 'http://localhost:5173/applications'
    });
    console.log('✅ Application status email sent successfully!\n');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 3: Interview Scheduled Email
    console.log('📧 Test 3: Sending Interview Scheduled Email...');
    const interviewDate = new Date();
    interviewDate.setDate(interviewDate.getDate() + 3); // 3 days from now
    
    await emailService.sendInterviewScheduledEmail(testRecipient, {
      candidateName: 'Test User',
      jobTitle: 'Senior Full Stack Developer',
      companyName: 'TechCorp Industries',
      interviewDate: interviewDate,
      interviewTime: '10:00 AM IST',
      interviewType: 'Technical Round (Video Call)',
      meetingLink: 'https://meet.google.com/abc-defg-hij',
      interviewerName: 'Sarah Johnson (Tech Lead)',
      notes: 'Please prepare to discuss your recent MERN stack projects and be ready for a live coding session.',
      dashboardLink: 'http://localhost:5173/interviews'
    });
    console.log('✅ Interview scheduled email sent successfully!\n');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 4: Offer Extended Email
    console.log('📧 Test 4: Sending Offer Extended Email...');
    const joinDate = new Date();
    joinDate.setDate(joinDate.getDate() + 30);
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);
    
    await emailService.sendOfferExtendedEmail(testRecipient, {
      candidateName: 'Test User',
      jobTitle: 'Senior Full Stack Developer',
      companyName: 'TechCorp Industries',
      salary: 1800000, // 18 LPA
      joinDate: joinDate,
      expiryDate: expiryDate,
      dashboardLink: 'http://localhost:5173/offers'
    });
    console.log('✅ Offer extended email sent successfully!\n');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 5: Interview Reminder Email
    console.log('📧 Test 5: Sending Interview Reminder Email...');
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    
    await emailService.sendInterviewReminderEmail(testRecipient, {
      candidateName: 'Test User',
      jobTitle: 'Senior Full Stack Developer',
      companyName: 'TechCorp Industries',
      interviewDate: tomorrowDate,
      interviewTime: '10:00 AM IST',
      meetingLink: 'https://meet.google.com/abc-defg-hij',
      dashboardLink: 'http://localhost:5173/interviews'
    });
    console.log('✅ Interview reminder email sent successfully!\n');
    
    console.log('🎉 All test emails sent successfully!');
    console.log(`📬 Check your inbox at: ${testRecipient}`);
    console.log('💡 Don\'t forget to check spam folder if emails don\'t appear in inbox!\n');
    
    console.log('📊 Email Service Status:');
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   SMTP Host: ${process.env.SMTP_HOST || 'Not configured'}`);
    console.log(`   SMTP User: ${process.env.SMTP_USER || 'Not configured'}`);
    
  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Check if SMTP credentials are set in .env');
    console.error('   2. Verify SMTP_USER and SMTP_PASS are correct');
    console.error('   3. Ensure NODE_ENV is set to "production" to send real emails');
    console.error('   4. Check if Gmail 2FA is enabled and App Password is generated');
    console.error('\n📝 Required .env variables:');
    console.error('   SMTP_HOST=smtp.gmail.com');
    console.error('   SMTP_PORT=587');
    console.error('   SMTP_USER=your-email@gmail.com');
    console.error('   SMTP_PASS=your-16-char-app-password');
    console.error('   NODE_ENV=production');
  }
  
  process.exit(0);
};

// Run test
testEmail();
