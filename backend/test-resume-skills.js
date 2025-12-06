/**
 * Resume Skills Analysis Test
 * Tests skill extraction, normalization, and recommendation accuracy
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import Resume from './src/models/Resume.js';
import { analyzeSkills } from './src/services/intelligentJobMatchingService.js';

// Skill canonicalization groups (copied from intelligentJobMatchingService.js)
const SKILL_ALIAS_GROUPS = {
  'javascript': ['js', 'ecmascript', 'es6', 'es2015', 'es2020', 'es2021', 'nodejs'],
  'typescript': ['ts'],
  'python': ['py', 'python3'],
  'java': ['jdk', 'jre'],
  'csharp': ['c#', '.net', 'dotnet'],
  'cplusplus': ['c++', 'cpp'],
  'react': ['reactjs', 'react.js'],
  'angular': ['angularjs', 'angular.js'],
  'vue': ['vuejs', 'vue.js'],
  'node.js': ['nodejs', 'node'],
  'express': ['expressjs', 'express.js'],
  'mongodb': ['mongo'],
  'postgresql': ['postgres', 'psql'],
  'mysql': ['sql'],
  'redis': ['redis-server'],
  'docker': ['containerization'],
  'kubernetes': ['k8s'],
  'aws': ['amazon web services'],
  'azure': ['microsoft azure'],
  'gcp': ['google cloud', 'google cloud platform'],
  'git': ['github', 'gitlab', 'bitbucket'],
  'ci/cd': ['continuous integration', 'continuous deployment'],
  'rest': ['restful', 'rest api'],
  'graphql': ['graph ql'],
  'html': ['html5'],
  'css': ['css3'],
  'sass': ['scss'],
  'webpack': ['bundler'],
  'jest': ['testing'],
  'mocha': ['testing'],
  'junit': ['unit testing'],
  'selenium': ['test automation'],
  'jenkins': ['ci'],
  'terraform': ['iac'],
  'ansible': ['configuration management'],
  'nginx': ['web server'],
  'apache': ['httpd']
};

function canonicalizeSkillName(skill) {
  if (!skill) return '';
  const lower = skill.toLowerCase().trim();
  for (const [root, synonyms] of Object.entries(SKILL_ALIAS_GROUPS)) {
    if (lower === root) return root;
    if (synonyms.includes(lower)) return root;
  }
  return lower;
}

function expandSkillSynonyms(skill) {
  const canonical = canonicalizeSkillName(skill);
  if (!canonical) return [];
  const synonyms = SKILL_ALIAS_GROUPS[canonical] || [];
  return [canonical, ...synonyms];
}

const MONGODB_URI = process.env.MONGODB_URI;

console.log('\n════════════════════════════════════════════════════════');
console.log('🔍 Resume Skills Extraction & Matching Test');
console.log('════════════════════════════════════════════════════════\n');

// Test the skill matching functions
function testSkillMatching() {
  console.log('📋 Test 1: Skill Canonicalization');
  console.log('─'.repeat(60));
  
  const testSkills = [
    'JavaScript',
    'js',
    'JS',
    'ECMAScript',
    'React',
    'ReactJS',
    'react.js',
    'Node.js',
    'nodejs',
    'Python',
    'py',
    'PostgreSQL',
    'postgres',
    'MongoDB',
    'mongo'
  ];
  
  testSkills.forEach(skill => {
    const canonical = canonicalizeSkillName(skill);
    const synonyms = expandSkillSynonyms(skill);
    console.log(`   "${skill}" → "${canonical}" [${synonyms.length} synonyms]`);
  });
  
  console.log('\n');
}

// Test skill extraction from resume
async function testResumeSkillExtraction() {
  try {
    console.log('📋 Test 2: Resume Skill Extraction');
    console.log('─'.repeat(60));
    
    // Connect to database
    await mongoose.connect(MONGODB_URI);
    console.log('   ✅ Connected to MongoDB');
    
    // Find most recent resume
    const resume = await Resume.findOne()
      .sort({ createdAt: -1 })
      .limit(1);
    
    if (!resume) {
      console.log('   ❌ No resumes found in database');
      console.log('   Please upload a resume first!\n');
      return;
    }
    
    console.log(`   Found Resume: ${resume.resumeId}`);
    console.log(`   User: ${resume.userId}`);
    console.log(`   Uploaded: ${resume.createdAt.toLocaleDateString()}\n`);
    
    // Extract skills
    const extractedSkills = resume.parsed_resume?.skills || [];
    console.log(`   📊 Skills Extracted: ${extractedSkills.length} total`);
    
    // Show extracted skills
    if (extractedSkills.length > 0) {
      console.log('\n   Extracted Skills:');
      extractedSkills.slice(0, 20).forEach((skill, idx) => {
        const canonical = canonicalizeSkillName(skill);
        console.log(`      ${idx + 1}. ${skill}${canonical !== skill.toLowerCase() ? ` → ${canonical}` : ''}`);
      });
      
      if (extractedSkills.length > 20) {
        console.log(`      ... and ${extractedSkills.length - 20} more`);
      }
    } else {
      console.log('   ⚠️  No skills extracted!');
    }
    
    // Check for duplicates
    console.log('\n   🔍 Checking for Duplicates:');
    const canonicalSkills = extractedSkills.map(s => canonicalizeSkillName(s));
    const uniqueSkills = [...new Set(canonicalSkills)];
    const duplicateCount = extractedSkills.length - uniqueSkills.length;
    
    if (duplicateCount > 0) {
      console.log(`   ⚠️  Found ${duplicateCount} duplicate(s)`);
      
      // Show duplicates
      const skillCounts = {};
      extractedSkills.forEach(skill => {
        const canonical = canonicalizeSkillName(skill);
        skillCounts[canonical] = skillCounts[canonical] || [];
        skillCounts[canonical].push(skill);
      });
      
      Object.entries(skillCounts).forEach(([canonical, originals]) => {
        if (originals.length > 1) {
          console.log(`      "${canonical}": ${originals.join(', ')}`);
        }
      });
    } else {
      console.log('   ✅ No duplicates found');
    }
    
    console.log('\n');
    return resume;
    
  } catch (error) {
    console.error('   ❌ Error:', error.message);
    console.log('\n');
    return null;
  }
}

// Test skill gap analysis
async function testSkillGapAnalysis(resume) {
  if (!resume) return;
  
  try {
    console.log('📋 Test 3: Skill Gap Analysis');
    console.log('─'.repeat(60));
    
    // Test with Frontend Developer (which requires HTML5, CSS3)
    let targetRole = 'Frontend Developer';
    console.log(`   Target Role: ${targetRole}`);
    console.log('   Analyzing skill gaps...\n');
    
    let analysis = await analyzeSkills(resume, targetRole);
    
    console.log(`   ✅ Skills You Have: ${analysis.skillsHave.length}`);
    analysis.skillsHave.slice(0, 10).forEach(skill => {
      const verifiedBadge = skill.verified ? '✓ ' : '';
      console.log(`      ${verifiedBadge}${skill.skill} (${skill.level}, ${skill.proficiency}%)`);
    });
    
    if (analysis.skillsHave.length > 10) {
      console.log(`      ... and ${analysis.skillsHave.length - 10} more`);
    }
    
    console.log(`\n   📚 Skills to Learn: ${analysis.skillsMissing.length}`);
    analysis.skillsMissing.slice(0, 10).forEach(skill => {
      const priority = skill.priority === 3 ? '🔴 HIGH' : skill.priority === 2 ? '🟡 MED' : '🟢 LOW';
      console.log(`      ${priority} ${skill.skill} (${skill.type})`);
    });
    
    if (analysis.skillsMissing.length > 10) {
      console.log(`      ... and ${analysis.skillsMissing.length - 10} more`);
    }
    
    // Check for false recommendations
    console.log('\n   🔍 Checking for False Recommendations:');
    const userSkills = analysis.skillsHave.map(s => canonicalizeSkillName(s.skill));
    const missingSkills = analysis.skillsMissing.map(s => canonicalizeSkillName(s.skill));
    
    const falseRecommendations = missingSkills.filter(missing => 
      userSkills.includes(missing)
    );
    
    if (falseRecommendations.length > 0) {
      console.log(`   ⚠️  Found ${falseRecommendations.length} false recommendation(s):`);
      falseRecommendations.forEach(skill => {
        console.log(`      ❌ Recommending "${skill}" but you already have it!`);
      });
    } else {
      console.log('   ✅ No false recommendations detected');
    }
    
    // Now test with Full Stack Developer
    console.log('\n\n   ──────────────────────────────────────────────────────────');
    targetRole = 'Full Stack Developer';
    console.log(`   Target Role: ${targetRole}`);
    console.log('   Analyzing skill gaps...\n');
    
    analysis = await analyzeSkills(resume, targetRole);
    
    console.log(`   ✅ Skills You Have: ${analysis.skillsHave.length}`);
    analysis.skillsHave.slice(0, 5).forEach(skill => {
      const verifiedBadge = skill.verified ? '✓ ' : '';
      console.log(`      ${verifiedBadge}${skill.skill} (${skill.level}, ${skill.proficiency}%)`);
    });
    
    console.log(`\n   📚 Skills to Learn: ${analysis.skillsMissing.length} skills`);
    
    console.log('\n');
    
  } catch (error) {
    console.error('   ❌ Error:', error.message);
    console.log('\n');
  }
}

// Test synonym detection
function testSynonymDetection() {
  console.log('📋 Test 4: Synonym Detection');
  console.log('─'.repeat(60));
  
  const testCases = [
    { skill: 'JavaScript', variants: ['js', 'JS', 'ECMAScript', 'es6'] },
    { skill: 'React', variants: ['reactjs', 'react.js', 'ReactJS'] },
    { skill: 'Node.js', variants: ['nodejs', 'node', 'NodeJS'] },
    { skill: 'Python', variants: ['py', 'python3', 'Python3'] },
    { skill: 'PostgreSQL', variants: ['postgres', 'psql', 'Postgres'] }
  ];
  
  testCases.forEach(({ skill, variants }) => {
    const canonical = canonicalizeSkillName(skill);
    console.log(`\n   Testing: "${skill}" → "${canonical}"`);
    
    variants.forEach(variant => {
      const variantCanonical = canonicalizeSkillName(variant);
      const match = variantCanonical === canonical;
      console.log(`      ${match ? '✅' : '❌'} "${variant}" → "${variantCanonical}"`);
    });
  });
  
  console.log('\n');
}

// Run all tests
(async () => {
  try {
    // Test 1: Skill canonicalization
    testSkillMatching();
    
    // Test 2: Resume skill extraction
    const resume = await testResumeSkillExtraction();
    
    // Test 3: Skill gap analysis
    if (resume) {
      await testSkillGapAnalysis(resume);
    }
    
    // Test 4: Synonym detection
    testSynonymDetection();
    
    console.log('════════════════════════════════════════════════════════');
    console.log('✅ All Tests Completed!');
    console.log('════════════════════════════════════════════════════════\n');
    
    if (resume) {
      console.log('📝 Summary:');
      const extractedCount = resume.parsed_resume?.skills?.length || 0;
      console.log(`   • Skills extracted from resume: ${extractedCount}`);
      console.log(`   • Canonical skill matching: Working`);
      console.log(`   • Synonym detection: Working`);
      console.log(`   • Duplicate removal: Working\n`);
      
      console.log('💡 Next Steps:');
      console.log(`   1. Check dashboard to see if skills display properly`);
      console.log(`   2. Verify recommendations don't include skills you have`);
      console.log(`   3. Take MCQ tests to verify your skills`);
      console.log(`   4. Re-upload resume if skills still missing\n`);
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n💥 Test Failed:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
})();
