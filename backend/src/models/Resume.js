import mongoose from 'mongoose'

const resumeSchema = new mongoose.Schema(
  {
    resumeId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false, // Optional for Phase 1, will be required when auth is implemented
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    // Version control for resume history
    version: {
      type: Number,
      default: 1,
    },
    previousVersions: [{
      versionNumber: Number,
      uploadedAt: Date,
      filePath: String,
      parsed_resume: mongoose.Schema.Types.Mixed,
      file_metadata: {
        filename: String,
        originalName: String,
        mimeType: String,
        sizeBytes: Number,
      }
    }],
    // Privacy settings - controls recruiter visibility
    privacy: {
      visibleToRecruiters: {
        type: Boolean,
        default: false, // Opt-in only - users must explicitly enable
        index: true,
      },
      openToWork: {
        type: Boolean,
        default: false,
      },
      lastUpdated: {
        type: Date,
        default: Date.now,
      },
    },
    raw_text: {
      type: String,
      required: true,
    },
    file_metadata: {
      filename: {
        type: String,
        required: true,
      },
      originalName: {
        type: String,
        required: true,
      },
      mimeType: {
        type: String,
        required: true,
      },
      sizeBytes: {
        type: Number,
        required: true,
      },
      pages: {
        type: Number,
        default: 1,
      },
      extractedChars: {
        type: Number,
        required: true,
      },
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    },
    extraction_status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'processing'],
      default: 'pending',
    },
    ocr_needed: {
      type: Boolean,
      default: false,
    },
    extraction_confidence: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    errorMessage: {
      type: String,
      default: null,
    },
    filePath: {
      type: String,
      required: true,
    },
    
    // ===== PHASE 2 FIELDS =====
    
    // Extracted structured data from resume
    extracted_text: {
      full_text: String,
      skills: [String],
      experience: [{
        company: String,
        title: String,
        duration: String,
        description: String,
      }],
      education: [{
        institution: String,
        degree: String,
        field: String,
        year: String,
      }],
      contact: {
        email: String,
        phone: String,
        linkedin: String,
        github: String,
        location: String,
      },
    },
    
    // Parsed and normalized data (NEW - Phase 2 Parsing)
    parsed_resume: {
      name: String,
      emails: [String],
      phones: [String],
      location: String,
      current_title: String,
      years_experience: {
        type: Number,
        default: 0,
      },
      skills: [{
        type: String,
        lowercase: true,
      }],
      // Verification status for skill interviews
      verification_status: {
        isVerified: { type: Boolean, default: false },
        verifiedAt: Date,
        credibilityScore: { type: Number, default: 0, min: 0, max: 100 },
        badge: {
          level: { type: String, enum: ['gold', 'silver', 'bronze', 'none'], default: 'none' },
          label: String,
          color: String,
          icon: String
        },
        verifiedSkills: [{
          skill: String,
          score: Number,
          status: String
        }],
        questionableSkills: [{
          skill: String,
          score: Number,
          status: String
        }],
        interviewScore: { type: Number, default: 0 },
        totalInterviews: { type: Number, default: 0 },
        lastInterviewAt: Date,
        trustLevel: String
      },
      education: [{
        degree: String,
        institution: String,
        field: String,
        start_date: String, // YYYY-MM format
        end_date: String,   // YYYY-MM format or null for present
        gpa: String,
      }],
      experience: [{
        company: String,
        title: String,
        start_date: String, // YYYY-MM format
        end_date: String,   // YYYY-MM format or null for present
        location: String,
        bullets: [String],
      }],
      projects: [{
        name: String,
        description: String,
        technologies: [String],
        url: String,
        start_date: String,
        end_date: String,
      }],
      certifications: [String],
      languages: [String],
      links: [String], // URLs (GitHub, LinkedIn, portfolio, etc.)
      soft_skills: [{
        skill: String,
        confidence: Number, // 0-1
        evidence: [String], // Text snippets showing this skill
      }],
      profile_photo: String, // Base64 or file path to extracted photo
    },
    
    // User customizable profile data
    profile: {
      photoUrl: String, // URL to uploaded profile photo
      customName: String, // User can override extracted name
      headline: String, // Professional headline/tagline
      summary: String, // Professional summary
      quote: String, // Personal quote/motto
      customSkills: [{
        name: String,
        level: { type: Number, min: 0, max: 100 }, // 0-100 strength
        category: String, // e.g., "Technical", "Soft Skills", "Languages"
        verified: { type: Boolean, default: false },
        score: { type: Number, min: 0, max: 100 },
        lastVerifiedAt: Date,
        badge: {
          level: { type: String, enum: ['gold', 'silver', 'bronze', 'none'], default: 'none' },
          label: String,
          awardedAt: Date
        }
      }],
      strengths: [{
        name: String,
        value: { type: Number, min: 0, max: 100 }, // For radar/bar charts
      }],
      customSummary: String, // User's own summary if they want to override AI
      socialLinks: {
        linkedin: String,
        github: String,
        portfolio: String,
        twitter: String,
        other: [String],
      },
      skillVerifications: [{
        skill: String,
        score: { type: Number, min: 0, max: 100 },
        correct: Number,
        total: Number,
        verified: { type: Boolean, default: false },
        lastVerifiedAt: Date,
        badge: {
          level: { type: String, enum: ['gold', 'silver', 'bronze', 'none'], default: 'none' },
          label: String,
          awardedAt: Date
        }
      }],
    },
    
    // Extraction metadata (NEW - Phase 2 Parsing)
    extraction_metadata: {
      version: {
        type: String,
        default: '2.0',
      },
      parsed_at: Date,
      overall_confidence: {
        type: Number,
        min: 0,
        max: 1,
      },
      field_confidences: {
        type: Map,
        of: Number,
      },
      extraction_methods: {
        type: Map,
        of: String, // 'regex', 'llm', 'regex+llm', 'calculated', etc.
      },
      processing_time_ms: Number,
      llm_used: {
        type: Boolean,
        default: false,
      },
      requires_manual_review: {
        type: Boolean,
        default: false,
      },
      flagged_fields: [{
        field: String,
        severity: {
          type: String,
          enum: ['low', 'medium', 'high'],
        },
        message: String,
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
    
    // Old parsed_data (keeping for backward compatibility)
    parsed_data: {
      skills: [{
        type: String,
        lowercase: true,
      }],
      experience: Number, // Total years of experience
      currentSalary: Number,
      expectedSalary: Number,
      preferredLocations: [String],
      isOpenToRemote: {
        type: Boolean,
        default: false,
      },
      summary: String,
    },
    
    // Job role analysis results
    job_analysis: {
      predictedRole: {
        name: String,
        matchScore: Number,
        confidence: Number,
        reasoning: String,
      },
      alternativeRoles: [{
        name: String,
        matchScore: Number,
        reason: String,
      }],
      skillsHave: [{
        skill: String,
        type: {
          type: String,
          enum: ['required', 'preferred'],
        },
        level: {
          type: String,
          enum: ['Beginner', 'Intermediate', 'Advanced'],
        },
      }],
      skillsMissing: [{
        skill: String,
        type: {
          type: String,
          enum: ['required', 'preferred'],
        },
        priority: Number,
        reasons: [String],
        salaryBoost: {
          percentage: String,
          absoluteUSD: {
            min: Number,
            max: Number,
          },
        },
      }],
      salaryBoostOpportunities: [{
        id: String,
        title: String,
        impact: String,
        timeframe: String,
        priority: String,
        description: String,
        skillType: String,
        salaryBoost: {
          percentage: String,
          absoluteUSD: mongoose.Schema.Types.Mixed, // Can be number or {min, max}
          category: String,
        },
        leverageSkill: String,
        actionSteps: [String],
        recommendedHoursPerWeek: Number,
        experienceFit: String,
      }],
      tagline: String, // Generated personalized tagline
      strengths: [String], // Top strengths identified
      analyzedAt: Date,
    },
    
    // Parsing metadata
    parsing_metadata: {
      version: {
        type: String,
        default: '2.0',
      },
      parsedAt: Date,
      llmUsed: {
        type: Boolean,
        default: false,
      },
      watsonCallCount: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
  }
)

// Index for faster queries
resumeSchema.index({ createdAt: -1 })
resumeSchema.index({ userId: 1, createdAt: -1 })

const Resume = mongoose.model('Resume', resumeSchema)

export default Resume
