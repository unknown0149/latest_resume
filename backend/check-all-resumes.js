/**
 * Check all resumes in database
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import Resume from './src/models/Resume.js';

const MONGODB_URI = process.env.MONGODB_URI;

async function checkAllResumes() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    const resumes = await Resume.find().sort({ createdAt: -1 }).limit(5);
    
    console.log(`📊 Total Resumes Found: ${resumes.length}\n`);
    console.log('═'.repeat(70));
    
    resumes.forEach((resume, idx) => {
      console.log(`\n${idx + 1}. Resume ID: ${resume.resumeId}`);
      console.log(`   Created: ${resume.createdAt.toLocaleString()}`);
      console.log(`   User: ${resume.userId}`);
      console.log(`   File: ${resume.fileName || 'N/A'}`);
      
      const skills = resume.parsed_resume?.skills || [];
      console.log(`   Skills (${skills.length}): ${skills.slice(0, 10).join(', ')}${skills.length > 10 ? '...' : ''}`);
      
      const hasAnalysis = !!resume.skillAnalysis;
      console.log(`   Has Skill Analysis: ${hasAnalysis ? 'Yes' : 'No'}`);
      
      const hasEmbedding = !!resume.embedding;
      console.log(`   Has Embedding: ${hasEmbedding ? 'Yes' : 'No'}`);
    });
    
    console.log('\n' + '═'.repeat(70));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkAllResumes();
