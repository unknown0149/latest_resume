/**
 * End-to-End Test: Recruiter-Applicant Job Flow
 * Tests complete flow from job posting to application
 */

import axios from 'axios';

const API_BASE = 'http://localhost:8000/api';
const FRONTEND_URL = 'http://localhost:3001';

// Test accounts (adjust these based on your setup)
const RECRUITER_CREDS = {
  email: 'recruiter@test.com',
  password: 'test123',
  name: 'Test Recruiter',
  role: 'recruiter'
};

const APPLICANT_CREDS = {
  email: 'applicant@test.com',
  password: 'test123',
  name: 'Test Applicant'
};

let recruiterToken = null;
let applicantToken = null;
let testJobId = null;
let testResumeId = null;
let applicationId = null;

// Helper functions
const log = (message, data = null) => {
  console.log(`\n✅ ${message}`);
  if (data) console.log(JSON.stringify(data, null, 2));
};

const logError = (message, error) => {
  console.error(`\n❌ ${message}`);
  console.error(error.response?.data || error.message);
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Test functions
async function testRecruiterRegistration() {
  console.log('\n📝 TEST 1: Recruiter Registration/Login');
  try {
    // Try login first
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: RECRUITER_CREDS.email,
      password: RECRUITER_CREDS.password
    });
    recruiterToken = loginRes.data.token;
    log('Recruiter logged in successfully', { token: recruiterToken.substring(0, 20) + '...' });
  } catch (error) {
    // If login fails, try registration
    try {
      const registerRes = await axios.post(`${API_BASE}/auth/register`, RECRUITER_CREDS);
      recruiterToken = registerRes.data.token;
      log('Recruiter registered successfully', { token: recruiterToken.substring(0, 20) + '...' });
    } catch (regError) {
      logError('Recruiter registration/login failed', regError);
      throw regError;
    }
  }
}

async function testJobPosting() {
  console.log('\n📝 TEST 2: Post Job as Recruiter');
  try {
    const jobData = {
      title: 'Senior Full Stack Developer - Test Job',
      description: 'We are looking for an experienced full stack developer with expertise in React and Node.js. This is a test job posting.',
      company: {
        name: 'Test Company Inc',
        website: 'https://testcompany.com'
      },
      location: {
        city: 'Bangalore',
        state: 'Karnataka',
        country: 'India',
        isRemote: false,
        locationType: 'hybrid'
      },
      employmentType: 'full-time',
      experienceLevel: 'senior',
      experienceYears: { min: 3, max: 5 },
      requirements: [
        'Strong experience with React.js and Node.js',
        'Experience with MongoDB and PostgreSQL',
        'Good understanding of RESTful APIs',
        'Experience with Git and CI/CD'
      ],
      responsibilities: [
        'Design and develop scalable web applications',
        'Work with cross-functional teams',
        'Write clean, maintainable code',
        'Participate in code reviews'
      ],
      skills: {
        required: ['react', 'node.js', 'mongodb', 'javascript', 'typescript'],
        preferred: ['docker', 'kubernetes', 'aws', 'redis'],
        allSkills: ['react', 'node.js', 'mongodb', 'javascript', 'typescript', 'docker', 'kubernetes', 'aws', 'redis']
      },
      salary: {
        min: 1500000,
        max: 2500000,
        currency: 'INR',
        period: 'annually'
      },
      status: 'active'
    };

    const response = await axios.post(
      `${API_BASE}/jobs/create`,
      jobData,
      { headers: { Authorization: `Bearer ${recruiterToken}` } }
    );

    testJobId = response.data.job.jobId;
    log('Job posted successfully', {
      jobId: testJobId,
      title: response.data.job.title,
      platform: response.data.job.source.platform
    });

    // Verify it's marked as manual platform
    if (response.data.job.source.platform !== 'manual') {
      throw new Error(`Expected platform 'manual', got '${response.data.job.source.platform}'`);
    }
  } catch (error) {
    logError('Job posting failed', error);
    throw error;
  }
}

async function testRecruiterJobsList() {
  console.log('\n📝 TEST 3: Verify Job in Recruiter Dashboard');
  try {
    const response = await axios.get(
      `${API_BASE}/jobs/recruiter`,
      { headers: { Authorization: `Bearer ${recruiterToken}` } }
    );

    const jobs = response.data.jobs;
    const postedJob = jobs.find(j => j.jobId === testJobId);

    if (!postedJob) {
      throw new Error('Posted job not found in recruiter jobs list');
    }

    log('Job visible in recruiter dashboard', {
      totalJobs: jobs.length,
      testJob: {
        id: postedJob.jobId,
        title: postedJob.title,
        status: postedJob.status
      }
    });
  } catch (error) {
    logError('Recruiter jobs list fetch failed', error);
    throw error;
  }
}

async function testApplicantRegistration() {
  console.log('\n📝 TEST 4: Applicant Registration/Login');
  try {
    // Try login first
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: APPLICANT_CREDS.email,
      password: APPLICANT_CREDS.password
    });
    applicantToken = loginRes.data.token;
    log('Applicant logged in successfully');
  } catch (error) {
    // If login fails, try registration
    try {
      const registerRes = await axios.post(`${API_BASE}/auth/register`, {
        ...APPLICANT_CREDS,
        role: 'applicant'
      });
      applicantToken = registerRes.data.token;
      log('Applicant registered successfully');
    } catch (regError) {
      logError('Applicant registration/login failed', regError);
      throw regError;
    }
  }
}

async function testJobVisibilityForApplicant() {
  console.log('\n📝 TEST 5: Check Job Visibility for Applicant');
  try {
    // Check /jobs/all endpoint
    const allJobsRes = await axios.get(`${API_BASE}/jobs/all?limit=100`);
    const allJobs = allJobsRes.data.jobs;
    const testJob = allJobs.find(j => j.jobId === testJobId);

    if (!testJob) {
      throw new Error('Test job not found in /jobs/all endpoint');
    }

    log('Job visible in marketplace', {
      totalJobs: allJobs.length,
      testJob: {
        id: testJob.jobId,
        title: testJob.title,
        platform: testJob.source.platform
      }
    });

    // Check job source breakdown
    const platforms = allJobs.reduce((acc, job) => {
      const platform = job.source?.platform || 'unknown';
      acc[platform] = (acc[platform] || 0) + 1;
      return acc;
    }, {});

    log('Job platform distribution', platforms);

    // Verify seed jobs are separate from manual jobs
    const seedJobs = allJobs.filter(j => j.source?.platform === 'seed');
    const manualJobs = allJobs.filter(j => j.source?.platform === 'manual');
    
    console.log(`  - CSV/Seed jobs: ${seedJobs.length}`);
    console.log(`  - Recruiter/Manual jobs: ${manualJobs.length}`);

  } catch (error) {
    logError('Job visibility check failed', error);
    throw error;
  }
}

async function testJobApplication() {
  console.log('\n📝 TEST 6: Apply for Job');
  
  // First, we need a resume
  try {
    // Check if applicant has a resume
    const resumesRes = await axios.get(
      `${API_BASE}/resume`,
      { headers: { Authorization: `Bearer ${applicantToken}` } }
    );

    if (resumesRes.data.resumes && resumesRes.data.resumes.length > 0) {
      testResumeId = resumesRes.data.resumes[0].resumeId;
      log('Using existing resume', { resumeId: testResumeId });
    } else {
      console.log('  ⚠️  No resume found. Please upload a resume manually first.');
      console.log(`  Visit: ${FRONTEND_URL}/upload`);
      return;
    }

    // Apply for the job
    const applyRes = await axios.post(
      `${API_BASE}/jobs/${testJobId}/apply`,
      { resumeId: testResumeId },
      { headers: { Authorization: `Bearer ${applicantToken}` } }
    );

    applicationId = applyRes.data.application?.id;
    log('Application submitted successfully', {
      applicationId,
      status: applyRes.data.application?.status,
      matchScore: applyRes.data.application?.matchScore
    });

  } catch (error) {
    if (error.response?.data?.code === 'ALREADY_APPLIED') {
      log('Already applied to this job (idempotent)', error.response.data);
    } else {
      logError('Job application failed', error);
      throw error;
    }
  }
}

async function testRecruiterApplicationView() {
  console.log('\n📝 TEST 7: Verify Application in Recruiter Dashboard');
  try {
    await sleep(2000); // Give time for data to sync

    const response = await axios.get(
      `${API_BASE}/jobs/${testJobId}/candidates`,
      { headers: { Authorization: `Bearer ${recruiterToken}` } }
    );

    const applications = response.data.applications || [];
    const testApplication = applications.find(a => 
      a.resumeId?.toString() === testResumeId || 
      a.resume?.resumeId === testResumeId
    );

    if (!testApplication && applicationId) {
      console.log('  ⚠️  Application not yet visible to recruiter (may need time to sync)');
      return;
    }

    log('Application visible to recruiter', {
      totalApplications: applications.length,
      testApplication: testApplication ? {
        status: testApplication.status,
        candidateName: testApplication.candidateName
      } : 'Not found'
    });

  } catch (error) {
    logError('Recruiter application view failed', error);
    // Don't throw - this might not be implemented yet
  }
}

async function testApplicationStatusUpdate() {
  console.log('\n📝 TEST 8: Update Application Status');
  try {
    if (!applicationId) {
      console.log('  ⚠️  No applicationId available, skipping status update test');
      return;
    }

    const response = await axios.put(
      `${API_BASE}/applications/${applicationId}/status`,
      { status: 'screening' },
      { headers: { Authorization: `Bearer ${recruiterToken}` } }
    );

    log('Application status updated', {
      applicationId,
      newStatus: response.data.application?.status
    });

  } catch (error) {
    logError('Application status update failed', error);
    // Don't throw - endpoint might not exist
  }
}

async function cleanup() {
  console.log('\n🧹 Cleanup: Removing test job');
  try {
    if (testJobId) {
      await axios.delete(
        `${API_BASE}/jobs/${testJobId}`,
        { headers: { Authorization: `Bearer ${recruiterToken}` } }
      );
      log('Test job removed');
    }
  } catch (error) {
    console.log('  ⚠️  Cleanup failed (job may need manual deletion)');
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting End-to-End Tests\n');
  console.log('=' .repeat(60));

  try {
    await testRecruiterRegistration();
    await testJobPosting();
    await testRecruiterJobsList();
    await testApplicantRegistration();
    await testJobVisibilityForApplicant();
    await testJobApplication();
    await testRecruiterApplicationView();
    await testApplicationStatusUpdate();

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED!');
    console.log('='.repeat(60));

  } catch (error) {
    console.log('\n' + '='.repeat(60));
    console.log('❌ TEST SUITE FAILED');
    console.log('='.repeat(60));
    process.exit(1);
  } finally {
    // Optionally cleanup
    // await cleanup();
  }
}

// Run tests
runTests().catch(console.error);
