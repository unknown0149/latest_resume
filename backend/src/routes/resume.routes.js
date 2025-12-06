import express from 'express'
import { v4 as uuidv4 } from 'uuid'
import upload, { handleUploadError } from '../middleware/uploadMiddleware.js'
import { authenticateToken } from '../middleware/authMiddleware.js'
import { extractText, parseResume, quickParse, deepParse } from '../services/resumeProcessingService.js'
import { predictBestRole, analyzeSkills, generateSalaryBoostRecommendations, alignSkillsWithCareerAdvice } from '../services/intelligentJobMatchingService.js'
import { generateRoadmap } from '../services/roadmapService.js'
import { generateResumeSummaryWithWatson } from '../services/watsonResumeSummaryService.js'
import { trackUsage } from '../services/subscriptionService.js'
import Resume from '../models/Resume.js'
import { logger, createLogger } from '../utils/logger.js'
import { queueResumeEmbedding } from '../services/embeddingQueueService.js'
import fs from 'fs/promises'

const BADGE_META = {
  gold: { label: 'Gold Badge', color: '#fbbf24', icon: '🥇' },
  silver: { label: 'Silver Badge', color: '#d1d5db', icon: '🥈' },
  bronze: { label: 'Brown Badge', color: '#fb923c', icon: '🥉' },
  none: { label: 'Needs Practice', color: '#94a3b8', icon: '🎯' }
}

function determineSkillBadge(score) {
  if (typeof score !== 'number') {
    return { level: 'none', ...BADGE_META.none }
  }

  if (score >= 85) {
    return { level: 'gold', ...BADGE_META.gold }
  }
  if (score >= 70) {
    return { level: 'silver', ...BADGE_META.silver }
  }
  if (score >= 50) {
    return { level: 'bronze', ...BADGE_META.bronze }
  }

  return { level: 'none', ...BADGE_META.none }
}

function deriveTrustLevel(score) {
  if (score >= 85) return 'excellent'
  if (score >= 70) return 'good'
  if (score >= 50) return 'moderate'
  if (score > 0) return 'low'
  return 'unverified'
}

// ═══════════════════════════════════════════════════════════════════════
// RESUME UPLOAD & PARSING ROUTES (Using Unified Service)
// ═══════════════════════════════════════════════════════════════════════

// Helper: Validate page count
function validatePageCount(pages, maxPages) {
  if (pages > maxPages) {
    throw new Error(`Resume exceeds maximum page limit of ${maxPages} pages`);
  }
}

const router = express.Router()

/**
 * GET /api/resume
 * Get all resumes for the authenticated user
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId

    if (!userId) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'User ID not found',
        statusCode: 400,
      })
    }

    const resumes = await Resume.find({ userId })
      .select('resumeId file_metadata parsed_resume.name parsed_resume.skills job_analysis.predictedRole createdAt')
      .sort({ createdAt: -1 })
      .limit(10)

    res.json({
      success: true,
      count: resumes.length,
      resumes: resumes.map(resume => ({
        resumeId: resume.resumeId,
        name: resume.parsed_resume?.name || 'Unnamed Resume',
        skillCount: resume.parsed_resume?.skills?.length || 0,
        predictedRole: resume.job_analysis?.predictedRole?.name || null,
        uploadedAt: resume.createdAt,
        fileName: resume.file_metadata?.originalName || 'Unknown'
      }))
    })
  } catch (error) {
    logger.error(`Get resumes error: ${error.message}`)
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve resumes',
      statusCode: 500,
    })
  }
})

/**
 * POST /api/resume/upload
 * Upload and extract text from resume file
 */
router.post(
  '/upload',
  authenticateToken, // Optional auth for Phase 1
  upload.single('file'),
  handleUploadError,
  async (req, res) => {
    const traceId = uuidv4()
    const requestLogger = createLogger({ traceId })

    try {
      // Validate file was uploaded
      if (!req.file) {
        return res.status(400).json({
          error: 'No file uploaded',
          message: 'Please provide a file in the "file" field',
          statusCode: 400,
        })
      }

      const { file } = req
      const userObjectId = req.user?._id || req.user?.userId || null
      
      requestLogger.info(`Processing resume upload: ${file.originalname}`)

      // Extract text from file
      const extractionResult = await extractText(file)

      // Check if extraction failed
      if (extractionResult.status === 'failed') {
        // Clean up uploaded file
        await fs.unlink(file.path).catch(() => {})

        return res.status(422).json({
          error: 'Extraction failed',
          message: extractionResult.error || 'Failed to extract text from file',
          statusCode: 422,
        })
      }

      // Validate page count
      try {
        const maxPages = parseInt(process.env.MAX_PAGES || 30)
        validatePageCount(extractionResult.pages, maxPages)
      } catch (error) {
        // Clean up uploaded file
        await fs.unlink(file.path).catch(() => {})

        return res.status(400).json({
          error: 'Page limit exceeded',
          message: error.message,
          statusCode: 400,
        })
      }

      // Prepare file metadata
      const file_metadata = {
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        pages: extractionResult.pages,
        extractedChars: extractionResult.extractedChars,
        uploadedAt: new Date(),
      }

      // Determine extraction status
      let extraction_status = 'completed'
      if (extractionResult.status === 'low_quality') {
        extraction_status = 'completed' // Still completed, but with warning
      }

      // If user already has an active resume, version it instead of creating a new resumeId
      let resume = null
      let resumeId
      if (userObjectId) {
        resume = await Resume.findOne({ userId: userObjectId, isActive: true })
      }

      if (resume) {
        resumeId = resume.resumeId
        // Push current snapshot to history before overwriting
        resume.previousVersions = resume.previousVersions || []
        resume.previousVersions.push({
          versionNumber: resume.version || 1,
          uploadedAt: resume.file_metadata?.uploadedAt || new Date(),
          filePath: resume.filePath,
          parsed_resume: resume.parsed_resume,
          file_metadata: resume.file_metadata,
        })

        resume.version = (resume.version || 1) + 1
        resume.raw_text = extractionResult.raw_text
        resume.file_metadata = file_metadata
        resume.extraction_status = extraction_status
        resume.ocr_needed = extractionResult.ocrNeeded
        resume.extraction_confidence = extractionResult.extractionConfidence
        resume.errorMessage = extractionResult.message || null
        resume.filePath = file.path
        resume.privacy = resume.privacy || {
          visibleToRecruiters: false,
          openToWork: false,
          lastUpdated: new Date(),
        }
        resume.privacy.lastUpdated = new Date()

        await resume.save()
        requestLogger.info(`Resume updated with new version`, { resumeId: resume.resumeId, version: resume.version })
      } else {
        resumeId = uuidv4()
        resume = new Resume({
          resumeId,
          userId: userObjectId,
          raw_text: extractionResult.raw_text,
          file_metadata,
          extraction_status,
          ocr_needed: extractionResult.ocrNeeded,
          extraction_confidence: extractionResult.extractionConfidence,
          errorMessage: extractionResult.message || null,
          filePath: file.path,
          version: 1,
          previousVersions: [],
          // Initialize privacy settings with secure defaults
          privacy: {
            visibleToRecruiters: false, // Private by default
            openToWork: false,
            lastUpdated: new Date(),
          },
        })

        await resume.save()
        requestLogger.info(`Resume saved successfully`, { resumeId })
      }
      
      // Track usage for subscription limits
      if (req.user && req.user._id) {
        try {
          await trackUsage(req.user._id, 'resumesUploaded');
        } catch (err) {
          requestLogger.warn('Failed to track resume upload usage', err);
        }
      }

      // Prepare response
      const response = {
        resumeId,
        raw_text: extractionResult.raw_text,
        file_metadata: {
          filename: file_metadata.originalName,
          mimeType: file_metadata.mimeType,
          sizeBytes: file_metadata.sizeBytes,
          pages: file_metadata.pages,
          extractedChars: file_metadata.extractedChars,
        },
        extraction_status,
        ocr_needed: extractionResult.ocrNeeded,
        extraction_confidence: extractionResult.extractionConfidence,
      }

      // Add warning if low quality
      if (extractionResult.status === 'low_quality') {
        response.warning = extractionResult.message
      }

      res.status(201).json(response)
    } catch (error) {
      requestLogger.error(`Upload endpoint error: ${error.message}`)

      // Clean up file on error
      if (req.file) {
        await fs.unlink(req.file.path).catch(() => {})
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'An error occurred while processing your resume',
        statusCode: 500,
      })
    }
  }
)

/**
 * GET /api/resume/:resumeId
 * Retrieve resume by ID
 */
router.get('/:resumeId', authenticateToken, async (req, res) => {
  try {
    const { resumeId } = req.params

    const resume = await Resume.findOne({ resumeId })

    if (!resume) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Resume not found',
        statusCode: 404,
      })
    }

    // Return resume data with analysis
    res.json({
      resumeId: resume.resumeId,
      raw_text: resume.raw_text,
      file_metadata: resume.file_metadata,
      extraction_status: resume.extraction_status,
      ocr_needed: resume.ocr_needed,
      extraction_confidence: resume.extraction_confidence,
      parsed_resume: resume.parsed_resume,
      job_analysis: resume.job_analysis,
      createdAt: resume.createdAt,
    })
  } catch (error) {
    logger.error(`Get resume error: ${error.message}`)
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve resume',
      statusCode: 500,
    })
  }
})

/**
 * GET /api/resume/:resumeId/status
 * Check resume processing status (useful for async OCR)
 */
router.get('/:resumeId/status', async (req, res) => {
  try {
    const { resumeId } = req.params

    const resume = await Resume.findOne({ resumeId }).select(
      'resumeId extraction_status ocr_needed extraction_confidence errorMessage'
    )

    if (!resume) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Resume not found',
        statusCode: 404,
      })
    }

    res.json({
      resumeId: resume.resumeId,
      status: resume.extraction_status,
      ocr_needed: resume.ocr_needed,
      confidence: resume.extraction_confidence,
      error: resume.errorMessage,
    })
  } catch (error) {
    logger.error(`Get status error: ${error.message}`)
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve status',
      statusCode: 500,
    })
  }
})

/**
 * POST /api/resume/:resumeId/parse
 * Parse resume using hybrid approach (regex + LLM)
 * Extracts structured data: name, skills, experience, education, etc.
 */
router.post('/:resumeId/parse', async (req, res) => {
  const traceId = uuidv4()
  const requestLogger = createLogger({ traceId })

  try {
    const { resumeId } = req.params
    const { mode = 'deep' } = req.body // 'quick', 'deep', or 'standard'

    requestLogger.info(`Parsing resume ${resumeId} with mode: ${mode}`)

    // Fetch resume from database
    const resume = await Resume.findOne({ resumeId })

    if (!resume) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Resume not found',
        statusCode: 404,
      })
    }

    if (!resume.raw_text) {
      return res.status(400).json({
        error: 'Invalid resume',
        message: 'Resume has no extracted text',
        statusCode: 400,
      })
    }

    // Choose parsing strategy based on mode
    let parseResult
    if (mode === 'quick') {
      parseResult = await quickParse(resume.raw_text)
    } else if (mode === 'deep') {
      parseResult = await deepParse(resume.raw_text)
    } else {
      parseResult = await parseResume(resume.raw_text)
    }

    if (!parseResult.success) {
      requestLogger.error(`Parsing failed for resume ${resumeId}`)
      return res.status(500).json({
        error: 'Parsing failed',
        message: 'Failed to parse resume',
        statusCode: 500,
      })
    }

    // Update resume with parsed data
    resume.parsed_resume = parseResult.parsed_resume
    resume.extraction_metadata = {
      version: parseResult.metadata.version,
      parsed_at: parseResult.metadata.parsed_at,
      overall_confidence: parseResult.metadata.overall_confidence,
      field_confidences: parseResult.metadata.field_confidences,
      extraction_methods: parseResult.metadata.extraction_methods,
      processing_time_ms: parseResult.metadata.processing_time_ms,
      llm_used: parseResult.metadata.llm_used,
      requires_manual_review: parseResult.metadata.requires_manual_review,
      flagged_fields: parseResult.metadata.missing_fields?.map(field => ({
        field: field,
        severity: 'low',
        message: `${field} could not be extracted`,
      })) || [],
    }

    await resume.save()

    requestLogger.info(`Resume ${resumeId} parsed successfully`, {
      confidence: parseResult.metadata.overall_confidence,
      requiresReview: parseResult.metadata.requires_manual_review,
    })

    // Queue embedding generation (Phase 3)
    let embeddingQueued = false
    let queuePosition = null
    try {
      const queueResult = queueResumeEmbedding(resumeId, 'normal')
      embeddingQueued = queueResult.queued
      queuePosition = queueResult.position
      requestLogger.info(`Queued embedding generation for resume ${resumeId} at position ${queuePosition}`)
    } catch (error) {
      requestLogger.warn(`Failed to queue embedding generation: ${error.message}`)
    }

    // Return parsed data
    res.json({
      resumeId,
      parsed_resume: parseResult.parsed_resume,
      metadata: parseResult.metadata,
      embedding_queued: embeddingQueued,
      queue_position: queuePosition,
    })
  } catch (error) {
    requestLogger.error(`Parse endpoint error: ${error.message}`)
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while parsing resume',
      statusCode: 500,
    })
  }
})

/**
 * GET /api/resume/:resumeId/parsed
 * Retrieve parsed resume data
 */
router.get('/:resumeId/parsed', authenticateToken, async (req, res) => {
  try {
    const { resumeId } = req.params

    const resume = await Resume.findOne({ resumeId }).select(
      'resumeId userId parsed_resume extraction_metadata parsed_data job_analysis profile privacy'
    )

    if (!resume) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Resume not found',
        statusCode: 404,
      })
    }

    if (!resume.parsed_resume) {
      return res.status(404).json({
        error: 'Not parsed',
        message: 'Resume has not been parsed yet. Call POST /api/resume/:resumeId/parse first.',
        statusCode: 404,
      })
    }

    // Allow access if user is owner, admin, or recruiter WITH opt-in privacy
    const isOwner = req.user && resume.userId && resume.userId.toString() === req.user._id.toString()
    const isAdmin = req.user && req.user.role === 'admin'
    const recruiterOptIn = req.user && req.user.role === 'recruiter' && resume.privacy?.visibleToRecruiters
    
    if (!isOwner && !isAdmin && !recruiterOptIn) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to view this resume',
        statusCode: 403,
      })
    }

    res.json({
      resumeId,
      parsed_resume: resume.parsed_resume,
      metadata: resume.extraction_metadata,
      parsed_data: resume.parsed_data,
      job_analysis: resume.job_analysis,
      profile: resume.profile,
      privacy: resume.privacy, // Include privacy settings for owner
    })
  } catch (error) {
    logger.error(`Get parsed resume error: ${error.message}`)
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve parsed resume',
      statusCode: 500,
    })
  }
})

/**
 * POST /api/resume/:resumeId/analyze-role
 * Analyze resume and predict best job role with skill gaps and roadmap
 */
router.post('/:resumeId/analyze-role', async (req, res) => {
  const traceId = uuidv4()
  const requestLogger = createLogger({ traceId })

  try {
    const { resumeId } = req.params

    requestLogger.info(`Analyzing role for resume ${resumeId}`)

    // Fetch resume from database
    const resume = await Resume.findOne({ resumeId })

    if (!resume) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Resume not found',
        statusCode: 404,
      })
    }

    if (!resume.parsed_resume) {
      return res.status(400).json({
        error: 'Invalid resume',
        message: 'Resume must be parsed first. Call POST /api/resume/:resumeId/parse',
        statusCode: 400,
      })
    }

    // Step 1: Predict best role (with timeout)
    requestLogger.info('Predicting best job role...')
    const rolePrediction = await predictBestRole(resume)
    const primaryRole = rolePrediction.primaryRole.name

    // Step 2: Analyze skills once and reuse across downstream steps
    requestLogger.info(`Running skill gap analysis for ${primaryRole}`)
    const skillAnalysis = await analyzeSkills(resume, primaryRole)

    // Step 3: Generate salary boost recommendations using enriched skill analysis
    const salaryBoost = generateSalaryBoostRecommendations(
      skillAnalysis.skillsMissing,
      skillAnalysis.skillsHave,
      resume.parsed_resume?.years_experience || 0
    )

    // Step 4: Generate Watson-powered summary (parallel friendly but needs skill analysis)
    requestLogger.info('Generating comprehensive resume summary with Watson...')
    const watsonSummary = await generateResumeSummaryWithWatson(resume, rolePrediction.primaryRole, skillAnalysis)
    const careerAlignment = alignSkillsWithCareerAdvice(skillAnalysis, watsonSummary)

    // Step 5: Generate roadmap informed by alignment plan
    const roadmap = generateRoadmap(
      skillAnalysis.skillsMissing,
      skillAnalysis.skillsHave,
      primaryRole,
      {
        alignedRecommendations: skillAnalysis.alignedRecommendations,
        careerPlan: careerAlignment.plan,
        strengths: careerAlignment.insights?.strengthsToLeverage,
        watsonAdvice: careerAlignment.insights?.watsonAdvice,
      }
    )

    // Step 6: Generate resources for top missing skills
    const topMissingSkills = skillAnalysis.skillsMissing.slice(0, 3).map(s => s.skill)
    const resources = topMissingSkills.length > 0 ? generateFallbackResources(topMissingSkills) : []

    // Save analysis results to database
    resume.job_analysis = {
      predictedRole: {
        name: rolePrediction.primaryRole.name,
        matchScore: rolePrediction.primaryRole.matchScore,
        confidence: rolePrediction.primaryRole.confidence,
        reasoning: rolePrediction.primaryRole.reasoning
      },
      alternativeRoles: rolePrediction.alternativeRoles.map(role => ({
        name: role.name,
        matchScore: role.matchScore,
        reason: role.reason
      })),
      skillsHave: skillAnalysis.skillsHave.map(skill => ({
        skill: skill.skill,
        type: skill.type,
        level: skill.level,
        proficiency: skill.proficiency,
        verified: skill.verified
      })),
      skillsMissing: skillAnalysis.skillsMissing.map(skill => ({
        skill: skill.skill,
        type: skill.type,
        priority: skill.priority,
        reasons: skill.reasons,
        salaryBoost: skill.salaryBoost
      })),
      salaryBoostOpportunities: skillAnalysis.salaryBoostOpportunities || [],
      tagline: watsonSummary?.tagline || '',
      strengths: watsonSummary?.key_strengths || [],
      analyzedAt: new Date()
    }

    await resume.save()
    requestLogger.info(`Saved analysis results for resume ${resumeId}`)

    // Return comprehensive analysis
    requestLogger.info(`Role analysis complete for resume ${resumeId}`)

    res.json({
      success: true,
      resumeId: resume.resumeId,
      data: {
        rolePrediction: {
          primaryRole: rolePrediction.primaryRole,
          alternativeRoles: rolePrediction.alternativeRoles,
          watsonUsed: rolePrediction.watsonUsed
        },
        skillAnalysis: {
          skillsHave: skillAnalysis.skillsHave,
          skillsMissing: skillAnalysis.skillsMissing,
          alignedRecommendations: skillAnalysis.alignedRecommendations || [],
          careerAlignedPlan: careerAlignment.plan,
          careerAdviceInsights: careerAlignment.insights,
          skillGapSummary: skillAnalysis.skillGapSummary,
          salaryBoostOpportunities: skillAnalysis.salaryBoostOpportunities || []
        },
        recommendations: salaryBoost,
        roadmap: roadmap,
        resources: resources,
        watsonSummary: watsonSummary
      }
    })

function generateFallbackResources(skills, limit = 10) {
  const resources = []
  skills.forEach(skill => {
    resources.push(
      {
        skill,
        title: `${skill} - Official Documentation`,
        type: 'Documentation',
        provider: 'Official Docs',
        url: `https://www.google.com/search?q=${encodeURIComponent(skill)}+official+documentation`,
        description: `Comprehensive official documentation for ${skill}`,
        level: 'Beginner',
        duration: 'Self-paced',
        price: 'Free',
        rating: '4.5',
        skills: [skill]
      },
      {
        skill,
        title: `Learn ${skill} - Complete Course`,
        type: 'Course',
        provider: 'Udemy',
        url: `https://www.udemy.com/courses/search/?q=${encodeURIComponent(skill)}`,
        description: `Complete course covering ${skill} fundamentals and advanced concepts`,
        level: 'Intermediate',
        duration: '20-40 hours',
        price: '$49',
        rating: '4.6',
        skills: [skill]
      },
      {
        skill,
        title: `${skill} Tutorial - Video Series`,
        type: 'Video',
        provider: 'YouTube',
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(skill)}+tutorial`,
        description: `Free video tutorials for learning ${skill} from scratch`,
        level: 'Beginner',
        duration: '2-5 hours',
        price: 'Free',
        rating: '4.3',
        skills: [skill]
      }
    )
  })
  return resources.slice(0, limit)
}

  } catch (error) {
    requestLogger.error(`Role analysis failed for resume ${req.params.resumeId}:`, error)
    res.status(500).json({
      error: 'Analysis failed',
      message: error.message,
      statusCode: 500,
    })
  }
})

// ═══════════════════════════════════════════════════════════════════════
// PROFILE CUSTOMIZATION ROUTES
// ═══════════════════════════════════════════════════════════════════════

/**
 * POST /api/resume/:resumeId/profile/photo
 * Upload profile photo
 */
router.post(
  '/:resumeId/profile/photo',
  authenticateToken,
  upload.single('photo'),
  handleUploadError,
  async (req, res) => {
    try {
      const { resumeId } = req.params
      
      if (!req.file) {
        return res.status(400).json({
          error: 'No photo uploaded',
          message: 'Please provide a photo file',
          statusCode: 400,
        })
      }

      // Find resume
      const resume = await Resume.findOne({ resumeId, isActive: true })
      if (!resume) {
        // Clean up uploaded file
        await fs.unlink(req.file.path).catch(() => {})
        return res.status(404).json({
          error: 'Resume not found',
          statusCode: 404,
        })
      }

      // Delete old photo if exists
      if (resume.profile?.photoUrl) {
        const oldPhotoPath = resume.profile.photoUrl.replace('/uploads/', 'uploads/')
        await fs.unlink(oldPhotoPath).catch(() => {})
      }

      // Save new photo URL
      const photoUrl = `/uploads/${req.file.filename}`
      
      if (!resume.profile) {
        resume.profile = {}
      }
      resume.profile.photoUrl = photoUrl

      await resume.save()

      logger.info(`Profile photo updated for resume ${resumeId}`)

      res.json({
        success: true,
        photoUrl,
        message: 'Profile photo uploaded successfully',
      })
    } catch (error) {
      logger.error(`Upload profile photo error: ${error.message}`)
      // Clean up uploaded file on error
      if (req.file?.path) {
        await fs.unlink(req.file.path).catch(() => {})
      }
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to upload profile photo',
        statusCode: 500,
      })
    }
  }
)

/**
 * PATCH /api/resume/:resumeId/profile
 * Update profile customization data
 */
router.patch(
  '/:resumeId/profile',
  authenticateToken,
  async (req, res) => {
    try {
      const { resumeId } = req.params
      const updates = req.body

      // Find resume
      const resume = await Resume.findOne({ resumeId, isActive: true })
      if (!resume) {
        return res.status(404).json({
          error: 'Resume not found',
          statusCode: 404,
        })
      }

      // Initialize profile if doesn't exist
      if (!resume.profile) {
        resume.profile = {}
      }

      // Update allowed fields
      const allowedFields = [
        'customName',
        'headline',
        'summary',
        'quote',
        'customSkills',
        'strengths',
        'customSummary',
        'socialLinks'
      ]

      allowedFields.forEach(field => {
        if (updates[field] !== undefined) {
          resume.profile[field] = updates[field]
        }
      })

      await resume.save()

      logger.info(`Profile updated for resume ${resumeId}`)

      res.json({
        success: true,
        profile: resume.profile,
        message: 'Profile updated successfully',
      })
    } catch (error) {
      logger.error(`Update profile error: ${error.message}`)
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to update profile',
        statusCode: 500,
      })
    }
  }
)

/**
 * PATCH /api/resume/:resumeId/privacy
 * Update resume privacy settings
 */
router.patch(
  '/:resumeId/privacy',
  authenticateToken,
  async (req, res) => {
    try {
      const { resumeId } = req.params
      const { visibleToRecruiters, openToWork } = req.body

      // Find resume and verify ownership
      const resume = await Resume.findOne({ resumeId, isActive: true })
      if (!resume) {
        return res.status(404).json({
          error: 'Resume not found',
          statusCode: 404,
        })
      }

      // Verify user owns this resume
      if (req.user?._id && resume.userId && resume.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You can only update privacy settings for your own resume',
          statusCode: 403,
        })
      }

      // Initialize privacy if doesn't exist
      if (!resume.privacy) {
        resume.privacy = {
          visibleToRecruiters: false,
          openToWork: false,
          lastUpdated: new Date()
        }
      }

      // Update privacy fields
      if (visibleToRecruiters !== undefined) {
        resume.privacy.visibleToRecruiters = Boolean(visibleToRecruiters)
      }
      if (openToWork !== undefined) {
        resume.privacy.openToWork = Boolean(openToWork)
      }
      resume.privacy.lastUpdated = new Date()

      await resume.save()

      logger.info(`Privacy settings updated for resume ${resumeId}: visibleToRecruiters=${resume.privacy.visibleToRecruiters}, openToWork=${resume.privacy.openToWork}`)

      res.json({
        success: true,
        privacy: resume.privacy,
        message: 'Privacy settings updated successfully',
      })
    } catch (error) {
      logger.error(`Update privacy settings error: ${error.message}`)
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to update privacy settings',
        statusCode: 500,
      })
    }
  }
)

/**
 * GET /api/resume/:resumeId/profile
 * Get profile customization data
 */
router.get(
  '/:resumeId/profile',
  authenticateToken,
  async (req, res) => {
    try {
      const { resumeId } = req.params

      const resume = await Resume.findOne({ resumeId, isActive: true })
        .select('profile parsed_resume.name parsed_resume.skills parsed_resume.years_experience analysis')

      if (!resume) {
        return res.status(404).json({
          error: 'Resume not found',
          statusCode: 404,
        })
      }

      // Merge extracted data with custom profile
      const skillVerifications = resume.profile?.skillVerifications || []
      const verificationLookup = skillVerifications.reduce((acc, entry) => {
        if (entry.skill) {
          acc[entry.skill.toLowerCase()] = entry
        }
        return acc
      }, {})

      const baseSkills = resume.profile?.customSkills && resume.profile.customSkills.length > 0
        ? resume.profile.customSkills
        : (resume.parsed_resume?.skills || []).map(skill => ({
            name: skill,
            level: 70,
            category: 'Technical',
            verified: false,
            score: null,
            badge: { level: 'none', label: BADGE_META.none.label },
            lastVerifiedAt: null
          }))

      const mergedSkills = baseSkills.map(skillEntry => {
        const key = skillEntry.name?.toLowerCase()
        const verification = key ? verificationLookup[key] : null
        if (!verification) {
          return skillEntry
        }
        return {
          ...skillEntry,
          verified: verification.verified,
          score: verification.score,
          lastVerifiedAt: verification.lastVerifiedAt,
          badge: verification.badge,
        }
      })

      const profileData = {
        // Custom profile data
        ...(resume.profile || {}),
        // Fallback to extracted data
        name: resume.profile?.customName || resume.parsed_resume?.name || 'Your Name',
        skills: mergedSkills,
        customSkills: mergedSkills,
        yearsExperience: resume.parsed_resume?.years_experience || 0,
        // Analysis data for display
        analysis: resume.analysis || null,
        skillVerifications,
      }

      res.json({
        success: true,
        profile: profileData,
      })
    } catch (error) {
      logger.error(`Get profile error: ${error.message}`)
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve profile',
        statusCode: 500,
      })
    }
  }
)

// ═══════════════════════════════════════════════════════════════════════
// MCQ & RESOURCE GENERATION ROUTES
// ═══════════════════════════════════════════════════════════════════════

/**
 * POST /api/resume/generate-mcq
 * Generate MCQ questions for skill verification using Watson API
 */
router.post('/generate-mcq', authenticateToken, async (req, res) => {
  const traceId = uuidv4()
  const requestLogger = createLogger({ traceId })
  
  try {
    const { skill, count = 5 } = req.body

    if (!skill) {
      return res.status(400).json({
        error: 'Missing skill parameter',
        message: 'Please provide a skill to generate questions for',
        statusCode: 400,
      })
    }

    // Validate count
    const questionCount = Math.min(Math.max(parseInt(count) || 5, 3), 10);

    requestLogger.info(`Generating ${questionCount} MCQ questions for skill: ${skill}`)

    // Import Watson service
    const { generateMCQQuestions } = await import('../services/llmParsingService.js')
    
    // Generate questions using Watson AI
    const questions = await generateMCQQuestions(skill, questionCount)

    // Validate questions format
    const validQuestions = questions.filter(q => 
      q.question && 
      Array.isArray(q.options) && 
      q.options.length === 4 &&
      typeof q.correctAnswer === 'number' &&
      q.correctAnswer >= 0 && 
      q.correctAnswer < 4
    );

    if (validQuestions.length === 0) {
      throw new Error('No valid questions generated');
    }

    requestLogger.info(`Successfully generated ${validQuestions.length} valid MCQ questions for ${skill}`)

    res.json({
      success: true,
      skill,
      count: validQuestions.length,
      questions: validQuestions,
    })

  } catch (error) {
    requestLogger.error(`MCQ generation failed:`, error)
    res.status(500).json({
      error: 'MCQ generation failed',
      message: error.message,
      statusCode: 500,
    })
  }
})

/**
 * POST /api/resume/:resumeId/verify-skill
 * Save skill verification result
 */
router.post('/:resumeId/verify-skill', authenticateToken, async (req, res) => {
  try {
    const { resumeId } = req.params
    const { skill, score, correct = 0, total = 0, timestamp } = req.body

    if (!skill || typeof skill !== 'string') {
      return res.status(400).json({
        error: 'Invalid skill',
        message: 'Skill name is required',
        statusCode: 400,
      })
    }

    if (typeof score !== 'number' || Number.isNaN(score)) {
      return res.status(400).json({
        error: 'Invalid score',
        message: 'A numeric score is required',
        statusCode: 400,
      })
    }

    const resume = await Resume.findOne({ resumeId, isActive: true })

    if (!resume) {
      return res.status(404).json({
        error: 'Resume not found',
        statusCode: 404,
      })
    }

    // Initialize verifications array if not exists
    if (!resume.profile) {
      resume.profile = {}
    }
    if (!resume.profile.skillVerifications) {
      resume.profile.skillVerifications = []
    }

    // Add or update verification
    const existingIndex = resume.profile.skillVerifications.findIndex(
      v => v.skill?.toLowerCase() === skill.toLowerCase()
    )

    const badge = determineSkillBadge(score)
    const verifiedAt = timestamp ? new Date(timestamp) : new Date()
    const verificationData = {
      skill,
      score,
      correct,
      total,
      verified: score >= 70,
      lastVerifiedAt: verifiedAt,
      badge: {
        level: badge.level,
        label: badge.label,
        awardedAt: verifiedAt,
      },
    }

    if (existingIndex >= 0) {
      resume.profile.skillVerifications[existingIndex] = verificationData
    } else {
      resume.profile.skillVerifications.push(verificationData)
    }

    // Sync custom skills with verification data
    if (!Array.isArray(resume.profile.customSkills)) {
      resume.profile.customSkills = []
    }
    if (Array.isArray(resume.profile.customSkills)) {
      const skillIndex = resume.profile.customSkills.findIndex(
        s => s.name?.toLowerCase() === skill.toLowerCase()
      )

      if (skillIndex >= 0) {
        resume.profile.customSkills[skillIndex] = {
          ...resume.profile.customSkills[skillIndex],
          verified: verificationData.verified,
          score: verificationData.score,
          lastVerifiedAt: verificationData.lastVerifiedAt,
          badge: verificationData.badge,
        }
      } else {
        resume.profile.customSkills.push({
          name: skill,
          level: verificationData.score,
          category: 'Technical',
          verified: verificationData.verified,
          score: verificationData.score,
          lastVerifiedAt: verificationData.lastVerifiedAt,
          badge: verificationData.badge,
        })
      }
    }

    // Update aggregated verification status snapshot
    if (!resume.parsed_resume) {
      resume.parsed_resume = {}
    }
    if (!resume.parsed_resume.verification_status) {
      resume.parsed_resume.verification_status = {
        isVerified: false,
        verifiedSkills: [],
        questionableSkills: [],
        credibilityScore: 0,
        badge: { level: 'none', label: BADGE_META.none.label, color: BADGE_META.none.color, icon: BADGE_META.none.icon },
        interviewScore: 0,
        totalInterviews: 0,
        trustLevel: 'unverified'
      }
    }

    const allVerifications = resume.profile.skillVerifications
    const averageScore = allVerifications.length
      ? Math.round(allVerifications.reduce((sum, entry) => sum + (entry.score || 0), 0) / allVerifications.length)
      : 0
    const overallBadge = determineSkillBadge(averageScore)

    resume.parsed_resume.verification_status.isVerified = allVerifications.some(v => v.verified)
    resume.parsed_resume.verification_status.verifiedAt = verifiedAt
    resume.parsed_resume.verification_status.credibilityScore = averageScore
    resume.parsed_resume.verification_status.interviewScore = averageScore
    resume.parsed_resume.verification_status.totalInterviews = allVerifications.length
    resume.parsed_resume.verification_status.badge = {
      level: overallBadge.level,
      label: overallBadge.label,
      color: overallBadge.color,
      icon: overallBadge.icon
    }
    resume.parsed_resume.verification_status.trustLevel = deriveTrustLevel(averageScore)
    resume.parsed_resume.verification_status.lastInterviewAt = verifiedAt
    resume.parsed_resume.verification_status.verifiedSkills = allVerifications
      .filter(v => v.verified)
      .map(v => ({ skill: v.skill, score: v.score, status: 'verified' }))
    resume.parsed_resume.verification_status.questionableSkills = allVerifications
      .filter(v => !v.verified)
      .map(v => ({ skill: v.skill, score: v.score, status: 'needs_improvement' }))

    resume.markModified('profile.skillVerifications')
    resume.markModified('profile.customSkills')
    resume.markModified('parsed_resume.verification_status')

    await resume.save()

    res.json({
      success: true,
      verification: verificationData,
      skillVerifications: allVerifications,
      profile: resume.profile,
      verificationStatus: resume.parsed_resume.verification_status,
    })

  } catch (error) {
    logger.error(`Skill verification save failed: ${error.message}`)
    res.status(500).json({
      error: 'Failed to save verification',
      message: error.message,
      statusCode: 500,
    })
  }
})

/**
 * POST /api/resume/generate-resources
 * Generate learning resources for skills using Watson/Gemini API
 */
router.post('/generate-resources', authenticateToken, async (req, res) => {
  try {
    const { skills, limit = 10 } = req.body

    if (!skills || !Array.isArray(skills) || skills.length === 0) {
      return res.status(400).json({
        error: 'Missing skills parameter',
        message: 'Please provide an array of skills',
        statusCode: 400,
      })
    }

    requestLogger.info(`Generating resources for ${skills.length} skills`)

    // Import resource generation service
    const { generateLearningResources } = await import('../services/llmParsingService.js')
    
    // Generate resources using AI
    const resources = await generateLearningResources(skills, limit)

    res.json({
      success: true,
      count: resources.length,
      resources,
    })

  } catch (error) {
    requestLogger.error(`Resource generation failed:`, error)
    res.status(500).json({
      error: 'Resource generation failed',
      message: error.message,
      statusCode: 500,
    })
  }
})

/**
 * GET /api/resume/user/verifications
 * Get all skill verifications across user's resumes
 */
router.get('/user/verifications', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User ID not found',
        statusCode: 401,
      });
    }
    
    // Find all active resumes for this user
    const resumes = await Resume.find({ userId: userId, isActive: true })
      .select('resumeId profile.skillVerifications createdAt')
      .sort({ createdAt: -1 });
    
    // Aggregate all verifications
    const allVerifications = new Map();
    
    for (const resume of resumes) {
      const verifications = resume.profile?.skillVerifications || [];
      
      for (const verification of verifications) {
        const skillKey = verification.skill?.toLowerCase();
        if (!skillKey) continue;
        
        // Keep the latest/best verification for each skill
        const existing = allVerifications.get(skillKey);
        if (!existing || verification.score > existing.score || 
            new Date(verification.lastVerifiedAt) > new Date(existing.lastVerifiedAt)) {
          allVerifications.set(skillKey, {
            ...verification,
            resumeId: resume.resumeId,
            verifiedOn: resume.createdAt
          });
        }
      }
    }
    
    const verifiedSkills = Array.from(allVerifications.values())
      .sort((a, b) => b.score - a.score);
    
    logger.info(`Retrieved ${verifiedSkills.length} verified skills for user ${userId}`);
    
    res.json({
      success: true,
      userId: userId,
      totalVerified: verifiedSkills.length,
      verifiedSkills: verifiedSkills,
      resumeCount: resumes.length
    });
    
  } catch (error) {
    logger.error('Failed to get user verifications:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve verifications',
      statusCode: 500,
    });
  }
});

export default router

