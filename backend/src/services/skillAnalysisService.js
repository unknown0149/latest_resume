/**
 * Skill Analysis Service
 * Analyzes resume skills against target role to identify gaps, levels, and salary boost opportunities
 */

import { normalizeSkillsArray, normalizeSkill, matchSkillsFuzzy } from '../utils/skillNormalizer.js';
import { getRoleByName } from '../data/roleSkillDatabase.js';
import { getTopSalaryBoostOpportunities, calculatePotentialIncrease } from '../data/salaryBoostSkills.js';
import { logger } from '../utils/logger.js';
import { generateRoadmap } from './roadmapService.js';

/**
 * Estimate skill proficiency level based on heuristics
 */
function estimateSkillLevel(skill, resumeText, skills) {
  const text = resumeText.toLowerCase();
  const skillLower = skill.toLowerCase();
  
  // Count mentions in resume
  const mentions = (text.match(new RegExp(skillLower, 'gi')) || []).length;
  
  // Check for level indicators
  const hasExpert = /expert|proficient|advanced|senior/i.test(resumeText);
  const hasIntermediate = /intermediate|working knowledge|familiar/i.test(resumeText);
  const hasBeginner = /beginner|basic|learning|exposure/i.test(resumeText);
  
  // Heuristic scoring
  if (mentions >= 3 || hasExpert) {
    return 'Advanced';
  } else if (mentions === 2 || hasIntermediate) {
    return 'Intermediate';
  } else if (mentions === 1 || hasBeginner) {
    return 'Beginner';
  } else {
    return 'Beginner'; // Default
  }
}

/**
 * Calculate skill gap priority
 */
function calculateSkillPriority(skill, roleData, salaryBoostData) {
  let priority = 0;
  let reasons = [];
  
  // Check if it's a required skill (high priority)
  if (roleData.requiredSkills.some(s => s.toLowerCase() === skill.toLowerCase())) {
    priority += 50;
    reasons.push('Required for role');
  }
  
  // Check if it's a preferred skill (medium priority)
  if (roleData.preferredSkills.some(s => s.toLowerCase() === skill.toLowerCase())) {
    priority += 30;
    reasons.push('Preferred for role');
  }
  
  // Check salary boost impact
  if (salaryBoostData) {
    const impactMatch = salaryBoostData.impact.percentage.match(/(\d+)-(\d+)/);
    if (impactMatch) {
      const avgImpact = (parseInt(impactMatch[1]) + parseInt(impactMatch[2])) / 2;
      priority += avgImpact / 2; // Scale down to 0-25 range
      reasons.push(`+${avgImpact}% salary impact`);
    }
  }
  
  return {
    priority: Math.min(priority, 100),
    reasons: reasons,
  };
}

/**
 * Check if a skill is verified by the user
 * @param {string} skill - Skill to check
 * @param {Array} verifiedSkills - Array of verified skill objects
 * @returns {Object|null} - Verification data if found, null otherwise
 */
function findVerifiedSkill(skill, verifiedSkills = []) {
  if (!Array.isArray(verifiedSkills) || verifiedSkills.length === 0) {
    return null;
  }
  
  const skillLower = skill.toLowerCase().trim();
  
  // Check exact match first
  let verified = verifiedSkills.find(v => 
    v.skill && v.skill.toLowerCase().trim() === skillLower
  );
  
  if (verified) return verified;
  
  // Check fuzzy match using normalizeSkill
  const normalizedSkill = normalizeSkillsArray([skill])[0];
  verified = verifiedSkills.find(v => {
    if (!v.skill) return false;
    const normalizedVerified = normalizeSkillsArray([v.skill])[0];
    return normalizedVerified === normalizedSkill;
  });
  
  return verified || null;
}

/**
 * Analyze skills for a specific target role
 * @param {Object} parsedResume - Resume data (can be full resume document)
 * @param {string} targetRoleName - Target job role
 * @param {Object} options - Additional options (verifiedSkills, userId, etc.)
 */
export async function analyzeSkills(parsedResume, targetRoleName, options = {}) {
  try {
    logger.info(`Analyzing skills for role: ${targetRoleName}`);
    
    // Get role data
    const roleData = getRoleByName(targetRoleName);
    if (!roleData) {
      throw new Error(`Role not found: ${targetRoleName}`);
    }
    
    // Extract verified skills from multiple sources
    let verifiedSkills = options.verifiedSkills || [];
    
    // Check if parsedResume has profile.skillVerifications
    if (parsedResume.profile?.skillVerifications?.length) {
      verifiedSkills = parsedResume.profile.skillVerifications.filter(v => 
        v.verified === true && v.score >= 70
      );
      logger.info(`Found ${verifiedSkills.length} verified skills from profile`);
    }
    
    // Also check parsed_resume.verification_status
    if (parsedResume.parsed_resume?.verification_status?.verifiedSkills?.length) {
      const additionalVerified = parsedResume.parsed_resume.verification_status.verifiedSkills;
      verifiedSkills = [...verifiedSkills, ...additionalVerified];
      // Deduplicate by skill name
      const seen = new Set();
      verifiedSkills = verifiedSkills.filter(v => {
        const key = v.skill?.toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      logger.info(`Total verified skills after merge: ${verifiedSkills.length}`);
    }
    
    // Extract and normalize resume skills
    const resumeSkills = [];
    if (parsedResume.extracted_text?.skills?.length) {
      resumeSkills.push(...parsedResume.extracted_text.skills);
    }
    if (parsedResume.parsed_data?.skills?.length) {
      resumeSkills.push(...parsedResume.parsed_data.skills);
    }
    if (parsedResume.parsed_resume?.skills?.length) {
      resumeSkills.push(...parsedResume.parsed_resume.skills);
    }
    
    // Add verified skills to resume skills (user has proven they know these)
    const verifiedSkillNames = verifiedSkills.map(v => v.skill).filter(Boolean);
    resumeSkills.push(...verifiedSkillNames);
    
    const normalizedSkills = normalizeSkillsArray([...new Set(resumeSkills)]);
    const resumeText = parsedResume.extracted_text?.full_text || '';
    
    logger.info(`Analyzing with ${normalizedSkills.length} skills (including ${verifiedSkillNames.length} verified)`);
    
    // Match skills against role requirements
    const requiredMatch = matchSkillsFuzzy(roleData.requiredSkills, normalizedSkills);
    const preferredMatch = matchSkillsFuzzy(roleData.preferredSkills, normalizedSkills);
    
    // Skills you have (ALL resume skills, with indication if they match role)
    const skillsHave = normalizedSkills.map(skill => {
      const matchesRequired = requiredMatch.matched.some(s => s.toLowerCase() === skill.toLowerCase());
      const matchesPreferred = preferredMatch.matched.some(s => s.toLowerCase() === skill.toLowerCase());
      
      // Check if skill is verified
      const verificationData = findVerifiedSkill(skill, verifiedSkills);
      const isVerified = verificationData !== null;
      
      return {
        skill: skill,
        type: matchesRequired ? 'required' : matchesPreferred ? 'preferred' : 'additional',
        level: estimateSkillLevel(skill, resumeText, normalizedSkills),
        matchesRole: matchesRequired || matchesPreferred,
        proficiency: matchesRequired ? 80 : matchesPreferred ? 70 : 60, // Estimate proficiency
        verified: isVerified,
        verificationScore: verificationData?.score || null,
        verificationBadge: verificationData?.badge || null,
      };
    });
    
    // Get top salary boost opportunities (filter for missing skills)
    const salaryBoostData = getTopSalaryBoostOpportunities(10);
    
    // Analyze missing skills with priority
    const skillsMissing = [];
    
    // Required skills missing (highest priority)
    for (const skill of requiredMatch.missing) {
      // Skip if user has verified this skill (even if not on current resume)
      const verificationData = findVerifiedSkill(skill, verifiedSkills);
      if (verificationData && verificationData.verified && verificationData.score >= 70) {
        logger.info(`Skipping ${skill} - already verified with score ${verificationData.score}`);
        continue;
      }
      
      const boostData = salaryBoostData.find(sb => sb.skill.toLowerCase() === skill.toLowerCase());
      const priorityData = calculateSkillPriority(skill, roleData, boostData);
      
      skillsMissing.push({
        skill: skill,
        type: 'required',
        priority: priorityData.priority,
        reasons: priorityData.reasons,
        salaryBoost: boostData ? {
          percentage: boostData.impact.percentage,
          absoluteUSD: boostData.impact.absoluteUSD,
        } : null,
      });
    }
    
    // Preferred skills missing (medium priority)
    for (const skill of preferredMatch.missing) {
      // Skip if user has verified this skill
      const verificationData = findVerifiedSkill(skill, verifiedSkills);
      if (verificationData && verificationData.verified && verificationData.score >= 70) {
        logger.info(`Skipping ${skill} - already verified with score ${verificationData.score}`);
        continue;
      }
      
      const boostData = salaryBoostData.find(sb => sb.skill.toLowerCase() === skill.toLowerCase());
      const priorityData = calculateSkillPriority(skill, roleData, boostData);
      
      skillsMissing.push({
        skill: skill,
        type: 'preferred',
        priority: priorityData.priority,
        reasons: priorityData.reasons,
        salaryBoost: boostData ? {
          percentage: boostData.impact.percentage,
          absoluteUSD: boostData.impact.absoluteUSD,
        } : null,
      });
    }
    
    // Sort by priority
    skillsMissing.sort((a, b) => b.priority - a.priority);
    
    // Calculate potential salary increase if missing skills are acquired
    const currentSalary = parsedResume.parsed_data?.currentSalary || roleData.salaryRange.USD.min;
    const potentialIncrease = calculatePotentialIncrease(
      skillsMissing.filter(s => s.salaryBoost).map(s => s.skill),
      currentSalary,
      'USD'
    );
    
    // Count verified skills
    const verifiedCount = verifiedSkills.filter(v => v.verified && v.score >= 70).length;
    
    // Build response
    const result = {
      targetRole: {
        name: roleData.name,
        category: roleData.category,
        experienceRange: roleData.experienceRange,
        salaryRange: roleData.salaryRange,
      },
      skillsSummary: {
        totalHave: skillsHave.length, // Total resume skills
        totalMissing: skillsMissing.length,
        totalVerified: verifiedCount, // NEW: Count of verified skills
        requiredHave: skillsHave.filter(s => s.type === 'required').length,
        requiredMissing: skillsMissing.filter(s => s.type === 'required').length,
        preferredHave: skillsHave.filter(s => s.type === 'preferred').length,
        preferredMissing: skillsMissing.filter(s => s.type === 'preferred').length,
        additionalSkills: skillsHave.filter(s => s.type === 'additional').length,
        completeness: ((requiredMatch.matched.length / roleData.requiredSkills.length) * 100).toFixed(1),
      },
      skillsHave: skillsHave,
      skillsMissing: skillsMissing.slice(0, 10), // Top 10 missing skills
      verifiedSkills: verifiedSkills.filter(v => v.verified && v.score >= 70), // NEW: Include verified skills in response
      salaryBoostOpportunities: {
        topOpportunities: skillsMissing
          .filter(s => s.salaryBoost)
          .slice(0, 5)
          .map(s => ({
            skill: s.skill,
            type: s.type,
            impact: s.salaryBoost.percentage,
            potentialIncrease: {
              USD: s.salaryBoost.absoluteUSD,
            },
          })),
        totalPotentialIncrease: potentialIncrease,
      },
      recommendations: generateRecommendations(skillsMissing, roleData),
      roadmap: generateRoadmap(skillsMissing, skillsHave, roleData.role),
      metadata: {
        analyzedAt: new Date().toISOString(),
        resumeSkillsCount: normalizedSkills.length,
      },
    };
    
    logger.info(`Skill analysis complete: ${skillsHave.length} have, ${skillsMissing.length} missing`);
    return result;
    
  } catch (error) {
    logger.error('Skill analysis failed:', error);
    throw error;
  }
}

/**
 * Generate personalized recommendations
 */
function generateRecommendations(skillsMissing, roleData) {
  const recommendations = [];
  
  // Required skills recommendation
  const requiredMissing = skillsMissing.filter(s => s.type === 'required');
  if (requiredMissing.length > 0) {
    recommendations.push({
      priority: 'HIGH',
      title: 'Focus on Required Skills First',
      description: `You're missing ${requiredMissing.length} required skills for this role. Start with: ${requiredMissing.slice(0, 3).map(s => s.skill).join(', ')}`,
      estimatedTime: `${requiredMissing.length * 2}-${requiredMissing.length * 4} months`,
    });
  }
  
  // High salary boost recommendation
  const highBoostSkills = skillsMissing
    .filter(s => s.salaryBoost && s.priority > 60)
    .slice(0, 3);
  
  if (highBoostSkills.length > 0) {
    recommendations.push({
      priority: 'HIGH',
      title: 'Learn High-Value Skills',
      description: `These skills offer significant salary increases: ${highBoostSkills.map(s => s.skill).join(', ')}`,
      estimatedTime: '6-12 months',
      salaryImpact: highBoostSkills[0].salaryBoost.percentage,
    });
  }
  
  // Preferred skills recommendation
  const preferredMissing = skillsMissing.filter(s => s.type === 'preferred');
  if (preferredMissing.length > 0) {
    recommendations.push({
      priority: 'MEDIUM',
      title: 'Expand with Preferred Skills',
      description: `Strengthen your profile with: ${preferredMissing.slice(0, 3).map(s => s.skill).join(', ')}`,
      estimatedTime: `${preferredMissing.length * 1}-${preferredMissing.length * 2} months`,
    });
  }
  
  // Experience recommendation
  if (roleData.experienceRange.min > 0) {
    recommendations.push({
      priority: 'MEDIUM',
      title: 'Gain Practical Experience',
      description: `Build projects using ${roleData.requiredSkills.slice(0, 3).join(', ')} to demonstrate your skills`,
      estimatedTime: '3-6 months',
    });
  }
  
  return recommendations;
}

/**
 * Quick skill gap check (lightweight version)
 */
export async function quickSkillGap(userSkills, targetRoleName) {
  try {
    const roleData = getRoleByName(targetRoleName);
    if (!roleData) {
      throw new Error(`Role not found: ${targetRoleName}`);
    }
    
    const normalizedSkills = normalizeSkillsArray(userSkills);
    const requiredMatch = matchSkillsFuzzy(roleData.requiredSkills, normalizedSkills);
    
    return {
      role: roleData.name,
      completeness: ((requiredMatch.matched.length / roleData.requiredSkills.length) * 100).toFixed(1),
      missingRequired: requiredMatch.missing,
      matchedRequired: requiredMatch.matched,
    };
  } catch (error) {
    logger.error('Quick skill gap check failed:', error);
    throw error;
  }
}

export default {
  analyzeSkills,
  quickSkillGap,
};
