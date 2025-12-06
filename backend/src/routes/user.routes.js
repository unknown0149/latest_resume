import express from 'express';
import User from '../models/User.js';
import Resume from '../models/Resume.js';
import { logger } from '../utils/logger.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import multer from 'multer';
// import sharp from 'sharp'; // TEMPORARILY DISABLED - Sharp module has compatibility issues
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for avatar uploads
const avatarStorage = multer.memoryStorage();
const avatarUpload = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
    }
  }
});

// Ensure avatars directory exists
const avatarsDir = path.join(__dirname, '../../uploads/avatars');
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
  logger.info(`Created avatars directory: ${avatarsDir}`);
}

/**
 * @route   GET /api/user/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's resume count
    const resumeCount = await Resume.countDocuments({ userId: user._id });
    
    // Get latest resume
    const latestResume = await Resume.findOne({ userId: user._id, isActive: true })
      .sort({ createdAt: -1 })
      .select('resumeId parsed_resume job_analysis createdAt');

    res.json({
      success: true,
      user: user.getPublicProfile(),
      resumeCount,
      latestResume: latestResume ? {
        id: latestResume.resumeId,
        name: latestResume.parsed_resume?.name,
        skills: latestResume.parsed_resume?.skills || [],
        role: latestResume.job_analysis?.predictedRole,
        uploadedAt: latestResume.createdAt
      } : null
    });

  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @route   PUT /api/user/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const {
      name,
      phone,
      location,
      tagline,
      bio,
      social_links,
      preferences
    } = req.body;

    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update fields if provided
    if (name) user.name = name.trim();
    if (phone !== undefined) user.phone = phone;
    if (location !== undefined) user.location = location;
    if (tagline !== undefined) user.tagline = tagline;
    if (bio !== undefined) user.bio = bio;
    
    if (social_links) {
      user.social_links = {
        ...user.social_links,
        ...social_links
      };
    }
    
    if (preferences) {
      user.preferences = {
        ...user.preferences,
        ...preferences
      };
    }

    // Recalculate profile completeness
    user.calculateProfileCompleteness();
    
    await user.save();

    logger.info(`Profile updated for user: ${user.email}`);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: user.getPublicProfile()
    });

  } catch (error) {
    logger.error('Update profile error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @route   POST /api/user/avatar
 * @desc    Upload user avatar
 * @access  Private
 */
router.post('/avatar', requireAuth, avatarUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete old avatar if exists
    if (user.avatar_url) {
      const oldAvatarPath = path.join(__dirname, '../../', user.avatar_url);
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    }

    // Process image with sharp
    const filename = `${user._id}-${Date.now()}.webp`;
    const filepath = path.join(avatarsDir, filename);

    // TEMPORARILY DISABLED - Using direct file save without sharp processing
    // await sharp(req.file.buffer)
    //   .resize(256, 256, {
    //     fit: 'cover',
    //     position: 'center'
    //   })
    //   .webp({ quality: 85 })
    //   .toFile(filepath);
    
    // Temporary workaround: save file directly
    fs.writeFileSync(filepath, req.file.buffer);

    // Update user avatar URL
    user.avatar_url = `/uploads/avatars/${filename}`;
    user.calculateProfileCompleteness();
    await user.save();

    logger.info(`Avatar uploaded for user: ${user.email}`);

    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      avatar_url: user.avatar_url
    });

  } catch (error) {
    logger.error('Avatar upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during avatar upload'
    });
  }
});

/**
 * @route   DELETE /api/user/avatar
 * @desc    Delete user avatar
 * @access  Private
 */
router.delete('/avatar', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete avatar file if exists
    if (user.avatar_url) {
      const avatarPath = path.join(__dirname, '../../', user.avatar_url);
      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath);
      }
    }

    user.avatar_url = null;
    user.calculateProfileCompleteness();
    await user.save();

    logger.info(`Avatar deleted for user: ${user.email}`);

    res.json({
      success: true,
      message: 'Avatar deleted successfully'
    });

  } catch (error) {
    logger.error('Avatar deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @route   GET /api/user/stats
 * @desc    Get user statistics
 * @access  Private
 */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get additional stats from database
    const totalResumes = await Resume.countDocuments({ userId: user._id });
    const activeResume = await Resume.findOne({ userId: user._id, isActive: true });
    
    // Calculate days since registration
    const daysSinceRegistration = Math.floor(
      (new Date() - user.createdAt) / (1000 * 60 * 60 * 24)
    );

    res.json({
      success: true,
      stats: {
        ...user.stats,
        resumesUploaded: totalResumes,
        daysSinceRegistration,
        hasActiveResume: !!activeResume,
        lastLoginAt: user.lastLoginAt,
        memberSince: user.createdAt
      }
    });

  } catch (error) {
    logger.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @route   GET /api/user/resumes
 * @desc    Get user's resume history
 * @access  Private
 */
router.get('/resumes', requireAuth, async (req, res) => {
  try {
    const resumes = await Resume.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .select('resumeId file_metadata parsed_resume job_analysis isActive createdAt');

    const resumeHistory = resumes.map(resume => ({
      id: resume.resumeId,
      filename: resume.file_metadata?.originalName,
      name: resume.parsed_resume?.name,
      currentTitle: resume.parsed_resume?.current_title,
      skillsCount: resume.parsed_resume?.skills?.length || 0,
      experienceYears: resume.parsed_resume?.years_experience || 0,
      predictedRole: resume.job_analysis?.predictedRole?.name,
      matchScore: resume.job_analysis?.predictedRole?.matchScore,
      isActive: resume.isActive,
      uploadedAt: resume.createdAt
    }));

    res.json({
      success: true,
      count: resumeHistory.length,
      resumes: resumeHistory
    });

  } catch (error) {
    logger.error('Get resume history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @route   PUT /api/user/resumes/:resumeId/activate
 * @desc    Set a resume as active
 * @access  Private
 */
router.put('/resumes/:resumeId/activate', requireAuth, async (req, res) => {
  try {
    const { resumeId } = req.params;

    // Verify resume belongs to user
    const resume = await Resume.findOne({ resumeId, userId: req.user.userId });
    
    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found'
      });
    }

    // Deactivate all user's resumes
    await Resume.updateMany(
      { userId: req.user.userId },
      { isActive: false }
    );

    // Activate selected resume
    resume.isActive = true;
    await resume.save();

    logger.info(`Resume ${resumeId} activated for user: ${req.user.userId}`);

    res.json({
      success: true,
      message: 'Resume activated successfully'
    });

  } catch (error) {
    logger.error('Activate resume error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @route   PUT /api/user/password
 * @desc    Change user password
 * @access  Private
 */
router.put('/password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    const user = await User.findById(req.user.userId).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const matches = await user.comparePassword(currentPassword);
    if (!matches) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    user.password = newPassword;
    // Invalidate refresh token on password change
    user.refreshToken = null;
    await user.save();

    logger.info(`Password updated for user: ${user.email}`);

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    logger.error('Update password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating password'
    });
  }
});

/**
 * @route   DELETE /api/user/account
 * @desc    Delete user account and associated resumes
 * @access  Private
 */
router.delete('/account', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete avatar file if exists
    if (user.avatar_url) {
      const avatarPath = path.join(__dirname, '../../', user.avatar_url);
      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath);
      }
    }

    // Delete resumes belonging to user
    await Resume.deleteMany({ userId: user._id });

    await user.deleteOne();

    logger.info(`Account deleted for user: ${user.email}`);

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    logger.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting account'
    });
  }
});

export default router;
