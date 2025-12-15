/**
 * Recruiter Routes
 * API endpoints for employer/recruiter portal
 */

import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import Job from '../models/Job.js';
import JobApplication from '../models/JobApplication.js';
import Organization from '../models/Organization.js';
import User from '../models/User.js';
import Resume from '../models/Resume.js';
import { ensureDatabaseConnection } from '../config/database.js';
import {
  asyncHandler,
  NotFoundError,
  ForbiddenError,
  ValidationError,
  successResponse,
} from '../utils/errorHandler.js';
import {
  validateJobUpdate,
  validateApplicationStatus,
  validateBulkStatus,
  validateBulkReject,
  validateInterviewSchedule,
  validateOffer,
  validateNote,
} from '../utils/validation.js';
import {
  EVENTS,
  emitApplicationEvent,
  emitInterviewEvent,
  emitOfferEvent,
} from '../utils/notificationEmitter.js';

const router = express.Router();

const DEFAULT_EXPIRY_DAYS = parseInt(process.env.RECRUITER_JOB_EXPIRY_DAYS || '45', 10);
const MS_IN_DAY = 24 * 60 * 60 * 1000;
const ALLOWED_SOURCE_PLATFORMS = new Set(['linkedin', 'indeed', 'glassdoor', 'direct', 'api', 'manual', 'seed', 'real']);

const STATUS_LABELS = {
  applied: 'Applied',
  screening: 'Screening',
  shortlisted: 'Shortlisted',
  interview_scheduled: 'Interview scheduled',
  interview_completed: 'Interview completed',
  offer_extended: 'Offer extended',
  offer_accepted: 'Offer accepted',
  offer_declined: 'Offer declined',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

const buildJobId = (existingId) => {
  if (existingId && typeof existingId === 'string' && existingId.trim().length) {
    return existingId.trim();
  }
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const normalizeSalaryPeriod = (value = 'annually') => {
  const normalized = value.toString().toLowerCase();
  if (['hourly', 'hour', 'per_hour', 'hr'].includes(normalized)) {
    return 'hourly';
  }
  if (['annual', 'annually', 'yearly', 'year', 'yr', 'per_year'].includes(normalized)) {
    return 'annually';
  }
  return 'annually';
};

const normalizeSourcePlatform = (value = '') => {
  const platform = value.toString().toLowerCase().trim();
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

const ensureDate = (value, fallback = null) => {
  if (!value) {
    return fallback;
  }
  const candidate = new Date(value);
  return Number.isNaN(candidate.getTime()) ? fallback : candidate;
};

const normalizeArrayField = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter((entry) => entry.length > 0);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  return [];
};

const normalizeSkillsPayload = (skills = {}) => {
  if (Array.isArray(skills)) {
    const normalized = skills.filter(Boolean).map((skill) => skill.toLowerCase().trim());
    return {
      required: normalized,
      preferred: normalized,
      allSkills: Array.from(new Set(normalized)),
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
    allSkills: combined,
  };
};

const buildSkillsFromRequirements = (requirements = []) => {
  const normalized = requirements
    .filter((req) => typeof req === 'string')
    .map((req) => req.toLowerCase().trim());
  const unique = Array.from(new Set(normalized));
  return {
    required: unique,
    preferred: unique,
    allSkills: unique,
  };
};

const normalizeCompany = (companyInput, organization) => {
  if (typeof companyInput === 'string' && companyInput.trim().length) {
    return {
      name: companyInput.trim(),
      logo: null,
      website: null,
      size: '1-50',
    };
  }

  const fallbackName = (organization?.name || 'Unknown Company').trim();
  const providedName = typeof companyInput?.name === 'string' ? companyInput.name.trim() : '';
  return {
    name: providedName.length ? providedName : fallbackName,
    logo: companyInput?.logo || null,
    website: companyInput?.website || null,
    size: companyInput?.size || '1-50',
  };
};

const normalizeLocation = (locationInput = {}) => {
  if (typeof locationInput === 'string' && locationInput.trim().length) {
    return {
      city: locationInput.trim(),
      state: null,
      country: 'United States',
      isRemote: false,
    };
  }

  return {
    city: locationInput.city || '',
    state: locationInput.state || '',
    country: locationInput.country || 'United States',
    isRemote: Boolean(locationInput.isRemote),
  };
};

const normalizeSalary = (salaryInput = {}) => {
  if (!salaryInput || (salaryInput.min == null && salaryInput.max == null)) {
    return undefined;
  }

  const min = Number(salaryInput.min);
  const max = Number(salaryInput.max);
  return {
    min: Number.isFinite(min) ? min : undefined,
    max: Number.isFinite(max) ? max : undefined,
    currency: salaryInput.currency || 'USD',
    period: normalizeSalaryPeriod(salaryInput.period || 'annually'),
  };
};

const ensureRecruiterDatabase = async (req, res, next) => {
  try {
    await ensureDatabaseConnection();
    return next();
  } catch (error) {
    console.error('Database unavailable for recruiter route:', error);
    return res.status(503).json({
      success: false,
      message: 'Database temporarily unavailable. Please try again shortly.'
    });
  }
};

/**
 * Middleware to check recruiter access
 */
const requireRecruiterAccess = asyncHandler(async (req, res, next) => {
  const orgSlug = req.params.orgSlug || req.body.organizationSlug;
  
  if (!orgSlug) {
    throw new ValidationError('Organization slug is required');
  }
  
  const organization = await Organization.findOne({ slug: orgSlug });
  
  if (!organization) {
    throw new NotFoundError('Organization');
  }
  
  // Check if user has recruiter or admin access
  const memberRole = organization.getMemberRole(req.user._id);
  
  if (!memberRole || !['owner', 'admin', 'recruiter'].includes(memberRole)) {
    throw new ForbiddenError('Insufficient permissions');
  }
  
  req.organization = organization;
  next();
});

/**
 * @route GET /api/recruiter/:orgSlug/dashboard
 * @desc Get recruiter dashboard statistics
 * @access Private (Recruiter)
 */
router.get('/:orgSlug/dashboard', authenticate, ensureRecruiterDatabase, requireRecruiterAccess, async (req, res) => {
  try {
    const organizationId = req.organization._id;
    
    // Get job statistics
    const totalJobs = await Job.countDocuments({ organizationId });
    const activeJobs = await Job.countDocuments({ organizationId, status: 'active' });
    
    // Get application statistics
    const totalApplications = await JobApplication.countDocuments({ organizationId });
    const newApplications = await JobApplication.countDocuments({
      organizationId,
      status: 'applied',
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    });
    
    // Get pipeline statistics
    const pipelineStats = await JobApplication.getApplicationStats(organizationId);
    
    // Get recent applications
    const recentApplications = await JobApplication.find({ organizationId })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('userId', 'name email avatar')
      .populate('jobId', 'title company location')
      .populate('resumeId', 'parsedData.name');
    
    // Get upcoming interviews
    const upcomingInterviews = await JobApplication.find({
      organizationId,
      'interviews.status': 'scheduled',
      'interviews.scheduledAt': { $gte: new Date() },
    })
      .sort({ 'interviews.scheduledAt': 1 })
      .limit(10)
      .populate('userId', 'name email avatar')
      .populate('jobId', 'title');
    
    res.json({
      success: true,
      dashboard: {
        jobs: {
          total: totalJobs,
          active: activeJobs,
        },
        applications: {
          total: totalApplications,
          new: newApplications,
          pipeline: pipelineStats,
        },
        recentApplications,
        upcomingInterviews,
      },
    });
  } catch (error) {
    console.error('Error fetching recruiter dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
    });
  }
});

/**
 * @route POST /api/recruiter/:orgSlug/jobs
 * @desc Create new job posting
 * @access Private (Recruiter)
 */
router.post('/:orgSlug/jobs', authenticate, ensureRecruiterDatabase, requireRecruiterAccess, async (req, res) => {
  try {
    const jobInput = req.body || {};

    if (!jobInput.title || !jobInput.description) {
      return res.status(400).json({
        success: false,
        message: 'Title and description are required',
      });
    }

    const jobId = buildJobId(jobInput.jobId);
    const postedDate = new Date();
    const expiresAt = new Date(postedDate.getTime() + DEFAULT_EXPIRY_DAYS * MS_IN_DAY);

    const normalizedRequirements = normalizeArrayField(jobInput.requirements);
    const normalizedResponsibilities = normalizeArrayField(jobInput.responsibilities);
    const normalizedBenefits = normalizeArrayField(jobInput.benefits);

    const providedSkills = normalizeSkillsPayload(jobInput.skills);
    const hasSkills =
      providedSkills.required.length ||
      providedSkills.preferred.length ||
      providedSkills.allSkills.length;

    const job = new Job({
      jobId,
      title: jobInput.title,
      description: jobInput.description,
      company: normalizeCompany(jobInput.company, req.organization),
      location: normalizeLocation(jobInput.location),
      responsibilities: normalizedResponsibilities,
      requirements: normalizedRequirements,
      employmentType: jobInput.employmentType || jobInput.type || 'full-time',
      experienceLevel: jobInput.experienceLevel || 'mid',
      experienceYears: jobInput.experienceYears,
      salary: normalizeSalary(jobInput.salary),
      benefits: normalizedBenefits,
      applicationDeadline: ensureDate(jobInput.applicationDeadline),
      applicationUrl: jobInput.applicationUrl || jobInput.applyUrl || null,
      applicationEmail: jobInput.applicationEmail || null,
      tag: jobInput.tag || null,
      skills: hasSkills ? providedSkills : buildSkillsFromRequirements(normalizedRequirements),
      organizationId: req.organization._id,
      postedBy: req.user._id,
      postedDate,
      expiresAt,
      status: jobInput.status || 'active',
      source: {
        platform: normalizeSourcePlatform(jobInput.source?.platform || 'manual'),
        sourceUrl: jobInput.source?.sourceUrl || jobInput.applicationUrl || null,
        sourceJobId: jobInput.source?.sourceJobId || jobId,
      },
    });

    await job.save();

    res.status(201).json({
      success: true,
      message: 'Job posted successfully',
      job,
    });
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create job',
    });
  }
});

/**
 * @route GET /api/recruiter/:orgSlug/jobs
 * @desc Get organization's job postings
 * @access Private (Recruiter)
 */
router.get('/:orgSlug/jobs', authenticate, ensureRecruiterDatabase, requireRecruiterAccess, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    const query = { organizationId: req.organization._id };
    if (status) query.status = status;
    
    const jobs = await Job.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('postedBy', 'name email');
    
    const total = await Job.countDocuments(query);
    
    res.json({
      success: true,
      jobs,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch jobs',
    });
  }
});

/**
 * @route GET /api/recruiter/:orgSlug/jobs/:jobId
 * @desc Get single job details
 * @access Private (Recruiter)
 */
router.get('/:orgSlug/jobs/:jobId', authenticate, ensureRecruiterDatabase, requireRecruiterAccess, async (req, res) => {
  try {
    const job = await Job.findOne({
      _id: req.params.jobId,
      organizationId: req.organization._id,
    }).populate('postedBy', 'name email');
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }
    
    res.json({
      success: true,
      job,
    });
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job',
    });
  }
});

/**
 * @route PUT /api/recruiter/:orgSlug/jobs/:jobId
 * @desc Update job posting
 * @access Private (Recruiter)
 */
router.put('/:orgSlug/jobs/:jobId', authenticate, ensureRecruiterDatabase, requireRecruiterAccess, async (req, res) => {
  try {
    const {
      title,
      company,
      location,
      type,
      description,
      requirements,
      salary,
      benefits,
      experienceLevel,
      status,
    } = req.body;
    
    const job = await Job.findOne({
      _id: req.params.jobId,
      organizationId: req.organization._id,
    });
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }
    
    // Update fields if provided
    if (title) job.title = title;
    if (company) job.company = company;
    if (location) job.location = location;
    if (type) job.type = type;
    if (description) job.description = description;
    if (requirements) job.requirements = requirements;
    if (salary) job.salary = salary;
    if (benefits) job.benefits = benefits;
    if (experienceLevel) job.experienceLevel = experienceLevel;
    if (status) job.status = status;
    
    await job.save();
    
    res.json({
      success: true,
      message: 'Job updated successfully',
      job,
    });
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update job',
    });
  }
});

/**
 * @route DELETE /api/recruiter/:orgSlug/jobs/:jobId
 * @desc Close/archive job posting
 * @access Private (Recruiter)
 */
router.delete('/:orgSlug/jobs/:jobId', authenticate, ensureRecruiterDatabase, requireRecruiterAccess, async (req, res) => {
  try {
    const job = await Job.findOne({
      _id: req.params.jobId,
      organizationId: req.organization._id,
    });
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }
    
    // Set status to closed instead of deleting
    job.status = 'closed';
    await job.save();
    
    res.json({
      success: true,
      message: 'Job closed successfully',
      job,
    });
  } catch (error) {
    console.error('Error closing job:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to close job',
    });
  }
});

/**
 * @route POST /api/recruiter/:orgSlug/jobs/:jobId/clone
 * @desc Clone an existing job posting
 * @access Private (Recruiter)
 */
router.post('/:orgSlug/jobs/:jobId/clone', authenticate, ensureRecruiterDatabase, requireRecruiterAccess, async (req, res) => {
  try {
    const originalJob = await Job.findOne({
      _id: req.params.jobId,
      organizationId: req.organization._id,
    });
    
    if (!originalJob) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }
    
    // Create new job with same details
    const clonedJob = new Job({
      title: `${originalJob.title} (Copy)`,
      company: originalJob.company,
      location: originalJob.location,
      type: originalJob.type,
      description: originalJob.description,
      requirements: originalJob.requirements,
      salary: originalJob.salary,
      benefits: originalJob.benefits,
      experienceLevel: originalJob.experienceLevel,
      organizationId: req.organization._id,
      postedBy: req.user._id,
      status: 'draft', // Start as draft
    });
    
    await clonedJob.save();
    
    res.status(201).json({
      success: true,
      message: 'Job cloned successfully',
      job: clonedJob,
    });
  } catch (error) {
    console.error('Error cloning job:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clone job',
    });
  }
});

/**
 * @route GET /api/recruiter/:orgSlug/applications
 * @desc Get all applications for organization
 * @access Private (Recruiter)
 */
router.get('/:orgSlug/applications', authenticate, ensureRecruiterDatabase, requireRecruiterAccess, async (req, res) => {
  try {
    const { jobId, status, page = 1, limit = 20, search } = req.query;
    
    const query = { organizationId: req.organization._id };
    if (jobId) query.jobId = jobId;
    if (status) query.status = status;
    
    console.log('[Applications Query]', {
      orgId: req.organization._id,
      orgName: req.organization.name,
      query,
      jobIdFilter: jobId,
      statusFilter: status
    });
    
    const applications = await JobApplication.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('userId', 'name email avatar phone')
      .populate('jobId', 'title company location')
      .populate('resumeId');
    
    const total = await JobApplication.countDocuments(query);
    
    console.log('[Applications Result]', {
      totalInDB: total,
      returnedCount: applications.length,
      sampleApp: applications.length > 0 ? {
        id: applications[0]._id,
        userId: applications[0].userId?._id,
        jobId: applications[0].jobId?._id,
        jobTitle: applications[0].jobId?.title,
        status: applications[0].status
      } : 'No applications'
    });
    
    // Apply search filter if provided
    let filteredApplications = applications;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredApplications = applications.filter(app => 
        app.userId?.name?.toLowerCase().includes(searchLower) ||
        app.userId?.email?.toLowerCase().includes(searchLower) ||
        app.jobId?.title?.toLowerCase().includes(searchLower)
      );
    }
    
    res.json({
      success: true,
      applications: filteredApplications,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch applications',
    });
  }
});

/**
 * @route PUT /api/recruiter/:orgSlug/applications/:applicationId/status
 * @desc Update application status
 * @access Private (Recruiter)
 */
router.put(
  '/:orgSlug/applications/:applicationId/status',
  authenticate,
  ensureRecruiterDatabase,
  requireRecruiterAccess,
  validateApplicationStatus,
  asyncHandler(async (req, res) => {
    const { status, note } = req.body;
    
    const application = await JobApplication.findOne({
      _id: req.params.applicationId,
      organizationId: req.organization._id,
    }).populate('userId jobId');
    
    if (!application) {
      throw new NotFoundError('Application');
    }
    
    const oldStatus = application.status;
    await application.updateStatus(status, req.user._id, note, {
      source: 'recruiter',
      label: STATUS_LABELS[status] || `Status updated to ${status}`,
    });
    
    // Emit notification event
    emitApplicationEvent(EVENTS.APPLICATION.STATUS_CHANGED, {
      applicationId: application._id,
      userId: application.userId._id,
      jobTitle: application.jobId.title,
      company: application.jobId.company,
      status,
      oldStatus,
    });
    
    return successResponse(res, application, 'Application status updated');
  })
);

/**
 * @route POST /api/recruiter/:orgSlug/applications/:applicationId/interview
 * @desc Schedule interview for application
 * @access Private (Recruiter)
 */
router.post(
  '/:orgSlug/applications/:applicationId/interview',
  authenticate,
  ensureRecruiterDatabase,
  requireRecruiterAccess,
  validateInterviewSchedule,
  asyncHandler(async (req, res) => {
    const { type, scheduledAt, duration, interviewers, location, meetingLink, notes } = req.body;
    
    const application = await JobApplication.findOne({
      _id: req.params.applicationId,
      organizationId: req.organization._id,
    }).populate('userId jobId');
    
    if (!application) {
      throw new NotFoundError('Application');
    }
    
    await application.scheduleInterview({
      type,
      scheduledAt,
      duration,
      interviewers,
      location,
      meetingLink,
      notes,
    }, req.user._id);
    
    // Emit interview scheduled event
    const interview = application.interviews[application.interviews.length - 1];
    emitInterviewEvent(EVENTS.INTERVIEW.SCHEDULED, {
      interviewId: interview._id,
      applicationId: application._id,
      userId: application.userId._id,
      jobTitle: application.jobId.title,
      interviewType: type,
      scheduledAt,
    });
    
    return successResponse(res, application, 'Interview scheduled successfully');
  })
);

/**
 * @route POST /api/recruiter/:orgSlug/applications/:applicationId/notes
 * @desc Add note to application
 * @access Private (Recruiter)
 */
router.post(
  '/:orgSlug/applications/:applicationId/notes',
  authenticate,
  ensureRecruiterDatabase,
  requireRecruiterAccess,
  validateNote,
  asyncHandler(async (req, res) => {
    const { note } = req.body;
    
    const application = await JobApplication.findOne({
      _id: req.params.applicationId,
      organizationId: req.organization._id,
    });
    
    if (!application) {
      throw new NotFoundError('Application');
    }
    
    application.recruiterNotes.push({
      userId: req.user._id,
      note,
    });
    
    await application.save();
    
    return successResponse(res, application, 'Note added successfully');
  })
);

/**
 * @route POST /api/recruiter/:orgSlug/applications/bulk-status
 * @desc Update status for multiple applications
 * @access Private (Recruiter)
 */
router.post(
  '/:orgSlug/applications/bulk-status',
  authenticate,
  ensureRecruiterDatabase,
  requireRecruiterAccess,
  validateBulkStatus,
  asyncHandler(async (req, res) => {
    const { applicationIds, status } = req.body;
    const statusEvent = {
      status,
      label: STATUS_LABELS[status] || `Status updated to ${status}`,
      note: 'Bulk status update',
      updatedAt: new Date(),
      updatedBy: req.user._id,
      source: 'recruiter',
    };
    
    // Update all applications
    const result = await JobApplication.updateMany(
      {
        _id: { $in: applicationIds },
        organizationId: req.organization._id,
      },
      {
        $set: { status },
        $push: {
          statusHistory: statusEvent,
        },
      }
    );
    
    // Emit events for each updated application
    const applications = await JobApplication.find({
      _id: { $in: applicationIds },
    }).populate('userId jobId').select('_id userId jobId status');
    
    applications.forEach((app) => {
      emitApplicationEvent(EVENTS.APPLICATION.STATUS_CHANGED, {
        applicationId: app._id,
        userId: app.userId._id,
        jobTitle: app.jobId.title,
        company: app.jobId.company,
        status,
      });
    });
    
    return successResponse(
      res,
      { updated: result.modifiedCount },
      `${result.modifiedCount} applications updated`
    );
  })
);

/**
 * @route POST /api/recruiter/:orgSlug/applications/bulk-reject
 * @desc Reject multiple applications
 * @access Private (Recruiter)
 */
router.post(
  '/:orgSlug/applications/bulk-reject',
  authenticate,
  ensureRecruiterDatabase,
  requireRecruiterAccess,
  validateBulkReject,
  asyncHandler(async (req, res) => {
    const { applicationIds, reason } = req.body;
    const statusEvent = {
      status: 'rejected',
      label: STATUS_LABELS.rejected,
      note: reason || 'Application rejected',
      updatedAt: new Date(),
      updatedBy: req.user._id,
      source: 'recruiter',
    };
    
    const result = await JobApplication.updateMany(
      {
        _id: { $in: applicationIds },
        organizationId: req.organization._id,
      },
      {
        $set: { 
          status: 'rejected',
        },
        $push: {
          statusHistory: statusEvent,
        },
      }
    );
    
    // Emit rejection events
    const applications = await JobApplication.find({
      _id: { $in: applicationIds },
    }).populate('userId jobId').select('_id userId jobId');
    
    applications.forEach((app) => {
      emitApplicationEvent(EVENTS.APPLICATION.STATUS_CHANGED, {
        applicationId: app._id,
        userId: app.userId._id,
        jobTitle: app.jobId.title,
        company: app.jobId.company,
        status: 'rejected',
      });
    });
    
    return successResponse(
      res,
      { updated: result.modifiedCount },
      `${result.modifiedCount} applications rejected`
    );
  })
);

/**
 * @route GET /api/recruiter/:orgSlug/candidates/search
 * @desc Search candidates in database (with PII protection)
 * @access Private (Recruiter)
 */
router.get(
  '/:orgSlug/candidates/search',
  authenticate,
  ensureRecruiterDatabase,
  requireRecruiterAccess,
  asyncHandler(async (req, res) => {
    const { skills, experience, location, minExperience, maxExperience, query: searchQuery, page = 1, limit = 20 } = req.query;
    
    // Check if user has PII access
    const memberRole = req.organization.getMemberRole(req.user._id);
    const canViewPII = ['owner', 'admin'].includes(memberRole);
    
    // Build search query
    const query = {};
    
    // Skill-based search
    if (skills) {
      const skillArray = Array.isArray(skills) ? skills : skills.split(',');
      query['parsedData.skills'] = { $in: skillArray };
    }
    
    // Experience range filter
    if (minExperience) {
      query['parsedData.experience.totalYears'] = { $gte: parseInt(minExperience) };
    }
    if (maxExperience) {
      query['parsedData.experience.totalYears'] = {
        ...query['parsedData.experience.totalYears'],
        $lte: parseInt(maxExperience),
      };
    }
    
    // Location filter
    if (location) {
      query['parsedData.personalInfo.location'] = { $regex: location, $options: 'i' };
    }
    
    // Text search in resume content
    if (searchQuery) {
      query.$or = [
        { 'parsedData.personalInfo.name': { $regex: searchQuery, $options: 'i' } },
        { 'parsedData.skills': { $regex: searchQuery, $options: 'i' } },
        { 'parsedData.summary': { $regex: searchQuery, $options: 'i' } },
      ];
    }
    
    // Select fields based on permissions
    const selectFields = canViewPII
      ? 'userId parsedData.personalInfo parsedData.skills parsedData.experience parsedData.education createdAt'
      : 'parsedData.personalInfo.name parsedData.skills parsedData.experience parsedData.education createdAt -parsedData.personalInfo.email -parsedData.personalInfo.phone';
    
    const populateFields = canViewPII
      ? 'name email avatar phone location'
      : 'name avatar location -email -phone';
    
    // Search in Resume collection with field restrictions
    const resumes = await Resume.find(query)
      .select(selectFields)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('userId', populateFields)
      .lean(); // Use lean for better performance
    
    const total = await Resume.countDocuments(query);
    
    // Audit log for compliance
    // TODO: Create AuditLog model and uncomment
    // await AuditLog.create({
    //   action: 'candidate_search',
    //   performedBy: req.user._id,
    //   organizationId: req.organization._id,
    //   searchParams: { skills, experience, location, minExperience, maxExperience, searchQuery },
    //   resultsCount: resumes.length,
    //   timestamp: new Date(),
    // });
    
    return successResponse(res, {
      candidates: resumes,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
      piiAccess: canViewPII,
    });
  })
);

/**
 * @route GET /api/recruiter/:orgSlug/applications/:applicationId
 * @desc Get full application details with resume
 * @access Private (Recruiter)
 */
router.get('/:orgSlug/applications/:applicationId', authenticate, ensureRecruiterDatabase, requireRecruiterAccess, async (req, res) => {
  try {
    const application = await JobApplication.findOne({
      _id: req.params.applicationId,
      organizationId: req.organization._id,
    })
      .populate('userId', 'name email avatar phone location social_links bio')
      .populate('jobId')
      .populate('resumeId')
      .populate('interviews.interviewers', 'name email avatar')
      .populate('recruiterNotes.userId', 'name email')
      .populate('communications.sentBy', 'name email')
      .populate('statusHistory.updatedBy', 'name email role');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
      });
    }

    const timeline = [];

    if (application.statusHistory?.length) {
      application.statusHistory.forEach((entry) => {
        timeline.push({
          event: entry.label || STATUS_LABELS[entry.status] || entry.status,
          date: entry.updatedAt,
          status: entry.status,
          type: 'status',
          actor: entry.source === 'candidate' ? application.userId?.name : entry.updatedBy?.name || 'Recruiter',
          note: entry.note,
          content: entry.meta,
        });
      });
    } else {
      timeline.push({
        event: 'Application Received',
        date: application.createdAt,
        status: 'applied',
        actor: application.userId?.name,
        type: 'status',
      });
    }

    application.recruiterNotes.forEach(note => {
      timeline.push({
        event: 'Note Added',
        date: note.createdAt,
        type: 'note',
        actor: note.userId?.name,
        content: note.note,
      });
    });

    application.interviews.forEach(interview => {
      timeline.push({
        event: `Interview ${interview.type || ''} ${interview.status || ''}`.trim(),
        date: interview.scheduledAt,
        type: 'interview',
        content: interview,
      });
    });

    if (application.offer) {
      timeline.push({
        event: 'Offer Details',
        date: application.offer.offeredAt,
        type: 'offer',
        content: application.offer,
      });
    }

    timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      success: true,
      application: {
        ...application.toObject(),
        timeline,
      },
    });
  } catch (error) {
    console.error('Error fetching application details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch application details',
    });
  }
});

/**
 * @route POST /api/recruiter/:orgSlug/applications/:applicationId/offer
 * @desc Send job offer to candidate
 * @access Private (Recruiter)
 */
router.post('/:orgSlug/applications/:applicationId/offer', authenticate, ensureRecruiterDatabase, requireRecruiterAccess, async (req, res) => {
  try {
    const { salary, benefits, joiningDate, validUntil } = req.body;

    const application = await JobApplication.findOne({
      _id: req.params.applicationId,
      organizationId: req.organization._id,
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
      });
    }

    await application.extendOffer({
      salary,
      currency: 'INR',
      benefits,
      joiningDate: new Date(joiningDate),
      validUntil: new Date(validUntil),
    }, req.user._id);

    res.json({
      success: true,
      message: 'Offer sent successfully',
      application,
    });
  } catch (error) {
    console.error('Error sending offer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send offer',
    });
  }
});

/**
 * @route PUT /api/recruiter/:orgSlug/interviews/:interviewId
 * @desc Update interview details
 * @access Private (Recruiter)
 */
router.put('/:orgSlug/interviews/:interviewId', authenticate, ensureRecruiterDatabase, requireRecruiterAccess, async (req, res) => {
  try {
    const { scheduledAt, location, meetingLink, status, feedback, rating } = req.body;

    const application = await JobApplication.findOne({
      organizationId: req.organization._id,
      'interviews._id': req.params.interviewId,
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Interview not found',
      });
    }

    const interview = application.interviews.id(req.params.interviewId);
    
    if (scheduledAt) interview.scheduledAt = new Date(scheduledAt);
    if (location) interview.location = location;
    if (meetingLink) interview.meetingLink = meetingLink;
    if (status) interview.status = status;
    if (feedback) interview.feedback = feedback;
    if (rating) interview.rating = rating;
    
    let savedViaStatusUpdate = false;
    if (status === 'completed') {
      interview.completedAt = new Date();
      await application.updateStatus('interview_completed', req.user._id, feedback || 'Interview completed', {
        source: 'recruiter',
        label: 'Interview completed',
        meta: {
          interviewId: interview._id,
          rating,
        },
      });
      savedViaStatusUpdate = true;
    } else if (status && status !== 'scheduled') {
      application.recordStatusEvent({
        status: `interview_${status}`,
        label: `Interview ${status.replace(/_/g, ' ')}`,
        note: feedback,
        meta: {
          interviewId: interview._id,
        },
        userId: req.user._id,
        source: 'recruiter',
      });
    }
    
    if (!savedViaStatusUpdate) {
      await application.save();
    }

    res.json({
      success: true,
      message: 'Interview updated successfully',
      interview,
    });
  } catch (error) {
    console.error('Error updating interview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update interview',
    });
  }
});

/**
 * @route GET /api/recruiter/discover-candidates
 * @desc Discover candidates who have made their profiles visible to recruiters
 * @access Private (Recruiter)
 */
router.get(
  '/discover-candidates',
  authenticate,
  asyncHandler(async (req, res) => {
    // Verify user is a recruiter
    if (!req.user || !['recruiter', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Recruiter privileges required.'
      });
    }

    const { search, skills, experience, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query - only show resumes where user opted in to recruiter visibility
    const query = {
      isActive: true,
      'privacy.visibleToRecruiters': true,
      'parsed_resume.skills.0': { $exists: true } // Ensure resume has skills
    };

    // Search filter (name, location, current role)
    if (search && search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      query.$or = [
        { 'parsed_resume.name': searchRegex },
        { 'parsed_resume.full_name': searchRegex },
        { 'parsed_resume.location': searchRegex },
        { 'parsed_resume.current_role': searchRegex },
        { 'parsed_resume.title': searchRegex }
      ];
    }

    // Skills filter
    if (skills && skills.trim()) {
      const skillList = skills.split(',').map(s => s.trim()).filter(Boolean);
      if (skillList.length > 0) {
        query['parsed_resume.skills'] = { 
          $regex: skillList.join('|'), 
          $options: 'i' 
        };
      }
    }

    // Experience filter
    if (experience && experience !== 'all') {
      const expQuery = {};
      if (experience === '0-2') {
        expQuery.$lte = 2;
      } else if (experience === '3-5') {
        expQuery.$gte = 3;
        expQuery.$lte = 5;
      } else if (experience === '6-10') {
        expQuery.$gte = 6;
        expQuery.$lte = 10;
      } else if (experience === '10+') {
        expQuery.$gte = 10;
      }
      
      if (Object.keys(expQuery).length > 0) {
        query.$or = query.$or || [];
        query.$or.push(
          { 'parsed_resume.years_experience': expQuery },
          { 'parsed_data.years_of_experience': expQuery }
        );
      }
    }

    try {
      // Count total matching candidates
      const total = await Resume.countDocuments(query);

      // Fetch candidates with pagination
      const candidates = await Resume.find(query)
        .select('resumeId userId parsed_resume parsed_data privacy createdAt updatedAt')
        .populate('userId', 'name email phone location')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      res.json({
        success: true,
        candidates,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching candidates:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch candidates',
        error: error.message
      });
    }
  })
);

export default router;
