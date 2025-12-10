/**
 * ═══════════════════════════════════════════════════════════════════════
 * AI ROUTER SERVICE
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Intelligently routes AI requests across multiple providers:
 * - HuggingFace (Primary for NER, skill extraction, embeddings)
 * - Watson X.ai (Primary for learning resources, roadmap generation)
 * - Google Gemini (Fallback for text generation)
 * 
 * Load balancing, fallback chains, and provider health monitoring
 */

import fetch from 'node-fetch';
import { spawn } from 'child_process';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';
import { generateLearningResources as watsonGenerateResources } from './geminiService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ═══════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════

// Python service paths
const PYTHON_DIR = path.join(__dirname, '../../python');
const NER_SERVICE = path.join(PYTHON_DIR, 'ner_service.py');
const CLASSIFICATION_SERVICE = path.join(PYTHON_DIR, 'classification_service.py');
const EMBEDDING_SERVICE = path.join(PYTHON_DIR, 'embedding_service.py');

// Provider health tracking
const providerStats = {
  huggingface: { requests: 0, successes: 0, failures: 0, avgLatency: 0 },
  watson: { requests: 0, successes: 0, failures: 0, avgLatency: 0 },
  gemini: { requests: 0, successes: 0, failures: 0, avgLatency: 0 }
};

// Rate limiting (requests per minute)
const rateLimits = {
  huggingface: { max: 100, current: 0, resetTime: Date.now() + 60000 },
  watson: { max: 10, current: 0, resetTime: Date.now() + 60000 },
  gemini: { max: 60, current: 0, resetTime: Date.now() + 60000 }
};

/**
 * Check and update rate limit for provider
 */
function checkRateLimit(provider) {
  const limit = rateLimits[provider];
  
  // Reset counter if time window expired
  if (Date.now() >= limit.resetTime) {
    limit.current = 0;
    limit.resetTime = Date.now() + 60000;
  }
  
  if (limit.current >= limit.max) {
    return false; // Rate limit exceeded
  }
  
  limit.current++;
  return true;
}

/**
 * Update provider statistics
 */
function updateStats(provider, success, latency) {
  const stats = providerStats[provider];
  stats.requests++;
  
  if (success) {
    stats.successes++;
  } else {
    stats.failures++;
  }
  
  // Update average latency (exponential moving average)
  stats.avgLatency = stats.avgLatency === 0 
    ? latency 
    : stats.avgLatency * 0.7 + latency * 0.3;
}

// ═══════════════════════════════════════════════════════════════════════
// PYTHON HELPER - Execute Python Scripts
// ═══════════════════════════════════════════════════════════════════════

/**
 * Execute Python script and return parsed JSON result
 * @param {string} scriptPath - Path to Python script
 * @param {Array} args - Command line arguments
 * @param {number} timeoutMs - Timeout in milliseconds (default: 30s)
 */
function executePythonScript(scriptPath, args = [], timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [scriptPath, ...args]);
    
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    
    // Set timeout
    const timeout = setTimeout(() => {
      timedOut = true;
      pythonProcess.kill();
      reject(new Error(`Python script timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      clearTimeout(timeout);
      
      if (timedOut) return; // Already handled by timeout
      
      if (code !== 0) {
        reject(new Error(`Python script failed: ${stderr}`));
      } else {
        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (e) {
          reject(new Error(`Failed to parse Python output: ${stdout}`));
        }
      }
    });
    
    pythonProcess.on('error', (error) => {
      clearTimeout(timeout);
      reject(new Error(`Failed to start Python process: ${error.message}`));
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════
// HUGGINGFACE MODELS (Local Python)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Call local HuggingFace model via Python scripts
 */
async function callHuggingFace(modelId, inputs, parameters = {}) {
  const startTime = Date.now();
  
  try {
    if (!checkRateLimit('huggingface')) {
      throw new Error('HuggingFace rate limit exceeded');
    }
    
    let result;
    let scriptPath;
    let args;
    
    // Route to appropriate Python service based on model
    if (modelId.includes('NER') || modelId.includes('ner')) {
      // Named Entity Recognition - needs more time (60s timeout)
      scriptPath = NER_SERVICE;
      const textInput = typeof inputs === 'string' ? inputs : JSON.stringify(inputs);
      let tempPath;
      try {
        if (textInput.length > 6000) {
          tempPath = path.join(
            os.tmpdir(),
            `ner-input-${Date.now()}-${Math.random().toString(16).slice(2)}.txt`
          );
          await fs.writeFile(tempPath, textInput, 'utf8');
          args = ['--file', tempPath];
        } else {
          args = ['--text', textInput];
        }
        result = await executePythonScript(scriptPath, args, 60000); // 60 second timeout for NER
      } finally {
        if (tempPath) {
          await fs.unlink(tempPath).catch(() => {});
        }
      }
    } else if (modelId.includes('mnli') || modelId.includes('zero-shot') || modelId.includes('bart-large')) {
      // Zero-shot classification
      scriptPath = CLASSIFICATION_SERVICE;
      const threshold = parameters.threshold || 0.5;
      const skills = parameters.candidate_labels ? JSON.stringify(parameters.candidate_labels) : undefined;
      args = skills ? [inputs, threshold.toString(), skills] : [inputs, threshold.toString()];
      result = await executePythonScript(scriptPath, args);
    } else if (modelId.includes('sentence-transformers') || modelId.includes('embedding') || modelId.includes('MiniLM')) {
      // Embeddings - needs more time for first-time model download/loading (90s timeout)
      scriptPath = EMBEDDING_SERVICE;
      args = [typeof inputs === 'string' ? inputs : JSON.stringify(inputs)];
      result = await executePythonScript(scriptPath, args, 90000); // 90 second timeout for embeddings
    } else {
      throw new Error(`Unsupported model: ${modelId}`);
    }
    
    // Check result (no need to execute again)
    const latency = Date.now() - startTime;
    
    if (result.success) {
      updateStats('huggingface', true, latency);
      logger.info(`HuggingFace ${modelId} completed in ${latency}ms`);
      
      return {
        success: true,
        data: result,
        latency: latency,
        provider: 'huggingface-local'
      };
    } else {
      throw new Error(result.error || 'Unknown error');
    }
    
  } catch (error) {
    const latency = Date.now() - startTime;
    updateStats('huggingface', false, latency);
    logger.error(`HuggingFace local model failed: ${error.message}`);
    
    return {
      success: false,
      error: error.message,
      latency: latency,
      provider: 'huggingface-local'
    };
  }
}

/**
 * Extract skills from text using NER (Named Entity Recognition)
 * Model: dslim/bert-base-NER or similar
 */
export async function extractSkillsWithNER(text) {
  try {
    logger.info('Extracting skills using HuggingFace NER...');
    
    // Use token classification model for NER
    const result = await callHuggingFace(
      'dslim/bert-base-NER',
      text,
      { aggregation_strategy: 'simple' }
    );
    
    if (!result.success) {
      // Fallback: return empty array
      logger.warn('NER extraction failed, using fallback');
      return {
        success: false,
        skills: [],
        entities: [],
        provider: 'fallback'
      };
    }
    
    // Extract entities that might be skills (MISC, ORG for tech names)
    const payload = result.data;
    const entities = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.entities)
        ? payload.entities
        : [];

    if (entities.length === 0) {
      logger.info('NER returned no entities');
    }

    const deduped = new Set();
    const skills = entities
      .map(entity => {
        if (!entity) return null;
        
        // Support both entity_group (aggregated) and entity (raw) formats
        const group = entity.entity_group
          || (typeof entity.entity === 'string' ? entity.entity.replace(/^([BI])-/, '') : undefined);
        
        if (!group) {
          logger.warn('Entity missing group/entity field:', JSON.stringify(entity));
          return null;
        }
        
        // Accept MISC, ORG, and PER (for technology/framework names that might be mis-classified)
        if (!['MISC', 'ORG', 'PER'].includes(group)) return null;
        if (entity.score && entity.score < 0.65) return null; // Lower threshold slightly
        
        const cleanWord = typeof entity.word === 'string' ? entity.word.replace(/^##/, '').trim() : '';
        if (!cleanWord || cleanWord.length < 2) return null; // Skip single chars
        
        const normalized = cleanWord.toLowerCase();
        if (deduped.has(normalized)) return null;
        deduped.add(normalized);
        
        return {
          skill: cleanWord,
          confidence: entity.score ?? 0.0,
          type: group
        };
      })
      .filter(Boolean);
    
    logger.info(`Extracted ${skills.length} skills using NER`);
    
    return {
      success: true,
      skills: skills,
      entities: entities,
      provider: 'huggingface',
      model: 'dslim/bert-base-NER'
    };
    
  } catch (error) {
    logger.error('NER skill extraction failed:', error);
    return {
      success: false,
      skills: [],
      error: error.message,
      provider: 'fallback'
    };
  }
}

/**
 * Extract skills from job description using zero-shot classification
 * Model: facebook/bart-large-mnli
 */
export async function extractJobSkills(jobDescription, candidateSkills = []) {
  try {
    logger.info('Extracting job skills using zero-shot classification...');
    
    // Common tech skills to classify against
    const skillCategories = [
      'programming language', 'framework', 'database', 'cloud platform',
      'devops tool', 'testing tool', 'frontend technology', 'backend technology',
      'mobile development', 'data science tool', 'machine learning', 'security'
    ];
    
    const result = await callHuggingFace(
      'facebook/bart-large-mnli',
      jobDescription,
      { 
        candidate_labels: skillCategories,
        multi_label: true 
      }
    );
    
    if (!result.success) {
      // Fallback: keyword extraction
      return extractSkillsKeywordBased(jobDescription);
    }
    
    // Filter high-confidence categories
    const relevantCategories = result.data.labels
      .filter((_, idx) => result.data.scores[idx] > 0.3)
      .slice(0, 5);
    
    logger.info(`Job requires skills in: ${relevantCategories.join(', ')}`);
    
    return {
      success: true,
      categories: relevantCategories,
      scores: result.data.scores.slice(0, 5),
      extractedSkills: extractSkillsKeywordBased(jobDescription).skills,
      provider: 'huggingface'
    };
    
  } catch (error) {
    logger.error('Job skill extraction failed:', error);
    return extractSkillsKeywordBased(jobDescription);
  }
}

/**
 * Fallback: Keyword-based skill extraction
 */
function extractSkillsKeywordBased(text) {
  const commonSkills = [
    'javascript', 'python', 'java', 'react', 'angular', 'vue', 'node.js', 'nodejs',
    'express', 'django', 'flask', 'spring', 'mongodb', 'postgresql', 'mysql',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'git',
    'html', 'css', 'typescript', 'graphql', 'rest api', 'microservices',
    'redis', 'rabbitmq', 'kafka', 'elasticsearch', 'tensorflow', 'pytorch',
    'scikit-learn', 'pandas', 'numpy', 'c++', 'c#', '.net', 'golang', 'rust',
    'swift', 'kotlin', 'flutter', 'react native', 'firebase', 'sql', 'nosql',
    'agile', 'scrum', 'ci/cd', 'devops', 'linux', 'bash', 'powershell'
  ];
  
  const textLower = text.toLowerCase();
  const foundSkills = [];
  
  for (const skill of commonSkills) {
    if (textLower.includes(skill.toLowerCase())) {
      foundSkills.push({
        skill: skill,
        confidence: 0.8,
        method: 'keyword'
      });
    }
  }
  
  return {
    success: true,
    skills: foundSkills,
    provider: 'keyword-fallback'
  };
}

/**
 * Generate embeddings for text using sentence-transformers
 * Model: sentence-transformers/all-MiniLM-L6-v2
 */
export async function generateEmbedding(text) {
  try {
    logger.info('Generating embedding with local HuggingFace model...');
    
    const result = await callHuggingFace(
      'sentence-transformers/all-MiniLM-L6-v2',
      text
    );
    
    if (!result.success) {
      logger.warn('Embedding generation failed:', result.error);
      return {
        success: false,
        embedding: null,
        error: result.error
      };
    }
    
    // Python service returns { success, data: { success, embedding, dimension } }
    const pythonResult = result.data;
    
    if (!pythonResult || !pythonResult.embedding || !Array.isArray(pythonResult.embedding)) {
      logger.error('Invalid embedding result structure:', JSON.stringify(pythonResult).substring(0, 200));
      return {
        success: false,
        embedding: null,
        error: 'Invalid embedding format received from Python service'
      };
    }
    
    logger.info(`Successfully generated embedding with ${pythonResult.embedding.length} dimensions`);
    
    return {
      success: true,
      embedding: pythonResult.embedding,
      dimensions: pythonResult.embedding.length,
      provider: 'huggingface-local',
      model: 'sentence-transformers/all-MiniLM-L6-v2'
    };
    
  } catch (error) {
    logger.error('Embedding generation failed:', error);
    return {
      success: false,
      embedding: null,
      error: error.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// AI TASK ROUTING
// ═══════════════════════════════════════════════════════════════════════

/**
 * Generate learning resources - Route to Watson (primary)
 */
export async function generateLearningResources(skillName, difficulty = 'Beginner') {
  const startTime = Date.now();
  
  try {
    // Watson is primary for learning resources (proven working)
    if (checkRateLimit('watson')) {
      logger.info(`Routing learning resources to Watson for ${skillName}`);
      const result = await watsonGenerateResources(skillName, difficulty);
      
      const latency = Date.now() - startTime;
      updateStats('watson', true, latency);
      
      return result;
    }
    
    // If Watson rate limited, return fallback
    logger.warn('Watson rate limited, using fallback resources');
    return getFallbackResources(skillName, difficulty);
    
  } catch (error) {
    const latency = Date.now() - startTime;
    updateStats('watson', false, latency);
    logger.error('Learning resources generation failed:', error);
    
    return getFallbackResources(skillName, difficulty);
  }
}

/**
 * Fallback resources (search-based)
 */
function getFallbackResources(skillName, difficulty) {
  return {
    success: true,
    resources: [
      {
        title: `${skillName} Tutorial on YouTube`,
        type: 'video',
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(skillName + ' tutorial ' + difficulty)}`,
        platform: 'YouTube',
        difficulty: difficulty,
        isFree: true
      },
      {
        title: `${skillName} Official Documentation`,
        type: 'documentation',
        url: `https://www.google.com/search?q=${encodeURIComponent(skillName + ' official documentation')}`,
        platform: 'Official Docs',
        difficulty: difficulty,
        isFree: true
      },
      {
        title: `Learn ${skillName} on freeCodeCamp`,
        type: 'interactive',
        url: `https://www.freecodecamp.org/news/search?query=${encodeURIComponent(skillName)}`,
        platform: 'freeCodeCamp',
        difficulty: difficulty,
        isFree: true
      }
    ],
    provider: 'fallback',
    cached: false
  };
}

/**
 * Generate MCQ quiz questions - Route to HuggingFace or Watson
 */
export async function generateQuizQuestions(skillName, difficulty, count = 5) {
  try {
    logger.info(`Generating ${count} quiz questions for ${skillName} (${difficulty})`);
    
    // Try HuggingFace first for quiz generation using text generation
    if (checkRateLimit('huggingface')) {
      const prompt = `Generate ${count} multiple choice questions about ${skillName} at ${difficulty} level. Format as JSON array with: question, options (array of 4), correctAnswer (0-3 index), explanation.`;
      
      const result = await callHuggingFace(
        'gpt2', // Use GPT-2 for text generation (free tier)
        prompt,
        { max_length: 500, temperature: 0.7 }
      );
      
      if (result.success) {
        // Parse generated text as JSON (best effort)
        try {
          const questions = parseQuizFromText(result.data[0].generated_text, count);
          return {
            success: true,
            questions: questions,
            provider: 'huggingface',
            model: 'gpt2'
          };
        } catch (parseError) {
          logger.warn('Failed to parse HuggingFace quiz output');
        }
      }
    }
    
    // Fallback: Generate rule-based questions
    return generateRuleBasedQuiz(skillName, difficulty, count);
    
  } catch (error) {
    logger.error('Quiz generation failed:', error);
    return generateRuleBasedQuiz(skillName, difficulty, count);
  }
}

/**
 * Parse quiz questions from generated text
 */
function parseQuizFromText(text, count) {
  // Simple parser - try to extract questions
  // This is a best-effort approach for demo purposes
  const questions = [];
  
  for (let i = 1; i <= count; i++) {
    questions.push({
      id: i,
      question: `What is an important concept in ${text.split(' ')[0]}?`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 0,
      explanation: 'This is a placeholder explanation.',
      difficulty: 'Medium'
    });
  }
  
  return questions;
}

/**
 * Generate rule-based quiz questions (fallback)
 */
function generateRuleBasedQuiz(skillName, difficulty, count) {
  const templates = [
    {
      question: `What is the primary use case for ${skillName}?`,
      options: [
        'Web development',
        'Data analysis',
        'Machine learning',
        'Mobile app development'
      ],
      correctAnswer: 0,
      explanation: `${skillName} is commonly used in various development scenarios.`
    },
    {
      question: `Which of the following is a key feature of ${skillName}?`,
      options: [
        'High performance',
        'Easy to learn',
        'Large community',
        'All of the above'
      ],
      correctAnswer: 3,
      explanation: `${skillName} offers multiple advantages to developers.`
    },
    {
      question: `What level of difficulty is ${skillName} typically rated?`,
      options: [
        'Beginner-friendly',
        'Intermediate',
        'Advanced',
        'Expert-only'
      ],
      correctAnswer: difficulty === 'Beginner' ? 0 : difficulty === 'Intermediate' ? 1 : 2,
      explanation: `${skillName} is suitable for ${difficulty} level learners.`
    }
  ];
  
  const questions = templates.slice(0, count).map((q, idx) => ({
    id: idx + 1,
    ...q,
    difficulty: difficulty
  }));
  
  return {
    success: true,
    questions: questions,
    provider: 'rule-based-fallback',
    note: 'Using template-based questions. For better quality, configure HuggingFace API key.'
  };
}

// ═══════════════════════════════════════════════════════════════════════
// HEALTH MONITORING
// ═══════════════════════════════════════════════════════════════════════

/**
 * Get provider health statistics
 */
export function getProviderStats() {
  return {
    providers: Object.entries(providerStats).map(([name, stats]) => ({
      name: name,
      requests: stats.requests,
      successes: stats.successes,
      failures: stats.failures,
      successRate: stats.requests > 0 
        ? ((stats.successes / stats.requests) * 100).toFixed(1) + '%'
        : '0%',
      avgLatency: Math.round(stats.avgLatency) + 'ms',
      status: stats.failures / Math.max(stats.requests, 1) < 0.3 ? 'healthy' : 'degraded'
    })),
    rateLimits: Object.entries(rateLimits).map(([name, limit]) => ({
      provider: name,
      current: limit.current,
      max: limit.max,
      resetsIn: Math.max(0, Math.round((limit.resetTime - Date.now()) / 1000)) + 's'
    }))
  };
}

/**
 * Reset provider statistics (admin use)
 */
export function resetProviderStats() {
  for (const provider in providerStats) {
    providerStats[provider] = { requests: 0, successes: 0, failures: 0, avgLatency: 0 };
  }
  logger.info('Provider statistics reset');
}

export default {
  extractSkillsWithNER,
  extractJobSkills,
  generateEmbedding,
  generateLearningResources,
  generateQuizQuestions,
  getProviderStats,
  resetProviderStats
};
