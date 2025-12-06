/**
 * Data Export Routes
 * Allows users to export their data for GDPR compliance and portability
 */

import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import Resume from '../models/Resume.js';
import JobApplication from '../models/JobApplication.js';
import User from '../models/User.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/export/data
 * Export all user data in JSON format
 */
router.get('/data', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;

    // Fetch all user data
    const [user, resumes, applications] = await Promise.all([
      User.findById(userId).select('-password').lean(),
      Resume.find({ userId, isActive: true }).lean(),
      JobApplication.find({ userId })
        .populate('jobId', 'title company location salary')
        .lean()
    ]);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prepare export data
    const exportData = {
      exportDate: new Date().toISOString(),
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        phone: user.phone,
        location: user.location,
        bio: user.bio,
        tagline: user.tagline,
        social_links: user.social_links
      },
      resumes: resumes.map(resume => ({
        resumeId: resume.resumeId,
        version: resume.version,
        uploadedAt: resume.file_metadata?.uploadedAt,
        filename: resume.file_metadata?.originalName,
        parsed_data: resume.parsed_resume,
        privacy: resume.privacy,
        verification_status: resume.parsed_resume?.verification_status
      })),
      applications: applications.map(app => ({
        jobTitle: app.jobId?.title,
        company: app.jobId?.company?.name,
        status: app.status,
        appliedAt: app.createdAt,
        interviews: app.interviews,
        offer: app.offer,
        matchScore: app.matchScore
      })),
      statistics: {
        totalResumes: resumes.length,
        totalApplications: applications.length,
        activeApplications: applications.filter(a => ['applied', 'shortlisted', 'interview_scheduled'].includes(a.status)).length
      }
    };

    res.json({
      success: true,
      data: exportData
    });

    logger.info(`Data exported for user ${userId}`);
  } catch (error) {
    logger.error('Data export failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export data',
      error: error.message
    });
  }
});

/**
 * GET /api/export/resume/:resumeId/versions
 * Get all versions of a specific resume
 */
router.get('/resume/:resumeId/versions', authenticateToken, async (req, res) => {
  try {
    const { resumeId } = req.params;
    const userId = req.user._id;

    const resume = await Resume.findOne({ resumeId, userId }).lean();

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found'
      });
    }

    const versions = [
      {
        versionNumber: resume.version,
        uploadedAt: resume.file_metadata?.uploadedAt,
        filename: resume.file_metadata?.originalName,
        isCurrent: true,
        parsed_resume: resume.parsed_resume
      },
      ...(resume.previousVersions || []).map(v => ({
        versionNumber: v.versionNumber,
        uploadedAt: v.uploadedAt,
        filename: v.file_metadata?.originalName,
        isCurrent: false,
        parsed_resume: v.parsed_resume
      }))
    ].sort((a, b) => b.versionNumber - a.versionNumber);

    res.json({
      success: true,
      resumeId,
      totalVersions: versions.length,
      versions
    });

  } catch (error) {
    logger.error('Failed to fetch resume versions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch resume versions',
      error: error.message
    });
  }
});

/**
 * POST /api/export/resume/:resumeId/restore/:versionNumber
 * Restore a previous version of resume
 */
router.post('/resume/:resumeId/restore/:versionNumber', authenticateToken, async (req, res) => {
  try {
    const { resumeId, versionNumber } = req.params;
    const userId = req.user._id;

    const resume = await Resume.findOne({ resumeId, userId });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found'
      });
    }

    const targetVersion = resume.previousVersions?.find(
      v => v.versionNumber === parseInt(versionNumber)
    );

    if (!targetVersion) {
      return res.status(404).json({
        success: false,
        message: 'Version not found'
      });
    }

    // Save current version to history
    resume.previousVersions.push({
      versionNumber: resume.version,
      uploadedAt: resume.file_metadata.uploadedAt,
      filePath: resume.filePath,
      parsed_resume: resume.parsed_resume,
      file_metadata: resume.file_metadata
    });

    // Restore target version
    resume.version = parseInt(versionNumber);
    resume.parsed_resume = targetVersion.parsed_resume;
    resume.filePath = targetVersion.filePath;
    resume.file_metadata = targetVersion.file_metadata;

    await resume.save();

    res.json({
      success: true,
      message: `Restored to version ${versionNumber}`,
      currentVersion: resume.version
    });

    logger.info(`Resume ${resumeId} restored to version ${versionNumber} by user ${userId}`);
  } catch (error) {
    logger.error('Failed to restore resume version:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to restore version',
      error: error.message
    });
  }
});

export default router;
