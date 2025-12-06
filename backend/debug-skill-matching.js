/**
 * Debug skill matching
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import Resume from './src/models/Resume.js';
import { canonicalizeSkillName, expandSkillSynonyms } from './src/services/intelligentJobMatchingService.js';

const MONGODB_URI = process.env.MONGODB_URI;

async function debugSkillMatching() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');
    
    const resume = await Resume.findOne().sort({ createdAt: -1 }).limit(1);
    const userSkills = resume.parsed_resume?.skills || [];
    
    console.log('📋 User Skills (from resume):');
    userSkills.forEach((skill, idx) => {
      const canonical = canonicalizeSkillName(skill);
      const synonyms = expandSkillSynonyms(skill);
      console.log(`   ${idx + 1}. "${skill}" → canonical: "${canonical}"`);
      console.log(`      Synonyms: [${synonyms.join(', ')}]\n`);
    });
    
    console.log('\n📋 Required Skills (Full Stack Developer):');
    const requiredSkills = ['JavaScript', 'React', 'Node.js', 'SQL', 'REST API', 'Git'];
    requiredSkills.forEach((skill, idx) => {
      const canonical = canonicalizeSkillName(skill);
      const synonyms = expandSkillSynonyms(skill);
      console.log(`   ${idx + 1}. "${skill}" → canonical: "${canonical}"`);
      console.log(`      Synonyms: [${synonyms.join(', ')}]\n`);
    });
    
    console.log('\n📋 Preferred Skills (Full Stack Developer):');
    const preferredSkills = ['TypeScript', 'Express.js', 'MongoDB', 'Docker', 'AWS', 'PostgreSQL', 'Redux', 'Next.js', 'Tailwind CSS', 'Jest', 'CI/CD'];
    preferredSkills.forEach((skill, idx) => {
      const canonical = canonicalizeSkillName(skill);
      const synonyms = expandSkillSynonyms(skill);
      console.log(`   ${idx + 1}. "${skill}" → canonical: "${canonical}"`);
      console.log(`      Synonyms: [${synonyms.join(', ')}]\n`);
    });
    
    console.log('\n🔍 Matching Test:');
    console.log('─'.repeat(70));
    
    const matchesSkill = (candidateSkill, targetSkill) => {
      if (!candidateSkill || !targetSkill) return false;
      const candLower = candidateSkill.toLowerCase().trim();
      const targLower = targetSkill.toLowerCase().trim();
      if (!candLower || !targLower) return false;

      // Exact match (case-insensitive)
      if (candLower === targLower) {
        console.log(`      ✅ MATCH (exact match)\n`);
        return true;
      }

      // Canonical match (e.g., "js" === "javascript")
      const canonicalCandidate = canonicalizeSkillName(candidateSkill);
      const canonicalTarget = canonicalizeSkillName(targetSkill);
      
      console.log(`   Comparing: "${candidateSkill}" vs "${targetSkill}"`);
      console.log(`      Canonical: "${canonicalCandidate}" vs "${canonicalTarget}"`);
      
      if (canonicalCandidate && canonicalTarget && canonicalCandidate === canonicalTarget) {
        console.log(`      ✅ MATCH (canonical equal)\n`);
        return true;
      }

      // Synonym match (e.g., "reactjs" in ["react", "reactjs", "react.js"])
      const candidateTokens = expandSkillSynonyms(candidateSkill);
      const targetTokens = expandSkillSynonyms(targetSkill);
      const hasOverlap = candidateTokens.some(token => targetTokens.includes(token));
      
      if (hasOverlap) {
        console.log(`      ✅ MATCH (synonym overlap)\n`);
        return true;
      }
      
      // Word boundary substring match (prevents "java" matching "javascript")
      const wordBoundary = (text, search) => {
        const regex = new RegExp(`\\b${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        return regex.test(text);
      };
      
      if (wordBoundary(candLower, targLower) || wordBoundary(targLower, candLower)) {
        console.log(`      ✅ MATCH (word boundary substring)\n`);
        return true;
      }
      
      console.log(`      ❌ NO MATCH\n`);
      return false;
    };
    
    console.log('\nChecking if user has required skills:\n');
    requiredSkills.forEach(reqSkill => {
      const hasSkill = userSkills.some(userSkill => matchesSkill(userSkill, reqSkill));
      console.log(`   ${hasSkill ? '✅' : '❌'} "${reqSkill}": ${hasSkill ? 'FOUND' : 'MISSING'}\n`);
    });
    
    process.exit(0);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

debugSkillMatching();
