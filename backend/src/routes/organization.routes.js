/**
 * Organization Routes
 * API endpoints for multi-tenancy organization management
 */

import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import Organization from '../models/Organization.js';
import Subscription from '../models/Subscription.js';

const router = express.Router();

/**
 * @route POST /api/organizations
 * @desc Create new organization
 * @access Private
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, description, industry, size, website } = req.body;
    
    const organization = new Organization({
      name,
      description,
      industry,
      size,
      website,
      owner: req.user._id,
      members: [{
        userId: req.user._id,
        role: 'owner',
        permissions: [],
      }],
    });
    
    await organization.save();
    
    res.status(201).json({
      success: true,
      message: 'Organization created successfully',
      organization,
    });
  } catch (error) {
    console.error('Error creating organization:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create organization',
    });
  }
});

/**
 * @route GET /api/organizations
 * @desc Get user's organizations
 * @access Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const organizations = await Organization.find({
      $or: [
        { owner: req.user._id },
        { 'members.userId': req.user._id }
      ],
      status: 'active'
    })
      .populate('owner', 'name email')
      .populate('members.userId', 'name email avatar')
      .populate('subscriptionId')
      .lean();
    
    res.json({
      success: true,
      organizations,
    });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch organizations',
    });
  }
});

/**
 * @route GET /api/organizations/:slug
 * @desc Get organization by slug
 * @access Private
 */
router.get('/:slug', authenticate, async (req, res) => {
  try {
    const organization = await Organization.findOne({ slug: req.params.slug })
      .populate('owner', 'name email')
      .populate('members.userId', 'name email avatar')
      .populate('subscriptionId');
    
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
    }
    
    // Check if user is a member
    const isMember = organization.members.some(
      m => m.userId._id.toString() === req.user._id.toString()
    );
    
    if (!isMember && organization.owner._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }
    
    res.json({
      success: true,
      organization,
    });
  } catch (error) {
    console.error('Error fetching organization:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch organization',
    });
  }
});

/**
 * @route PUT /api/organizations/:slug
 * @desc Update organization
 * @access Private (Admin/Owner)
 */
router.put('/:slug', authenticate, async (req, res) => {
  try {
    const organization = await Organization.findOne({ slug: req.params.slug });
    
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
    }
    
    // Check permissions
    if (!organization.hasPermission(req.user._id, 'manage_settings')) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
    }
    
    const { name, description, industry, size, website, settings } = req.body;
    
    if (name) organization.name = name;
    if (description) organization.description = description;
    if (industry) organization.industry = industry;
    if (size) organization.size = size;
    if (website) organization.website = website;
    if (settings) organization.settings = { ...organization.settings, ...settings };
    
    await organization.save();
    
    res.json({
      success: true,
      message: 'Organization updated successfully',
      organization,
    });
  } catch (error) {
    console.error('Error updating organization:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update organization',
    });
  }
});

/**
 * @route POST /api/organizations/:slug/members
 * @desc Add member to organization
 * @access Private (Admin/Owner)
 */
router.post('/:slug/members', authenticate, async (req, res) => {
  try {
    const organization = await Organization.findOne({ slug: req.params.slug });
    
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
    }
    
    // Check permissions
    if (!organization.hasPermission(req.user._id, 'manage_members')) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
    }
    
    const { userId, role, permissions } = req.body;
    
    await organization.addMember(userId, role, permissions);
    
    res.json({
      success: true,
      message: 'Member added successfully',
      organization,
    });
  } catch (error) {
    console.error('Error adding member:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to add member',
    });
  }
});

/**
 * @route DELETE /api/organizations/:slug/members/:userId
 * @desc Remove member from organization
 * @access Private (Admin/Owner)
 */
router.delete('/:slug/members/:userId', authenticate, async (req, res) => {
  try {
    const organization = await Organization.findOne({ slug: req.params.slug });
    
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
    }
    
    // Check permissions
    if (!organization.hasPermission(req.user._id, 'manage_members')) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
    }
    
    // Can't remove owner
    if (organization.owner.toString() === req.params.userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove organization owner',
      });
    }
    
    await organization.removeMember(req.params.userId);
    
    res.json({
      success: true,
      message: 'Member removed successfully',
      organization,
    });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove member',
    });
  }
});

/**
 * @route PUT /api/organizations/:slug/members/:userId
 * @desc Update member role/permissions
 * @access Private (Admin/Owner)
 */
router.put('/:slug/members/:userId', authenticate, async (req, res) => {
  try {
    const organization = await Organization.findOne({ slug: req.params.slug });
    
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
    }
    
    // Check permissions
    if (!organization.hasPermission(req.user._id, 'manage_members')) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
    }
    
    const { role, permissions } = req.body;
    
    await organization.updateMemberRole(req.params.userId, role, permissions);
    
    res.json({
      success: true,
      message: 'Member updated successfully',
      organization,
    });
  } catch (error) {
    console.error('Error updating member:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update member',
    });
  }
});

/**
 * @route DELETE /api/organizations/:slug
 * @desc Delete organization
 * @access Private (Owner only)
 */
router.delete('/:slug', authenticate, async (req, res) => {
  try {
    const organization = await Organization.findOne({ slug: req.params.slug });
    
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
    }
    
    // Only owner can delete
    if (organization.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only organization owner can delete',
      });
    }
    
    // Cancel subscription if exists
    if (organization.subscriptionId) {
      const subscription = await Subscription.findById(organization.subscriptionId);
      if (subscription && subscription.subscriptionId) {
        // Cancel Razorpay subscription
        // await razorpay.subscriptions.cancel(subscription.subscriptionId);
      }
    }
    
    organization.status = 'cancelled';
    await organization.save();
    
    res.json({
      success: true,
      message: 'Organization deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting organization:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete organization',
    });
  }
});

export default router;
