/**
 * Check resume parsing details
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import Resume from './src/models/Resume.js';

const MONGODB_URI = process.env.MONGODB_URI;

console.log('\n🔍 Resume Parsing Details\n');
console.log('═'.repeat(70));

async function checkResume() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    const resume = await Resume.findOne().sort({ createdAt: -1 }).limit(1);
    
    if (!resume) {
      console.log('❌ No resumes found');
      return;
    }
    
    console.log('📄 Resume ID:', resume.resumeId);
    console.log('📅 Created:', resume.createdAt.toLocaleString());
    console.log('👤 User:', resume.userId);
    console.log('📁 File:', resume.fileName);
    console.log('\n');
    
    // Show parsed_resume structure
    console.log('📋 PARSED RESUME DATA:');
    console.log('─'.repeat(70));
    
    if (resume.parsed_resume) {
      console.log('\n1️⃣  Basic Info:');
      console.log('   Name:', resume.parsed_resume.name || 'N/A');
      console.log('   Email:', resume.parsed_resume.email || 'N/A');
      console.log('   Phone:', resume.parsed_resume.phone || 'N/A');
      console.log('   Location:', resume.parsed_resume.location || 'N/A');
      
      console.log('\n2️⃣  Skills (parsed_resume.skills):');
      if (resume.parsed_resume.skills && resume.parsed_resume.skills.length > 0) {
        resume.parsed_resume.skills.forEach((skill, idx) => {
          console.log(`   ${idx + 1}. ${typeof skill === 'object' ? JSON.stringify(skill) : skill}`);
        });
      } else {
        console.log('   ⚠️  No skills in parsed_resume.skills');
      }
      
      console.log('\n3️⃣  Technical Skills (parsed_resume.technical_skills):');
      if (resume.parsed_resume.technical_skills) {
        console.log('   ', JSON.stringify(resume.parsed_resume.technical_skills, null, 2));
      } else {
        console.log('   ⚠️  No technical_skills field');
      }
      
      console.log('\n4️⃣  Summary:');
      console.log('   ', resume.parsed_resume.summary || 'N/A');
      
      console.log('\n5️⃣  Education:');
      if (resume.parsed_resume.education && resume.parsed_resume.education.length > 0) {
        resume.parsed_resume.education.forEach((edu, idx) => {
          console.log(`   ${idx + 1}. ${edu.degree || edu.institution || JSON.stringify(edu)}`);
        });
      } else {
        console.log('   ⚠️  No education');
      }
      
      console.log('\n6️⃣  Work Experience:');
      if (resume.parsed_resume.work_experience && resume.parsed_resume.work_experience.length > 0) {
        resume.parsed_resume.work_experience.forEach((work, idx) => {
          console.log(`   ${idx + 1}. ${work.title || work.company || JSON.stringify(work)}`);
        });
      } else {
        console.log('   ⚠️  No work experience');
      }
      
      console.log('\n7️⃣  Projects:');
      if (resume.parsed_resume.projects && resume.parsed_resume.projects.length > 0) {
        resume.parsed_resume.projects.forEach((project, idx) => {
          console.log(`   ${idx + 1}. ${project.name || project.title || JSON.stringify(project)}`);
        });
      } else {
        console.log('   ⚠️  No projects');
      }
      
      console.log('\n8️⃣  Certifications:');
      if (resume.parsed_resume.certifications && resume.parsed_resume.certifications.length > 0) {
        resume.parsed_resume.certifications.forEach((cert, idx) => {
          console.log(`   ${idx + 1}. ${cert.name || cert.title || JSON.stringify(cert)}`);
        });
      } else {
        console.log('   ⚠️  No certifications');
      }
      
      console.log('\n9️⃣  Raw Text (first 500 chars):');
      if (resume.parsed_resume.rawText) {
        console.log('   ', resume.parsed_resume.rawText.substring(0, 500));
      } else {
        console.log('   ⚠️  No raw text');
      }
      
    } else {
      console.log('❌ No parsed_resume data!');
    }
    
    // Show providedSkills
    console.log('\n\n📦 PROVIDED SKILLS (from upload):');
    console.log('─'.repeat(70));
    if (resume.providedSkills && resume.providedSkills.length > 0) {
      resume.providedSkills.forEach((skill, idx) => {
        console.log(`   ${idx + 1}. ${typeof skill === 'object' ? JSON.stringify(skill) : skill}`);
      });
    } else {
      console.log('   ⚠️  No providedSkills');
    }
    
    // Show skillAnalysis
    console.log('\n\n📊 SKILL ANALYSIS:');
    console.log('─'.repeat(70));
    if (resume.skillAnalysis) {
      console.log('\n   Skills Have:');
      if (resume.skillAnalysis.skillsHave && resume.skillAnalysis.skillsHave.length > 0) {
        resume.skillAnalysis.skillsHave.slice(0, 10).forEach((skill, idx) => {
          console.log(`      ${idx + 1}. ${skill.skill} (${skill.level}, ${skill.proficiency}%)`);
        });
      } else {
        console.log('      ⚠️  None');
      }
      
      console.log('\n   Skills Missing:');
      if (resume.skillAnalysis.skillsMissing && resume.skillAnalysis.skillsMissing.length > 0) {
        resume.skillAnalysis.skillsMissing.slice(0, 10).forEach((skill, idx) => {
          console.log(`      ${idx + 1}. ${skill.skill} (${skill.type}, priority: ${skill.priority})`);
        });
      } else {
        console.log('      ⚠️  None');
      }
    } else {
      console.log('   ⚠️  No skillAnalysis');
    }
    
    // Show embedding info
    console.log('\n\n🔢 EMBEDDING:');
    console.log('─'.repeat(70));
    console.log('   Has embedding:', !!resume.embedding);
    if (resume.embedding) {
      console.log('   Embedding dimensions:', resume.embedding.length);
    }
    
    console.log('\n' + '═'.repeat(70));
    console.log('✅ Analysis Complete\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkResume();
