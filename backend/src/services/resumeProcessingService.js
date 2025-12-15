/**
 * ═══════════════════════════════════════════════════════════════════════
 * UNIFIED RESUME PROCESSING SERVICE
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Consolidates:
 *   - extractionService.js (text extraction)
 *   - hybridParserService.js (regex + NER + LLM parsing)
 *   - llmParsingService.js (Watson X.ai integration)
 * 
 * Single entry point for: Upload → Extract → Parse → Generate Embedding
 */

import dotenv from 'dotenv';
dotenv.config();

import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import fs from 'fs/promises';
import axios from 'axios';
import {
  extractEmails,
  extractPhones,
  extractURLs,
  extractYearsExperience,
  extractEducationKeywords,
  extractName,
  extractLocation,
  extractCurrentTitle,
  extractSkillKeywords,
} from '../utils/regexExtractor.js';
import { calculateYearsOfExperience, getExperienceLevel } from '../utils/experienceCalculator.js';
import { canonicalizeSkill, canonicalizeSkills, isKnownSkill } from '../data/skillsCanonical.js';
import { normalizeSkill } from '../utils/skillNormalizer.js';
import { logger } from '../utils/logger.js';
import { analyzeSoftSkillsFromResume } from './softSkillsService.js';
import { extractSkillsWithNER, extractJobSkills } from './aiRouter.js';

// Increase NER timeout to 60 seconds
const NER_TIMEOUT_MS = 60000;
const MAX_FILTERED_SKILLS = 60;

const ALWAYS_ALLOW_SKILLS = new Set(['ai', 'ml', 'go', 'c', 'c++', 'c#', 'ui', 'ux']);
const NON_SKILL_EXACT = new Set([
  'linkedin',
  'resume',
  'summary',
  'objective',
  'gaming',
  'blogging',
  'travelling',
  'traveling',
  'interests',
  'interest',
  'hobbies',
  'hobby',
  'campus',
  'event',
  'events',
  'platform',
  'bmsit',
]);
const NON_SKILL_KEYWORDS = [
  'university',
  'college',
  'institute',
  'school',
  'academy',
  'campus',
  'platform',
  'management',
  'technolog',
  'solution',
  'department',
  'experience',
  'project',
  'objective',
  'summary',
  'interest',
  'hobby',
  'linkedin',
  'achievement',
  'profile',
];
const TECH_KEYWORDS = [
  'js', 'css', 'sql', 'api', 'cloud', 'dev', 'data', 'engineer', 'design', 'test', 'ops', 'aws', 'azure',
  'gcp', 'front', 'back', 'stack', 'security', 'analysis', 'automation', 'mobile', 'web', 'android', 'ios',
  'database', 'pipeline', 'microservice', 'docker', 'kubernetes', 'server', 'lang', 'framework', 'ai', 'ml'
];

const splitTokens = (value) => {
  if (!value || typeof value !== 'string') return [];
  return value
    .split(/[^a-zA-Z0-9+#.]+/)
    .map(token => token.trim().toLowerCase())
    .filter(Boolean);
};

const buildContextStopwords = (result = {}) => {
  const tokens = new Set();
  splitTokens(result.name).forEach(token => tokens.add(token));
  (result.emails || []).forEach(email => splitTokens(email).forEach(token => tokens.add(token)));
  (result.education || []).forEach(ed => {
    splitTokens(ed?.institution).forEach(token => tokens.add(token));
    splitTokens(ed?.degree).forEach(token => tokens.add(token));
    splitTokens(ed?.field).forEach(token => tokens.add(token));
  });
  return tokens;
};

const isLikelyValidSkill = (rawSkill, contextStopwords) => {
  if (!rawSkill || typeof rawSkill !== 'string') return false;
  const normalized = normalizeSkill(rawSkill);
  if (!normalized) return false;
  const lower = normalized.toLowerCase();

  if (contextStopwords.has(lower)) return false;
  if (NON_SKILL_EXACT.has(lower)) return false;
  if (lower.length <= 1) return false;
  if (lower.length <= 2 && !ALWAYS_ALLOW_SKILLS.has(lower)) return false;
  if (NON_SKILL_KEYWORDS.some(keyword => lower.includes(keyword))) return false;

  const canonical = canonicalizeSkill(normalized);
  if (isKnownSkill(canonical) || isKnownSkill(normalized)) return true;

  const hasTechKeyword = TECH_KEYWORDS.some(keyword => lower.includes(keyword));
  return hasTechKeyword;
};

const cleanExtractedSkills = (skills, resultContext) => {
  if (!Array.isArray(skills) || skills.length === 0) return [];
  const contextStopwords = buildContextStopwords(resultContext);
  const filtered = skills
    .map(skill => normalizeSkill(skill))
    .filter(skill => skill && isLikelyValidSkill(skill, contextStopwords))
    .map(skill => canonicalizeSkill(skill));
  return [...new Set(filtered)].slice(0, MAX_FILTERED_SKILLS);
};

// ═══════════════════════════════════════════════════════════════════════
// SECTION 1: TEXT EXTRACTION (PDF/DOC/TXT)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Extract raw text from uploaded file
 * Supports: PDF, DOCX, TXT
 */
export async function extractText(file) {
  try {
    const { mimetype, path } = file;
    
    logger.info(`Extracting text from ${mimetype}...`);
    
    let raw_text = '';
    let pages = 0;
    let extractionConfidence = 1.0;
    let ocrNeeded = false;
    
    // PDF files
    if (mimetype === 'application/pdf') {
      try {
        const buffer = await fs.readFile(path);
        // Try basic pdf-parse first for speed
        try {
          const data = await pdf(buffer, {
            max: 0,
            version: 'v2.0.550'
          });
          
          raw_text = data.text;
          pages = data.numpages;
        } catch (pdfError) {
          // If basic parsing fails, try more robust methods
          logger.warn(`Basic PDF parsing failed: ${pdfError.message}, trying advanced methods...`);
          
          // Import and use the advanced extraction service
          const { extractFromPDF } = await import('./extractionService.js');
          const result = await extractFromPDF(path);
          raw_text = result.text;
          pages = result.pages;
        }
        
        // Check if OCR needed (less than 100 chars per page)
        const avgCharsPerPage = raw_text.length / pages;
        if (avgCharsPerPage < 100) {
          ocrNeeded = true;
          extractionConfidence = 0.3;
        }
      } catch (error) {
        logger.error(`PDF extraction failed: ${error.message}`);
        throw new Error(`Failed to extract text from PDF: ${error.message}`);
      }
    }
    // DOCX files
    else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const buffer = await fs.readFile(path);
      const result = await mammoth.extractRawText({ buffer });
      
      raw_text = result.value;
      pages = Math.ceil(raw_text.length / 3000); // Estimate pages
    }
    // TXT files
    else if (mimetype === 'text/plain') {
      raw_text = await fs.readFile(path, 'utf-8');
      pages = Math.ceil(raw_text.length / 3000);
    }
    else {
      throw new Error(`Unsupported file type: ${mimetype}`);
    }
    
    // Validate extraction
    const extractedChars = raw_text.length;
    if (extractedChars < 100) {
      return {
        status: 'failed',
        error: 'Extracted text too short (< 100 chars)',
        extractedChars,
        ocrNeeded: true
      };
    }
    
    // Check quality
    const status = ocrNeeded ? 'low_quality' : 'success';
    const message = ocrNeeded ? 'Text extracted but may be incomplete. OCR recommended.' : null;
    
    return {
      status,
      raw_text: raw_text.trim(),
      pages,
      extractedChars,
      extractionConfidence,
      ocrNeeded,
      message
    };
    
  } catch (error) {
    logger.error(`Text extraction failed: ${error.message}`);
    return {
      status: 'failed',
      error: error.message,
      extractedChars: 0,
      ocrNeeded: false
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 2: WATSON X.AI INTEGRATION (LLM Parsing)
// ═══════════════════════════════════════════════════════════════════════

// Watson credentials from .env (Updated to use new credentials)
const IBM_API_KEY = process.env.WATSONX_API_KEY || process.env.IBM_API_KEY;
const IBM_PROJECT_ID = process.env.WATSONX_PROJECT_ID || process.env.IBM_PROJECT_ID;
const IBM_URL = process.env.WATSONX_URL || process.env.IBM_URL || 'https://us-south.ml.cloud.ibm.com/ml/v1/text/generation?version=2023-05-29';
const IBM_MODEL_ID = process.env.WATSONX_MODEL_ID || process.env.IBM_MODEL_ID || 'ibm/granite-3-8b-instruct';

// Log Watson configuration on module load
if (IBM_API_KEY && IBM_PROJECT_ID) {
  logger.info(`Watson X.ai configured: API Key (${IBM_API_KEY.substring(0, 10)}...), Project ID: ${IBM_PROJECT_ID}`);
} else {
  logger.warn('Watson X.ai NOT configured - missing WATSONX_API_KEY or WATSONX_PROJECT_ID');
}

// IAM token cache
let cachedToken = null;
let tokenExpiry = null;

/**
 * Get IBM IAM access token (cached for 1 hour)
 */
async function getIAMToken() {
  // Check cache
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }
  
  try {
    const response = await axios.post(
      'https://iam.cloud.ibm.com/identity/token',
      new URLSearchParams({
        grant_type: 'urn:ibm:params:oauth:grant-type:apikey',
        apikey: IBM_API_KEY
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    
    cachedToken = response.data.access_token;
    tokenExpiry = Date.now() + (50 * 60 * 1000); // 50 minutes
    
    logger.info('IAM token obtained successfully');
    return cachedToken;
    
  } catch (error) {
    logger.error('IAM token request failed:');
    logger.error('Status:', error.response?.status);
    logger.error('Status Text:', error.response?.statusText);
    logger.error('Error Data:', JSON.stringify(error.response?.data, null, 2));
    logger.error('Error Message:', error.message);
    logger.error('API Key (first 10 chars):', IBM_API_KEY?.substring(0, 10) + '...');
    throw new Error(`IAM token failed: ${error.response?.data?.errorMessage || error.response?.status || error.message}`);
  }
}

/**
 * Call Watson X.ai for structured resume parsing
 */
async function parseResumeWithWatson(rawText) {
  // Check if Watson credentials are configured
  if (!IBM_API_KEY || !IBM_PROJECT_ID) {
    logger.warn('Watson credentials not configured, skipping Watson parsing');
    return {
      success: false,
      error: 'Watson credentials not configured',
      confidence: 0,
      source: 'watson'
    };
  }
  
  try {
    const token = await getIAMToken();
    
    const prompt = `Extract structured information from this resume. Return ONLY a valid JSON object with these fields:
{
  "name": "full name",
  "email": "email@example.com",
  "phone": "phone number",
  "location": "city, country",
  "current_title": "current job title",
  "years_experience": 2.5,
  "skills": ["skill1", "skill2"],
  "education": [{"degree": "B.Tech", "field": "CSE", "institution": "University", "year": 2023}],
  "experience": [{"title": "Developer", "company": "Company", "duration": "2021-2023", "description": "work details"}],
  "projects": [{"name": "Project Name", "description": "what it does", "technologies": ["tech1"]}]
}

Resume Text:
${rawText.substring(0, 4000)}

JSON:`;
    
    const response = await axios.post(
      IBM_URL,
      {
        input: prompt,
        parameters: {
          decoding_method: 'greedy',
          max_new_tokens: 1500,
          min_new_tokens: 100,
          temperature: 0.3,
          top_p: 0.85,
          repetition_penalty: 1.1
        },
        model_id: IBM_MODEL_ID,
        project_id: IBM_PROJECT_ID
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    
    const generatedText = response.data.results[0].generated_text.trim();
    
    // Extract JSON from response
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Watson response');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      success: true,
      data: parsed,
      confidence: 0.75,
      source: 'watson'
    };
    
  } catch (error) {
    logger.error('Watson parsing failed:', error.message);
    return {
      success: false,
      error: error.message,
      confidence: 0,
      source: 'watson'
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 3: HYBRID PARSING (Regex → Watson LLM Fallback)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Main parsing function: Fast regex extraction with Watson fallback for missing fields
 * 
 * Strategy:
 * 1. Regex extraction (FAST, 95% accurate for structured fields)
 * 2. Watson LLM only for missing/low-confidence fields
 * 3. Canonical skill normalization
 */
export async function parseResume(rawText, options = {}) {
  const startTime = Date.now();
  const { useLLM = false, minConfidence = 0.60 } = options; // Disabled by default for speed
  
  logger.info('Starting hybrid resume parsing...');
  
  const confidenceScores = {};
  const extractionMethods = {};
  
  const result = {
    name: null,
    emails: [],
    phones: [],
    location: null,
    current_title: null,
    years_experience: 0,
    skills: [],
    education: [],
    experience: [],
    projects: [],
    links: [],
  };
  
  // ─────────────────────────────────────────────────────────────────────
  // PHASE 1: REGEX EXTRACTION (Fast & Accurate)
  // ─────────────────────────────────────────────────────────────────────
  
  // Extract contact info (confidence: 0.95-0.98)
  const emailsResult = extractEmails(rawText);
  if (emailsResult.confidence > 0) {
    result.emails = emailsResult.emails;
    confidenceScores.emails = emailsResult.confidence;
    extractionMethods.emails = 'regex';
  }
  
  const phonesResult = extractPhones(rawText);
  if (phonesResult.confidence > 0) {
    result.phones = phonesResult.phones;
    confidenceScores.phones = phonesResult.confidence;
    extractionMethods.phones = 'regex';
  }
  
  const urlsResult = extractURLs(rawText);
  if (urlsResult.confidence > 0) {
    result.links = urlsResult.urls;
    confidenceScores.links = urlsResult.confidence;
    extractionMethods.links = 'regex';
  }
  
  // Extract name (confidence: 0.80-0.95)
  const nameResult = extractName(rawText);
  if (nameResult.confidence >= minConfidence) {
    result.name = nameResult.name;
    confidenceScores.name = nameResult.confidence;
    extractionMethods.name = 'regex';
  }
  
  // Extract location (confidence: 0.88)
  const locationResult = extractLocation(rawText);
  if (locationResult.confidence >= minConfidence) {
    result.location = locationResult.location;
    confidenceScores.location = locationResult.confidence;
    extractionMethods.location = 'regex';
  }
  
  // Extract current title (confidence: 0.75)
  const titleResult = extractCurrentTitle(rawText);
  if (titleResult.confidence >= minConfidence) {
    result.current_title = titleResult.title;
    confidenceScores.current_title = titleResult.confidence;
    extractionMethods.current_title = 'regex';
  }
  
  // Extract skills (confidence: 0.70)
  const skillsRegex = extractSkillKeywords(rawText);
  if (skillsRegex.confidence > 0) {
    result.skills = canonicalizeSkills(skillsRegex.skills);
    confidenceScores.skills = skillsRegex.confidence;
    extractionMethods.skills = 'regex';
  }
  
  // Enhanced skill extraction using Python NER
  try {
    logger.info('Running Python NER skill extraction...');
    const nerResult = await extractSkillsWithNER(rawText);
    if (nerResult.success && nerResult.skills && nerResult.skills.length > 0) {
      const aiSkills = nerResult.skills.map(s => s.skill.toLowerCase());
      result.skills = [...new Set([...result.skills, ...aiSkills])];
      extractionMethods.skills = 'regex+ner';
      confidenceScores.skills = Math.max(confidenceScores.skills || 0, 0.85);
      logger.info(`NER extracted ${nerResult.skills.length} additional skills`);
    } else {
      logger.info('NER returned no additional skills, using regex skills only');
    }
  } catch (error) {
    logger.warn('NER skill extraction failed, continuing with regex skills:', error.message);
    // Continue with regex-extracted skills - don't fail the entire parse
  }

  result.skills = cleanExtractedSkills(result.skills, result);
  
  // Extract experience years
  const expResult = extractYearsExperience(rawText);
  if (expResult.confidence > 0) {
    result.years_experience = expResult.years;
    confidenceScores.years_experience = expResult.confidence;
    extractionMethods.years_experience = 'regex';
  }
  
  // Extract education keywords
  const educationKeywords = extractEducationKeywords(rawText);
  if (educationKeywords.matches && educationKeywords.matches.length > 0) {
    result.education = educationKeywords.matches
      .filter(m => m.type === 'degree')
      .map(match => ({
        degree: match.text,
        field: null,
        institution: null,
        year: null
      }));
    confidenceScores.education = educationKeywords.confidence;
    extractionMethods.education = 'regex';
  }
  
  // ─────────────────────────────────────────────────────────────────────
  // PHASE 2: WATSON LLM (Only for missing/low-confidence fields)
  // ─────────────────────────────────────────────────────────────────────
  
  let llmUsed = false;
  const missingFields = [];
  
  // Check what's missing
  if (!result.name || confidenceScores.name < 0.70) missingFields.push('name');
  if (!result.current_title) missingFields.push('current_title');
  if (result.skills.length === 0) missingFields.push('skills');
  if (result.experience.length === 0) missingFields.push('experience');
  if (result.projects.length === 0) missingFields.push('projects');
  
  // Use Watson only if critical fields missing and useLLM enabled
  if (useLLM && missingFields.length > 0) {
    logger.info(`Calling Watson for missing fields: ${missingFields.join(', ')}`);
    
    try {
      const llmResult = await parseResumeWithWatson(rawText);
      
      if (llmResult.success) {
        llmUsed = true;
        const llmData = llmResult.data;
        
        // Fill missing fields from Watson
        if (!result.name && llmData.name) {
          result.name = llmData.name;
          confidenceScores.name = llmResult.confidence;
          extractionMethods.name = 'watson';
        }
        
        if (!result.current_title && llmData.current_title) {
          result.current_title = llmData.current_title;
          confidenceScores.current_title = llmResult.confidence;
          extractionMethods.current_title = 'watson';
        }
        
        if (result.skills.length === 0 && llmData.skills) {
          result.skills = canonicalizeSkills(llmData.skills);
          confidenceScores.skills = llmResult.confidence;
          extractionMethods.skills = 'watson';
        }
        
        if (llmData.experience && llmData.experience.length > 0) {
          result.experience = llmData.experience;
          confidenceScores.experience = llmResult.confidence;
          extractionMethods.experience = 'watson';
        }
        
        if (llmData.projects && llmData.projects.length > 0) {
          result.projects = llmData.projects;
          confidenceScores.projects = llmResult.confidence;
          extractionMethods.projects = 'watson';
        }
        
        if (llmData.education && llmData.education.length > 0) {
          result.education = llmData.education;
          confidenceScores.education = llmResult.confidence;
          extractionMethods.education = 'watson';
        }
      } else {
        logger.warn(`Watson parsing failed: ${llmResult.error}`);
      }
    } catch (watsonError) {
      logger.error(`Watson error (continuing without it): ${watsonError.message}`);
      // Continue without Watson - regex results are still valid
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────
  // PHASE 3: VALIDATION & METADATA
  // ─────────────────────────────────────────────────────────────────────
  
  // Calculate overall confidence (weighted average)
  const fieldWeights = {
    name: 0.15,
    emails: 0.10,
    skills: 0.25,
    experience: 0.20,
    current_title: 0.15,
    education: 0.15
  };
  
  let overallConfidence = 0;
  let totalWeight = 0;
  
  for (const [field, weight] of Object.entries(fieldWeights)) {
    if (confidenceScores[field]) {
      overallConfidence += confidenceScores[field] * weight;
      totalWeight += weight;
    }
  }
  
  overallConfidence = totalWeight > 0 ? overallConfidence / totalWeight : 0;
  
  // Check if manual review needed
  const requiresManualReview = overallConfidence < 0.65 || 
    !result.name || 
    result.skills.length === 0;
  
  // ─────────────────────────────────────────────────────────────────────
  // PHASE 4: SOFT SKILLS ANALYSIS
  // ─────────────────────────────────────────────────────────────────────
  
  let softSkills = [];
  try {
    softSkills = analyzeSoftSkillsFromResume(result);
    result.soft_skills = softSkills;
    logger.info(`Identified ${softSkills.length} soft skills`);
  } catch (error) {
    logger.error('Soft skills analysis failed:', error.message);
  }
  
  const processingTimeMs = Date.now() - startTime;
  
  logger.info(`Resume parsed in ${processingTimeMs}ms (Watson: ${llmUsed})`);
  
  return {
    success: true,
    parsed_resume: result,
    metadata: {
      version: '3.0-unified',
      parsed_at: new Date().toISOString(),
      overall_confidence: parseFloat(overallConfidence.toFixed(2)),
      field_confidences: confidenceScores,
      extraction_methods: extractionMethods,
      processing_time_ms: processingTimeMs,
      llm_used: llmUsed,
      missing_fields: missingFields,
      requires_manual_review: requiresManualReview,
      soft_skills_count: softSkills.length
    }
  };
}

/**
 * Quick parse: Regex only (no LLM) - FASTEST
 */
export async function quickParse(rawText) {
  return await parseResume(rawText, { useLLM: false, minConfidence: 0.50 });
}

/**
 * Deep parse: Regex only for speed (LLM disabled)
 */
export async function deepParse(rawText) {
  return await parseResume(rawText, { useLLM: false, minConfidence: 0.75 });
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 4: WATSON UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Call Watson to predict best job role (used in rolePredictionService)
 */
export async function predictRoleWithWatson(skills, experience, currentTitle) {
  try {
    const token = await getIAMToken();
    
    const prompt = `Given these candidate details:
Skills: ${skills.join(', ')}
Experience: ${experience} years
Current Title: ${currentTitle || 'Not specified'}

Predict the top 3 best-fit job roles. Return ONLY a JSON array:
["Primary Role", "Alternative Role 1", "Alternative Role 2"]

JSON:`;
    
    const response = await axios.post(
      IBM_URL,
      {
        input: prompt,
        parameters: {
          decoding_method: 'greedy',
          max_new_tokens: 200,
          temperature: 0.3,
          top_p: 0.85
        },
        model_id: IBM_MODEL_ID,
        project_id: IBM_PROJECT_ID
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    
    const generatedText = response.data.results[0].generated_text.trim();
    const jsonMatch = generatedText.match(/\[[\s\S]*\]/);
    
    if (!jsonMatch) {
      throw new Error('No JSON array found in Watson response');
    }
    
    const roles = JSON.parse(jsonMatch[0]);
    
    return {
      success: true,
      roles: roles,
      confidence: 0.75
    };
    
  } catch (error) {
    logger.error('Watson role prediction failed:', error.message);
    return {
      success: false,
      error: error.message,
      confidence: 0
    };
  }
}

/**
 * Generate AI summary for job (used in jobMatchingService)
 */
export async function generateJobSummary(job, candidateSkills, missingSkills) {
  try {
    const token = await getIAMToken();
    
    const prompt = `Summarize this job match in 2-3 sentences:

Job: ${job.title} at ${job.company}
Location: ${job.location}
Salary: ${job.salary_min}-${job.salary_max}
Required Skills: ${job.required_skills.join(', ')}

Candidate Has: ${candidateSkills.join(', ')}
Missing Skills: ${missingSkills.join(', ')}

Focus on: why this is a good match, what skills need improvement.

Summary:`;
    
    const response = await axios.post(
      IBM_URL,
      {
        input: prompt,
        parameters: {
          decoding_method: 'greedy',
          max_new_tokens: 150,
          temperature: 0.5,
          top_p: 0.85
        },
        model_id: IBM_MODEL_ID,
        project_id: IBM_PROJECT_ID
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const summary = response.data.results[0].generated_text.trim();
    
    return {
      success: true,
      summary: summary
    };
    
  } catch (error) {
    logger.error('Watson job summary failed:', error.message);
    return {
      success: false,
      summary: null
    };
  }
}

export { getIAMToken, parseResumeWithWatson };
