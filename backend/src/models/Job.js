/**
 * Job Model - Stores job listings with skill-based indexing
 * Used for matching candidates to relevant job opportunities
 */

import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema(
  {
    jobId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    
    // Core Job Information
    title: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    company: {
      name: {
        type: String,
        required: true,
        index: true,
      },
      logo: String,
      website: String,
      size: {
        type: String,
        enum: ['1-50', '51-200', '201-500', '501-1000', '1001-5000', '5000+'],
      },
    },
    
    // Location & Remote
    location: {
      city: String,
      state: String,
      country: {
        type: String,
        default: 'United States',
      },
      isRemote: {
        type: Boolean,
        default: false,
        index: true,
      },
    },
    
    // Multi-tenancy support
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      locationType: {
        type: String,
        enum: ['on-site', 'remote', 'hybrid'],
        default: 'on-site',
      },
    },
    
    // Job Details
    description: {
      type: String,
      required: true,
    },
    responsibilities: [String],
    requirements: [String],
    
    // Employment Details
    employmentType: {
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'internship', 'freelance'],
      default: 'full-time',
      index: true,
    },
    experienceLevel: {
      type: String,
      enum: ['entry', 'mid', 'senior', 'lead', 'executive'],
      index: true,
    },
    experienceYears: {
      min: Number,
      max: Number,
    },
    
    // Compensation
    salary: {
      min: Number,
      max: Number,
      currency: {
        type: String,
        default: 'USD',
      },
      period: {
        type: String,
        enum: ['hourly', 'annually'],
        default: 'annually',
      },
    },
    
    // Skills - CRITICAL FOR MATCHING
    skills: {
      required: [{
        type: String,
        lowercase: true,
        trim: true,
      }],
      preferred: [{
        type: String,
        lowercase: true,
        trim: true,
      }],
      // Combined array for easier querying
      allSkills: [{
        type: String,
        lowercase: true,
        trim: true,
      }],
    },
    
    // Embedding for semantic matching (Phase 3)
    embedding: {
      type: [Number],
      default: null,
      validate: {
        validator: function(v) {
          return v === null || v.length === 768 || v.length === 384;
        },
        message: 'Embedding must be 384 or 768 dimensions'
      }
    },
    embedding_metadata: {
      model: {
        type: String,
        default: 'text-embedding-004'
      },
      dimensions: Number,
      generated_at: Date,
      text_hash: String,
      is_mock: {
        type: Boolean,
        default: false
      },
      cached: Boolean,
      processing_time_ms: Number,
    },
    
    // Source & Metadata
    source: {
      platform: {
        type: String,
        enum: ['linkedin', 'indeed', 'glassdoor', 'direct', 'api', 'manual', 'seed', 'real'],
        required: true,
      },
      sourceUrl: String,
      sourceJobId: String,
    },
    
    // Application URL - Direct link to apply for job
    applicationUrl: {
      type: String,
      trim: true,
    },
    
    // Benefits
    benefits: String,
    
    // Real-time job specific fields
    tag: {
      type: String,
      enum: ['internship', 'full-time', 'part-time', 'contract', 'freelance', null],
      index: true,
    },
    applicationDeadline: Date,
    
    // Dates & Lifecycle
    postedDate: {
      type: Date,
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      // Removed index: true to avoid duplicate with TTL index below
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    
    // Status & Visibility
    status: {
      type: String,
      enum: ['active', 'expired', 'filled', 'closed', 'draft'],
      default: 'active',
      index: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    
    // Analytics & Tracking
    views: {
      type: Number,
      default: 0,
    },
    applications: {
      type: Number,
      default: 0,
    },
    
    // Benefits & Perks
    benefits: [String],
    
    // Apply Information
    applicationUrl: String,
    applicationEmail: String,
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// ===== INDEXES FOR PERFORMANCE =====

// Compound index for skill-based matching (MOST IMPORTANT)
jobSchema.index({ 'skills.allSkills': 1, status: 1, expiresAt: 1 });

// TTL Index - Auto-delete expired jobs after 7 days of expiration
jobSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 604800 }); // 7 days

// Compound indexes for common queries
jobSchema.index({ status: 1, postedDate: -1 }); // Active jobs sorted by recency
jobSchema.index({ 'location.isRemote': 1, status: 1 }); // Remote job filtering
jobSchema.index({ experienceLevel: 1, status: 1 }); // Filter by experience level
jobSchema.index({ employmentType: 1, status: 1 }); // Filter by employment type

// Text index for full-text search
jobSchema.index({
  title: 'text',
  description: 'text',
  'company.name': 'text',
});

// ===== MIDDLEWARE =====

// Before saving, populate allSkills array for easier querying
jobSchema.pre('save', function (next) {
  if (this.isModified('skills')) {
    this.skills.allSkills = [
      ...new Set([
        ...(this.skills.required || []),
        ...(this.skills.preferred || [])
      ])
    ].map(skill => skill.toLowerCase().trim());
  }
  next();
});

// Auto-update lastUpdated
jobSchema.pre('save', function (next) {
  if (this.isModified() && !this.isNew) {
    this.lastUpdated = new Date();
  }
  next();
});

// ===== INSTANCE METHODS =====

// Calculate match percentage with a resume's skills
jobSchema.methods.calculateMatchScore = function (userSkills) {
  if (!userSkills || userSkills.length === 0) return 0;
  
  const normalizedUserSkills = userSkills.map(s => s.toLowerCase().trim());
  const requiredSkills = this.skills.required || [];
  const preferredSkills = this.skills.preferred || [];
  
  // Helper function for flexible skill matching
  const hasSkill = (jobSkill, candidateSkills) => {
    const jobLower = jobSkill.toLowerCase().trim();
    return candidateSkills.some(candidateSkill => {
      const candLower = candidateSkill.toLowerCase().trim();
      // Exact match or partial match
      if (candLower === jobLower || candLower.includes(jobLower) || jobLower.includes(candLower)) {
        return true;
      }
      // Common variations
      if ((jobLower === 'javascript' && candLower === 'js') || (jobLower === 'js' && candLower === 'javascript')) return true;
      if ((jobLower === 'typescript' && candLower === 'ts') || (jobLower === 'ts' && candLower === 'typescript')) return true;
      if ((jobLower === 'postgresql' && candLower === 'postgres') || (jobLower === 'postgres' && candLower === 'postgresql')) return true;
      if ((jobLower === 'reactjs' && candLower === 'react') || (jobLower === 'react' && candLower === 'reactjs')) return true;
      if ((jobLower === 'nodejs' && (candLower === 'node.js' || candLower === 'node')) || 
          ((candLower === 'nodejs' || candLower === 'node.js') && jobLower === 'node')) return true;
      return false;
    });
  };
  
  // Weight required skills more heavily (70%) vs preferred (30%)
  const requiredMatches = requiredSkills.filter(skill => 
    hasSkill(skill, normalizedUserSkills)
  ).length;
  
  const preferredMatches = preferredSkills.filter(skill => 
    hasSkill(skill, normalizedUserSkills)
  ).length;
  
  const requiredScore = requiredSkills.length > 0 
    ? (requiredMatches / requiredSkills.length) * 70 
    : 70; // Full points if no required skills
  
  const preferredScore = preferredSkills.length > 0 
    ? (preferredMatches / preferredSkills.length) * 30 
    : 30; // Full points if no preferred skills
  
  return Math.round(requiredScore + preferredScore);
};

// Get matched and missing skills
jobSchema.methods.getSkillBreakdown = function (userSkills) {
  const normalizedUserSkills = userSkills.map(s => s.toLowerCase().trim());
  
  // Helper function for flexible skill matching
  const hasSkill = (jobSkill, candidateSkills) => {
    const jobLower = jobSkill.toLowerCase().trim();
    return candidateSkills.some(candidateSkill => {
      const candLower = candidateSkill;
      // Exact match or partial match
      if (candLower === jobLower || candLower.includes(jobLower) || jobLower.includes(candLower)) {
        return true;
      }
      // Common variations
      if ((jobLower === 'javascript' && candLower === 'js') || (jobLower === 'js' && candLower === 'javascript')) return true;
      if ((jobLower === 'typescript' && candLower === 'ts') || (jobLower === 'ts' && candLower === 'typescript')) return true;
      if ((jobLower === 'postgresql' && candLower === 'postgres') || (jobLower === 'postgres' && candLower === 'postgresql')) return true;
      if ((jobLower === 'reactjs' && candLower === 'react') || (jobLower === 'react' && candLower === 'reactjs')) return true;
      if ((jobLower === 'nodejs' && (candLower === 'node.js' || candLower === 'node')) || 
          ((candLower === 'nodejs' || candLower === 'node.js') && jobLower === 'node')) return true;
      return false;
    });
  };
  
  const matched = this.skills.allSkills.filter(skill => 
    hasSkill(skill, normalizedUserSkills)
  );
  
  const missing = this.skills.allSkills.filter(skill => 
    !hasSkill(skill, normalizedUserSkills)
  );
  
  return { matched, missing };
};

// Increment view count
jobSchema.methods.incrementViews = function () {
  this.views += 1;
  return this.save();
};

// Increment application count
jobSchema.methods.incrementApplications = function () {
  this.applications += 1;
  return this.save();
};

// ===== STATIC METHODS =====

// Find jobs matching user skills (sorted by match score)
jobSchema.statics.findMatchingJobs = async function (userSkills, options = {}) {
  const {
    limit = 20,
    minMatchScore = 50,
    experienceLevel = null,
    isRemote = null,
    employmentType = null,
    sourcePlatforms = null,
  } = options;
  
  // Normalize user skills with variations
  const normalizedUserSkills = userSkills.map(s => s.toLowerCase().trim());
  const skillVariations = new Set(normalizedUserSkills);
  
  // Add common variations
  normalizedUserSkills.forEach(skill => {
    if (skill === 'javascript' || skill === 'js') {
      skillVariations.add('javascript');
      skillVariations.add('js');
    } else if (skill === 'typescript' || skill === 'ts') {
      skillVariations.add('typescript');
      skillVariations.add('ts');
    } else if (skill === 'postgresql' || skill === 'postgres') {
      skillVariations.add('postgresql');
      skillVariations.add('postgres');
    } else if (skill === 'reactjs' || skill === 'react') {
      skillVariations.add('reactjs');
      skillVariations.add('react');
    } else if (skill === 'nodejs' || skill === 'node.js' || skill === 'node') {
      skillVariations.add('nodejs');
      skillVariations.add('node.js');
      skillVariations.add('node');
    }
  });
  
  // Build query with more flexible matching
  const query = {
    status: 'active',
    expiresAt: { $gt: new Date() },
    $or: [
      { 'skills.allSkills': { $in: Array.from(skillVariations) } },
      // Also match if ANY required/preferred skills overlap
      { 'skills.required': { $in: Array.from(skillVariations) } },
      { 'skills.preferred': { $in: Array.from(skillVariations) } }
    ]
  };
  
  if (experienceLevel) query.experienceLevel = experienceLevel;
  if (isRemote !== null) query['location.isRemote'] = isRemote;
  if (employmentType) query.employmentType = employmentType;
  if (Array.isArray(sourcePlatforms) && sourcePlatforms.length > 0) {
    query['source.platform'] = { $in: sourcePlatforms };
  }
  
  const activeJobs = await this.find(query)
    .sort({ postedDate: -1 })
    .limit(limit * 2) // Get more than needed to filter by score
    .lean();
  
  // Calculate match scores and enrich data
  const jobsWithScores = activeJobs.map(job => {
    const matchScore = this.prototype.calculateMatchScore.call(
      { skills: job.skills },
      userSkills
    );
    const skillBreakdown = this.prototype.getSkillBreakdown.call(
      { skills: job.skills },
      userSkills
    );
    
    return {
      ...job,
      matchScore,
      matchedSkills: skillBreakdown.matched,
      missingSkills: skillBreakdown.missing,
    };
  });
  
  // Filter and sort
  return jobsWithScores
    .filter(job => job.matchScore >= minMatchScore)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
};

// Clean up expired jobs (for manual cleanup if TTL isn't enough)
jobSchema.statics.cleanupExpiredJobs = async function () {
  const result = await this.deleteMany({
    status: 'expired',
    expiresAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // 30 days old
  });
  return result.deletedCount;
};

// Get trending jobs (most viewed)
jobSchema.statics.getTrendingJobs = async function (limit = 10) {
  return this.find({ status: 'active', expiresAt: { $gt: new Date() } })
    .sort({ views: -1, postedDate: -1 })
    .limit(limit)
    .lean();
};

const Job = mongoose.model('Job', jobSchema);

export default Job;
