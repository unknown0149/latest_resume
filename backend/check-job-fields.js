import mongoose from 'mongoose';

mongoose.connect('mongodb://localhost:27017/resume_analyzer', {}).then(() => {
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
    // Get samples from each platform
    console.log('\n--- Sample from each platform ---\n');
    
    const platforms = ['seed', 'real', 'manual', 'linkedin'];
    
    for (const platform of platforms) {
      const sample = await Job.findOne({ 
        status: 'active',
        'source.platform': platform
      }).lean();
      
      if (sample) {
        console.log(`\n=== Platform: ${platform} ===`);
        console.log(`Title: ${sample.title}`);
        console.log(`Company: ${sample.company}`);
        console.log(`Source:`, sample.source);
        console.log(`Has postedBy: ${!!sample.postedBy}`);
        console.log(`Has organizationId: ${!!sample.organizationId}`);
        console.log(`Has source.origin: ${sample.source?.origin}`);
        console.log(`Has source.type: ${sample.source?.type}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Done');
    process.exit(0);
  }
}
