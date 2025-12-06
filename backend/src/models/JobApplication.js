/**
 * Job Application Model
 * Tracks job applications and candidate pipeline
 */

import mongoose from 'mongoose';

const jobApplicationSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  resumeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resume',
    required: true,
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    index: true,
  },
  
  // Application status pipeline
  status: {
    type: String,
    enum: [
      'applied',
      'screening',
      'shortlisted',
      'interview_scheduled',
      'interview_completed',
      'offer_extended',
      'offer_accepted',
      'offer_declined',
      'rejected',
      'withdrawn',
    ],
    default: 'applied',
    required: true,
  },
  
  // Match score and analysis
  matchScore: {
    type: Number,
    min: 0,
    max: 100,
  },
  aiAnalysis: {
    strengths: [String],
    concerns: [String],
    recommendations: [String],
    skillMatch: {
      matched: [String],
      missing: [String],
      percentage: Number,
    },
  },
  
  // Cover letter and application details
  coverLetter: String,
  portfolio: String,
  expectedSalary: {
    min: Number,
    max: Number,
    currency: { type: String, default: 'INR' },
  },
  noticePeriod: Number, // in days
  availableFrom: Date,
  
  // Interview details
  interviews: [{
    type: {
      type: String,
      enum: ['phone', 'video', 'onsite', 'technical', 'hr'],
    },
    scheduledAt: Date,
    duration: Number, // minutes
    interviewers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    location: String,
    meetingLink: String,
    notes: String,
    feedback: String,
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'no_show'],
      default: 'scheduled',
    },
    completedAt: Date,
  }],
  
  // Recruiter notes and tags
  recruiterNotes: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    note: String,
    createdAt: {
      type: Date,
      default: Date.now,
    },
  }],
  tags: [String],
  
  // Communication history
  communications: [{
    type: {
      type: String,
      enum: ['email', 'phone', 'message', 'meeting'],
    },
    subject: String,
    content: String,
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
  }],

  // Detailed status history
  statusHistory: [{
    status: String,
    label: String,
    note: String,
    meta: mongoose.Schema.Types.Mixed,
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    source: {
      type: String,
      enum: ['candidate', 'recruiter', 'system'],
      default: 'system',
    },
  }],
  
  // Offer details
  offer: {
    salary: Number,
    currency: { type: String, default: 'INR' },
    benefits: [String],
    joiningDate: Date,
    offeredAt: Date,
    validUntil: Date,
    declineReason: String,
    acceptedAt: Date,
    declinedAt: Date,
    responseNotes: String,
  },
  
  // Rejection details
  rejection: {
    reason: String,
    feedback: String,
    rejectedAt: Date,
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  
  // Source tracking
  source: {
    type: String,
    enum: ['direct', 'referral', 'linkedin', 'jobboard', 'agency', 'other'],
    default: 'direct',
  },
  referralBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  
  // Metadata
  metadata: {
    type: Map,
    of: String,
  },
}, {
  timestamps: true,
});

// Compound indexes
jobApplicationSchema.index({ jobId: 1, userId: 1 }, { unique: true });
jobApplicationSchema.index({ organizationId: 1, status: 1 });
jobApplicationSchema.index({ createdAt: -1 });

// Methods
jobApplicationSchema.methods.recordStatusEvent = function({ status, label, note, meta, userId, source = 'system' } = {}) {
  if (!status) {
    return;
  }

  this.statusHistory = this.statusHistory || [];
  this.statusHistory.push({
    status,
    label: label || status.replace(/_/g, ' '),
    note,
    meta,
    updatedAt: new Date(),
    updatedBy: userId || undefined,
    source,
  });
};

jobApplicationSchema.methods.updateStatus = async function(newStatus, userId, notes, options = {}) {
  this.status = newStatus;

  if (notes) {
    this.recruiterNotes.push({
      userId,
      note: `Status changed to ${newStatus}: ${notes}`,
    });
  }

  this.recordStatusEvent({
    status: newStatus,
    label: options.label,
    note: notes,
    meta: options.meta,
    userId,
    source: options.source || 'system',
  });
  
  await this.save();
  return this;
};

jobApplicationSchema.methods.scheduleInterview = async function(interviewDetails, userId) {
  this.interviews.push(interviewDetails);
  this.status = 'interview_scheduled';

  const interview = this.interviews[this.interviews.length - 1];
  this.recordStatusEvent({
    status: 'interview_scheduled',
    label: `Interview scheduled${interviewDetails.type ? ` (${interviewDetails.type})` : ''}`,
    note: interviewDetails.notes,
    meta: {
      interviewId: interview?._id,
      scheduledAt: interviewDetails.scheduledAt,
      type: interviewDetails.type,
    },
    userId,
    source: 'recruiter',
  });

  await this.save();
  return this;
};

jobApplicationSchema.methods.extendOffer = async function(offerDetails, userId) {
  this.offer = {
    ...offerDetails,
    offeredAt: new Date(),
  };
  this.status = 'offer_extended';

  this.recordStatusEvent({
    status: 'offer_extended',
    label: 'Offer extended',
    note: offerDetails.notes,
    meta: {
      salary: offerDetails.salary,
      joiningDate: offerDetails.joiningDate,
      validUntil: offerDetails.validUntil,
    },
    userId,
    source: 'recruiter',
  });

  await this.save();
  return this;
};

jobApplicationSchema.pre('save', function(next) {
  if (this.isNew && (!this.statusHistory || this.statusHistory.length === 0)) {
    this.statusHistory = [{
      status: this.status || 'applied',
      label: 'Application submitted',
      updatedAt: this.createdAt || new Date(),
      updatedBy: this.userId,
      source: 'candidate',
    }];
  }
  next();
});

// Static methods
jobApplicationSchema.statics.getApplicationStats = async function(organizationId, filters = {}) {
  const pipeline = [
    { $match: { organizationId, ...filters } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgMatchScore: { $avg: '$matchScore' },
      },
    },
  ];
  
  const stats = await this.aggregate(pipeline);
  
  const statusMap = {
    applied: 0,
    screening: 0,
    shortlisted: 0,
    interview_scheduled: 0,
    interview_completed: 0,
    offer_extended: 0,
    offer_accepted: 0,
    offer_declined: 0,
    rejected: 0,
    withdrawn: 0,
  };
  
  stats.forEach(stat => {
    statusMap[stat._id] = stat.count;
  });
  
  return statusMap;
};

const JobApplication = mongoose.model('JobApplication', jobApplicationSchema);

export default JobApplication;
