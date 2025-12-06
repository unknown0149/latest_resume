/**
 * Saved Jobs Routes
 * API endpoints for saving and managing job bookmarks
 */

import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import SavedJob from '../models/SavedJob.js';
import Job from '../models/Job.js';

const router = express.Router();

/**
 * @route POST /api/saved-jobs
 * @desc Save a job
 * @access Private
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { jobId, collection, notes, tags } = req.body;
    
    // Check if job exists
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }
    
    // Check if already saved
    const existingSave = await SavedJob.findOne({
      userId: req.user._id,
      jobId,
    });
    
    if (existingSave) {
      return res.status(400).json({
        success: false,
        message: 'Job already saved',
        savedJob: existingSave,
      });
    }
    
    const savedJob = new SavedJob({
      userId: req.user._id,
      jobId,
      collection: collection || 'default',
      notes,
      tags,
    });
    
    await savedJob.save();
    
    res.status(201).json({
      success: true,
      message: 'Job saved successfully',
      savedJob,
    });
  } catch (error) {
    console.error('Error saving job:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save job',
    });
  }
});

/**
 * @route GET /api/saved-jobs
 * @desc Get all saved jobs for user
 * @access Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { collection, tags, applied, page = 1, limit = 20 } = req.query;
    
    const query = { userId: req.user._id };
    
    if (collection) query.collection = collection;
    if (tags) query.tags = { $in: tags.split(',') };
    if (applied !== undefined) query.applied = applied === 'true';
    
    const savedJobs = await SavedJob.find(query)
      .populate('jobId')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await SavedJob.countDocuments(query);
    
    res.json({
      success: true,
      savedJobs,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching saved jobs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch saved jobs',
    });
  }
});

/**
 * @route GET /api/saved-jobs/collections
 * @desc Get all collections for user
 * @access Private
 */
router.get('/collections', authenticate, async (req, res) => {
  try {
    const collections = await SavedJob.getUserCollections(req.user._id);
    
    // Get count for each collection
    const collectionsWithCount = await Promise.all(
      collections.map(async (name) => {
        const count = await SavedJob.countDocuments({
          userId: req.user._id,
          collection: name,
        });
        return { name, count };
      })
    );
    
    res.json({
      success: true,
      collections: collectionsWithCount,
    });
  } catch (error) {
    console.error('Error fetching collections:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch collections',
    });
  }
});

/**
 * @route PUT /api/saved-jobs/:id
 * @desc Update saved job details
 * @access Private
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { collection, notes, tags } = req.body;
    
    const savedJob = await SavedJob.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    
    if (!savedJob) {
      return res.status(404).json({
        success: false,
        message: 'Saved job not found',
      });
    }
    
    if (collection) savedJob.collection = collection;
    if (notes !== undefined) savedJob.notes = notes;
    if (tags) savedJob.tags = tags;
    
    await savedJob.save();
    
    res.json({
      success: true,
      message: 'Saved job updated successfully',
      savedJob,
    });
  } catch (error) {
    console.error('Error updating saved job:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update saved job',
    });
  }
});

/**
 * @route DELETE /api/saved-jobs/:id
 * @desc Remove saved job
 * @access Private
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const savedJob = await SavedJob.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });
    
    if (!savedJob) {
      return res.status(404).json({
        success: false,
        message: 'Saved job not found',
      });
    }
    
    res.json({
      success: true,
      message: 'Saved job removed successfully',
    });
  } catch (error) {
    console.error('Error removing saved job:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove saved job',
    });
  }
});

/**
 * @route POST /api/saved-jobs/:id/mark-applied
 * @desc Mark saved job as applied
 * @access Private
 */
router.post('/:id/mark-applied', authenticate, async (req, res) => {
  try {
    const savedJob = await SavedJob.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    
    if (!savedJob) {
      return res.status(404).json({
        success: false,
        message: 'Saved job not found',
      });
    }
    
    await savedJob.markAsApplied();
    
    res.json({
      success: true,
      message: 'Job marked as applied',
      savedJob,
    });
  } catch (error) {
    console.error('Error marking job as applied:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark job as applied',
    });
  }
});

/**
 * @route PUT /api/saved-jobs/:id/application-status
 * @desc Update application status for saved job
 * @access Private
 */
router.put('/:id/application-status', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    
    const savedJob = await SavedJob.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    
    if (!savedJob) {
      return res.status(404).json({
        success: false,
        message: 'Saved job not found',
      });
    }
    
    await savedJob.updateApplicationStatus(status);
    
    res.json({
      success: true,
      message: 'Application status updated',
      savedJob,
    });
  } catch (error) {
    console.error('Error updating application status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update application status',
    });
  }
});

/**
 * @route POST /api/saved-jobs/:id/reminder
 * @desc Set reminder for saved job
 * @access Private
 */
router.post('/:id/reminder', authenticate, async (req, res) => {
  try {
    const { date } = req.body;
    
    const savedJob = await SavedJob.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    
    if (!savedJob) {
      return res.status(404).json({
        success: false,
        message: 'Saved job not found',
      });
    }
    
    savedJob.reminder = {
      enabled: true,
      date: new Date(date),
      notified: false,
    };
    
    await savedJob.save();
    
    res.json({
      success: true,
      message: 'Reminder set successfully',
      savedJob,
    });
  } catch (error) {
    console.error('Error setting reminder:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set reminder',
    });
  }
});

/**
 * @route GET /api/saved-jobs/check/:jobId
 * @desc Check if job is saved
 * @access Private
 */
router.get('/check/:jobId', authenticate, async (req, res) => {
  try {
    const savedJob = await SavedJob.findOne({
      userId: req.user._id,
      jobId: req.params.jobId,
    });
    
    res.json({
      success: true,
      isSaved: !!savedJob,
      savedJob,
    });
  } catch (error) {
    console.error('Error checking saved job:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check saved job',
    });
  }
});

export default router;
