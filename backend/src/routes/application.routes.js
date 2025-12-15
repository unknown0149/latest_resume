/**
 * Job Application Routes (USER SIDE)
 * Endpoints for job seekers to apply and track applications
 */

import express from 'express';
import mongoose from 'mongoose';
import { authenticate } from '../middleware/authMiddleware.js';
import Job from '../models/Job.js';
import JobApplication from '../models/JobApplication.js';
import Resume from '../models/Resume.js';
import { checkFeatureAccess } from '../middleware/subscriptionMiddleware.js';
import { trackUsage } from '../services/subscriptionService.js';

const router = express.Router();

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

const getUserId = (req) => {
  if (req.user?._id) {
    return req.user._id.toString();
  }
  if (req.user?.userId) {
    return req.user.userId.toString();
  }
  return null;
};

/**
 * @route POST /api/applications/apply/:jobId
 * @desc Apply to a job
 * @access Private
 */
router.post('/apply/:jobId', authenticate, checkFeatureAccess('jobApplications'), async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { jobId } = req.params;
    const {
      resumeId,
      coverLetter,
      portfolio,
      expectedSalary,
      noticePeriod,
      availableFrom,
    } = req.body;

    // Check if job exists
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    if (job.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'This job is no longer accepting applications',
      });
    }

    // Get resume (use provided or user's active resume)
    let resume;
    if (resumeId) {
      resume = await Resume.findOne({ resumeId, userId });
    } else {
      resume = await Resume.findOne({ userId, isActive: true });
    }

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found. Please upload a resume first.',
      });
    }

    // Check if already applied
    const existingApplication = await JobApplication.findOne({
      jobId,
      userId,
    });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied to this job',
        applicationId: existingApplication._id,
      });
    }

    // Calculate match score using resume and job data
    const skills = resume.parsed_resume?.skills || [];
    const jobSkills = job.requirements?.skills || [];
    const matchedSkills = skills.filter(skill =>
      jobSkills.some(jSkill => jSkill.toLowerCase().includes(skill.toLowerCase()))
    );
    const matchScore = jobSkills.length > 0
      ? Math.round((matchedSkills.length / jobSkills.length) * 100)
      : 50;

    // Create application
    console.log('[Creating Application]', {
      jobId,
      jobTitle: job.title,
      userId,
      jobOrganizationId: job.organizationId,
      jobPostedBy: job.postedBy,
      hasOrgId: !!job.organizationId
    });
    
    const application = new JobApplication({
      jobId,
      userId,
      resumeId: resume._id,
      organizationId: job.organizationId,
      status: 'applied',
      matchScore,
      aiAnalysis: {
        strengths: [],
        concerns: [],
        recommendations: [],
        skillMatch: {
          matched: matchedSkills,
          missing: jobSkills.filter(jSkill =>
            !skills.some(skill => skill.toLowerCase().includes(jSkill.toLowerCase()))
          ),
          percentage: matchScore,
        },
      },
      coverLetter,
      portfolio,
      expectedSalary: expectedSalary ? {
        min: expectedSalary.min,
        max: expectedSalary.max,
        currency: expectedSalary.currency || 'INR',
      } : undefined,
      noticePeriod,
      availableFrom: availableFrom ? new Date(availableFrom) : undefined,
      source: 'direct',
      statusHistory: [{
        status: 'applied',
        label: 'Application submitted',
        note: coverLetter ? 'Cover letter attached' : undefined,
        meta: {
          jobTitle: job.title,
          company: job.company,
        },
        updatedAt: new Date(),
        updatedBy: userId,
        source: 'candidate',
      }],
    });

    await application.save();
    
    console.log('[Application Created]', {
      applicationId: application._id,
      organizationId: application.organizationId,
      status: application.status
    });

    // Track usage
    try {
      await trackUsage(userId, 'jobApplications');
    } catch (trackingError) {
      console.warn('Failed to track job application usage', trackingError);
    }

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      application: {
        id: application._id,
        jobId: application.jobId,
        status: application.status,
        matchScore: application.matchScore,
        appliedAt: application.createdAt,
      },
    });
  } catch (error) {
    console.error('Error applying to job:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit application',
    });
  }
});

/**
 * @route GET /api/applications
 * @desc Get user's job applications
 * @access Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { status, page = 1, limit = 20, sort = 'recent' } = req.query;

    const query = { userId };
    if (status) query.status = status;

    let sortOption = { createdAt: -1 }; // Default: most recent
    if (sort === 'match') sortOption = { matchScore: -1 };
    if (sort === 'oldest') sortOption = { createdAt: 1 };

    const applications = await JobApplication.find(query)
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('jobId')
      .populate('resumeId', 'resumeId file_metadata.originalName');

    const total = await JobApplication.countDocuments(query);

    // Format response
    const formattedApplications = applications.map(app => {
      const job = app.jobId || {};
      return {
        id: app._id,
        job: {
          id: job._id,
          title: job.title || 'Position details pending',
          company: job.company?.name || job.company || 'Company name pending',
          location: job.location?.city || job.location?.state || job.location?.country || job.location || 'Location not specified',
          type: job.employmentType || job.type || null,
          salary: job.salary,
        },
        status: app.status,
        matchScore: app.matchScore || 0,
        appliedAt: app.createdAt,
        resumeUsed: app.resumeId?.file_metadata?.originalName,
        hasInterview: app.interviews?.length > 0,
        nextInterview: app.interviews?.find(i => i.status === 'scheduled' && new Date(i.scheduledAt) > new Date()),
        hasOffer: !!app.offer,
        offer: app.offer || null,
      };
    });

    res.json({
      success: true,
      applications: formattedApplications,
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

router.get('/user/stats', authenticate, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const total = await JobApplication.countDocuments({ userId: userObjectId });
    const byStatus = await JobApplication.aggregate([
      { $match: { userId: userObjectId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const stats = {
      total,
      active: 0,
      interviewing: 0,
      offers: 0,
      rejected: 0,
      byStatus: {},
    };

    byStatus.forEach(item => {
      stats.byStatus[item._id] = item.count;
      if (['applied', 'screening', 'shortlisted'].includes(item._id)) {
        stats.active += item.count;
      }
      if (['interview_scheduled', 'interview_completed'].includes(item._id)) {
        stats.interviewing += item.count;
      }
      if (['offer_extended', 'offer_accepted'].includes(item._id)) {
        stats.offers += item.count;
      }
      if (item._id === 'rejected') {
        stats.rejected += item.count;
      }
    });

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Error fetching application stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
    });
  }
});

router.get('/offers', authenticate, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const applications = await JobApplication.find({
      userId,
      offer: { $exists: true, $ne: null },
    })
      .populate('jobId', 'title company location type salary')
      .sort({ 'offer.offeredAt': -1 });

    const offers = applications.map(app => ({
      id: app._id,
      job: {
        id: app.jobId?._id,
        title: app.jobId?.title,
        company: app.jobId?.company,
        location: app.jobId?.location,
        type: app.jobId?.type,
        salary: app.jobId?.salary,
      },
      status: app.status,
      offer: app.offer,
      updatedAt: app.updatedAt,
    }));

    res.json({
      success: true,
      offers,
    });
  } catch (error) {
    console.error('Error fetching offers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch offers',
    });
  }
});

/**
 * @route GET /api/applications/:id
 * @desc Get application details
 * @access Private
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const application = await JobApplication.findOne({
      _id: req.params.id,
      userId,
    })
      .populate('jobId')
      .populate('resumeId')
      .populate('interviews.interviewers', 'name email avatar')
      .populate('statusHistory.updatedBy', 'name email role');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
      });
    }

    // Build timeline
    const timeline = [];

    if (application.statusHistory?.length) {
      application.statusHistory.forEach((entry) => {
        timeline.push({
          event: entry.label || STATUS_LABELS[entry.status] || entry.status,
          date: entry.updatedAt,
          status: entry.status,
          type: 'status',
          actor: entry.source === 'candidate' ? 'You' : entry.updatedBy?.name || 'Recruiter',
          note: entry.note,
          details: entry.meta,
        });
      });
    } else {
      timeline.push({ event: 'Applied', date: application.createdAt, status: 'applied', type: 'status' });
      if (application.status === 'screening') {
        timeline.push({ event: 'Under Review', date: application.updatedAt, status: 'screening', type: 'status' });
      }
      if (application.status === 'shortlisted') {
        timeline.push({ event: 'Shortlisted', date: application.updatedAt, status: 'shortlisted', type: 'status' });
      }
    }

    if (application.interviews?.length > 0) {
      application.interviews.forEach(interview => {
        timeline.push({
          event: `Interview ${interview.type || ''}`.trim(),
          date: interview.scheduledAt,
          status: interview.status,
          type: 'interview',
          details: interview,
        });
      });
    }
    if (application.offer) {
      timeline.push({
        event: 'Offer Details',
        date: application.offer.offeredAt,
        status: application.status,
        type: 'offer',
        details: application.offer,
      });
    }

    timeline.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({
      success: true,
      application: {
        id: application._id,
        job: application.jobId,
        status: application.status,
        matchScore: application.matchScore,
        aiAnalysis: application.aiAnalysis,
        coverLetter: application.coverLetter,
        expectedSalary: application.expectedSalary,
        interviews: application.interviews,
        offer: application.offer,
        timeline,
        appliedAt: application.createdAt,
        updatedAt: application.updatedAt,
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
 * @route PUT /api/applications/:id/withdraw
 * @desc Withdraw application
 * @access Private
 */
router.put('/:id/withdraw', authenticate, async (req, res) => {
  try {
    const { reason } = req.body;
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const application = await JobApplication.findOne({
      _id: req.params.id,
      userId,
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
      });
    }

    if (['offer_accepted', 'withdrawn'].includes(application.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot withdraw this application',
      });
    }

    application.rejection = {
      reason: reason || 'Withdrawn by candidate',
      feedback: '',
      rejectedAt: new Date(),
    };

    await application.updateStatus('withdrawn', userId, reason || 'Withdrawn by candidate', {
      source: 'candidate',
      label: 'Application withdrawn',
    });

    res.json({
      success: true,
      message: 'Application withdrawn successfully',
    });
  } catch (error) {
    console.error('Error withdrawing application:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to withdraw application',
    });
  }
});

router.put('/:id/offer/respond', authenticate, async (req, res) => {
  try {
    const { action, message } = req.body; // action: accept | decline
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    if (!['accept', 'decline'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be accept or decline',
      });
    }

    const application = await JobApplication.findOne({
      _id: req.params.id,
      userId,
      offer: { $exists: true, $ne: null },
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Offer not found for this application',
      });
    }

    let statusToSet = 'offer_accepted';
    let statusNote = message || 'Offer accepted';

    if (action === 'accept') {
      application.offer.acceptedAt = new Date();
      if (message) {
        application.offer.responseNotes = message;
      }
    } else {
      statusToSet = 'offer_declined';
      statusNote = message || 'Candidate declined the offer';
      application.offer.declineReason = statusNote;
      application.offer.declinedAt = new Date();
    }

    await application.updateStatus(statusToSet, userId, statusNote, {
      source: 'candidate',
      label: statusToSet === 'offer_accepted' ? 'Offer accepted' : 'Offer declined',
      meta: {
        action,
      },
    });

    res.json({
      success: true,
      message: action === 'accept' ? 'Offer accepted' : 'Offer declined',
      offer: application.offer,
    });
  } catch (error) {
    console.error('Error responding to offer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update offer response',
    });
  }
});

export default router;
