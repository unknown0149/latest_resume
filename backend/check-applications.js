import mongoose from 'mongoose';

mongoose.connect('mongodb://localhost:27017/resume_analyzer', {}).then(() => {
  console.log('✅ Connected to MongoDB');
  runTests();
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

const JobApplicationSchema = new mongoose.Schema({}, { strict: false, collection: 'jobapplications' });
const JobApplication = mongoose.model('JobApplication', JobApplicationSchema);

const JobSchema = new mongoose.Schema({}, { strict: false, collection: 'jobs' });
const Job = mongoose.model('Job', JobSchema);

async function runTests() {
  try {
    // Check job applications
    console.log('\n=== Job Applications ===');
    const applications = await JobApplication.find({}).lean();
    console.log(`Total applications: ${applications.length}`);
    
    if (applications.length > 0) {
      const sample = applications[0];
      console.log('\nSample application:');
      console.log(`- Application ID: ${sample._id}`);
      console.log(`- Job ID: ${sample.jobId}`);
      console.log(`- User ID: ${sample.userId}`);
      console.log(`- Organization ID: ${sample.organizationId}`);
      console.log(`- Status: ${sample.status}`);
      console.log(`- Created: ${sample.createdAt}`);
      
      // Check if the job exists
      if (sample.jobId) {
        const job = await Job.findById(sample.jobId).lean();
        if (job) {
          console.log('\nCorresponding job:');
          console.log(`- Title: ${job.title}`);
          console.log(`- Company: ${job.company?.name || job.company}`);
          console.log(`- Has organizationId: ${!!job.organizationId}`);
          console.log(`- organizationId value: ${job.organizationId}`);
          console.log(`- Has postedBy: ${!!job.postedBy}`);
          console.log(`- postedBy value: ${job.postedBy}`);
        } else {
          console.log('\n❌ Job not found!');
        }
      }
    } else {
      console.log('No applications found in database');
    }
    
    // Check organizations
    const OrgSchema = new mongoose.Schema({}, { strict: false, collection: 'organizations' });
    const Organization = mongoose.model('Organization', OrgSchema);
    
    console.log('\n=== Organizations ===');
    const orgs = await Organization.find({}).lean();
    console.log(`Total organizations: ${orgs.length}`);
    if (orgs.length > 0) {
      console.log('Organization IDs:');
      orgs.forEach(org => {
        console.log(`- ${org._id}: ${org.name} (${org.slug})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Done');
    process.exit(0);
  }
}
