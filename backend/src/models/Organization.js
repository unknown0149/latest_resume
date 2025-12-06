/**
 * Organization Model
 * Multi-tenancy support for teams and enterprises
 */

import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  industry: {
    type: String,
    enum: ['technology', 'finance', 'healthcare', 'education', 'retail', 'manufacturing', 'other'],
  },
  size: {
    type: String,
    enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'],
  },
  website: String,
  logo: String,
  
  // Multi-tenancy settings
  settings: {
    whiteLabel: {
      enabled: { type: Boolean, default: false },
      primaryColor: { type: String, default: '#6366f1' },
      secondaryColor: { type: String, default: '#4f46e5' },
      logoUrl: String,
      faviconUrl: String,
    },
    features: {
      enableRecruiterPortal: { type: Boolean, default: false },
      enableTeamCollaboration: { type: Boolean, default: false },
      enableCustomIntegrations: { type: Boolean, default: false },
      enableSSO: { type: Boolean, default: false },
      enableAdvancedAnalytics: { type: Boolean, default: false },
    },
    security: {
      enforceSSO: { type: Boolean, default: false },
      requireMFA: { type: Boolean, default: false },
      passwordPolicy: {
        minLength: { type: Number, default: 8 },
        requireUppercase: { type: Boolean, default: true },
        requireLowercase: { type: Boolean, default: true },
        requireNumbers: { type: Boolean, default: true },
        requireSpecialChars: { type: Boolean, default: false },
      },
      ipWhitelist: [String],
      sessionTimeout: { type: Number, default: 3600 }, // seconds
    },
    billing: {
      paymentMethod: String,
      billingEmail: String,
      billingAddress: {
        street: String,
        city: String,
        state: String,
        country: String,
        postalCode: String,
      },
      taxId: String,
    },
  },
  
  // Ownership
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  
  // Members
  members: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'recruiter', 'member'],
      default: 'member',
    },
    permissions: [{
      type: String,
      enum: [
        'manage_members',
        'manage_billing',
        'manage_settings',
        'post_jobs',
        'view_candidates',
        'schedule_interviews',
        'manage_integrations',
        'view_analytics',
        'export_data',
      ],
    }],
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  
  // Subscription
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'suspended', 'cancelled'],
    default: 'active',
  },
  
  // Metadata
  metadata: {
    type: Map,
    of: String,
  },
}, {
  timestamps: true,
});

// Indexes
organizationSchema.index({ slug: 1 });
organizationSchema.index({ owner: 1 });
organizationSchema.index({ 'members.userId': 1 });

// Pre-save hook to generate slug
organizationSchema.pre('save', async function(next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    // Ensure unique slug
    let suffix = 1;
    let potentialSlug = this.slug;
    
    while (await this.constructor.findOne({ slug: potentialSlug, _id: { $ne: this._id } })) {
      potentialSlug = `${this.slug}-${suffix}`;
      suffix++;
    }
    
    this.slug = potentialSlug;
  }
  next();
});

// Add member to organization
organizationSchema.methods.addMember = async function(userId, role = 'member', permissions = []) {
  const existingMember = this.members.find(m => m.userId.toString() === userId.toString());
  
  if (existingMember) {
    throw new Error('User is already a member of this organization');
  }
  
  this.members.push({
    userId,
    role,
    permissions,
  });
  
  await this.save();
  return this;
};

// Remove member from organization
organizationSchema.methods.removeMember = async function(userId) {
  this.members = this.members.filter(m => m.userId.toString() !== userId.toString());
  await this.save();
  return this;
};

// Update member role
organizationSchema.methods.updateMemberRole = async function(userId, newRole, newPermissions) {
  const member = this.members.find(m => m.userId.toString() === userId.toString());
  
  if (!member) {
    throw new Error('User is not a member of this organization');
  }
  
  member.role = newRole;
  if (newPermissions) {
    member.permissions = newPermissions;
  }
  
  await this.save();
  return this;
};

// Check if user has permission
organizationSchema.methods.hasPermission = function(userId, permission) {
  const member = this.members.find(m => m.userId.toString() === userId.toString());
  
  if (!member) {
    return false;
  }
  
  // Owners and admins have all permissions
  if (member.role === 'owner' || member.role === 'admin') {
    return true;
  }
  
  return member.permissions.includes(permission);
};

// Get member role
organizationSchema.methods.getMemberRole = function(userId) {
  const member = this.members.find(m => m.userId.toString() === userId.toString());
  return member ? member.role : null;
};

// Static method to get user's organizations
organizationSchema.statics.getUserOrganizations = async function(userId) {
  return this.find({
    $or: [
      { owner: userId },
      { 'members.userId': userId },
    ],
    status: 'active',
  });
};

const Organization = mongoose.model('Organization', organizationSchema);

export default Organization;
