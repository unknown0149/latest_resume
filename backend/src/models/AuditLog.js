import mongoose from 'mongoose';

/**
 * AuditLog Model
 * Tracks sensitive operations and user actions for compliance and security
 * Essential for GDPR, data privacy, and security auditing
 */

const auditLogSchema = new mongoose.Schema({
  // Who performed the action
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  userEmail: {
    type: String,
    required: true
  },
  
  userRole: {
    type: String,
    enum: ['candidate', 'recruiter', 'admin', 'super_admin'],
    required: true
  },

  // Organization context (for multi-tenancy)
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },

  // What action was performed
  action: {
    type: String,
    required: true,
    enum: [
      // Authentication
      'USER_LOGIN',
      'USER_LOGOUT',
      'USER_REGISTER',
      'PASSWORD_CHANGE',
      'PASSWORD_RESET',
      
      // Data Access
      'CANDIDATE_SEARCH',
      'CANDIDATE_VIEW',
      'CANDIDATE_EXPORT',
      'RESUME_DOWNLOAD',
      'BULK_EXPORT',
      
      // Application Management
      'APPLICATION_CREATE',
      'APPLICATION_UPDATE',
      'APPLICATION_DELETE',
      'BULK_STATUS_UPDATE',
      'BULK_REJECT',
      
      // Interview Management
      'INTERVIEW_SCHEDULE',
      'INTERVIEW_UPDATE',
      'INTERVIEW_CANCEL',
      
      // Offer Management
      'OFFER_CREATE',
      'OFFER_UPDATE',
      'OFFER_WITHDRAW',
      
      // Job Management
      'JOB_CREATE',
      'JOB_UPDATE',
      'JOB_DELETE',
      'JOB_PUBLISH',
      'JOB_UNPUBLISH',
      
      // User Management
      'USER_CREATE',
      'USER_UPDATE',
      'USER_DELETE',
      'USER_DEACTIVATE',
      'ROLE_CHANGE',
      
      // System
      'SETTINGS_UPDATE',
      'API_KEY_GENERATE',
      'PERMISSION_CHANGE'
    ],
    index: true
  },

  // Target resource
  resourceType: {
    type: String,
    enum: ['User', 'Resume', 'Job', 'Application', 'Interview', 'Offer', 'Organization', 'Settings', 'System']
  },

  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },

  // Search/query parameters (for search audits)
  searchParams: {
    type: mongoose.Schema.Types.Mixed, // Flexible object for different search types
    default: null
  },

  // Results metadata
  resultsCount: {
    type: Number,
    default: 0
  },

  // Changed data (before/after for updates)
  changes: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed
  },

  // Request metadata
  ipAddress: {
    type: String,
    required: true
  },

  userAgent: {
    type: String,
    default: ''
  },

  requestMethod: {
    type: String,
    enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    default: 'GET'
  },

  requestUrl: {
    type: String,
    default: ''
  },

  // Status and error tracking
  status: {
    type: String,
    enum: ['success', 'failure', 'partial'],
    default: 'success'
  },

  errorMessage: {
    type: String,
    default: null
  },

  // Additional context
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // Timestamp
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false, // We use custom timestamp field
  collection: 'auditlogs'
});

// Compound indexes for common queries
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ organizationId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1, timestamp: -1 });
auditLogSchema.index({ ipAddress: 1, timestamp: -1 });

// TTL index - automatically delete logs older than 2 years (compliance requirement)
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 63072000 }); // 2 years

// Static methods

/**
 * Log an audit event
 */
auditLogSchema.statics.log = async function({
  userId,
  userEmail,
  userRole,
  organizationId = null,
  action,
  resourceType = null,
  resourceId = null,
  searchParams = null,
  resultsCount = 0,
  changes = null,
  ipAddress,
  userAgent = '',
  requestMethod = 'GET',
  requestUrl = '',
  status = 'success',
  errorMessage = null,
  metadata = {}
}) {
  try {
    const log = new this({
      userId,
      userEmail,
      userRole,
      organizationId,
      action,
      resourceType,
      resourceId,
      searchParams,
      resultsCount,
      changes,
      ipAddress,
      userAgent,
      requestMethod,
      requestUrl,
      status,
      errorMessage,
      metadata,
      timestamp: new Date()
    });

    await log.save();
    return log;
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - audit logging should never break the main flow
    return null;
  }
};

/**
 * Get audit logs for a user
 */
auditLogSchema.statics.getUserLogs = async function(userId, options = {}) {
  const {
    limit = 50,
    skip = 0,
    startDate = null,
    endDate = null,
    actions = null
  } = options;

  const query = { userId };
  
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }

  if (actions && actions.length > 0) {
    query.action = { $in: actions };
  }

  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip)
    .lean();
};

/**
 * Get audit logs for an organization
 */
auditLogSchema.statics.getOrganizationLogs = async function(organizationId, options = {}) {
  const {
    limit = 100,
    skip = 0,
    startDate = null,
    endDate = null,
    actions = null,
    userIds = null
  } = options;

  const query = { organizationId };
  
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }

  if (actions && actions.length > 0) {
    query.action = { $in: actions };
  }

  if (userIds && userIds.length > 0) {
    query.userId = { $in: userIds };
  }

  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip)
    .populate('userId', 'name email')
    .lean();
};

/**
 * Get sensitive action logs (data exports, bulk operations)
 */
auditLogSchema.statics.getSensitiveActions = async function(options = {}) {
  const sensitiveActions = [
    'CANDIDATE_EXPORT',
    'RESUME_DOWNLOAD',
    'BULK_EXPORT',
    'BULK_STATUS_UPDATE',
    'BULK_REJECT',
    'USER_DELETE',
    'ROLE_CHANGE',
    'PERMISSION_CHANGE'
  ];

  return this.find({
    action: { $in: sensitiveActions },
    ...options
  })
  .sort({ timestamp: -1 })
  .populate('userId', 'name email role')
  .lean();
};

/**
 * Get failed actions for security monitoring
 */
auditLogSchema.statics.getFailedActions = async function(hours = 24) {
  const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  return this.find({
    status: 'failure',
    timestamp: { $gte: startDate }
  })
  .sort({ timestamp: -1 })
  .lean();
};

/**
 * Get activity summary for a user
 */
auditLogSchema.statics.getUserActivitySummary = async function(userId, days = 30) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  return this.aggregate([
    {
      $match: {
        userId: mongoose.Types.ObjectId(userId),
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 },
        lastOccurrence: { $max: '$timestamp' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

/**
 * Detect suspicious activity patterns
 */
auditLogSchema.statics.detectSuspiciousActivity = async function(userId, hours = 24) {
  const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  // Check for multiple failed logins
  const failedLogins = await this.countDocuments({
    userId,
    action: 'USER_LOGIN',
    status: 'failure',
    timestamp: { $gte: startDate }
  });

  // Check for unusual data export volumes
  const dataExports = await this.countDocuments({
    userId,
    action: { $in: ['CANDIDATE_EXPORT', 'RESUME_DOWNLOAD', 'BULK_EXPORT'] },
    timestamp: { $gte: startDate }
  });

  // Check for access from multiple IPs
  const uniqueIPs = await this.distinct('ipAddress', {
    userId,
    timestamp: { $gte: startDate }
  });

  return {
    failedLogins,
    dataExports,
    uniqueIPsCount: uniqueIPs.length,
    uniqueIPs,
    suspicious: failedLogins > 5 || dataExports > 100 || uniqueIPs.length > 10
  };
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
