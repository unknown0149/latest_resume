/**
 * Saved Job Model
 * Allows users to bookmark and save job postings
 */

import mongoose from 'mongoose';

const savedJobSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
    index: true,
  },
  
  // Organization for saved jobs (renamed from 'collection' to avoid reserved keyword)
  collectionName: {
    type: String,
    default: 'default',
    index: true,
  },
  
  // User notes
  notes: String,
  
  // Tags for organization
  tags: [String],
  
  // Reminder settings
  reminder: {
    enabled: { type: Boolean, default: false },
    date: Date,
    notified: { type: Boolean, default: false },
  },
  
  // Application tracking
  applied: {
    type: Boolean,
    default: false,
  },
  appliedAt: Date,
  applicationStatus: {
    type: String,
    enum: ['not_applied', 'applied', 'interviewing', 'offered', 'rejected', 'withdrawn'],
    default: 'not_applied',
  },
}, {
  timestamps: true,
});

// Compound unique index to prevent duplicate saves
savedJobSchema.index({ userId: 1, jobId: 1 }, { unique: true });

// Indexes for filtering
savedJobSchema.index({ userId: 1, collectionName: 1 });
savedJobSchema.index({ userId: 1, tags: 1 });

// Methods
savedJobSchema.methods.markAsApplied = async function() {
  this.applied = true;
  this.appliedAt = new Date();
  this.applicationStatus = 'applied';
  await this.save();
  return this;
};

savedJobSchema.methods.updateApplicationStatus = async function(status) {
  this.applicationStatus = status;
  await this.save();
  return this;
};

// Static methods
savedJobSchema.statics.getUserCollections = async function(userId) {
  const collections = await this.distinct('collection', { userId });
  return collections;
};

savedJobSchema.statics.getJobsByCollection = async function(userId, collection) {
  return this.find({ userId, collection })
    .populate('jobId')
    .sort({ createdAt: -1 });
};

const SavedJob = mongoose.model('SavedJob', savedJobSchema);

export default SavedJob;
