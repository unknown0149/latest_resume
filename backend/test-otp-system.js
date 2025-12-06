/**
 * Complete OTP System Test
 * Tests email verification, 2FA login, and password reset flows
 * 
 * Run: node backend/test-otp-system.js
 */

const API_URL = process.env.API_URL || 'http://localhost:8000/api';

// Test user data
const TEST_USER = {
  name: 'Test User',
  email: 'devilhunter0149@gmail.com',
  password: 'Test@123',
  newPassword: 'NewTest@456'
};

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function info(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

function section(message) {
  log(`\n${'='.repeat(60)}`, 'blue');
  log(`  ${message}`, 'bold');
  log(`${'='.repeat(60)}\n`, 'blue');
}

async function makeRequest(endpoint, method = 'GET', data = null, token = null) {
  const url = `${API_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    },
    ...(data && { body: JSON.stringify(data) })
  };

  try {
    const response = await fetch(url, options);
    const result = await response.json();
    return { success: response.ok, status: response.status, data: result };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function promptOTP(message) {
  return new Promise((resolve) => {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    readline.question(`\n${colors.yellow}${message}${colors.reset}\n> `, (answer) => {
      readline.close();
      resolve(answer.trim());
    });
  });
}

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test 1: Registration with Email Verification
async function testRegistration() {
  section('TEST 1: Registration & Email Verification');

  // Step 1: Register user
  info(`Registering user: ${TEST_USER.email}`);
  const registerRes = await makeRequest('/auth/register', 'POST', {
    name: TEST_USER.name,
    email: TEST_USER.email,
    password: TEST_USER.password
  });

  if (!registerRes.success) {
    if (registerRes.data?.message?.includes('already exists')) {
      log('User already exists, skipping registration', 'yellow');
      return { skipped: true };
    }
    error(`Registration failed: ${registerRes.data?.message || registerRes.error}`);
    return { success: false };
  }

  success('Registration successful!');
  info(`Response: ${JSON.stringify(registerRes.data, null, 2)}`);

  if (!registerRes.data.requiresVerification) {
    log('Email verification not required (backward compatibility mode)', 'yellow');
    return { success: true, token: registerRes.data.token };
  }

  // Step 2: Get OTP from user
  const otp = await promptOTP('📧 Enter the 6-digit OTP sent to your email:');

  // Step 3: Verify email
  info('Verifying email with OTP...');
  const verifyRes = await makeRequest('/auth/verify-email', 'POST', {
    email: TEST_USER.email,
    otp
  });

  if (!verifyRes.success) {
    error(`Email verification failed: ${verifyRes.data?.message || verifyRes.error}`);
    return { success: false };
  }

  success('Email verified successfully!');
  info(`Response: ${JSON.stringify(verifyRes.data, null, 2)}`);

  return { success: true, token: verifyRes.data.token };
}

// Test 2: Login (without 2FA)
async function testLogin() {
  section('TEST 2: Normal Login');

  info(`Logging in as: ${TEST_USER.email}`);
  const loginRes = await makeRequest('/auth/login', 'POST', {
    email: TEST_USER.email,
    password: TEST_USER.password
  });

  if (!loginRes.success) {
    error(`Login failed: ${loginRes.data?.message || loginRes.error}`);
    return { success: false };
  }

  if (loginRes.data.requires2FA) {
    log('2FA is enabled for this account', 'yellow');
    return { success: true, requires2FA: true };
  }

  success('Login successful!');
  info(`Token: ${loginRes.data.token?.substring(0, 20)}...`);

  return { success: true, token: loginRes.data.token };
}

// Test 3: Enable 2FA
async function testEnable2FA(token) {
  section('TEST 3: Enable Two-Factor Authentication');

  if (!token) {
    error('No token provided, cannot enable 2FA');
    return { success: false };
  }

  info('Enabling 2FA...');
  const enable2FARes = await makeRequest('/auth/enable-2fa', 'POST', null, token);

  if (!enable2FARes.success) {
    error(`Failed to enable 2FA: ${enable2FARes.data?.message || enable2FARes.error}`);
    return { success: false };
  }

  success('2FA enabled successfully!');
  return { success: true };
}

// Test 4: Login with 2FA
async function testLoginWith2FA() {
  section('TEST 4: Login with 2FA');

  // Step 1: Initial login (will send OTP)
  info(`Initiating 2FA login for: ${TEST_USER.email}`);
  const loginRes = await makeRequest('/auth/login', 'POST', {
    email: TEST_USER.email,
    password: TEST_USER.password
  });

  if (!loginRes.success) {
    error(`Login failed: ${loginRes.data?.message || loginRes.error}`);
    return { success: false };
  }

  if (!loginRes.data.requires2FA) {
    log('2FA is not enabled for this account', 'yellow');
    return { success: true, token: loginRes.data.token };
  }

  success('2FA code sent to email!');

  // Step 2: Get OTP from user
  const otp = await promptOTP('🔐 Enter the 6-digit 2FA code:');

  // Step 3: Login with OTP
  info('Verifying 2FA code...');
  const verify2FARes = await makeRequest('/auth/login', 'POST', {
    email: TEST_USER.email,
    password: TEST_USER.password,
    otp
  });

  if (!verify2FARes.success) {
    error(`2FA verification failed: ${verify2FARes.data?.message || verify2FARes.error}`);
    return { success: false };
  }

  success('2FA login successful!');
  info(`Token: ${verify2FARes.data.token?.substring(0, 20)}...`);

  return { success: true, token: verify2FARes.data.token };
}

// Test 5: Password Reset
async function testPasswordReset() {
  section('TEST 5: Password Reset');

  // Step 1: Request password reset
  info(`Requesting password reset for: ${TEST_USER.email}`);
  const forgotRes = await makeRequest('/auth/forgot-password', 'POST', {
    email: TEST_USER.email
  });

  if (!forgotRes.success) {
    error(`Forgot password failed: ${forgotRes.data?.message || forgotRes.error}`);
    return { success: false };
  }

  success('Password reset code sent!');

  // Step 2: Get OTP from user
  const otp = await promptOTP('🔑 Enter the 6-digit reset code:');

  // Step 3: Reset password with OTP
  info('Resetting password...');
  const resetRes = await makeRequest('/auth/reset-password', 'POST', {
    email: TEST_USER.email,
    otp,
    newPassword: TEST_USER.newPassword
  });

  if (!resetRes.success) {
    error(`Password reset failed: ${resetRes.data?.message || resetRes.error}`);
    return { success: false };
  }

  success('Password reset successful!');

  // Step 4: Login with new password
  info('Testing login with new password...');
  await wait(1000);
  
  const loginRes = await makeRequest('/auth/login', 'POST', {
    email: TEST_USER.email,
    password: TEST_USER.newPassword
  });

  if (!loginRes.success && !loginRes.data?.requires2FA) {
    error(`Login with new password failed: ${loginRes.data?.message}`);
    return { success: false };
  }

  success('Login with new password successful!');

  // Restore original password
  info('Restoring original password...');
  const restoreRes = await makeRequest('/auth/forgot-password', 'POST', {
    email: TEST_USER.email
  });

  if (restoreRes.success) {
    const restoreOtp = await promptOTP('Enter OTP to restore original password:');
    await makeRequest('/auth/reset-password', 'POST', {
      email: TEST_USER.email,
      otp: restoreOtp,
      newPassword: TEST_USER.password
    });
    success('Original password restored!');
  }

  return { success: true };
}

// Test 6: Resend Verification OTP
async function testResendVerification() {
  section('TEST 6: Resend Verification OTP');

  info('Testing resend verification...');
  const resendRes = await makeRequest('/auth/resend-verification', 'POST', {
    email: TEST_USER.email
  });

  if (!resendRes.success) {
    if (resendRes.data?.message?.includes('already verified')) {
      success('Email already verified (as expected)');
      return { success: true, skipped: true };
    }
    error(`Resend verification failed: ${resendRes.data?.message || resendRes.error}`);
    return { success: false };
  }

  success('Verification code resent successfully!');
  return { success: true };
}

// Main test runner
async function runAllTests() {
  log('\n🚀 OTP System Complete Test Suite\n', 'bold');
  info(`Testing with email: ${TEST_USER.email}`);
  info(`API URL: ${API_URL}\n`);

  const results = {};
  let token = null;

  // Test 1: Registration & Email Verification
  results.registration = await testRegistration();
  if (results.registration.success) {
    token = results.registration.token;
  }
  await wait(2000);

  // Test 2: Normal Login
  if (!results.registration.skipped) {
    results.login = await testLogin();
    if (results.login.success && results.login.token) {
      token = results.login.token;
    }
    await wait(2000);
  }

  // Test 3: Enable 2FA
  if (token) {
    results.enable2FA = await testEnable2FA(token);
    await wait(2000);
  }

  // Test 4: Login with 2FA
  if (results.enable2FA?.success) {
    results.login2FA = await testLoginWith2FA();
    await wait(2000);
  }

  // Test 5: Password Reset
  results.passwordReset = await testPasswordReset();
  await wait(2000);

  // Test 6: Resend Verification
  results.resendVerification = await testResendVerification();

  // Summary
  section('TEST SUMMARY');
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const [test, result] of Object.entries(results)) {
    if (result.skipped) {
      log(`⏭️  ${test}: SKIPPED`, 'yellow');
      skipped++;
    } else if (result.success) {
      success(`${test}: PASSED`);
      passed++;
    } else {
      error(`${test}: FAILED`);
      failed++;
    }
  }

  log(`\n${'='.repeat(60)}`, 'blue');
  log(`Total: ${passed + failed + skipped} | Passed: ${passed} | Failed: ${failed} | Skipped: ${skipped}`, 'bold');
  log(`${'='.repeat(60)}\n`, 'blue');

  if (failed === 0) {
    success('🎉 All tests passed!');
  } else {
    error(`❌ ${failed} test(s) failed`);
  }

  process.exit(failed === 0 ? 0 : 1);
}

// Run tests
runAllTests().catch((err) => {
  error(`Test suite error: ${err.message}`);
  console.error(err);
  process.exit(1);
});
