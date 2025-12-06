/**
 * Notification Model - User notifications for job matches, interviews, etc.
 * Enables real-time alerts and notification center
 */

import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema(
  {
    notificationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    
    // Notification Type
    type: {
      type: String,
      enum: [
        'quiz_completed',
        'interview_completed',
        'interview_scheduled',
        'application_status',
        'offer_received',
        'skill_verified',
        'job_match',
        'job_applied',
        'profile_incomplete',
        'resume_parsed',
        'resume_processed',
        'badge_earned',
        'reminder',
        'system',
        'system_alert',
      ],
      required: true,
      index: true,
    },
    
    // Notification Content
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      maxlength: 500,
    },
    
    // Action Link
    actionUrl: {
      type: String,
      default: null,
    },
    actionText: {
      type: String,
      default: 'View Details',
    },
    
    // Status
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: Date,
    
    // Priority
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    
    // Related Data
    metadata: {
      resumeId: String,
      jobId: String,
      matchScore: Number,
      badgeLevel: String,
      skillsVerified: [String],
      customData: mongoose.Schema.Types.Mixed,
    },
    
    // Expiry
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

// ===== INDEXES =====

// Compound index for fetching user's unread notifications
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 })

// Compound index for notification type
notificationSchema.index({ userId: 1, type: 1, createdAt: -1 })

// TTL Index - Auto-delete expired notifications (remove duplicate index definition)
if (!notificationSchema.path('expiresAt').options.index) {
  notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
}

// ===== INSTANCE METHODS =====

// Mark as read
notificationSchema.methods.markAsRead = function () {
  if (!this.read) {
    this.read = true
    this.readAt = new Date()
    return this.save()
  }
  return Promise.resolve(this)
}

// ===== STATIC METHODS =====

// Get unread count for user
notificationSchema.statics.getUnreadCount = async function (userId) {
  return this.countDocuments({ userId, read: false })
}

// Get user notifications with pagination
notificationSchema.statics.getUserNotifications = async function (userId, options = {}) {
  const {
    limit = 20,
    skip = 0,
    type = null,
    unreadOnly = false,
  } = options

  const query = { userId }
  if (type) query.type = type
  if (unreadOnly) query.read = false

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .lean()
}

// Mark all as read for user
notificationSchema.statics.markAllAsRead = async function (userId) {
  return this.updateMany(
    { userId, read: false },
    { $set: { read: true, readAt: new Date() } }
  )
}

// Create notification helper
notificationSchema.statics.createNotification = async function (data) {
  const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  return this.create({
    notificationId,
    ...data,
  })
}

// Bulk create notifications
notificationSchema.statics.createBulk = async function (notifications) {
  const notificationsWithIds = notifications.map(n => ({
    notificationId: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ...n,
  }))
  
  return this.insertMany(notificationsWithIds)
}

// Delete old notifications
notificationSchema.statics.cleanupOld = async function (daysOld = 30) {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000)
  return this.deleteMany({ createdAt: { $lt: cutoffDate }, read: true })
}

const Notification = mongoose.model('Notification', notificationSchema)

export default Notification
