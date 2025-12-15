/**
 * ═══════════════════════════════════════════════════════════════════════
 * JOB API ROUTES (Using Unified Intelligent Matching Service)
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Endpoints:
 *   - POST /api/resume/:resumeId/analyze-role → AI role prediction + skill gaps
 *   - GET /api/jobs/match/:resumeId → Hybrid job matching (embeddings + classical)
 *   - GET /api/jobs/semantic-match/:resumeId → Pure semantic matching
 *   - POST /api/jobs/:jobId/track → Track interactions (view/apply/save)
 *   - GET /api/jobs/saved/:resumeId → User saved jobs
 */

import express from 'express';
import mongoose from 'mongoose';
import { 
  predictBestRole, 
  analyzeSkills, 
  findMatchingJobs, 
  findSemanticMatches, 
  findSimilarJobs,
  trackJobInteraction,
  getJobWithMatch
} from '../services/intelligentJobMatchingService.js';
import { queueResumeEmbedding, queueJobEmbedding, getQueueStats, processQueue } from '../services/embeddingQueueService.js';
import { loadSeedJobs, clearSeedJobs } from '../services/seedJobsService.js';
import { importJobsFromJSON, importJobsFromCSV } from '../services/csvJobImportService.js';
import { generateTagline, generateBio } from '../services/taglineService.js';
import { analyzeStrengths } from '../services/softSkillsService.js';
import Resume from '../models/Resume.js';
import Job from '../models/Job.js';
import JobMatch from '../models/JobMatch.js';
import JobApplication from '../models/JobApplication.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { logger } from '../utils/logger.js';
import { ensureDatabaseConnection } from '../config/database.js';
import { loadJobsFromFile, reloadJobsFromFile, getJobsFilePath } from '../services/fileJobService.js';
import { evaluateJobCompatibilityWithWatson, mapResumeToProfile } from '../services/watsonJobCompatibilityService.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { requireRecruiter } from '../middleware/subscriptionMiddleware.js';
import { EVENTS, emitApplicationEvent } from '../utils/notificationEmitter.js';

const router = express.Router();

const DEFAULT_EXPIRY_DAYS = parseInt(process.env.RECRUITER_JOB_EXPIRY_DAYS || '45', 10);
const MS_IN_DAY = 24 * 60 * 60 * 1000;
const ALLOWED_SOURCE_PLATFORMS = new Set(['linkedin', 'indeed', 'glassdoor', 'direct', 'api', 'manual', 'seed', 'real']);

const ensureDate = (value, fallback) => {
  if (!value) {
    return new Date(fallback || Date.now());
  }

  const candidate = new Date(value);
  return Number.isNaN(candidate.getTime()) ? new Date(fallback || Date.now()) : candidate;
};

const normalizeSalaryPeriod = (value) => {
  const normalized = (value || '').toString().toLowerCase();

  if (['hourly', 'hour', 'per_hour', 'hr'].includes(normalized)) {
    return 'hourly';
  }

  // Default to annually for year/annual synonyms or unknown values
  if (['annual', 'annually', 'yearly', 'year', 'yr', 'per_year'].includes(normalized)) {
    return 'annually';
  }

  return 'annually';
};

const normalizeSourcePlatform = (value) => {
  const platform = (value || '').toString().toLowerCase().trim();
  if (ALLOWED_SOURCE_PLATFORMS.has(platform)) {
    return platform;
  }
  if (platform === 'job_portal' || platform === 'aggregator') {
    return 'api';
  }
  if (platform === 'file' || platform === 'career_page') {
    return 'manual';
  }
  return 'manual';
};

const normalizeSkillsPayload = (skills = {}) => {
  if (Array.isArray(skills)) {
    const normalized = skills.filter(Boolean).map((skill) => skill.toLowerCase().trim());
    return {
      required: normalized,
      preferred: normalized,
      allSkills: Array.from(new Set(normalized))
    };
  }

  const required = Array.isArray(skills.required)
    ? skills.required.filter(Boolean).map((skill) => skill.toLowerCase().trim())
    : [];

  const preferredCandidates = Array.isArray(skills.preferred)
    ? skills.preferred
    : Array.isArray(skills.nice_to_have)
      ? skills.nice_to_have
      : [];

  const preferred = preferredCandidates.filter(Boolean).map((skill) => skill.toLowerCase().trim());
  const combined = Array.from(new Set([...required, ...preferred]));

  return {
    required,
    preferred: preferred.length ? preferred : required,
    allSkills: combined
  };
};

const buildJobId = (existingId) => {
  if (existingId && typeof existingId === 'string' && existingId.trim().length) {
    return existingId.trim();
  }
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

const normalizeJobPayload = (rawJob = {}) => {
  const postedDate = ensureDate(rawJob.postedDate, Date.now());
  const expiresAtFallback = new Date(postedDate.getTime() + DEFAULT_EXPIRY_DAYS * MS_IN_DAY);
  const expiresAt = ensureDate(rawJob.expiresAt, expiresAtFallback);

  const salary = rawJob.salary ? { ...rawJob.salary } : undefined;
  if (salary) {
    if (salary.min !== undefined) salary.min = Number(salary.min);
    if (salary.max !== undefined) salary.max = Number(salary.max);
    salary.currency = salary.currency || 'USD';
    salary.period = normalizeSalaryPeriod(salary.period);
  }

  const source = {
    platform: normalizeSourcePlatform(rawJob.source?.platform),
    sourceUrl: rawJob.source?.sourceUrl || rawJob.applicationUrl || null,
    sourceJobId: rawJob.source?.sourceJobId || rawJob.jobId || null
  };

  return {
    ...rawJob,
    jobId: buildJobId(rawJob.jobId),
    postedDate,
    expiresAt,
    salary,
    source,
    skills: normalizeSkillsPayload(rawJob.skills || {})
  };
};

const toPlainObject = (doc) => {
  if (!doc) return null;
  return typeof doc.toObject === 'function' ? doc.toObject() : doc;
};

const projectResumeSnapshot = (resumeDoc) => {
  const plain = toPlainObject(resumeDoc);
  if (!plain) return null;

  return {
    _id: plain._id,
    resumeId: plain.resumeId,
    userId: plain.userId,
    parsed_resume: plain.parsed_resume,
    parsed_data: plain.parsed_data,
    job_analysis: plain.job_analysis,
    profile: plain.profile,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt
  };
};

const computeJobFitAgainstResume = (jobDoc, resumeDoc) => {
  if (!jobDoc || !resumeDoc) {
    return {
      matchScore: 0,
      matchingSkills: [],
      missingSkills: jobDoc?.skills?.required || []
    };
  }

  const normalizeList = (list = []) =>
    list
      .filter(Boolean)
      .map((skill) => skill.toString().toLowerCase().trim())
      .filter(Boolean);

  const requiredSkills = normalizeList(jobDoc.skills?.required || []);
  const preferredSkills = normalizeList(jobDoc.skills?.preferred || []);
  const jobSkills = Array.from(new Set([...requiredSkills, ...preferredSkills]));

  const resumeSkills = normalizeList(
    (resumeDoc.parsed_resume?.skills?.length ? resumeDoc.parsed_resume.skills : resumeDoc.parsed_data?.skills) || []
  );

  const hasSkill = (jobSkill, candidateSkill) =>
    candidateSkill === jobSkill ||
    candidateSkill.includes(jobSkill) ||
    jobSkill.includes(candidateSkill);

  const matchingSkills = jobSkills.filter((jobSkill) =>
    resumeSkills.some((candidateSkill) => hasSkill(jobSkill, candidateSkill))
  );

  const missingSkills = requiredSkills.filter((reqSkill) =>
    !resumeSkills.some((candidateSkill) => hasSkill(reqSkill, candidateSkill))
  );

  let matchScore = jobSkills.length ? (matchingSkills.length / jobSkills.length) * 100 : 60;

  const resumeExperience = typeof resumeDoc.parsed_resume?.years_experience === 'number'
    ? resumeDoc.parsed_resume.years_experience
    : resumeDoc.parsed_data?.experience;
  const minExp = jobDoc.experienceYears?.min ?? jobDoc.experience?.min;
  const maxExp = jobDoc.experienceYears?.max ?? jobDoc.experience?.max;

  if (typeof resumeExperience === 'number') {
    if (typeof minExp === 'number' && resumeExperience >= minExp) {
      matchScore += 5;
    }
    if (typeof maxExp === 'number' && resumeExperience <= maxExp) {
      matchScore += 5;
    }
  }

  matchScore = Math.min(100, Math.max(0, matchScore));

  return {
    matchScore: Math.round(matchScore),
    matchingSkills,
    missingSkills
  };
};

const findJobByIdentifier = async (identifier, { lean = false } = {}) => {
  if (!identifier) {
    return null;
  }

  const lookup = Job.findOne({
    $or: [
      { jobId: identifier },
      ...(mongoose.Types.ObjectId.isValid(identifier) ? [{ _id: identifier }] : [])
    ]
  });

  return lean ? lookup.lean() : lookup;
};

const resolveResumeByIdentifier = async (resumeIdentifier) => {
  if (!resumeIdentifier) {
    return null;
  }

  let resume = await Resume.findOne({ resumeId: resumeIdentifier });
  if (resume) {
    return resume;
  }

  if (mongoose.Types.ObjectId.isValid(resumeIdentifier)) {
    resume = await Resume.findById(resumeIdentifier);
  }

  return resume;
};

const resolveCandidateUserId = (incomingUserId, resumeDoc) => {
  if (incomingUserId) {
    if (incomingUserId instanceof mongoose.Types.ObjectId) {
      return incomingUserId;
    }
    if (mongoose.Types.ObjectId.isValid(incomingUserId)) {
      return new mongoose.Types.ObjectId(incomingUserId);
    }
  }

  if (resumeDoc?.userId) {
    return resumeDoc.userId instanceof mongoose.Types.ObjectId
      ? resumeDoc.userId
      : new mongoose.Types.ObjectId(resumeDoc.userId);
  }

  return null;
};

const extractVerifiedSkills = (resumeDoc = {}) => {
  const collected = [];
  const seen = new Set();

  const pushSkill = (skillName) => {
    if (!skillName || typeof skillName !== 'string') {
      return;
    }
    const normalized = skillName.trim();
    if (!normalized) {
      return;
    }
    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    collected.push(normalized);
  };

  const verificationStatusSkills = resumeDoc.parsed_resume?.verification_status?.verifiedSkills || [];
  verificationStatusSkills.forEach((entry) => pushSkill(entry.skill || entry.name));

  const profileVerifications = resumeDoc.profile?.skillVerifications || [];
  profileVerifications
    .filter((entry) => entry?.verified)
    .forEach((entry) => pushSkill(entry.skill || entry.name));

  const skillsHave = Array.isArray(resumeDoc.skillInventory)
    ? resumeDoc.skillInventory
    : Array.isArray(resumeDoc.skillGaps?.skillsHave)
      ? resumeDoc.skillGaps.skillsHave
      : [];
  skillsHave
    .filter((entry) => entry?.verified)
    .forEach((entry) => pushSkill(entry.skill || entry.name || entry.title));

  return collected;
};

const requireDatabase = async (req, res, next) => {
  try {
    await ensureDatabaseConnection();
    return next();
  } catch (error) {
    logger.error('Database unavailable for job route:', error);
    return res.status(503).json({
      success: false,
      message: 'Database temporarily unavailable. Please try again shortly.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * NOTE: /api/resume/:resumeId/analyze-role endpoint moved to resume.routes.js
 * to avoid conflicts and keep resume-related operations together.
 */

/**
 * POST /api/resume/:resumeId/analyze-role-fast
 * Fast role analysis WITHOUT Watson AI (heuristic-only, <2 seconds)
 * Use this when you need quick results without AI overhead
 */
router.post('/resume/:resumeId/analyze-role-fast', async (req, res) => {
  try {
    const { resumeId } = req.params;
    
    // Fetch resume
    const resume = await Resume.findOne({ resumeId: resumeId });
    if (!resume) {
      return res.status(404).json({
        success: false,
        error: 'Resume not found'
      });
    }
    
    const skills = resume.parsed_resume?.skills || [];
    const experience = resume.parsed_resume?.years_experience || 0;
    
    if (skills.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Resume must have skills for analysis'
      });
    }
    
    // Fast heuristic role matching (no AI)
    const roleScores = [];
    for (const roleData of roles) {
      const { role: roleName, requiredSkills = [], preferredSkills = [] } = roleData;
      
      const coreMatches = requiredSkills.filter(skill => 
        skills.some(s => s.toLowerCase().includes(skill.toLowerCase()))
      );
      
      const score = (coreMatches.length / requiredSkills.length) * 100;
      
      roleScores.push({
        name: roleName,
        score,
        coreMatches: coreMatches.length,
        totalCore: requiredSkills.length
      });
    }
    
    roleScores.sort((a, b) => b.score - a.score);
    const topRole = roleScores[0];
    
    // Quick skill analysis
    const roleData = getRoleByName(topRole.name);
    const requiredSkills = roleData?.requiredSkills || [];
    const skillsHave = requiredSkills.filter(skill => 
      skills.some(s => s.toLowerCase().includes(skill.toLowerCase()))
    );
    const skillsMissing = requiredSkills.filter(skill => 
      !skills.some(s => s.toLowerCase().includes(skill.toLowerCase()))
    );
    
    res.json({
      success: true,
      fast: true,
      data: {
        predictedRole: {
          name: topRole.name,
          score: topRole.score,
          matchPercentage: Math.round(topRole.score)
        },
        skillsHave,
        skillsMissing,
        totalSkills: skills.length,
        processingTime: '<2s'
      }
    });
    
  } catch (error) {
    logger.error('Fast role analysis failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/jobs/match/:resumeId
 * Find matching jobs for a resume
 * Query params:
 *   - useEmbeddings: boolean (default: false) - Enable hybrid scoring with embeddings
 *   - limit, minMatchScore, includeRemote, employmentType, generateAISummaries
 */
router.get('/jobs/match/:resumeId', async (req, res) => {
  try {
    const { resumeId } = req.params;
    const {
      limit = 20,
      minMatchScore = 50,
      includeRemote = true,
      employmentType = null,
      generateAISummaries = true,
      useEmbeddings = false, // Hybrid scoring toggle
      verifyWithWatson = 'false'
    } = req.query;
    const enforceWatson = verifyWithWatson === 'true';
    
    // Fetch resume
    const resume = await Resume.findOne({ resumeId: resumeId });
    if (!resume) {
      return res.status(404).json({
        success: false,
        error: 'Resume not found'
      });
    }
    
    // Load CSV-backed job pool first so matches always reflect jobs.csv
    const fileJobs = await loadJobsFromFile();
    if (!fileJobs.length) {
      logger.error('jobs.csv returned 0 records. Aborting match request to avoid non-curated sources.');
      return res.status(503).json({
        success: false,
        error: 'jobs.csv feed is empty. Please upload at least one job entry before matching.'
      });
    }

    logger.info(
      `Finding matching jobs for resume ${resumeId} (embeddings: ${useEmbeddings === 'true'}, watson: ${enforceWatson}) using jobs.csv dataset`
    );
    let matchResult = await findMatchingJobs(resume, {
      limit: parseInt(limit),
      minMatchScore: parseInt(minMatchScore),
      includeRemote: includeRemote === 'true',
      employmentType,
      generateAISummaries: generateAISummaries === 'true',
      useEmbeddings: useEmbeddings === 'true', // Pass to service
      preferences: {
        minSalary: resume.parsed_data?.expectedSalary
      },
      verifyWithWatson: enforceWatson,
      // Exclude manual and direct platforms (recruiter posts) from marketplace matches
      sourcePlatforms: ['linkedin', 'indeed', 'glassdoor', 'real', 'seed', 'api'],
      excludePlatforms: ['manual', 'direct']
    });
    
    res.json({
      success: true,
      data: matchResult
    });
    
  } catch (error) {
    logger.error('Job matching failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/jobs/file-feed
 * Return jobs directly from backend/jobs.csv for quick card rendering
 */
router.get('/jobs/file-feed', async (req, res) => {
  try {
    const rawShape = req.query.shape === 'raw' || req.query.raw === 'true';
    const jobsData = await loadJobsFromFile();
    const total = jobsData.length;
    const offsetParam = Math.max(parseInt(req.query.offset) || 0, 0);
    const offset = Math.min(offsetParam, total);
    const requestedLimit = Math.max(parseInt(req.query.limit) || 50, 1);
    const slice = jobsData.slice(offset, Math.min(offset + requestedLimit, total));
    const payload = rawShape
      ? slice
      : slice.map((job) => ({
          id: job.jobId,
          title: job.title,
          company: job.company?.name,
          location: job.location?.city,
          salaryMin: job.salary?.min,
          salaryMax: job.salary?.max,
          currency: job.salary?.currency,
          experienceLevel: job.experienceLevel,
          employmentType: job.employmentType,
          skills: job.skills?.allSkills || [],
          description: job.description,
          applicationUrl: job.applicationUrl,
          tag: job.tag,
          source: job.source?.platform
        }));

    res.json({
      success: true,
      total,
      jobs: payload,
      metadata: {
        offset,
        limit: payload.length,
        filePath: 'backend/jobs.csv'
      }
    });
  } catch (error) {
    logger.error('Failed to read jobs.csv for file-feed:', error);
    res.status(500).json({
      success: false,
      error: 'Unable to load jobs from file feed'
    });
  }
});

/**
 * GET /api/jobs/search
 * Search jobs from jobs.csv with lightweight server-side filtering and optional resume compatibility
 */
router.get('/jobs/search', async (req, res) => {
  try {
    const {
      q,
      location,
      employmentType,
      experienceLevel,
      isRemote,
      tag,
      skills,
      offset = 0,
      limit = 20,
      resumeId
    } = req.query;

    const jobsData = await loadJobsFromFile();
    let filtered = jobsData;

    if (q) {
      const query = q.toLowerCase();
      filtered = filtered.filter(job =>
        job.title.toLowerCase().includes(query) ||
        job.company?.name?.toLowerCase().includes(query) ||
        job.description?.toLowerCase().includes(query)
      );
    }

    if (location) {
      const city = location.toLowerCase();
      filtered = filtered.filter(job => job.location?.city?.toLowerCase().includes(city));
    }

    if (employmentType) {
      filtered = filtered.filter(job => job.employmentType === employmentType);
    }

    if (experienceLevel) {
      filtered = filtered.filter(job => job.experienceLevel === experienceLevel);
    }

    if (isRemote === 'true') {
      filtered = filtered.filter(job => job.location?.isRemote);
    } else if (isRemote === 'false') {
      filtered = filtered.filter(job => !job.location?.isRemote);
    }

    if (tag) {
      filtered = filtered.filter(job => job.tag === tag);
    }

    if (skills) {
      const skillList = skills
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      if (skillList.length) {
        filtered = filtered.filter(job =>
          skillList.every(skill => job.skills?.allSkills?.includes(skill))
        );
      }
    }

    const maxLimit = Math.min(parseInt(limit) || 20, 50);
    let cursor = Math.max(parseInt(offset) || 0, 0);
    const total = filtered.length;
    const results = [];

    let resumeProfile = null;
    if (resumeId) {
      const resume = await Resume.findOne({ resumeId });
      resumeProfile = mapResumeToProfile(resume);
    }

    while (cursor < total && results.length < maxLimit) {
      const job = filtered[cursor];
      cursor++;

      if (resumeProfile) {
        const compatibility = await evaluateJobCompatibilityWithWatson(resumeProfile, job);
        job.compatibility = compatibility;
        if (!compatibility.compatible) {
          continue;
        }
      }

      results.push(job);
    }

    res.json({
      success: true,
      total,
      returned: results.length,
      nextOffset: cursor < total ? cursor : null,
      jobs: results
    });
  } catch (error) {
    logger.error('Job search failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/jobs/recruiter
 * Get jobs posted by the authenticated recruiter
 */
router.get('/jobs/recruiter', authenticate, requireRecruiter, requireDatabase, async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    console.log('Fetching jobs for recruiter:', req.user._id);

    const orgFilter = req.user?.organizationId
      ? [{ organizationId: req.user.organizationId }]
      : [];

    const jobs = await Job.find({
      $or: [
        { postedBy: req.user._id },
        ...orgFilter
      ]
    })
      .sort({ createdAt: -1 })
      .lean();

    console.log(`Found ${jobs.length} jobs for recruiter:`, req.user._id);

    res.json({
      success: true,
      jobs
    });
  } catch (error) {
    console.error('Error fetching recruiter jobs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch jobs',
      error: error.message
    });
  }
});

/**
 * GET /api/jobs/live
 * Get live jobs from CSV/seed data only (excludes recruiter-posted jobs)
 * Supports filtering by location, remote, employment type
 */
router.get('/jobs/live', async (req, res) => {
  try {
    const {
      limit = 50,
      page,
      offset,
      remote,
      isRemote,
      employmentType,
      city,
      location,
      experienceLevel,
      company,
      q,
      search,
    } = req.query;

    const numericLimit = Math.min(parseInt(limit, 10) || 50, 100);
    const offsetProvided = typeof offset !== 'undefined';
    const requestedPage = Math.max(parseInt(page, 10) || 1, 1);
    const skip = offsetProvided
      ? Math.max(parseInt(offset, 10) || 0, 0)
      : (requestedPage - 1) * numericLimit;

    const query = { 
      status: 'active',
      $or: [
        { postedBy: { $exists: false } },
        { postedBy: null }
      ] // Exclude recruiter-posted jobs - includes all CSV/seed/external jobs
    };

    const remoteFlag = remote ?? isRemote;
    if (remoteFlag === 'true') {
      query['location.isRemote'] = true;
    } else if (remoteFlag === 'false') {
      query['location.isRemote'] = { $ne: true };
    }

    if (employmentType) {
      query.employmentType = employmentType;
    }

    if (experienceLevel) {
      query.experienceLevel = experienceLevel;
    }

    if (company) {
      query['company.name'] = new RegExp(company, 'i');
    }

    const cityFilter = city || location;
    if (cityFilter) {
      const cityRegex = new RegExp(cityFilter, 'i');
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { 'location.city': cityRegex },
          { 'location.state': cityRegex },
          { 'location.country': cityRegex }
        ]
      });
    }

    const searchTerm = q || search;
    if (searchTerm) {
      const searchRegex = new RegExp(searchTerm, 'i');
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { tag: searchRegex },
          { 'company.name': searchRegex }
        ]
      });
    }

    const jobs = await Job.find(query)
      .sort({ createdAt: -1 })
      .limit(numericLimit)
      .skip(skip)
      .lean();

    const total = await Job.countDocuments(query);
    
    logger.info(`Live jobs query returned ${jobs.length} jobs out of ${total} total`);

    res.json({
      success: true,
      jobs,
      pagination: {
        total,
        returned: jobs.length,
        limit: numericLimit,
        offset: skip,
        page: requestedPage,
        nextOffset: skip + jobs.length < total ? skip + jobs.length : null
      }
    });
  } catch (err) {
    logger.error('Error fetching live jobs:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch live jobs' });
  }
});

/**
 * GET /api/jobs/recruiter-posted
 * Get jobs posted by recruiters only (excludes CSV/seed jobs)
 * Supports filtering by location, remote, employment type
 */
router.get('/jobs/recruiter-posted', async (req, res) => {
  try {
    const {
      limit = 50,
      page,
      offset,
      remote,
      isRemote,
      employmentType,
      city,
      location,
      experienceLevel,
      company,
      q,
      search,
    } = req.query;

    const numericLimit = Math.min(parseInt(limit, 10) || 50, 100);
    const offsetProvided = typeof offset !== 'undefined';
    const requestedPage = Math.max(parseInt(page, 10) || 1, 1);
    const skip = offsetProvided
      ? Math.max(parseInt(offset, 10) || 0, 0)
      : (requestedPage - 1) * numericLimit;

    const query = { 
      status: 'active',
      postedBy: { $exists: true, $ne: null } // Only recruiter-posted jobs (not null)
    };

    const remoteFlag = remote ?? isRemote;
    if (remoteFlag === 'true') {
      query['location.isRemote'] = true;
    } else if (remoteFlag === 'false') {
      query['location.isRemote'] = { $ne: true };
    }

    if (employmentType) {
      query.employmentType = employmentType;
    }

    if (experienceLevel) {
      query.experienceLevel = experienceLevel;
    }

    if (company) {
      query['company.name'] = new RegExp(company, 'i');
    }

    const cityFilter = city || location;
    if (cityFilter) {
      const cityRegex = new RegExp(cityFilter, 'i');
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { 'location.city': cityRegex },
          { 'location.state': cityRegex },
          { 'location.country': cityRegex }
        ]
      });
    }

    const searchTerm = q || search;
    if (searchTerm) {
      const searchRegex = new RegExp(searchTerm, 'i');
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { tag: searchRegex },
          { 'company.name': searchRegex }
        ]
      });
    }

    const jobs = await Job.find(query)
      .populate('postedBy', 'name email')
      .populate('organizationId', 'name slug')
      .sort({ createdAt: -1 })
      .limit(numericLimit)
      .skip(skip)
      .lean();

    const total = await Job.countDocuments(query);
    
    logger.info(`Recruiter jobs query returned ${jobs.length} jobs out of ${total} total`);

    res.json({
      success: true,
      jobs,
      pagination: {
        total,
        returned: jobs.length,
        limit: numericLimit,
        offset: skip,
        page: requestedPage,
        nextOffset: skip + jobs.length < total ? skip + jobs.length : null
      }
    });
  } catch (err) {
    logger.error('Error fetching recruiter-posted jobs:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch recruiter-posted jobs' });
  }
});

/**
 * GET /api/jobs/all
 * Get all active jobs (for applicants to browse)
 * Supports filtering by location, remote, employment type
 */
router.get('/jobs/all', async (req, res) => {
  try {
    const {
      limit = 50,
      page,
      offset,
      remote,
      isRemote,
      employmentType,
      city,
      location,
      experienceLevel,
      company,
      q,
      search,
      sourcePlatform
    } = req.query;

    const numericLimit = Math.min(parseInt(limit, 10) || 50, 100);
    const offsetProvided = typeof offset !== 'undefined';
    const requestedPage = Math.max(parseInt(page, 10) || 1, 1);
    const skip = offsetProvided
      ? Math.max(parseInt(offset, 10) || 0, 0)
      : (requestedPage - 1) * numericLimit;

    const query = { status: 'active' };

    // Filter by source platform if specified (comma-separated)
    if (sourcePlatform) {
      const platforms = sourcePlatform.split(',').map(p => p.trim());
      query['source.platform'] = { $in: platforms };
    }

    const remoteFlag = remote ?? isRemote;
    if (remoteFlag === 'true') {
      query['location.isRemote'] = true;
    } else if (remoteFlag === 'false') {
      query['location.isRemote'] = { $ne: true };
    }

    if (employmentType) {
      query.employmentType = employmentType;
    }

    if (experienceLevel) {
      query.experienceLevel = experienceLevel;
    }

    if (company) {
      query['company.name'] = new RegExp(company, 'i');
    }

    const cityFilter = city || location;
    if (cityFilter) {
      const cityRegex = new RegExp(cityFilter, 'i');
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { 'location.city': cityRegex },
          { 'location.state': cityRegex },
          { 'location.country': cityRegex }
        ]
      });
    }

    const searchTerm = q || search;
    if (searchTerm) {
      const searchRegex = new RegExp(searchTerm, 'i');
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { tag: searchRegex },
          { 'company.name': searchRegex }
        ]
      });
    }

    const jobs = await Job.find(query)
      .sort({ createdAt: -1 })
      .limit(numericLimit)
      .skip(skip)
      .lean();

    const total = await Job.countDocuments(query);
    const currentPage = Math.floor(skip / numericLimit) + 1;
    const totalPages = Math.max(1, Math.ceil(total / numericLimit));
    const nextOffset = skip + jobs.length < total ? skip + jobs.length : null;

    res.json({
      success: true,
      jobs,
      pagination: {
        total,
        page: currentPage,
        limit: numericLimit,
        pages: totalPages,
        offset: skip,
        nextOffset
      }
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch jobs',
      error: error.message
    });
  }
});

/**
 * GET /api/jobs/:jobId
 * Get job details with match information
 */
router.get('/jobs/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { resumeId } = req.query;
    
    if (resumeId) {
      // Get job with match info
      const result = await getJobWithMatch(jobId, resumeId);
      return res.json({
        success: true,
        job: result?.job || null,
        match: result?.match || null,
        data: result
      });
    }

    // Allow recruiters/admins to fetch by jobId even if not active (for applicant review)
    const job = await findJobByIdentifier(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }
    
    res.json({
      success: true,
      job,
      match: null
    });
    
  } catch (error) {
    logger.error('Failed to get job details:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/jobs/:jobId/track
 * Track job interaction (view, apply, save, dismiss)
 */
router.post('/jobs/:jobId/track', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { resumeId, action } = req.body;
    
    if (!resumeId || !action) {
      return res.status(400).json({
        success: false,
        error: 'resumeId and action are required'
      });
    }
    
    if (!['view', 'apply', 'save', 'dismiss'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid action. Must be: view, apply, save, or dismiss'
      });
    }
    
    const result = await trackJobInteraction(jobId, resumeId, action);
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    logger.error('Failed to track job interaction:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/jobs/saved/:resumeId
 * Get saved jobs for a user
 */
router.get('/jobs/saved/:resumeId', async (req, res) => {
  try {
    const { resumeId } = req.params;
    
    // Get saved matches
    const matches = await JobMatch.find({
      resumeId: resumeId,
      saved: true
    }).sort({ savedAt: -1 });
    
    // Fetch job details
    const jobIds = matches.map(m => m.jobId);
    const jobs = await Job.find({ jobId: { $in: jobIds }, status: 'active' });
    
    // Combine match and job data
    const savedJobs = matches.map(match => {
      const job = jobs.find(j => j.jobId === match.jobId);
      return {
        job: job,
        match: {
          matchScore: match.matchScore,
          matchedSkills: match.matchedSkills,
          missingSkills: match.missingSkills,
          aiSummary: match.aiSummary,
          savedAt: match.savedAt
        }
      };
    }).filter(item => item.job); // Filter out jobs that no longer exist
    
    res.json({
      success: true,
      count: savedJobs.length,
      data: savedJobs
    });
    
  } catch (error) {
    logger.error('Failed to get saved jobs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/jobs/applied/:resumeId
 * Get applied jobs for a user
 */
router.get('/jobs/applied/:resumeId', async (req, res) => {
  try {
    const { resumeId } = req.params;
    
    const matches = await JobMatch.find({
      resumeId: resumeId,
      applied: true
    }).sort({ appliedAt: -1 });
    
    const jobIds = matches.map(m => m.jobId);
    const jobs = await Job.find({ jobId: { $in: jobIds } });
    
    const appliedJobs = matches.map(match => {
      const job = jobs.find(j => j.jobId === match.jobId);
      return {
        job: job,
        match: {
          matchScore: match.matchScore,
          appliedAt: match.appliedAt,
          applicationStatus: match.applicationStatus
        }
      };
    }).filter(item => item.job);
    
    res.json({
      success: true,
      count: appliedJobs.length,
      data: appliedJobs
    });
    
  } catch (error) {
    logger.error('Failed to get applied jobs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/jobs/semantic-match/:resumeId
 * Find semantically similar jobs using embeddings (Phase 3)
 * Query params:
 *   - threshold: number (default: 0.70) - Minimum similarity score (0-1)
 *   - limit: number (default: 20) - Max results
 */
router.get('/jobs/semantic-match/:resumeId', async (req, res) => {
  try {
    const { resumeId } = req.params;
    const {
      threshold = 0.70,
      limit = 20
    } = req.query;
    
    // Fetch resume
    const resume = await Resume.findOne({ resumeId: resumeId });
    if (!resume) {
      return res.status(404).json({
        success: false,
        error: 'Resume not found'
      });
    }
    
    // Check if resume has embedding
    if (!resume.embedding || resume.embedding.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Resume does not have an embedding. Generate one first using POST /api/resume/:resumeId/generate-embedding',
        hint: 'Embeddings are generated automatically after parsing, or you can trigger generation manually.'
      });
    }
    
    logger.info(`Finding semantic matches for resume ${resumeId} (threshold: ${threshold})`);
    const result = await findSemanticMatches(resumeId, {
      minSimilarity: parseFloat(threshold),
      limit: parseInt(limit),
      includeJobDetails: true,
      applySkillAdjustment: true
    });
    
    res.json({
      success: result.success,
      data: {
        matches: result.matches,
        metadata: result.metadata
      }
    });
    
  } catch (error) {
    logger.error('Semantic matching failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/jobs/:jobId/similar
 * Find similar jobs to a given job using embeddings (Phase 3)
 * Query params:
 *   - limit: number (default: 5) - Max similar jobs to return
 */
router.get('/jobs/:jobId/similar', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { limit = 5 } = req.query;
    
    logger.info(`Finding similar jobs to ${jobId}`);
    const result = await findSimilarJobs(jobId, {
      limit: parseInt(limit),
      includeJobDetails: true
    });
    
    res.json({
      success: result.success,
      data: {
        referenceJob: result.referenceJob,
        similarJobs: result.matches,
        metadata: result.metadata
      }
    });
    
  } catch (error) {
    logger.error('Failed to find similar jobs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/resume/:resumeId/generate-embedding
 * Manually trigger embedding generation for a resume (Phase 3)
 */
router.post('/resume/:resumeId/generate-embedding', async (req, res) => {
  try {
    const { resumeId } = req.params;
    
    // Fetch resume
    const resume = await Resume.findOne({ resumeId: resumeId });
    if (!resume) {
      return res.status(404).json({
        success: false,
        error: 'Resume not found'
      });
    }
    
    // Check if resume has parsed data
    if (!resume.parsed_resume || !resume.parsed_resume.skills || resume.parsed_resume.skills.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Resume must be parsed first. Use POST /api/resume/:resumeId/parse'
      });
    }
    
    // Queue embedding generation with high priority
    const result = queueResumeEmbedding(resumeId, 'high');
    
    // Calculate estimated time
    const queueStats = getQueueStats();
    const estimatedMinutes = Math.ceil((result.position * 0.5) / 60); // ~30s per batch, 10/batch
    
    logger.info(`Queued embedding generation for resume ${resumeId} at position ${result.position}`);
    
    res.json({
      success: true,
      message: 'Embedding generation queued',
      data: {
        queued: result.queued,
        position: result.position,
        queueSize: result.queueSize,
        estimatedTimeMinutes: estimatedMinutes,
        queueStats: queueStats
      }
    });
    
  } catch (error) {
    logger.error('Failed to queue embedding generation:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/admin/embedding-queue-stats
 * Get embedding queue statistics (admin only)
 */
router.get('/admin/embedding-queue-stats', async (req, res) => {
  try {
    const stats = getQueueStats();
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    logger.error('Failed to get queue stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/admin/process-embedding-queue
 * Manually trigger queue processing (admin only, for testing)
 */
router.post('/admin/process-embedding-queue', async (req, res) => {
  try {
    logger.info('Manually triggering embedding queue processing');
    
    // Process queue asynchronously
    processQueue().catch(err => {
      logger.error('Queue processing error:', err);
    });
    
    res.json({
      success: true,
      message: 'Queue processing triggered',
      data: {
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('Failed to trigger queue processing:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/admin/seed-jobs
 * Load seed jobs into database (admin only)
 */
router.post('/admin/seed-jobs', async (req, res) => {
  try {
    const result = await loadSeedJobs();
    res.json(result);
  } catch (error) {
    logger.error('Failed to load seed jobs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/admin/import-jobs-json
 * Import jobs from JSON file (admin only)
 */
router.post('/admin/import-jobs-json', async (req, res) => {
  try {
    const { filePath } = req.body;
    
    if (!filePath) {
      return res.status(400).json({
        success: false,
        error: 'filePath is required'
      });
    }
    
    const result = await importJobsFromJSON(filePath);
    res.json(result);
  } catch (error) {
    logger.error('Failed to import jobs from JSON:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/admin/import-jobs-csv
 * Import jobs from CSV file (admin only)
 */
router.post('/admin/import-jobs-csv', async (req, res) => {
  try {
    const { filePath } = req.body;
    
    if (!filePath) {
      return res.status(400).json({
        success: false,
        error: 'filePath is required'
      });
    }
    
    const result = await importJobsFromCSV(filePath);
    res.json(result);
  } catch (error) {
    logger.error('Failed to import jobs from CSV:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/admin/reload-file-jobs
 * Purge Job collection and reload from backend/jobs.csv
 */
router.post('/admin/reload-file-jobs', async (_req, res) => {
  try {
    const result = await reloadJobsFromFile();
    res.json({
      success: true,
      message: `Reloaded ${result.inserted} jobs from ${getJobsFilePath()}`,
      data: result
    });
  } catch (error) {
    logger.error('Failed to reload jobs from csv file:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/jobs/list
 * List all jobs with advanced filtering and sorting
 * Query params:
 *   - page: Page number (default: 1)
 *   - limit: Jobs per page (default: 20)
 *   - search: Search in title, company, description
 *   - location: Filter by city/state
 *   - employmentType: Filter by employment type (full-time, part-time, contract, internship, freelance)
 *   - experienceLevel: Filter by experience level (entry, mid, senior, lead, executive)
 *   - isRemote: Filter remote jobs (true/false)
 *   - tag: Filter by tag (internship, job, etc)
 *   - company: Filter by company name
 *   - salaryMin: Minimum salary
 *   - salaryMax: Maximum salary
 *   - skills: Comma-separated skills to match
 *   - sortBy: Sort field (postedDate, salary, title, company)
 *   - sortOrder: Sort direction (asc, desc) - default: desc
 */
router.get('/jobs/list', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      location,
      employmentType,
      experienceLevel,
      isRemote,
      tag,
      company,
      salaryMin,
      salaryMax,
      skills,
      sortBy = 'postedDate',
      sortOrder = 'desc'
    } = req.query;
    
    // Build filter query
    const filter = { status: 'active' };
    
    // Text search
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { 'company.name': { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Location filter
    if (location) {
      filter.$or = [
        { 'location.city': { $regex: location, $options: 'i' } },
        { 'location.state': { $regex: location, $options: 'i' } }
      ];
    }
    
    // Employment type filter
    if (employmentType) {
      filter.employmentType = employmentType;
    }
    
    // Experience level filter
    if (experienceLevel) {
      filter.experienceLevel = experienceLevel;
    }
    
    // Remote filter
    if (isRemote !== undefined) {
      filter['location.isRemote'] = isRemote === 'true';
    }
    
    // Tag filter
    if (tag) {
      filter.tag = tag;
    }
    
    // Company filter
    if (company) {
      filter['company.name'] = { $regex: company, $options: 'i' };
    }
    
    // Salary range filter
    if (salaryMin || salaryMax) {
      filter['salary.max'] = {};
      if (salaryMin) filter['salary.max'].$gte = parseInt(salaryMin);
      if (salaryMax) filter['salary.min'] = { $lte: parseInt(salaryMax) };
    }
    
    // Skills filter
    if (skills) {
      const skillsArray = skills.split(',').map(s => s.trim().toLowerCase());
      filter['skills.allSkills'] = { $in: skillsArray };
    }
    
    // Build sort object
    const sortOptions = {};
    if (sortBy === 'salary') {
      sortOptions['salary.max'] = sortOrder === 'asc' ? 1 : -1;
    } else if (sortBy === 'title') {
      sortOptions.title = sortOrder === 'asc' ? 1 : -1;
    } else if (sortBy === 'company') {
      sortOptions['company.name'] = sortOrder === 'asc' ? 1 : -1;
    } else {
      sortOptions.postedDate = sortOrder === 'asc' ? 1 : -1;
    }
    
    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Execute query
    const [jobs, total] = await Promise.all([
      Job.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .select('-embedding -embedding_metadata'),
      Job.countDocuments(filter)
    ]);
    
    // Get filter statistics
    const stats = await Job.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: null,
          totalJobs: { $sum: 1 },
          avgSalaryMin: { $avg: '$salary.min' },
          avgSalaryMax: { $avg: '$salary.max' },
          employmentTypes: { $addToSet: '$employmentType' },
          experienceLevels: { $addToSet: '$experienceLevel' },
          tags: { $addToSet: '$tag' },
          companies: { $addToSet: '$company.name' }
        }
      }
    ]);
    
    res.json({
      success: true,
      jobs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
        hasMore: skip + jobs.length < total
      },
      stats: stats[0] || {},
      filters: {
        search,
        location,
        employmentType,
        experienceLevel,
        isRemote,
        tag,
        company,
        salaryMin,
        salaryMax,
        skills,
        sortBy,
        sortOrder
      }
    });
    
  } catch (error) {
    logger.error('Failed to list jobs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/admin/seed-jobs
 * Clear all seed jobs (admin only)
 */
router.delete('/admin/seed-jobs', async (req, res) => {
  try {
    const result = await clearSeedJobs();
    res.json(result);
  } catch (error) {
    logger.error('Failed to clear seed jobs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/stats/watson-usage
 * Get Watson API usage statistics
 */
router.get('/stats/watson-usage', async (req, res) => {
  try {
    // Get total resumes analyzed
    const totalResumes = await Resume.countDocuments({
      'parsing_metadata.parsedAt': { $exists: true }
    });
    
    // Get resumes that used Watson
    const watsonResumes = await Resume.countDocuments({
      'parsing_metadata.watsonCallCount': { $gt: 0 }
    });
    
    // Get total Watson calls
    const watsonCallsResult = await Resume.aggregate([
      { $match: { 'parsing_metadata.watsonCallCount': { $exists: true } } },
      { $group: { _id: null, total: { $sum: '$parsing_metadata.watsonCallCount' } } }
    ]);
    
    const totalWatsonCalls = watsonCallsResult.length > 0 ? watsonCallsResult[0].total : 0;
    
    // Calculate percentage
    const watsonUsagePercent = totalResumes > 0 ? ((watsonResumes / totalResumes) * 100).toFixed(2) : 0;
    
    res.json({
      success: true,
      data: {
        totalResumes: totalResumes,
        resumesUsingWatson: watsonResumes,
        totalWatsonCalls: totalWatsonCalls,
        watsonUsagePercent: parseFloat(watsonUsagePercent),
        targetUsagePercent: 5.0
      }
    });
    
  } catch (error) {
    logger.error('Failed to get Watson usage stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/jobs/create
 * Create a new job posting (for recruiters)
 */
router.post('/jobs/create', authenticate, requireRecruiter, requireDatabase, async (req, res) => {
  try {
    const jobData = req.body;
    
    // Validate required fields
    if (!jobData.title || !jobData.description || !jobData.company?.name) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, and company name are required'
      });
    }

    // Ensure postedBy is set
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    const normalizedJobData = normalizeJobPayload({
      ...jobData,
      organizationId: jobData.organizationId || req.user?.organizationId || null,
      status: jobData.status || 'active'
    });

    // Ensure company object is populated even if frontend sends only name string
    if (!normalizedJobData.company || !normalizedJobData.company.name) {
      normalizedJobData.company = {
        name: jobData.company?.name || req.user?.organizationName || 'My Company',
        logo: jobData.company?.logo || null,
        website: jobData.company?.website || null,
        size: jobData.company?.size || '1-50'
      };
    }

    // Create new job with explicit postedBy (fallback to organization if available)
    const job = new Job({
      ...normalizedJobData,
      postedBy: req.user._id,
      organizationId: normalizedJobData.organizationId || req.user?.organizationId || null
    });

    await job.save();

    console.log('Job created successfully:', { 
      jobId: job.jobId, 
      postedBy: job.postedBy,
      userId: req.user._id 
    });

    // Queue job for embedding generation (for semantic search)
    try {
      await queueJobEmbedding(job.jobId);
    } catch (embErr) {
      console.warn('Failed to queue job embedding:', embErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Job created successfully',
      job: {
        jobId: job.jobId,
        title: job.title,
        company: job.company,
        location: job.location,
        status: job.status,
        postedBy: job.postedBy
      }
    });
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create job',
      error: error.message
    });
  }
});

/**
 * POST /api/jobs/:jobId/apply
 * Allow authenticated candidates to apply to a job listed on the platform
 * Enhanced with comprehensive error handling and rate limiting
 */
router.post('/jobs/:jobId/apply', authenticate, async (req, res) => {
  try {
    const { jobId } = req.params;
    const { resumeId, coverLetter, expectedSalary, noticePeriod, availableFrom, portfolio } = req.body || {};

    // Validation
    if (!resumeId) {
      return res.status(400).json({
        success: false,
        message: 'resumeId is required to apply for a job',
        code: 'RESUME_ID_REQUIRED'
      });
    }

    // Rate limiting check - max 10 applications per hour per user
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentApplicationCount = await JobApplication.countDocuments({
      userId: req.user._id,
      createdAt: { $gte: oneHourAgo }
    });

    if (recentApplicationCount >= 10) {
      return res.status(429).json({
        success: false,
        message: 'Application rate limit exceeded. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: 3600
      });
    }

    // Fetch job with validation
    const job = await Job.findOne({ jobId, status: 'active' });
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found or no longer active',
        code: 'JOB_NOT_FOUND'
      });
    }

    // Check if job application deadline has passed
    if (job.deadline && new Date(job.deadline) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Application deadline has passed',
        code: 'DEADLINE_PASSED',
        deadline: job.deadline
      });
    }

    // Fetch resume with error handling
    const resume = await resolveResumeByIdentifier(resumeId);
    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found',
        code: 'RESUME_NOT_FOUND'
      });
    }

    // Check if resume is parsed
    if (!resume.parsed_resume || resume.extraction_status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Resume must be parsed before applying. Please wait for parsing to complete.',
        code: 'RESUME_NOT_PARSED',
        extractionStatus: resume.extraction_status
      });
    }

    // Ownership validation
    if (resume.userId && req.user?._id && resume.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only apply using your own resume',
        code: 'UNAUTHORIZED_RESUME'
      });
    }

    const candidateUserId = resolveCandidateUserId(req.user?._id, resume);
    if (!candidateUserId) {
      return res.status(400).json({
        success: false,
        message: 'Resume is not linked to a user account yet. Please upload your resume while logged in.',
        code: 'RESUME_NOT_LINKED'
      });
    }

    const candidateName = resume.parsed_resume?.name
      || resume.parsed_resume?.basics?.name
      || resume.profile?.name
      || req.user?.name
      || 'Candidate';
    const resumeIdentifier = resume.resumeId || resume._id?.toString();
    const verifiedSkillsForCandidate = extractVerifiedSkills(resume);

    // Check for duplicate application
    let existingApplication = await JobApplication.findOne({
      jobId: job._id,
      resumeId: resume._id,
      userId: candidateUserId
    });

    const fit = computeJobFitAgainstResume(job, resume);

    if (existingApplication) {
      // Update match info for visibility and return idempotent response
      existingApplication.matchScore = fit.matchScore;
      existingApplication.aiAnalysis = {
        ...(existingApplication.aiAnalysis || {}),
        skillMatch: {
          matched: fit.matchingSkills,
          missing: fit.missingSkills,
          percentage: fit.matchScore
        }
      };
      await existingApplication.save();

      return res.json({
        success: true,
        message: 'You have already applied to this job',
        code: 'ALREADY_APPLIED',
        application: {
          id: existingApplication._id,
          status: existingApplication.status,
          matchScore: existingApplication.matchScore,
          appliedAt: existingApplication.createdAt
        }
      });
    }

    // Create application with transaction-like behavior
    const application = new JobApplication({
      jobId: job._id,
      userId: candidateUserId,
      resumeId: resume._id,
      organizationId: job.organizationId,
      status: 'applied',
      matchScore: fit.matchScore,
      aiAnalysis: {
        skillMatch: {
          matched: fit.matchingSkills,
          missing: fit.missingSkills,
          percentage: fit.matchScore
        }
      },
      coverLetter,
      expectedSalary,
      noticePeriod,
      availableFrom,
      portfolio,
      source: 'direct'
    });

    await application.save();
    await Job.updateOne({ _id: job._id }, { $inc: { applications: 1 } });

    const totalApplications = (job.applications || 0) + 1;
    const verifiedSkillMessage = verifiedSkillsForCandidate.length
      ? ` with ${verifiedSkillsForCandidate.length} verified skill${verifiedSkillsForCandidate.length === 1 ? '' : 's'}`
      : '';

    // Emit application event (non-blocking)
    try {
      emitApplicationEvent(EVENTS.APPLICATION.SUBMITTED, {
        userId: candidateUserId,
        applicationId: application._id.toString(),
        jobTitle: job.title,
        company: job.company?.name || job.company || 'Company',
        jobId: job.jobId,
        resumeId: resumeIdentifier,
        status: 'APPLIED',
        matchScore: fit.matchScore,
        verifiedSkills: verifiedSkillsForCandidate,
        submittedAt: application.createdAt || new Date(),
      });
    } catch (eventError) {
      logger.warn('Failed to emit application submitted event:', eventError);
    }

    // Notify recruiter (non-blocking)
    if (job.postedBy) {
      try {
        await Notification.createNotification({
          userId: job.postedBy,
          type: 'job_applied',
          title: `New application for ${job.title}`,
          message: `${candidateName} just applied${verifiedSkillMessage}.`,
          actionUrl: `/recruiter/job/${job.jobId}/candidates`,
          metadata: {
            jobId: job.jobId,
            resumeId: resumeIdentifier,
            applicationId: application._id.toString(),
            matchScore: fit.matchScore,
            skillsVerified: verifiedSkillsForCandidate.slice(0, 10),
            totalApplications,
            expectedSalary,
            noticePeriod,
            availableFrom
          }
        });
      } catch (notificationError) {
        logger.warn('Failed to create recruiter notification for application:', notificationError);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      application: {
        id: application._id,
        status: application.status,
        matchScore: application.matchScore,
        submittedAt: application.createdAt
      }
    });
  } catch (error) {
    console.error('Error applying to job:', error);
    
    // Enhanced error responses
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid application data',
        code: 'VALIDATION_ERROR',
        errors: Object.values(error.errors).map(e => e.message)
      });
    }
    
    if (error.name === 'MongoError' && error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Duplicate application detected',
        code: 'DUPLICATE_APPLICATION'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to apply to job. Please try again.',
      code: 'APPLICATION_FAILED',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/jobs/recruiter/overview
 * Aggregate stats and recent applications for the authenticated recruiter
 */
router.get('/jobs/recruiter/overview', authenticate, requireRecruiter, requireDatabase, async (req, res) => {
  try {
    const recruiterId = req.user._id;

    const orgFilter = req.user?.organizationId
      ? [{ organizationId: req.user.organizationId }]
      : [];

    const jobs = await Job.find({
      $or: [
        { postedBy: recruiterId },
        ...orgFilter
      ]
    })
      .select('_id jobId title status createdAt company')
      .lean();

    const jobIds = jobs.map(job => job._id);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const stats = {
      totalJobs: jobs.length,
      newJobsThisMonth: jobs.filter(job => job.createdAt >= thirtyDaysAgo).length,
      activeJobs: jobs.filter(job => job.status === 'active').length,
      totalApplications: 0,
      newApplicationsToday: 0,
      interviewsScheduled: 0,
      interviewsThisWeek: 0,
      avgTimeToHire: 0
    };

    if (jobIds.length > 0) {
      stats.totalApplications = await JobApplication.countDocuments({ jobId: { $in: jobIds } });
      stats.newApplicationsToday = await JobApplication.countDocuments({
        jobId: { $in: jobIds },
        createdAt: { $gte: startOfToday }
      });
      
      // Count all applications with interview_scheduled status OR with scheduled interviews
      const [scheduledStatusCount, upcomingInterviewsCount] = await Promise.all([
        JobApplication.countDocuments({
          jobId: { $in: jobIds },
          status: 'interview_scheduled'
        }),
        JobApplication.countDocuments({
          jobId: { $in: jobIds },
          'interviews.status': 'scheduled',
          'interviews.scheduledAt': { $gte: new Date() }
        })
      ]);
      stats.interviewsScheduled = Math.max(scheduledStatusCount, upcomingInterviewsCount);
      
      // Count interviews scheduled in the next 7 days
      stats.interviewsThisWeek = await JobApplication.countDocuments({
        jobId: { $in: jobIds },
        interviews: {
          $elemMatch: {
            status: 'scheduled',
            scheduledAt: { $gte: new Date(), $lte: sevenDaysFromNow }
          }
        }
      });
    }

    const recentApplications = jobIds.length === 0
      ? []
      : await JobApplication.find({ jobId: { $in: jobIds } })
          .sort({ createdAt: -1 })
          .limit(10)
          .populate('userId', 'name email')
          .populate('jobId', 'title company.name department')
          .populate('resumeId', 'parsed_resume.name parsed_resume.email');

    const formattedApplications = recentApplications.map(app => ({
      _id: app._id,
      candidateName: app.resumeId?.parsed_resume?.name || app.userId?.name || 'Unknown',
      email: app.resumeId?.parsed_resume?.email || app.userId?.email || 'N/A',
      jobTitle: app.jobId?.title || 'Unknown role',
      department: app.jobId?.department || app.jobId?.company?.name || '—',
      status: app.status,
      appliedAt: app.createdAt
    }));

    res.json({
      success: true,
      stats,
      recentApplications: formattedApplications
    });
  } catch (error) {
    console.error('Error building recruiter overview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load recruiter overview',
      error: error.message
    });
  }
});

/**
 * GET /api/jobs/:jobId/candidates
 * Get all candidates matched to a specific job
 * Returns candidates ranked by match score
 */
router.get('/jobs/:jobId/candidates', authenticate, requireRecruiter, async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await findJobByIdentifier(jobId, { lean: true });
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Ensure postedBy is always returned for recruiter UI
    if (!job.postedBy && req.user?._id) {
      job.postedBy = req.user._id;
    }

    const applications = await JobApplication.find({ jobId: job._id })
      .populate({
        path: 'resumeId',
        select: 'resumeId userId parsed_resume parsed_data job_analysis profile createdAt updatedAt'
      })
      .populate({
        path: 'userId',
        select: 'name email role'
      })
      .sort({ createdAt: -1 })
      .lean();

    const appliedCandidates = applications.map((application) => {
      const resumeSnapshot = projectResumeSnapshot(application.resumeId);
      const fit = computeJobFitAgainstResume(job, resumeSnapshot);

      return {
        applicationId: application._id,
        resumeId: resumeSnapshot?.resumeId,
        userId: application.userId?._id || resumeSnapshot?.userId,
        user: application.userId || null,
        resume: resumeSnapshot,
        matchScore: fit.matchScore,
        matchingSkills: fit.matchingSkills,
        missingSkills: fit.missingSkills,
        status: application.status,
        appliedAt: application.createdAt,
        interviews: application.interviews || [],
        source: 'applied'
      };
    });

    const appliedResumeObjectIds = new Set(
      appliedCandidates
        .map((candidate) => candidate.resume?._id?.toString())
        .filter(Boolean)
    );

    // Only suggest resumes where user has opted-in to recruiter visibility
    const suggestionQuery = {
      isActive: true,
      'parsed_resume.skills.0': { $exists: true },
      'privacy.visibleToRecruiters': true, // Privacy protection: only show opt-in resumes
    };

    if (appliedResumeObjectIds.size > 0) {
      suggestionQuery._id = { $nin: Array.from(appliedResumeObjectIds) };
    }

    const potentialResumes = await Resume.find(suggestionQuery)
      .select('resumeId userId parsed_resume parsed_data job_analysis profile createdAt updatedAt')
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    const suggestedCandidates = potentialResumes
      .map((resumeDoc) => {
        const fit = computeJobFitAgainstResume(job, resumeDoc);
        return {
          resumeId: resumeDoc.resumeId,
          userId: resumeDoc.userId,
          resume: resumeDoc,
          matchScore: fit.matchScore,
          matchingSkills: fit.matchingSkills,
          missingSkills: fit.missingSkills,
          createdAt: resumeDoc.createdAt,
          status: 'suggested',
          source: 'suggested'
        };
      })
      .filter((candidate) => candidate.matchScore >= 35)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 25);

    res.json({
      success: true,
      appliedCandidates,
      suggestedCandidates,
      totals: {
        applied: appliedCandidates.length,
        suggested: suggestedCandidates.length
      }
    });
  } catch (error) {
    console.error('Error fetching job candidates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch candidates',
      error: error.message
    });
  }
});

/**
 * DELETE /api/jobs/:jobId
 * Soft delete a job posting created by the authenticated recruiter
 */
router.delete('/jobs/:jobId', authenticate, requireRecruiter, async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await Job.findOne({ jobId });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    const isOwner = job.postedBy?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You can only remove jobs you created'
      });
    }

    job.status = 'closed';
    job.expiresAt = job.expiresAt || new Date();
    await job.save();

    res.json({
      success: true,
      message: 'Job removed successfully'
    });
  } catch (error) {
    console.error('Error removing job:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove job',
      error: error.message
    });
  }
});

/**
 * PUT /api/jobs/:jobId
 * Update a job posting created by the authenticated recruiter
 */
router.put('/jobs/:jobId', authenticate, requireRecruiter, async (req, res) => {
  try {
    const { jobId } = req.params;
    const updateData = req.body;
    
    const job = await Job.findOne({ jobId });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    const isOwner = job.postedBy?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You can only update jobs you created'
      });
    }

    // Update job fields
    Object.keys(updateData).forEach(key => {
      if (key !== 'jobId' && key !== 'postedBy' && key !== 'source') {
        job[key] = updateData[key];
      }
    });

    job.updatedAt = new Date();
    await job.save();

    res.json({
      success: true,
      message: 'Job updated successfully',
      job
    });
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update job',
      error: error.message
    });
  }
});

/**
 * POST /api/jobs/:jobId/select-candidate
 * Shortlist a candidate for a job
 */
router.post('/jobs/:jobId/select-candidate', authenticate, requireRecruiter, async (req, res) => {
  try {
    const { jobId } = req.params;
    const { resumeId, userId } = req.body;

    if (!resumeId) {
      return res.status(400).json({
        success: false,
        message: 'resumeId is required'
      });
    }

    // Get job details
    const job = await Job.findOne({ jobId });
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    const resume = await resolveResumeByIdentifier(resumeId);
    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found'
      });
    }

    const candidateUserId = resolveCandidateUserId(userId, resume);
    if (!candidateUserId) {
      return res.status(400).json({
        success: false,
        message: 'Unable to determine candidate user account for this resume'
      });
    }

    // Check by both jobId+userId (the unique index) to prevent duplicates
    let application = await JobApplication.findOne({
      jobId: job._id,
      userId: candidateUserId
    });

    const fit = computeJobFitAgainstResume(job, resume);

    if (application) {
      // Update existing application
      application.status = 'shortlisted';
      application.matchScore = fit.matchScore;
      application.aiAnalysis = {
        ...(application.aiAnalysis || {}),
        skillMatch: {
          matched: fit.matchingSkills,
          missing: fit.missingSkills,
          percentage: fit.matchScore
        }
      };
      await application.save();
    } else {
      // Create new application
      application = new JobApplication({
        jobId: job._id,
        userId: candidateUserId,
        resumeId: resume._id,
        status: 'shortlisted',
        organizationId: job.organizationId,
        matchScore: fit.matchScore,
        aiAnalysis: {
          skillMatch: {
            matched: fit.matchingSkills,
            missing: fit.missingSkills,
            percentage: fit.matchScore
          }
        }
      });
      await application.save();
    }

    // Create notification for candidate
    try {
      await Notification.createNotification({
        userId: candidateUserId,
        type: 'application_update',
        title: `🎯 Shortlisted: ${job.title}`,
        message: `Great news! You've been shortlisted for ${job.title} at ${job.company?.name || 'the company'}`,
        actionUrl: `/applications`,
        metadata: {
          jobId: job.jobId,
          jobTitle: job.title,
          company: job.company?.name,
          applicationId: application._id.toString(),
          status: 'shortlisted'
        }
      });
    } catch (notificationError) {
      console.warn('Failed to create shortlist notification:', notificationError);
    }

    res.json({
      success: true,
      message: 'Candidate shortlisted successfully',
      application
    });
  } catch (error) {
    console.error('Error shortlisting candidate:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to shortlist candidate',
      error: error.message
    });
  }
});

/**
 * POST /api/jobs/:jobId/schedule-interview
 * Schedule an interview with a candidate
 */
router.post('/jobs/:jobId/schedule-interview', authenticate, requireRecruiter, async (req, res) => {
  try {
    const { jobId } = req.params;
    const { resumeId, userId, interview } = req.body;

    if (!resumeId || !interview) {
      return res.status(400).json({
        success: false,
        message: 'resumeId and interview details are required'
      });
    }

    // Get job details
    const job = await Job.findOne({ jobId });
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    const resume = await resolveResumeByIdentifier(resumeId);
    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found'
      });
    }

    const candidateUserId = resolveCandidateUserId(userId, resume);
    if (!candidateUserId) {
      return res.status(400).json({
        success: false,
        message: 'Unable to determine candidate user account for this resume'
      });
    }

    const fit = computeJobFitAgainstResume(job, resume);

    // Query by userId to match the unique index (jobId + userId)
    let application = await JobApplication.findOne({
      jobId: job._id,
      userId: candidateUserId
    });

    if (!application) {
      application = new JobApplication({
        jobId: job._id,
        userId: candidateUserId,
        resumeId: resume._id,
        status: 'interview_scheduled',
        organizationId: job.organizationId,
        matchScore: fit.matchScore,
        aiAnalysis: {
          skillMatch: {
            matched: fit.matchingSkills,
            missing: fit.missingSkills,
            percentage: fit.matchScore
          }
        }
      });
    } else {
      application.status = 'interview_scheduled';
      application.matchScore = fit.matchScore;
      application.aiAnalysis = {
        ...(application.aiAnalysis || {}),
        skillMatch: {
          matched: fit.matchingSkills,
          missing: fit.missingSkills,
          percentage: fit.matchScore
        }
      };
    }

    // Add interview details
    application.interviews.push({
      type: interview.type,
      scheduledAt: interview.scheduledAt,
      duration: interview.duration || 60,
      meetingLink: interview.meetingLink,
      location: interview.location,
      notes: interview.notes,
      status: 'scheduled'
    });

    await application.save();

    // Create notification for candidate
    try {
      const interviewTypeLabel = {
        'phone': 'Phone',
        'video': 'Video',
        'onsite': 'On-site',
        'technical': 'Technical',
        'hr': 'HR'
      }[interview.type] || 'Interview';

      const scheduledDate = new Date(interview.scheduledAt);
      const dateString = scheduledDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      await Notification.createNotification({
        userId: candidateUserId,
        type: 'interview_scheduled',
        title: `📅 Interview Scheduled: ${job.title}`,
        message: `${interviewTypeLabel} interview scheduled for ${dateString}`,
        actionUrl: `/applications`,
        metadata: {
          jobId: job.jobId,
          jobTitle: job.title,
          company: job.company?.name,
          applicationId: application._id.toString(),
          interviewType: interview.type,
          scheduledAt: interview.scheduledAt,
          meetingLink: interview.meetingLink,
          location: interview.location
        }
      });
    } catch (notificationError) {
      console.warn('Failed to create interview notification:', notificationError);
    }

    res.json({
      success: true,
      message: 'Interview scheduled successfully',
      application
    });
  } catch (error) {
    console.error('Error scheduling interview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to schedule interview',
      error: error.message
    });
  }
});

/**
 * POST /api/jobs/:jobId/reject-candidate
 * Reject a candidate
 */
router.post('/jobs/:jobId/reject-candidate', authenticate, requireRecruiter, async (req, res) => {
  try {
    const { jobId } = req.params;
    const { resumeId, userId } = req.body;

    if (!resumeId) {
      return res.status(400).json({
        success: false,
        message: 'resumeId is required'
      });
    }

    // Get job details
    const job = await Job.findOne({ jobId });
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    const resume = await resolveResumeByIdentifier(resumeId);
    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found'
      });
    }

    const candidateUserId = resolveCandidateUserId(userId, resume);
    if (!candidateUserId) {
      return res.status(400).json({
        success: false,
        message: 'Unable to determine candidate user account for this resume'
      });
    }

    const fit = computeJobFitAgainstResume(job, resume);

    // Query by userId to match the unique index (jobId + userId)
    let application = await JobApplication.findOne({
      jobId: job._id,
      userId: candidateUserId
    });

    if (!application) {
      application = new JobApplication({
        jobId: job._id,
        userId: candidateUserId,
        resumeId: resume._id,
        status: 'rejected',
        organizationId: job.organizationId,
        matchScore: fit.matchScore,
        aiAnalysis: {
          skillMatch: {
            matched: fit.matchingSkills,
            missing: fit.missingSkills,
            percentage: fit.matchScore
          }
        }
      });
    } else {
      application.status = 'rejected';
      application.matchScore = fit.matchScore;
      application.aiAnalysis = {
        ...(application.aiAnalysis || {}),
        skillMatch: {
          matched: fit.matchingSkills,
          missing: fit.missingSkills,
          percentage: fit.matchScore
        }
      };
    }

    await application.save();

    // Create notification for candidate
    try {
      await Notification.createNotification({
        userId: candidateUserId,
        type: 'application_update',
        title: `Application Update: ${job.title}`,
        message: `Thank you for your interest in ${job.title} at ${job.company?.name || 'our company'}. We've decided to move forward with other candidates at this time.`,
        actionUrl: `/applications`,
        metadata: {
          jobId: job.jobId,
          jobTitle: job.title,
          company: job.company?.name,
          applicationId: application._id.toString(),
          status: 'rejected'
        }
      });
    } catch (notificationError) {
      console.warn('Failed to create rejection notification:', notificationError);
    }

    res.json({
      success: true,
      message: 'Candidate rejected',
      application
    });
  } catch (error) {
    console.error('Error rejecting candidate:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject candidate',
      error: error.message
    });
  }
});

/**
 * POST /api/jobs/:jobId/extend-offer
 * Extend a job offer to a candidate
 */
router.post('/jobs/:jobId/extend-offer', authenticate, requireRecruiter, async (req, res) => {
  try {
    const { jobId } = req.params;
    const { resumeId, userId, offer } = req.body;

    if (!resumeId) {
      return res.status(400).json({
        success: false,
        message: 'resumeId is required'
      });
    }

    // Get job details
    const job = await Job.findOne({ jobId });
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    const resume = await resolveResumeByIdentifier(resumeId);
    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found'
      });
    }

    const candidateUserId = resolveCandidateUserId(userId, resume);
    if (!candidateUserId) {
      return res.status(400).json({
        success: false,
        message: 'Unable to determine candidate user account for this resume'
      });
    }

    // Query by userId to match the unique index
    let application = await JobApplication.findOne({
      jobId: job._id,
      userId: candidateUserId
    });

    if (!application) {
      const fit = computeJobFitAgainstResume(job, resume);
      application = new JobApplication({
        jobId: job._id,
        userId: candidateUserId,
        resumeId: resume._id,
        status: 'offer_extended',
        organizationId: job.organizationId,
        matchScore: fit.matchScore,
        offer: offer || {}
      });
    } else {
      application.status = 'offer_extended';
      if (offer) {
        application.offer = offer;
      }
    }

    await application.save();

    // Create notification for candidate
    try {
      const candidateName = resume.parsed_resume?.name || 'Candidate';
      await Notification.createNotification({
        userId: candidateUserId,
        type: 'offer_extended',
        title: `🎉 Job Offer from ${job.company?.name || 'Company'}`,
        message: `Congratulations! You've received an offer for ${job.title}`,
        actionUrl: `/applications`,
        metadata: {
          jobId: job.jobId,
          jobTitle: job.title,
          company: job.company?.name,
          applicationId: application._id.toString(),
          offer: offer
        }
      });
    } catch (notificationError) {
      console.warn('Failed to create offer notification:', notificationError);
    }

    res.json({
      success: true,
      message: 'Offer extended successfully',
      application
    });
  } catch (error) {
    console.error('Error extending offer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to extend offer',
      error: error.message
    });
  }
});

/**
 * GET /api/jobs/applications
 * Get all job applications for the authenticated user
 */
router.get('/jobs/applications', authenticate, async (req, res) => {
  try {
    const { status, page = 1, limit = 10, sort = 'recent' } = req.query;
    const userId = req.user._id;

    const query = { userId };
    if (status && status !== 'all') {
      query.status = status;
    }

    const sortOptions = {
      recent: { createdAt: -1 },
      oldest: { createdAt: 1 },
      match: { matchScore: -1 }
    };

    const sortQuery = sortOptions[sort] || sortOptions.recent;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [applications, total, stats] = await Promise.all([
      JobApplication.find(query)
        .populate({
          path: 'jobId',
          select: 'jobId title company location salary employmentType status'
        })
        .sort(sortQuery)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      JobApplication.countDocuments(query),
      JobApplication.aggregate([
        { $match: { userId: userId } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const statsMap = stats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {});

    res.json({
      success: true,
      applications: applications.map(app => {
        // Calculate next upcoming interview
        const now = new Date();
        const nextInterview = app.interviews?.find(
          interview => interview.status === 'scheduled' && new Date(interview.scheduledAt) > now
        );

        // Check if has offer
        const hasOffer = app.status === 'offer_extended' && app.offer;

        return {
          _id: app._id,
          id: app._id.toString(),
          jobId: app.jobId?.jobId,
          jobTitle: app.jobId?.title,
          company: app.jobId?.company?.name || app.jobId?.company,
          location: app.jobId?.location,
          job: {
            title: app.jobId?.title,
            company: app.jobId?.company?.name || app.jobId?.company,
            location: app.jobId?.location,
            type: app.jobId?.employmentType
          },
          status: app.status,
          matchScore: app.matchScore,
          appliedAt: app.createdAt,
          interviews: app.interviews,
          nextInterview: nextInterview || null,
          offer: app.offer,
          hasOffer: hasOffer || false
        };
      }),
      pagination: {
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      },
      stats: {
        total: total,
        applied: statsMap.applied || 0,
        screening: statsMap.screening || 0,
        shortlisted: statsMap.shortlisted || 0,
        interview_scheduled: statsMap.interview_scheduled || 0,
        interviewing: statsMap.interview_scheduled || 0,
        offer_extended: statsMap.offer_extended || 0,
        offers: statsMap.offer_extended || 0,
        active: (statsMap.applied || 0) + (statsMap.screening || 0) + (statsMap.shortlisted || 0),
        rejected: statsMap.rejected || 0
      }
    });
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch applications',
      error: error.message
    });
  }
});

/**
 * GET /api/interviews
 * Get all scheduled interviews for the authenticated user
 */
router.get('/interviews', authenticate, async (req, res) => {
  try {
    const { status = 'all', upcoming = 'true' } = req.query;
    const userId = req.user._id;

    // Find all applications with interviews for this user
    const applications = await JobApplication.find({
      userId,
      'interviews.0': { $exists: true }
    })
      .populate({
        path: 'jobId',
        select: 'jobId title company location employmentType'
      })
      .lean();

    // Flatten interviews and attach job details
    let interviews = [];
    const now = new Date();

    applications.forEach(app => {
      if (app.interviews && app.interviews.length > 0) {
        app.interviews.forEach(interview => {
          interviews.push({
            id: interview._id?.toString() || `${app._id}_${interview.scheduledAt}`,
            applicationId: app._id.toString(),
            job: {
              id: app.jobId?.jobId,
              title: app.jobId?.title,
              company: app.jobId?.company?.name || app.jobId?.company,
              location: app.jobId?.location,
              type: app.jobId?.employmentType
            },
            type: interview.type,
            scheduledAt: interview.scheduledAt,
            duration: interview.duration,
            location: interview.location,
            meetingLink: interview.meetingLink,
            notes: interview.notes,
            status: interview.status,
            completedAt: interview.completedAt,
            feedback: interview.feedback,
            rating: interview.rating
          });
        });
      }
    });

    // Filter by status
    if (status !== 'all') {
      interviews = interviews.filter(i => i.status === status);
    }

    // Filter by upcoming
    if (upcoming === 'true') {
      interviews = interviews.filter(i => new Date(i.scheduledAt) > now);
    }

    // Sort by scheduled date
    interviews.sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));

    res.json({
      success: true,
      interviews
    });
  } catch (error) {
    console.error('Error fetching interviews:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch interviews',
      error: error.message
    });
  }
});

/**
 * GET /api/applications/offers
 * Get all job offers for the authenticated user
 */
router.get('/applications/offers', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;

    const offers = await JobApplication.find({
      userId,
      status: { $in: ['offer_extended', 'offer_accepted', 'offer_declined'] }
    })
      .populate({
        path: 'jobId',
        select: 'jobId title company location salary employmentType'
      })
      .sort({ updatedAt: -1 })
      .lean();

    res.json({
      success: true,
      offers: offers.map(app => ({
        id: app._id.toString(),
        applicationId: app._id.toString(),
        job: {
          id: app.jobId?.jobId,
          title: app.jobId?.title,
          company: app.jobId?.company?.name || app.jobId?.company,
          location: app.jobId?.location,
          salary: app.jobId?.salary
        },
        status: app.status,
        offer: app.offer || {},
        extendedAt: app.updatedAt,
        matchScore: app.matchScore
      }))
    });
  } catch (error) {
    console.error('Error fetching offers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch offers',
      error: error.message
    });
  }
});

export default router;
