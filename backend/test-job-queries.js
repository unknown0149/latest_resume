import mongoose from 'mongoose';

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/resume_analyzer', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ Connected to MongoDB');
  runTests();
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

const JobSchema = new mongoose.Schema({}, { strict: false, collection: 'jobs' });
const Job = mongoose.model('Job', JobSchema);

async function runTests() {
  try {
    // Count total active jobs
    const totalActive = await Job.countDocuments({ status: 'active' });
    console.log(`\n📊 Total active jobs: ${totalActive}`);
    
    // Count jobs WITHOUT postedBy (Live/CSV jobs)
    const liveJobs = await Job.countDocuments({ 
      status: 'active', 
      postedBy: { $exists: false } 
    });
    console.log(`📊 Live jobs (no postedBy): ${liveJobs}`);
    
    // Count jobs WITH postedBy (Recruiter jobs)
    const recruiterJobs = await Job.countDocuments({ 
      status: 'active', 
      postedBy: { $exists: true, $ne: null } 
    });
    console.log(`📊 Recruiter jobs (with postedBy): ${recruiterJobs}`);
    
    // Show sample of each type
    console.log('\n--- Sample Live Job ---');
    const sampleLive = await Job.findOne({ 
      status: 'active', 
      postedBy: { $exists: false } 
    }).lean();
    if (sampleLive) {
      console.log(`Title: ${sampleLive.title}`);
      console.log(`Company: ${sampleLive.company}`);
      console.log(`Platform: ${sampleLive.source?.platform}`);
      console.log(`Has postedBy: ${!!sampleLive.postedBy}`);
    } else {
      console.log('No live jobs found!');
    }
    
    console.log('\n--- Sample Recruiter Job ---');
    const sampleRecruiter = await Job.findOne({ 
      status: 'active', 
      postedBy: { $exists: true, $ne: null } 
    }).lean();
    if (sampleRecruiter) {
      console.log(`Title: ${sampleRecruiter.title}`);
      console.log(`Company: ${sampleRecruiter.company}`);
      console.log(`Platform: ${sampleRecruiter.source?.platform}`);
      console.log(`Has postedBy: ${!!sampleRecruiter.postedBy}`);
      console.log(`PostedBy ID: ${sampleRecruiter.postedBy}`);
    } else {
      console.log('No recruiter jobs found!');
    }
    
    // Check platform distribution
    console.log('\n--- Platform Distribution ---');
    const platforms = await Job.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$source.platform', count: { $sum: 1 } } }
    ]);
    platforms.forEach(p => {
      console.log(`${p._id || 'null'}: ${p.count}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Done');
    process.exit(0);
  }
}
