/**
 * Test MongoDB Connection
 */

import mongoose from 'mongoose';
import { logger } from './src/utils/logger.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://devilhunter0149_db_user:fTK3DOPKe539Moeu@resumeproject.ebu1owj.mongodb.net/resume_analyzer?retryWrites=true&w=majority&appName=Resumeproject';

console.log('Testing MongoDB connection...\n');

try {
  const conn = await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    heartbeatFrequencyMS: 10000,
    maxPoolSize: 10
  });
  
  console.log('✅ MongoDB Connected Successfully!');
  console.log('Host:', conn.connection.host);
  console.log('Database:', conn.connection.name);
  console.log('Ready State:', mongoose.connection.readyState, '(1 = connected)');
  
  // Test a simple query
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log('\nAvailable Collections:', collections.length);
  collections.forEach(col => console.log('  -', col.name));
  
  // Check Resume collection
  const Resume = mongoose.connection.collection('resumes');
  const resumeCount = await Resume.countDocuments();
  console.log('\nResume documents:', resumeCount);
  
  // Check Job collection
  const Job = mongoose.connection.collection('jobs');
  const jobCount = await Job.countDocuments();
  console.log('Job documents:', jobCount);
  
  await mongoose.connection.close();
  console.log('\n✅ Connection test completed successfully!');
  
} catch (error) {
  console.log('\n❌ MongoDB Connection Failed!');
  console.log('Error:', error.message);
  
  if (error.name === 'MongoServerSelectionError') {
    console.log('\nPossible causes:');
    console.log('  - Network connectivity issues');
    console.log('  - MongoDB Atlas IP whitelist (ensure 0.0.0.0/0 is allowed)');
    console.log('  - Incorrect credentials');
    console.log('  - MongoDB cluster is paused');
  }
  
  process.exit(1);
}
