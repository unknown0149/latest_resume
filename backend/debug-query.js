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
    // Test the exact query from the backend
    const query1 = { 
      status: 'active',
      postedBy: { $exists: false }
    };
    console.log('\n=== Testing query: { status: "active", postedBy: { $exists: false } } ===');
    const count1 = await Job.countDocuments(query1);
    console.log(`Result: ${count1} jobs`);
    
    // Test without postedBy filter
    const query2 = { 
      status: 'active'
    };
    console.log('\n=== Testing query: { status: "active" } ===');
    const count2 = await Job.countDocuments(query2);
    console.log(`Result: ${count2} jobs`);
    
    // Test with $or
    const query3 = { 
      status: 'active',
      $or: [
        { postedBy: { $exists: false } },
        { postedBy: null }
      ]
    };
    console.log('\n=== Testing query: { status: "active", $or: [{ postedBy: { $exists: false } }, { postedBy: null }] } ===');
    const count3 = await Job.countDocuments(query3);
    console.log(`Result: ${count3} jobs`);
    
    // Check one sample job structure
    console.log('\n=== Sample job structure ===');
    const sample = await Job.findOne({ status: 'active' }).lean();
    if (sample) {
      console.log('Fields:', Object.keys(sample));
      console.log('Has postedBy field?', 'postedBy' in sample);
      console.log('postedBy value:', sample.postedBy);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Done');
    process.exit(0);
  }
}
