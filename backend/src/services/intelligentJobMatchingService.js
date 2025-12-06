/**
 * ═══════════════════════════════════════════════════════════════════════
 * INTELLIGENT JOB MATCHING SERVICE (UNIFIED)
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Consolidates:
 *   - rolePredictionService.js (AI role prediction)
 *   - skillAnalysisService.js (skill gap analysis)
 *   - jobMatchingService.js (hybrid scoring)
 *   - semanticMatchingService.js (embedding similarity)
 * 
 * Complete workflow: Role Prediction → Skill Gap → Job Ranking → AI Summaries
 */

import Job from '../models/Job.js';
import JobMatch from '../models/JobMatch.js';
import Resume from '../models/Resume.js';
import { logger } from '../utils/logger.js';
import { roles, getRoleByName } from '../data/roleSkillDatabase.js';
import { salaryBoostSkills } from '../data/salaryBoostSkills.js';
import { predictRoleWithWatson, generateJobSummary } from './resumeProcessingService.js';
import { generateCandidateEmbedding, generateJobEmbedding } from './embeddingService.js';

const SKILL_ALIAS_GROUPS = {
  // Programming Languages
  'javascript': ['js', 'ecmascript', 'es6', 'es2015', 'es2020', 'es2021', 'es2022'],
  'typescript': ['ts'],
  'python': ['py', 'python3', 'python2'],
  'java': ['jdk', 'jvm', 'java se', 'java ee'],
  'c++': ['cpp', 'c plus plus', 'cplusplus'],
  'csharp': ['c#', 'c sharp', '.net', 'dotnet'],
  'php': ['php7', 'php8'],
  'ruby': ['rb'],
  'go': ['golang'],
  'rust': ['rust-lang'],
  'swift': ['swift5'],
  'kotlin': ['kt'],
  'scala': ['scala lang'],
  'r': ['r-lang', 'r programming'],
  
  // Frontend Frameworks & Libraries
  'react': ['reactjs', 'react.js', 'react js'],
  'react native': ['react-native', 'reactnative'],
  'vue': ['vuejs', 'vue.js', 'vue js'],
  'angular': ['angularjs', 'angular.js', 'angular js'],
  'svelte': ['sveltejs'],
  'jquery': ['jquery3'],
  
  // Backend Frameworks
  'node.js': ['nodejs', 'node', 'node js'],
  'express.js': ['express', 'expressjs', 'express js'],
  'next.js': ['nextjs', 'next', 'next js'],
  'nestjs': ['nest.js', 'nest js'],
  'django': ['django framework'],
  'flask': ['flask framework'],
  'spring': ['spring boot', 'spring framework'],
  'laravel': ['laravel framework'],
  'rails': ['ruby on rails', 'ror'],
  
  // Databases
  'postgresql': ['postgres', 'psql', 'postgre sql'],
  'mysql': ['sql', 'mariadb', 'my sql'],
  'mongodb': ['mongo', 'mongo db'],
  'redis': ['redis-server', 'redis db'],
  'sqlite': ['sqlite3'],
  'cassandra': ['apache cassandra'],
  'dynamodb': ['dynamo db', 'aws dynamodb'],
  'elasticsearch': ['elastic search', 'elastic'],
  
  // DevOps & Cloud
  'docker': ['containerization', 'containers', 'docker compose'],
  'kubernetes': ['k8s', 'k8', 'kube'],
  'terraform': ['tf'],
  'ansible': ['configuration management'],
  'jenkins': ['jenkins ci', 'jenkins automation'],
  'git': ['github', 'gitlab', 'version control', 'source control'],
  'amazon web services': ['aws', 'amazon aws', 'aws cloud'],
  'google cloud platform': ['gcp', 'google cloud'],
  'microsoft azure': ['azure', 'azure cloud'],
  'ci/cd': ['continuous integration', 'continuous deployment', 'jenkins', 'github actions', 'gitlab ci'],
  
  // Web Technologies
  'html': ['html5', 'html 5', 'hypertext markup language'],
  'css': ['css3', 'css 3', 'cascading style sheets'],
  'sass': ['scss', 'sass css'],
  'less': ['less css'],
  'tailwind css': ['tailwind', 'tailwindcss'],
  'bootstrap': ['bootstrap 5', 'bootstrap 4'],
  'graphql': ['graph ql', 'graphql api'],
  'rest api': ['restful', 'rest', 'rest apis', 'restful api'],
  'websockets': ['web sockets', 'socket.io'],
  
  // Data Science & AI
  'machine learning': ['ml', 'machine-learning'],
  'deep learning': ['dl', 'deep-learning'],
  'artificial intelligence': ['ai'],
  'natural language processing': ['nlp'],
  'computer vision': ['cv'],
  'tensorflow': ['tf framework'],
  'pytorch': ['torch'],
  'scikit-learn': ['sklearn', 'scikit learn'],
  'pandas': ['pandas library'],
  'numpy': ['numpy library'],
  
  // Testing & QA
  'testing': ['qa', 'quality assurance', 'test automation'],
  'selenium': ['selenium webdriver', 'selenium testing'],
  'jest': ['jest testing'],
  'mocha': ['mocha testing'],
  'cypress': ['cypress testing'],
  'junit': ['junit testing'],
  'pytest': ['py.test'],
  
  // Data Engineering
  'data engineering': ['etl', 'data pipelines'],
  'apache spark': ['spark', 'pyspark'],
  'airflow': ['apache airflow'],
  'kafka': ['apache kafka'],
  
  // Other Tools
  'linux': ['unix', 'ubuntu', 'centos'],
  'bash': ['shell scripting', 'bash scripting'],
  'powershell': ['power shell'],
  'nginx': ['nginx server'],
  'apache': ['apache server', 'apache httpd']
};

export function canonicalizeSkillName(skill) {
  if (!skill) return '';
  const lower = skill.toLowerCase().trim();
  for (const [root, synonyms] of Object.entries(SKILL_ALIAS_GROUPS)) {
    if (lower === root) return root;
    if (synonyms.includes(lower)) return root;
  }
  return lower;
}

export function expandSkillSynonyms(skill) {
  const canonical = canonicalizeSkillName(skill);
  if (!canonical) return [];
  const synonyms = SKILL_ALIAS_GROUPS[canonical] || [];
  return [canonical, ...synonyms];
}

function escapeRegex(term) {
  return term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function countTermOccurrences(text, term) {
  if (!term) return 0;
  const escaped = escapeRegex(term);
  const strictPattern = new RegExp(`(?:^|[^a-z0-9+])(${escaped})(?:$|[^a-z0-9+])`, 'gi');
  const strictMatches = text.match(strictPattern);
  if (strictMatches) {
    return strictMatches.length;
  }

  const loosePattern = new RegExp(escaped, 'gi');
  const looseMatches = text.match(loosePattern);
  return looseMatches ? looseMatches.length : 0;
}

function flattenToLowercaseText(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.toLowerCase();
  if (Array.isArray(value)) {
    return value.map(item => flattenToLowercaseText(item)).join(' ');
  }
  if (typeof value === 'object') {
    return Object.values(value).map(item => flattenToLowercaseText(item)).join(' ');
  }
  return String(value).toLowerCase();
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 1: ROLE PREDICTION (AI-Powered)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Predict best job role for candidate using Watson X.ai
 * 
 * Process:
 * 1. Match skills against role database (heuristic scoring)
 * 2. Use Watson X.ai to predict top 3 roles
 * 3. Return primary role + alternatives
 */
export async function predictBestRole(resume) {
  try {
    const { skills = [], years_experience = 0, current_title } = resume.parsed_resume || {};
    
    if (!skills || skills.length === 0) {
      throw new Error('Resume must have skills to predict role');
    }
    
    logger.info(`Predicting role for resume with ${skills.length} skills`);
    
    // ─────────────────────────────────────────────────────────────────────
    // STEP 1: Heuristic Scoring (fast baseline)
    // ─────────────────────────────────────────────────────────────────────
    
    const roleScores = [];
    
    for (const roleData of roles) {
      const { role: roleName, requiredSkills: core_skills = [], preferredSkills: optional_skills = [], experienceRange = {} } = roleData;
      const min_experience = experienceRange.min || 0;
      
      // Skip if candidate doesn't meet min experience
      if (years_experience < min_experience) continue;
      
      // Calculate skill match score
      const coreMatches = core_skills.filter(skill => 
        skills.some(s => s.toLowerCase().includes(skill.toLowerCase()) || 
                        skill.toLowerCase().includes(s.toLowerCase()))
      );
      
      const optionalMatches = optional_skills.filter(skill =>
        skills.some(s => s.toLowerCase().includes(skill.toLowerCase()) ||
                        skill.toLowerCase().includes(s.toLowerCase()))
      );
      
      const coreScore = (coreMatches.length / core_skills.length) * 100;
      const optionalScore = (optionalMatches.length / optional_skills.length) * 50;
      const totalScore = coreScore + optionalScore;
      
      roleScores.push({
        name: roleName,
        score: totalScore,
        coreMatches: coreMatches.length,
        totalCore: core_skills.length,
        optionalMatches: optionalMatches.length
      });
    }
    
    // Sort by score
    roleScores.sort((a, b) => b.score - a.score);
    const topRoles = roleScores.slice(0, 3);
    
    // ─────────────────────────────────────────────────────────────────────
    // STEP 2: Watson X.ai Role Prediction (AI enhancement) - WITH TIMEOUT
    // ─────────────────────────────────────────────────────────────────────
    
    let watsonUsed = false;
    let aiRoles = [];
    
    try {
      // Apply 5 second timeout to Watson call for faster fallback
      const watsonResult = await Promise.race([
        predictRoleWithWatson(skills, years_experience, current_title),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Watson timeout')), 5000)
        )
      ]);
      
      if (watsonResult.success && watsonResult.roles.length > 0) {
        watsonUsed = true;
        aiRoles = watsonResult.roles;
        logger.info(`Watson predicted roles: ${aiRoles.join(', ')}`);
      }
    } catch (error) {
      logger.warn(`Watson role prediction failed/timeout: ${error.message}. Using heuristic fallback.`);
    }
    
    // ─────────────────────────────────────────────────────────────────────
    // STEP 3: Combine Heuristic + AI Results
    // ─────────────────────────────────────────────────────────────────────
    
    let finalRoles = topRoles;
    
    // If Watson provided results, boost those roles in ranking
    if (watsonUsed && aiRoles.length > 0) {
      const primaryAIRole = aiRoles[0];
      
      // Check if Watson's primary role matches our top roles
      const matchIndex = topRoles.findIndex(r => 
        r.name.toLowerCase().includes(primaryAIRole.toLowerCase()) ||
        primaryAIRole.toLowerCase().includes(r.name.toLowerCase())
      );
      
      if (matchIndex >= 0) {
        // Watson confirmed our prediction - boost confidence
        finalRoles = topRoles;
      } else {
        // Watson suggests different role - add it as primary
        const roleData = getRoleByName(primaryAIRole) || roles.find(r => r.role === topRoles[0].name);
        
        finalRoles = [
          {
            name: primaryAIRole,
            score: 85,
            coreMatches: 0,
            totalCore: roleData?.requiredSkills?.length || 0,
            optionalMatches: 0,
            source: 'watson'
          },
          ...topRoles.slice(0, 2)
        ];
      }
    }
    
    // ─────────────────────────────────────────────────────────────────────
    // STEP 4: Build Response
    // ─────────────────────────────────────────────────────────────────────
    
    const primaryRole = finalRoles[0];
    const primaryRoleData = getRoleByName(primaryRole.name);
    
    if (!primaryRoleData) {
      throw new Error(`Role data not found for: ${primaryRole.name}`);
    }
    
    return {
      primaryRole: {
        name: primaryRole.name,
        matchScore: primaryRole.score,
        matchPercentage: Math.round(primaryRole.score),
        coreSkillsMatched: `${primaryRole.coreMatches}/${primaryRole.totalCore}`,
        description: primaryRoleData.description,
        avgSalaryRange: primaryRoleData.salaryRange?.INR || { min: 500000, max: 2000000 },
        minExperience: primaryRoleData.experienceRange?.min || 0
      },
      alternativeRoles: finalRoles.slice(1, 3).map(role => {
        const roleData = getRoleByName(role.name) || {};
        return {
          name: role.name,
          matchScore: role.score,
          matchPercentage: Math.round(role.score),
          description: roleData.description || 'No description available'
        };
      }),
      metadata: {
        watsonUsed: watsonUsed,
        aiSuggestedRoles: aiRoles,
        totalRolesEvaluated: roleScores.length,
        confidence: watsonUsed ? 0.85 : 0.75
      }
    };
    
  } catch (error) {
    logger.error('Role prediction failed:', error);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 2: SKILL GAP ANALYSIS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Calculate skill proficiency level (0-100) based on resume analysis
 * Uses heuristics: mentions, years of experience, project count, resume prominence
 */
function calculateSkillProficiency(skillName, resume) {
  const parsedResume = resume.parsed_resume || {};
  const resumeText = parsedResume.extracted_text?.full_text || JSON.stringify(parsedResume);
  const textLower = resumeText.toLowerCase();

  const synonyms = expandSkillSynonyms(skillName);
  const searchTokens = synonyms.length > 0 ? synonyms : [skillName.toLowerCase()];

  const mentionCount = searchTokens.reduce((count, token) => count + countTermOccurrences(textLower, token), 0);
  const mentionScore = Math.min(mentionCount * 4, 20);

  const synonymsPattern = searchTokens.map(token => escapeRegex(token)).join('|') || escapeRegex(skillName.toLowerCase());
  const expertRegex = new RegExp(`(expert|advanced|senior|lead|architect)[^\n]{0,40}(?:${synonymsPattern})`, 'i');
  const intermediateRegex = new RegExp(`(intermediate|proficient|experienced|working knowledge)[^\n]{0,40}(?:${synonymsPattern})`, 'i');
  const beginnerRegex = new RegExp(`(learning|exposure|familiar|basic)[^\n]{0,40}(?:${synonymsPattern})`, 'i');

  let levelScore = 0;
  if (expertRegex.test(textLower)) {
    levelScore = 18;
  } else if (intermediateRegex.test(textLower)) {
    levelScore = 12;
  } else if (beginnerRegex.test(textLower)) {
    levelScore = 6;
  } else {
    levelScore = Math.min(mentionCount * 2, 10);
  }

  const projects = Array.isArray(parsedResume.projects) ? parsedResume.projects : [];
  const projectSkillCount = projects.reduce((total, project) => {
    const projectText = flattenToLowercaseText(project);
    return total + (searchTokens.some(token => projectText.includes(token)) ? 1 : 0);
  }, 0);
  const projectScore = Math.min(projectSkillCount * 15, 35);

  const experienceSections = [
    parsedResume.experience,
    parsedResume.work_experience,
    parsedResume.workExperience,
    parsedResume.employment_history,
    parsedResume.professional_experience
  ].filter(section => Array.isArray(section));

  const experiences = experienceSections.flat();
  const experienceSkillCount = experiences.reduce((total, experience) => {
    const experienceText = flattenToLowercaseText(experience);
    return total + (searchTokens.some(token => experienceText.includes(token)) ? 1 : 0);
  }, 0);
  const experienceScore = Math.min(experienceSkillCount * 7, 21);

  let recencyScore = 0;
  const firstMentionIndex = searchTokens
    .map(token => textLower.indexOf(token))
    .filter(index => index >= 0)
    .reduce((min, index) => Math.min(min, index), Infinity);

  if (firstMentionIndex !== Infinity && textLower.length > 0) {
    const positionRatio = firstMentionIndex / textLower.length;
    if (positionRatio <= 0.25) {
      recencyScore = 10;
    } else if (positionRatio <= 0.5) {
      recencyScore = 6;
    } else {
      recencyScore = 3;
    }
  }

  const totalScore = mentionScore + levelScore + projectScore + experienceScore + recencyScore;
  return Math.min(Math.round(totalScore), 100);
}

/**
 * Analyze skill gaps for a specific role
 * Returns: skills candidate has, missing skills, salary boost opportunities
 */
export async function analyzeSkills(resume, targetRole) {
  try {
    const candidateSkills = resume.parsed_resume?.skills || [];
    const roleData = getRoleByName(targetRole);
    
    if (!roleData) {
      throw new Error(`Unknown role: ${targetRole}`);
    }
    
    // Extract verified skills from profile
    let verifiedSkills = [];
    if (resume.profile?.skillVerifications?.length) {
      verifiedSkills = resume.profile.skillVerifications
        .filter(v => v.verified === true && v.score >= 70)
        .map(v => v.skill);
      logger.info(`Found ${verifiedSkills.length} verified skills for analysis`);
    }
    
    // Merge verified skills with candidate skills
    const allCandidateSkills = [...new Set([...candidateSkills, ...verifiedSkills])];
    
    const { requiredSkills: core_skills = [], preferredSkills: optional_skills = [] } = roleData;
    
    // ─────────────────────────────────────────────────────────────────────
    // STEP 1: Identify Skills Have vs Missing with Proficiency Calculation
    // ─────────────────────────────────────────────────────────────────────
    
    const skillsHave = [];
    const skillsMissing = [];

    const matchesSkill = (candidateSkill, targetSkill) => {
      if (!candidateSkill || !targetSkill) return false;
      const candLower = candidateSkill.toLowerCase().trim();
      const targLower = targetSkill.toLowerCase().trim();
      if (!candLower || !targLower) return false;

      // Exact match (case-insensitive)
      if (candLower === targLower) return true;

      // Canonical match (e.g., "js" === "javascript")
      const canonicalCandidate = canonicalizeSkillName(candidateSkill);
      const canonicalTarget = canonicalizeSkillName(targetSkill);
      if (canonicalCandidate && canonicalTarget && canonicalCandidate === canonicalTarget) {
        return true;
      }

      // Synonym match (e.g., "reactjs" in ["react", "reactjs", "react.js"])
      const candidateTokens = expandSkillSynonyms(candidateSkill);
      const targetTokens = expandSkillSynonyms(targetSkill);
      if (candidateTokens.some(token => targetTokens.includes(token))) {
        return true;
      }

      // Word boundary substring match (prevents "java" matching "javascript")
      // Only match if the substring is a complete word
      const wordBoundary = (text, search) => {
        const regex = new RegExp(`\\b${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        return regex.test(text);
      };
      
      if (wordBoundary(candLower, targLower) || wordBoundary(targLower, candLower)) {
        return true;
      }

      return false;
    };

    const evaluateSkillPresence = (skillName, type, defaultPriority) => {
      const hasSkill = allCandidateSkills.some(candidateSkill => matchesSkill(candidateSkill, skillName));

      if (hasSkill) {
        const proficiency = calculateSkillProficiency(skillName, resume);
        const level = proficiency >= 70 ? 'Expert' : proficiency >= 40 ? 'Intermediate' : 'Beginner';
        
        // Check if this skill is verified
        const isVerified = verifiedSkills.some(v => 
          matchesSkill(v, skillName)
        );

        skillsHave.push({
          skill: skillName,
          type,
          level,
          proficiency,
          verified: isVerified, // Add verification status
        });
        return;
      }

      const boostData = salaryBoostSkills.find(b =>
        b.skill.toLowerCase() === skillName.toLowerCase() ||
        skillName.toLowerCase().includes(b.skill.toLowerCase())
      );

      const fallbackUsd = type === 'required'
        ? { min: 15000, max: 35000 }
        : { min: 8000, max: 20000 };

      skillsMissing.push({
        skill: skillName,
        type,
        priority: defaultPriority,
        reasons: type === 'required' ? ['Required for role'] : ['Nice to have'],
        proficiency: 0,
        salaryBoost: boostData ? {
          percentage: boostData.impact.percentage,
          absoluteUSD: { ...boostData.impact.absoluteUSD },
          category: boostData.category
        } : {
          percentage: type === 'required' ? '18-28%' : '10-18%',
          absoluteUSD: fallbackUsd,
          category: type === 'required' ? 'Core' : 'Differentiator'
        }
      });
    };

    core_skills.forEach(skill => evaluateSkillPresence(skill, 'required', 3));
    optional_skills.forEach(skill => evaluateSkillPresence(skill, 'preferred', 2));

      const computeSimilarityScore = (skillA, skillB) => {
        const canonicalA = canonicalizeSkillName(skillA);
        const canonicalB = canonicalizeSkillName(skillB);
        if (!canonicalA || !canonicalB) return 0;
        if (canonicalA === canonicalB) return 2;

        if (matchesSkill(skillA, skillB) || matchesSkill(skillB, skillA)) {
          return 1.2;
        }

        const tokensA = expandSkillSynonyms(skillA);
        const tokensB = expandSkillSynonyms(skillB);
        if (tokensA.length === 0 || tokensB.length === 0) return 0;

        const coreTokensA = tokensA.map(token => token.split(/[^a-z0-9+]+/)).flat().filter(token => token.length > 2);
        const coreTokensB = tokensB.map(token => token.split(/[^a-z0-9+]+/)).flat().filter(token => token.length > 2);
        if (coreTokensA.length === 0 || coreTokensB.length === 0) return 0;

        const uniqueTokensA = [...new Set(coreTokensA)];
        const uniqueTokensB = [...new Set(coreTokensB)];
        const overlap = uniqueTokensA.filter(token => uniqueTokensB.includes(token));
        const union = new Set([...uniqueTokensA, ...uniqueTokensB]).size;
        const jaccard = overlap.length / union;

        return overlap.length > 0 ? jaccard + overlap.length * 0.5 : 0;
      };

    const alignedRecommendations = skillsMissing.map(missingSkill => {
      const alignedWith = skillsHave
        .map(existingSkill => {
          const similarity = computeSimilarityScore(missingSkill.skill, existingSkill.skill);
          if (similarity <= 0) return null;
          return {
            skill: existingSkill.skill,
            proficiency: existingSkill.proficiency || 0,
            level: existingSkill.level,
            similarity: Number(similarity.toFixed(2))
          };
        })
        .filter(Boolean)
        .sort((a, b) => (b.similarity * (b.proficiency + 1)) - (a.similarity * (a.proficiency + 1)))
        .slice(0, 3);

      return {
        targetSkill: missingSkill.skill,
        priority: missingSkill.priority,
        type: missingSkill.type,
        alignedWith,
        salaryBoost: missingSkill.salaryBoost || null
      };
    });

    skillsMissing.forEach((missing, index) => {
      missing.alignedWith = alignedRecommendations[index]?.alignedWith || [];
    });
    
    // ─────────────────────────────────────────────────────────────────────
    // STEP 2: Salary Boost Opportunities
    // ─────────────────────────────────────────────────────────────────────
    
    const salaryBoostOpportunities = [];
    
    for (const boostSkill of salaryBoostSkills) {
      // Check if candidate is missing this high-impact skill (including verified skills)
      const isMissing = !allCandidateSkills.some(s =>
        s.toLowerCase().includes(boostSkill.skill.toLowerCase()) ||
        boostSkill.skill.toLowerCase().includes(s.toLowerCase())
      );
      
      if (isMissing) {
        const usdRange = boostSkill.impact?.absoluteUSD || { min: 5000, max: 15000 };
        salaryBoostOpportunities.push({
          skill: boostSkill.skill,
          type: boostSkill.category,
          impact: boostSkill.impact?.percentage || '20-30%',
          potentialIncrease: {
            USD: usdRange
          },
          usdRangeLabel: `$${(usdRange.min / 1000).toFixed(0)}k - $${(usdRange.max / 1000).toFixed(0)}k`,
          reasoning: boostSkill.reasoning,
          demandLevel: boostSkill.demandLevel
        });
      }
    }
    
    // Sort by impact percentage (extract max value from range)
    salaryBoostOpportunities.sort((a, b) => {
      const getMaxImpact = (percentStr) => {
        const match = percentStr.match(/(\d+)-(\d+)%/);
        return match ? parseInt(match[2]) : 0;
      };
      return getMaxImpact(b.impact) - getMaxImpact(a.impact);
    });
    
    // ─────────────────────────────────────────────────────────────────────
    // STEP 3: Generate Recommendations
    // ─────────────────────────────────────────────────────────────────────
    
    const coreSkillsGap = skillsMissing.filter(s => s.type === 'required').length;
    const totalCoreSkills = core_skills.length;
    const coreSkillMatch = ((totalCoreSkills - coreSkillsGap) / totalCoreSkills) * 100;
    
    const recommendations = [];
    
    if (coreSkillsGap > 0) {
      recommendations.push({
        type: 'urgent',
        message: `You're missing ${coreSkillsGap} core skills for ${targetRole}. Focus on: ${skillsMissing.filter(s => s.type === 'required').slice(0, 3).map(s => s.skill).join(', ')}`
      });
    }
    
    if (coreSkillMatch >= 80) {
      recommendations.push({
        type: 'positive',
        message: `Great match! You have ${Math.round(coreSkillMatch)}% of core skills. Consider learning optional skills to stand out.`
      });
    }
    
    if (salaryBoostOpportunities.length > 0) {
      const topBoost = salaryBoostOpportunities[0];
      recommendations.push({
        type: 'opportunity',
        message: `Learning ${topBoost.skill} can boost your salary by ${topBoost.impact}!`
      });
    }
    
    return {
      targetRole: targetRole,
      skillsHave: skillsHave,
      skillsMissing: skillsMissing,
      alignedRecommendations: alignedRecommendations,
      skillGapSummary: {
        coreSkillsHave: totalCoreSkills - coreSkillsGap,
        coreSkillsTotal: totalCoreSkills,
        coreSkillMatch: Math.round(coreSkillMatch),
        missingCoreSkills: coreSkillsGap,
        missingOptionalSkills: skillsMissing.filter(s => s.type === 'preferred').length
      },
      salaryBoostOpportunities: salaryBoostOpportunities.slice(0, 5),
      recommendations: recommendations
    };
    
  } catch (error) {
    logger.error('Skill analysis failed:', error);
    throw error;
  }
}

/**
 * Generate salary boost recommendations from skill analysis
 * Helper function to transform skill analysis data into salary boost format
 */
export function generateSalaryBoostRecommendations(skillsMissing, skillsHave, yearsExperience, options = {}) {
  const {
    maxRecommendations = 6
  } = options;

  const strengths = (skillsHave || [])
    .filter(skill => (skill.proficiency || 0) >= 65)
    .sort((a, b) => (b.proficiency || 0) - (a.proficiency || 0));

  const priorityRank = { high: 3, medium: 2, low: 1 };

  const formatUsd = (boost) => {
    if (!boost?.absoluteUSD) return '$10k';
    if (typeof boost.absoluteUSD === 'number') {
      return `$${(boost.absoluteUSD / 1000).toFixed(0)}k`;
    }
    const { min, max } = boost.absoluteUSD;
    return `$${(min / 1000).toFixed(0)}k - $${(max / 1000).toFixed(0)}k`;
  };

  const formatImpact = (boost) => {
    if (!boost) return '+$10k';
    return `+${formatUsd(boost)} (${boost.percentage || boost.impact?.percentage || '15-20%'})`;
  };

  const formatTimeframe = (priority) => {
    if (priority >= 3) return '0-3 months sprint';
    if (priority >= 2) return '3-5 months';
    return '6+ months';
  };

  const deriveDescription = (skill, leverage) => {
    const reasons = skill.reasons?.length ? skill.reasons.join(', ') : skill.type === 'required' ? 'Core requirement for your target role' : 'High-visibility differentiator';
    const leverageText = leverage?.skill ? ` Build on your ${leverage.skill} (${leverage.level || 'proficiency'}) to accelerate mastery.` : '';
    const salaryText = skill.salaryBoost?.category ? ` ${skill.salaryBoost.category} teams are paying a premium for this capability.` : '';
    return `${skill.skill} unlocks higher leverage workstreams. ${reasons}.${salaryText}${leverageText}`.trim();
  };

  const buildActionSteps = (skill, leverage) => {
    const base = [
      `Weeks 1-2: Map a study plan covering ${skill.skill} fundamentals and key APIs`,
      `Weeks 3-4: Pair ${skill.skill} with ${leverage?.skill || 'existing'} experience to build a mini project`,
      `Weeks 5+: Ship a portfolio case study that highlights business impact using ${skill.skill}`
    ];

    if (skill.salaryBoost?.percentage) {
      base.push(`Document results to negotiate a +${skill.salaryBoost.percentage} raise during reviews/interviews`);
    }

    return base.slice(0, 4);
  };

  const enriched = skillsMissing
    .filter(skill => skill.salaryBoost)
    .map((skill, index) => {
      const leverage = skill.alignedWith?.[0] || strengths[0] || null;
      const priorityLabel = skill.priority >= 3 ? 'high' : skill.priority >= 2 ? 'medium' : 'low';
      const usdImpact = formatImpact(skill.salaryBoost);
      const timeframe = formatTimeframe(skill.priority || 1);

      return {
        rawPriority: priorityLabel,
        priorityScore: priorityRank[priorityLabel] || 1,
        salaryScore: typeof skill.salaryBoost?.absoluteUSD === 'number'
          ? skill.salaryBoost.absoluteUSD
          : skill.salaryBoost?.absoluteUSD?.max || 0,
        data: {
          id: `sb-${index + 1}-${canonicalizeSkillName(skill.skill).replace(/[^a-z0-9]+/g, '-')}`,
          title: `Level up ${skill.skill}`,
          impact: usdImpact,
          timeframe,
          priority: priorityLabel.charAt(0).toUpperCase() + priorityLabel.slice(1),
          description: deriveDescription(skill, leverage),
          skillType: skill.type,
          salaryBoost: skill.salaryBoost,
          leverageSkill: leverage?.skill || null,
          actionSteps: buildActionSteps(skill, leverage),
          recommendedHoursPerWeek: skill.priority >= 3 ? 8 : skill.priority >= 2 ? 6 : 4,
          experienceFit: yearsExperience >= 5 ? 'Target senior-level responsibilities' : 'Bridge to mid-level ownership'
        }
      };
    });

  enriched.sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
    return (b.salaryScore || 0) - (a.salaryScore || 0);
  });

  return enriched.slice(0, maxRecommendations).map(item => item.data);
}

export function alignSkillsWithCareerAdvice(skillAnalysis, watsonSummary) {
  const missingSkills = skillAnalysis?.skillsMissing || [];
  const haveSkills = skillAnalysis?.skillsHave || [];
  const alignedRecommendations = skillAnalysis?.alignedRecommendations || [];

  const watsonData = watsonSummary?.summary || {};
  const watsonPriorities = Array.isArray(watsonData.skillDevelopmentPriority)
    ? watsonData.skillDevelopmentPriority
    : [];

  const watsonPriorityMap = new Map();
  for (const entry of watsonPriorities) {
    if (!entry?.skill) continue;
    const canonical = canonicalizeSkillName(entry.skill);
    if (canonical) {
      watsonPriorityMap.set(canonical, entry);
    }
  }

  const addUniqueAction = (actions, text) => {
    if (!text) return;
    if (!actions.includes(text)) {
      actions.push(text);
    }
  };

  const plan = missingSkills.map(missing => {
    const canonicalMissing = canonicalizeSkillName(missing.skill);
    const watsonEntry = canonicalMissing ? watsonPriorityMap.get(canonicalMissing) : null;
    const recommendation = alignedRecommendations.find(rec => canonicalizeSkillName(rec.targetSkill) === canonicalMissing);
    const leverage = (missing.alignedWith && missing.alignedWith[0]) || recommendation?.alignedWith?.[0] || null;

    const priorityLabel = missing.priority >= 3 ? 'high' : missing.priority >= 2 ? 'medium' : 'low';
    const timeline = missing.priority >= 3 ? '0-30 days' : missing.priority >= 2 ? '30-60 days' : '60-90 days';
    const watsonPriority = watsonEntry?.priority || 'not mentioned';

    const actions = [];
    addUniqueAction(actions, watsonEntry?.reason ? `Why now: ${watsonEntry.reason}` : null);
    if (leverage) {
      addUniqueAction(actions, `Leverage your ${leverage.skill} (${leverage.level || 'existing experience'}) to accelerate ${missing.skill}.`);
    }
    if (missing.salaryBoost?.percentage) {
      addUniqueAction(actions, `Target a ${missing.salaryBoost.percentage} salary boost by completing a project focused on ${missing.skill}.`);
    }
    addUniqueAction(actions, watsonEntry?.expectedImpact ? `Impact: ${watsonEntry.expectedImpact}` : null);
    addUniqueAction(actions, `Schedule dedicated practice each week and ship a portfolio-ready artifact covering ${missing.skill} within ${timeline}.`);

    return {
      skill: missing.skill,
      priority: priorityLabel,
      timeframe: timeline,
      watsonPriority,
      salaryImpact: missing.salaryBoost?.percentage || null,
      leverage,
      actions: actions.slice(0, 4)
    };
  });

  const priorityOrder = { high: 3, medium: 2, low: 1 };
  plan.sort((a, b) => (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0));

  const focusAreas = watsonPriorities.slice(0, 3).map(entry => ({
    skill: entry.skill,
    priority: entry.priority,
    reason: entry.reason,
    expectedImpact: entry.expectedImpact
  }));

  const strengthsToLeverage = haveSkills
    .slice()
    .sort((a, b) => (b.proficiency || 0) - (a.proficiency || 0))
    .slice(0, 3)
    .map(skill => ({
      skill: skill.skill,
      proficiency: skill.proficiency,
      level: skill.level
    }));

  const summaryParts = [];
  const highPrioritySkills = plan.filter(item => item.priority === 'high').map(item => item.skill);
  if (highPrioritySkills.length > 0) {
    summaryParts.push(`Focus first on ${highPrioritySkills.slice(0, 2).join(', ')} over the next month.`);
  }
  if (watsonData.careerAdvice) {
    summaryParts.push(watsonData.careerAdvice);
  }

  const insights = {
    watsonAdvice: watsonData.careerAdvice || '',
    topPriorities: focusAreas,
    strengthsToLeverage,
    summary: summaryParts.join(' ') || 'Stay consistent with weekly practice and revisit this plan monthly.'
  };

  return {
    plan,
    insights
  };
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 3: JOB MATCHING (HYBRID SCORING)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Cosine similarity between two embedding vectors
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) {
    return 0;
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Find matching jobs with hybrid scoring (embeddings + classical)
 * 
 * Scoring Formula:
 * compositeScore = 0.7 * embeddingSimilarity + 0.3 * classicalScore
 * classicalScore = 0.6 * skillMatch + 0.2 * experienceMatch + 0.1 * recency + 0.1 * salaryMatch
 */
export async function findMatchingJobs(resume, options = {}) {
  const {
    limit = 20,
    minMatchScore = 50,
    includeRemote = true,
    employmentType = null,
    generateAISummaries = true,
    useEmbeddings = false,
    preferences = {}
  } = options;
  
  try {
    const candidateSkills = resume.parsed_resume?.skills || [];
    const candidateExperience = resume.parsed_resume?.years_experience || 0;
    const candidateEmbedding = resume.embedding || null;
    
    logger.info(`Matching jobs for resume (embeddings: ${useEmbeddings}, AI summaries: ${generateAISummaries})`);
    
    // ─────────────────────────────────────────────────────────────────────
    // STEP 1: Fetch Active Jobs
    // ─────────────────────────────────────────────────────────────────────
    
    const query = { status: 'active' };
    if (employmentType) query.employmentType = employmentType;
    if (!includeRemote) query['location.isRemote'] = false;
    
    const jobs = await Job.find(query).limit(500); // Get larger pool for filtering
    
    logger.info(`Fetched ${jobs.length} jobs from database with query: ${JSON.stringify(query)}`);
    
    if (jobs.length === 0) {
      return {
        matches: [],
        totalMatches: 0,
        metadata: {
          searchCriteria: options,
          resultsFound: 0
        }
      };
    }
    
    logger.info(`Found ${jobs.length} active jobs to evaluate`);
    
    // ─────────────────────────────────────────────────────────────────────
    // STEP 2: Calculate Match Scores
    // ─────────────────────────────────────────────────────────────────────
    
    const jobMatches = [];
    
    for (const job of jobs) {
      // ───────────────────────────────────────────────────────────────────
      // Filter out portal/listing pages - prioritize actual job postings
      // ───────────────────────────────────────────────────────────────────
      
      const isPortalPage = /^(Indeed|LinkedIn|Naukri|Glassdoor|Internshala|TimesJobs|Freshersworld|LetsIntern|Shine\.com)\s*-\s*/i.test(job.title);
      const isCareerPage = /\s+(Careers|Jobs|Internships|Opportunities|Openings)\s*$/i.test(job.title) && 
                          !/\s+(Manager|Engineer|Developer|Analyst|Scientist|Associate|Specialist|Intern|Recruitment)\s+/i.test(job.title);
      
      // Skip generic portal pages unless no better matches available
      const isGenericListing = isPortalPage || isCareerPage;
      
      // ───────────────────────────────────────────────────────────────────
      // Classical Scoring (always calculated)
      // ───────────────────────────────────────────────────────────────────
      
      const requiredSkills = job.skills?.required || [];
      const optionalSkills = job.skills?.preferred || [];
      
      // Skill match
      const matchedSkills = requiredSkills.filter(reqSkill =>
        candidateSkills.some(candSkill =>
          candSkill.toLowerCase().includes(reqSkill.toLowerCase()) ||
          reqSkill.toLowerCase().includes(candSkill.toLowerCase())
        )
      );
      
      const matchedOptional = optionalSkills.filter(optSkill =>
        candidateSkills.some(candSkill =>
          candSkill.toLowerCase().includes(optSkill.toLowerCase()) ||
          optSkill.toLowerCase().includes(candSkill.toLowerCase())
        )
      );
      
      const missingSkills = requiredSkills.filter(reqSkill =>
        !matchedSkills.some(matched => matched === reqSkill)
      );
      
      const skillMatchScore = requiredSkills.length > 0
        ? (matchedSkills.length / requiredSkills.length) * 100
        : 50;
      
      // Experience match
      const minExp = job.experienceYears?.min || job.experience?.min || 0;
      const maxExp = job.experienceYears?.max || job.experience?.max || 10;
      const expMatch = candidateExperience >= minExp && candidateExperience <= maxExp;
      const experienceScore = expMatch ? 100 : Math.max(0, 100 - Math.abs(candidateExperience - minExp) * 10);
      
      // Recency (jobs posted recently get higher score)
      const daysSincePosted = (Date.now() - new Date(job.postedDate || job.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      const recencyScore = Math.max(0, 100 - daysSincePosted * 2);
      
      // Salary match
      const minSalary = preferences.minSalary || 0;
      const salaryMatch = job.salary?.min >= minSalary;
      const salaryScore = salaryMatch ? 100 : 50;
      
      // Classical composite score
      const classicalScore = 
        0.6 * skillMatchScore +
        0.2 * experienceScore +
        0.1 * recencyScore +
        0.1 * salaryScore;
      
      // Penalize generic portal/listing pages
      const portalPenalty = isGenericListing ? 0.5 : 1.0; // 50% penalty for portal pages
      
      // ───────────────────────────────────────────────────────────────────
      // Embedding Similarity (if enabled and available)
      // ───────────────────────────────────────────────────────────────────
      
      let embeddingSimilarity = 0;
      let finalScore = classicalScore * portalPenalty;
      
      if (useEmbeddings && candidateEmbedding && job.embedding) {
        embeddingSimilarity = cosineSimilarity(candidateEmbedding, job.embedding);
        
        // Hybrid scoring: 70% embedding + 30% classical, then apply portal penalty
        finalScore = (0.7 * (embeddingSimilarity * 100) + 0.3 * classicalScore) * portalPenalty;
      }
      
      // ───────────────────────────────────────────────────────────────────
      // Filter by minimum match score
      // ───────────────────────────────────────────────────────────────────
      
      if (finalScore < minMatchScore) continue;
      
      jobMatches.push({
        job: job,
        matchScore: Math.round(finalScore),
        embeddingSimilarity: embeddingSimilarity,
        classicalScore: Math.round(classicalScore),
        skillMatchPercentage: Math.round(skillMatchScore),
        matchedSkills: matchedSkills,
        matchedOptionalSkills: matchedOptional,
        missingSkills: missingSkills,
        experienceMatch: expMatch,
        salaryMatch: salaryMatch
      });
    }
    
    // ─────────────────────────────────────────────────────────────────────
    // STEP 3: Sort by Match Score
    // ─────────────────────────────────────────────────────────────────────
    
    jobMatches.sort((a, b) => b.matchScore - a.matchScore);
    
    // Limit results
    const topMatches = jobMatches.slice(0, limit);
    
    logger.info(`Found ${jobMatches.length} matches, returning top ${topMatches.length}`);
    
    // ─────────────────────────────────────────────────────────────────────
    // STEP 4: Generate Rule-Based Summaries (Watson disabled)
    // ─────────────────────────────────────────────────────────────────────
    
    if (generateAISummaries && topMatches.length > 0) {
      logger.info(`Generating rule-based summaries for top ${Math.min(10, topMatches.length)} jobs`);
      
      const jobsToSummarize = topMatches.slice(0, Math.min(10, topMatches.length));
      
      for (const match of jobsToSummarize) {
        try {
          // Generate simple but effective summary
          const matchPercent = Math.round(match.matchScore);
          const matchedCount = match.matchedSkills?.length || 0;
          const missingCount = match.missingSkills?.length || 0;
          
          let summary = `${matchPercent}% match for this ${match.job.title} position at ${match.job.company.name}. `;
          
          if (matchedCount > 0) {
            summary += `You have ${matchedCount} matching skills. `;
          }
          
          if (missingCount > 0 && missingCount <= 3) {
            summary += `To strengthen your profile, consider learning: ${match.missingSkills.slice(0, 3).join(', ')}.`;
          } else if (missingCount > 3) {
            summary += `Focus on developing ${missingCount} additional skills for this role.`;
          } else {
            summary += `Excellent fit - you have all required skills!`;
          }
          
          match.aiSummary = summary;
        } catch (error) {
          logger.warn(`Failed to generate summary for job ${match.job.jobId}: ${error.message}`);
        }
      }
    }
    
    // ─────────────────────────────────────────────────────────────────────
    // STEP 5: Return Results
    // ─────────────────────────────────────────────────────────────────────
    
    return {
      matches: topMatches,
      totalMatches: jobMatches.length,
      metadata: {
        searchCriteria: options,
        resultsFound: topMatches.length,
        useEmbeddings: useEmbeddings,
        aiSummariesGenerated: generateAISummaries ? topMatches.filter(m => m.aiSummary).length : 0
      }
    };
    
  } catch (error) {
    logger.error('Job matching failed:', error);
    throw error;
  }
}

/**
 * Find semantically similar jobs using embeddings only
 */
export async function findSemanticMatches(resumeId, options = {}) {
  const {
    minSimilarity = 0.70,
    limit = 20,
    includeJobDetails = true,
    applySkillAdjustment = true
  } = options;
  
  try {
    // Get resume with embedding
    const resume = await Resume.findOne({ resumeId: resumeId });
    
    if (!resume || !resume.embedding) {
      throw new Error('Resume or embedding not found');
    }
    
    // Get all jobs with embeddings
    const jobs = await Job.find({ 
      status: 'active',
      embedding: { $exists: true, $ne: null }
    });
    
    logger.info(`Computing semantic similarity for ${jobs.length} jobs`);
    
    const matches = [];
    
    for (const job of jobs) {
      const similarity = cosineSimilarity(resume.embedding, job.embedding);
      
      if (similarity >= minSimilarity) {
        matches.push({
          job: includeJobDetails ? job : { jobId: job.jobId, title: job.title, company: job.company },
          similarity: parseFloat(similarity.toFixed(4)),
          matchScore: Math.round(similarity * 100)
        });
      }
    }
    
    // Sort by similarity
    matches.sort((a, b) => b.similarity - a.similarity);
    
    return {
      success: true,
      matches: matches.slice(0, limit),
      metadata: {
        totalEvaluated: jobs.length,
        totalMatches: matches.length,
        minSimilarity: minSimilarity,
        averageSimilarity: matches.length > 0
          ? (matches.reduce((sum, m) => sum + m.similarity, 0) / matches.length).toFixed(4)
          : 0
      }
    };
    
  } catch (error) {
    logger.error('Semantic matching failed:', error);
    return {
      success: false,
      error: error.message,
      matches: []
    };
  }
}

/**
 * Find similar jobs to a reference job
 */
export async function findSimilarJobs(jobId, options = {}) {
  const { limit = 5, includeJobDetails = true } = options;
  
  try {
    // Get reference job
    const referenceJob = await Job.findOne({ jobId: jobId });
    
    if (!referenceJob || !referenceJob.embedding) {
      throw new Error('Job or embedding not found');
    }
    
    // Get all other jobs
    const jobs = await Job.find({
      jobId: { $ne: jobId },
      status: 'active',
      embedding: { $exists: true, $ne: null }
    });
    
    const matches = [];
    
    for (const job of jobs) {
      const similarity = cosineSimilarity(referenceJob.embedding, job.embedding);
      
      matches.push({
        job: includeJobDetails ? job : { jobId: job.jobId, title: job.title, company: job.company },
        similarity: parseFloat(similarity.toFixed(4))
      });
    }
    
    // Sort by similarity
    matches.sort((a, b) => b.similarity - a.similarity);
    
    return {
      success: true,
      referenceJob: {
        jobId: referenceJob.jobId,
        title: referenceJob.title,
        company: referenceJob.company
      },
      matches: matches.slice(0, limit),
      metadata: {
        totalEvaluated: jobs.length
      }
    };
    
  } catch (error) {
    logger.error('Similar jobs search failed:', error);
    return {
      success: false,
      error: error.message,
      matches: []
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 4: JOB INTERACTION TRACKING
// ═══════════════════════════════════════════════════════════════════════

/**
 * Track job interaction (view, apply, save, dismiss)
 */
export async function trackJobInteraction(jobId, resumeId, action) {
  try {
    const actionMap = {
      view: { viewCount: 1 },
      apply: { applied: true, appliedAt: new Date() },
      save: { saved: true, savedAt: new Date() },
      dismiss: { dismissed: true, dismissedAt: new Date() }
    };
    
    const updateFields = actionMap[action];
    if (!updateFields) {
      throw new Error(`Invalid action: ${action}`);
    }
    
    // Update or create JobMatch
    const match = await JobMatch.findOneAndUpdate(
      { jobId: jobId, resumeId: resumeId },
      { $set: updateFields, $inc: { viewCount: action === 'view' ? 1 : 0 } },
      { upsert: true, new: true }
    );
    
    logger.info(`Tracked ${action} for job ${jobId} by resume ${resumeId}`);
    
    return {
      success: true,
      action: action,
      jobId: jobId,
      resumeId: resumeId,
      timestamp: new Date()
    };
    
  } catch (error) {
    logger.error('Failed to track interaction:', error);
    throw error;
  }
}

/**
 * Get job with match information
 */
export async function getJobWithMatch(jobId, resumeId) {
  try {
    const job = await Job.findOne({ jobId: jobId, status: 'active' });
    
    if (!job) {
      throw new Error('Job not found');
    }
    
    const match = await JobMatch.findOne({ jobId: jobId, resumeId: resumeId });
    
    return {
      job: job,
      match: match || null
    };
    
  } catch (error) {
    logger.error('Failed to get job with match:', error);
    throw error;
  }
}
