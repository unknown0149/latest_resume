/**
 * Interview Routes (USER SIDE)
 * Endpoints for candidates to view and respond to interviews
 */

import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import JobApplication from '../models/JobApplication.js';

const router = express.Router();

/**
 * @route GET /api/interviews
 * @desc Get user's scheduled interviews
 * @access Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { status = 'all', upcoming = 'true' } = req.query;

    // Find applications with interviews
    const applications = await JobApplication.find({
      userId: req.user._id,
      'interviews.0': { $exists: true },
    })
      .populate('jobId', 'title company location')
      .populate('interviews.interviewers', 'name email avatar')
      .sort({ 'interviews.scheduledAt': 1 });

    // Extract and filter interviews
    let allInterviews = [];
    applications.forEach(app => {
      app.interviews.forEach(interview => {
        allInterviews.push({
          id: interview._id,
          applicationId: app._id,
          job: {
            id: app.jobId?._id,
            title: app.jobId?.title,
            company: app.jobId?.company,
            location: app.jobId?.location,
          },
          type: interview.type,
          scheduledAt: interview.scheduledAt,
          duration: interview.duration,
          location: interview.location,
          meetingLink: interview.meetingLink,
          interviewers: interview.interviewers,
          status: interview.status,
          notes: interview.notes,
          feedback: interview.feedback,
          rating: interview.rating,
          completedAt: interview.completedAt,
        });
      });
    });

    // Filter by status
    if (status !== 'all') {
      allInterviews = allInterviews.filter(i => i.status === status);
    }

    // Filter upcoming only
    if (upcoming === 'true') {
      const now = new Date();
      allInterviews = allInterviews.filter(i =>
        i.status === 'scheduled' && new Date(i.scheduledAt) > now
      );
    }

    res.json({
      success: true,
      count: allInterviews.length,
      interviews: allInterviews,
    });
  } catch (error) {
    console.error('Error fetching interviews:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch interviews',
    });
  }
});

/**
 * @route GET /api/interviews/:id
 * @desc Get interview details
 * @access Private
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const application = await JobApplication.findOne({
      userId: req.user._id,
      'interviews._id': req.params.id,
    })
      .populate('jobId')
      .populate('interviews.interviewers', 'name email avatar phone');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Interview not found',
      });
    }

    const interview = application.interviews.id(req.params.id);

    res.json({
      success: true,
      interview: {
        id: interview._id,
        applicationId: application._id,
        job: application.jobId,
        type: interview.type,
        scheduledAt: interview.scheduledAt,
        duration: interview.duration,
        location: interview.location,
        meetingLink: interview.meetingLink,
        interviewers: interview.interviewers,
        notes: interview.notes,
        status: interview.status,
        feedback: interview.feedback,
        rating: interview.rating,
        completedAt: interview.completedAt,
      },
    });
  } catch (error) {
    console.error('Error fetching interview details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch interview details',
    });
  }
});

/**
 * @route PUT /api/interviews/:id/respond
 * @desc Accept or request reschedule for interview
 * @access Private
 */
router.put('/:id/respond', authenticate, async (req, res) => {
  try {
    const { response, reason, suggestedTimes } = req.body; // response: 'accept' | 'reschedule'

    const application = await JobApplication.findOne({
      userId: req.user._id,
      'interviews._id': req.params.id,
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Interview not found',
      });
    }

    const interview = application.interviews.id(req.params.id);

    if (interview.status !== 'scheduled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot respond to this interview',
      });
    }

    if (response === 'accept') {
      interview.notes = (interview.notes || '') + `\nCandidate confirmed attendance at ${new Date()}`;
      
      // Add to communications
      application.communications.push({
        type: 'message',
        subject: 'Interview Confirmation',
        content: 'Candidate confirmed attendance for the interview',
        sentBy: req.user._id,
      });
    } else if (response === 'reschedule') {
      interview.notes = (interview.notes || '') +
        `\nCandidate requested reschedule: ${reason}\nSuggested times: ${suggestedTimes?.join(', ')}`;
      
      application.communications.push({
        type: 'message',
        subject: 'Interview Reschedule Request',
        content: `Candidate requested to reschedule: ${reason}\nSuggested times: ${suggestedTimes?.join(', ')}`,
        sentBy: req.user._id,
      });
    }

    await application.save();

    res.json({
      success: true,
      message: response === 'accept' ? 'Interview confirmed' : 'Reschedule request sent',
    });
  } catch (error) {
    console.error('Error responding to interview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to respond to interview',
    });
  }
});

export default router;
