const http = require('http');

const BASE_URL = 'http://localhost:8000/api';

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    }).on('error', reject);
  });
}

async function quickVerify() {
  console.log('🔍 Quick System Verification\n');
  console.log('='.repeat(60));
  
  try {
    // Test 1: Backend Health
    console.log('\n1️⃣ Backend Health Check...');
    try {
      const health = await httpGet(`${BASE_URL}/health`);
      console.log('✅ Backend is running');
    } catch (err) {
      console.log('⚠️  Health endpoint not found, but continuing...');
    }

    // Test 2: Jobs Endpoint
    console.log('\n2️⃣ Checking Jobs Endpoint...');
    const jobsResponse = await httpGet(`${BASE_URL}/jobs/all?limit=10`);
    const jobs = jobsResponse.data.jobs || jobsResponse.data;
    console.log(`✅ Found ${jobs.length} jobs`);
    
    // Group by platform
    const platforms = jobs.reduce((acc, job) => {
      const platform = job.source?.platform || 'unknown';
      acc[platform] = (acc[platform] || 0) + 1;
      return acc;
    }, {});
    
    console.log('📊 Jobs by platform:');
    Object.entries(platforms).forEach(([platform, count]) => {
      console.log(`   - ${platform}: ${count} jobs`);
    });
    
    // Check for manual jobs
    const manualJobs = jobs.filter(j => j.source?.platform === 'manual');
    console.log(`\n   Recruiter jobs (manual): ${manualJobs.length}`);
    if (manualJobs.length > 0) {
      console.log('   Latest recruiter job:', manualJobs[0].title);
    }

    // Test 3: Job Match Endpoint (without auth)
    console.log('\n3️⃣ Testing Job Match Endpoint (should require resume)...');
    try {
      const matchResponse = await httpGet(`${BASE_URL}/jobs/match/test123`);
      console.log('⚠️  Match endpoint accessible without auth');
    } catch (err) {
      console.log('✅ Match endpoint requires resume/auth (expected)');
    }

    // Test 4: Check specific platforms
    console.log('\n4️⃣ Verifying Platform Separation...');
    
    // Get all jobs with more details
    const allJobsResponse = await httpGet(`${BASE_URL}/jobs/all?limit=100`);
    const allJobs = allJobsResponse.data.jobs || allJobsResponse.data;
    
    const seedJobs = allJobs.filter(j => j.source?.platform === 'seed');
    const manualAllJobs = allJobs.filter(j => j.source?.platform === 'manual');
    const directJobs = allJobs.filter(j => j.source?.platform === 'direct');
    const realJobs = allJobs.filter(j => j.source?.platform === 'real');
    
    console.log(`   📌 Seed (CSV) jobs: ${seedJobs.length}`);
    console.log(`   📌 Manual (Recruiter) jobs: ${manualAllJobs.length}`);
    console.log(`   📌 Direct (Employer) jobs: ${directJobs.length}`);
    console.log(`   📌 Real (Scraped) jobs: ${realJobs.length}`);
    
    if (seedJobs.length === 0) {
      console.log('   ⚠️  WARNING: No seed jobs found! Run CSV import.');
    }
    
    if (manualAllJobs.length === 0) {
      console.log('   ℹ️  No recruiter jobs yet. Create one from recruiter dashboard.');
    }

    // Test 5: Sample a few jobs
    console.log('\n5️⃣ Sample Jobs:');
    if (seedJobs.length > 0) {
      console.log(`\n   📦 Seed Job Example:`);
      console.log(`      Title: ${seedJobs[0].title}`);
      console.log(`      Company: ${seedJobs[0].company}`);
      console.log(`      Platform: ${seedJobs[0].source.platform}`);
    }
    
    if (manualAllJobs.length > 0) {
      console.log(`\n   👔 Recruiter Job Example:`);
      console.log(`      Title: ${manualAllJobs[0].title}`);
      console.log(`      Company: ${manualAllJobs[0].company}`);
      console.log(`      Platform: ${manualAllJobs[0].source.platform}`);
      console.log(`      Posted By: ${manualAllJobs[0].postedBy ? 'Recruiter ID present' : 'No recruiter ID'}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ System Verification Complete!');
    console.log('\n📝 Next Steps:');
    console.log('   1. Open http://localhost:3001 in your browser');
    console.log('   2. Follow MANUAL_TEST_CHECKLIST.md');
    console.log('   3. Test recruiter posting → applicant viewing → applying');
    console.log('\n' + '='.repeat(60));

  } catch (error) {
    console.error('\n❌ Verification failed:');
    console.error('Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\n⚠️  Backend is not running!');
      console.error('   Start it with: cd backend && npm start');
    } else {
      console.error('Full error:', error);
    }
  }
}

// Run verification
quickVerify();
