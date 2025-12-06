/**
 * Check specific resume by ID
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import Resume from './src/models/Resume.js';

const MONGODB_URI = process.env.MONGODB_URI;

async function checkSpecificResume() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');
    
    const resumeId = '90fb75e6-9df3-4d73-a40a-de31a5e3de06';
    const resume = await Resume.findOne({ resumeId });
    
    if (!resume) {
      console.log('❌ Resume not found');
      return;
    }
    
    console.log('📄 Resume ID:', resume.resumeId);
    console.log('📅 Created:', resume.createdAt.toLocaleString());
    console.log('\n');
    
    console.log('📋 SKILLS EXTRACTED:');
    console.log('─'.repeat(70));
    const skills = resume.parsed_resume?.skills || [];
    console.log(`Total: ${skills.length}\n`);
    skills.forEach((skill, idx) => {
      console.log(`   ${idx + 1}. ${skill}`);
    });
    
    console.log('\n\n📦 PROVIDED SKILLS:');
    console.log('─'.repeat(70));
    if (resume.providedSkills && resume.providedSkills.length > 0) {
      resume.providedSkills.forEach((skill, idx) => {
        console.log(`   ${idx + 1}. ${typeof skill === 'object' ? JSON.stringify(skill) : skill}`);
      });
    } else {
      console.log('   None');
    }
    
    console.log('\n\n📊 SKILL ANALYSIS:');
    console.log('─'.repeat(70));
    if (resume.skillAnalysis) {
      console.log('\nSkills Have:');
      if (resume.skillAnalysis.skillsHave && resume.skillAnalysis.skillsHave.length > 0) {
        resume.skillAnalysis.skillsHave.forEach((skill, idx) => {
          console.log(`   ${idx + 1}. ${skill.skill} (${skill.level}, ${skill.proficiency}%)`);
        });
      } else {
        console.log('   None');
      }
      
      console.log('\nSkills Missing:');
      if (resume.skillAnalysis.skillsMissing && resume.skillAnalysis.skillsMissing.length > 0) {
        resume.skillAnalysis.skillsMissing.slice(0, 15).forEach((skill, idx) => {
          const priority = skill.priority === 3 ? 'HIGH' : skill.priority === 2 ? 'MED' : 'LOW';
          console.log(`   ${idx + 1}. ${skill.skill} (${priority}, ${skill.type})`);
        });
        if (resume.skillAnalysis.skillsMissing.length > 15) {
          console.log(`   ... and ${resume.skillAnalysis.skillsMissing.length - 15} more`);
        }
      } else {
        console.log('   None');
      }
    } else {
      console.log('   No skill analysis stored');
    }
    
    console.log('\n\n🎯 RECOMMENDED ROLE:');
    console.log('─'.repeat(70));
    if (resume.recommendedRole) {
      console.log(`   ${resume.recommendedRole.role || 'N/A'}`);
      console.log(`   Match: ${resume.recommendedRole.matchScore || 0}%`);
    } else {
      console.log('   None');
    }
    
    console.log('\n\n📝 RAW TEXT (first 1000 chars):');
    console.log('─'.repeat(70));
    if (resume.parsed_resume?.rawText) {
      console.log(resume.parsed_resume.rawText.substring(0, 1000));
    } else {
      console.log('   No raw text');
    }
    
    console.log('\n');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkSpecificResume();
