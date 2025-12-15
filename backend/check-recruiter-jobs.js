import mongoose from 'mongoose';
import Job from './src/models/Job.js';

const MONGODB_URI = 'mongodb://localhost:27017/resume_analyzer';

async function checkRecruiterJobs() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Check all jobs with platform manual
    const manualJobs = await Job.find({ 'source.platform': 'manual' })
      .select('jobId title company status postedBy organizationId source createdAt')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    console.log(`📌 Found ${manualJobs.length} jobs with platform='manual':\n`);
    
    manualJobs.forEach((job, index) => {
      console.log(`${index + 1}. ${job.title}`);
      console.log(`   JobID: ${job.jobId}`);
      console.log(`   Company: ${job.company?.name || job.company}`);
      console.log(`   Status: ${job.status}`);
      console.log(`   Platform: ${job.source?.platform}`);
      console.log(`   PostedBy: ${job.postedBy ? job.postedBy.toString() : 'MISSING ⚠️'}`);
      console.log(`   OrgID: ${job.organizationId ? job.organizationId.toString() : 'none'}`);
      console.log(`   Created: ${job.createdAt}`);
      console.log('');
    });

    // Check all active jobs
    const allActive = await Job.countDocuments({ status: 'active' });
    const activeManual = await Job.countDocuments({ status: 'active', 'source.platform': 'manual' });
    const activeSeed = await Job.countDocuments({ status: 'active', 'source.platform': 'seed' });
    const activeReal = await Job.countDocuments({ status: 'active', 'source.platform': 'real' });

    console.log('📊 Job Platform Breakdown:');
    console.log(`   Total Active: ${allActive}`);
    console.log(`   Manual (Recruiter): ${activeManual}`);
    console.log(`   Seed (CSV): ${activeSeed}`);
    console.log(`   Real (Scraped): ${activeReal}`);
    console.log('');

    // Check if any jobs have postedBy field
    const jobsWithPostedBy = await Job.countDocuments({ postedBy: { $exists: true, $ne: null } });
    console.log(`✅ Jobs with postedBy field: ${jobsWithPostedBy}`);

    // Check recent jobs
    const recentJobs = await Job.find({ status: 'active' })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title source.platform postedBy createdAt')
      .lean();

    console.log('\n📅 5 Most Recent Active Jobs:');
    recentJobs.forEach((job, i) => {
      console.log(`   ${i + 1}. ${job.title} [${job.source?.platform}] ${job.postedBy ? '✓' : '✗'}`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Done');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkRecruiterJobs();
