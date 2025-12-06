import Joi from 'joi';

/**
 * Validation schemas for recruiter operations
 */

// Job validation
const jobCreateSchema = Joi.object({
  title: Joi.string().min(3).max(200).required(),
  company: Joi.string().min(2).max(200).required(),
  location: Joi.string().min(2).max(200).required(),
  type: Joi.string().valid('full-time', 'part-time', 'contract', 'internship', 'remote').required(),
  description: Joi.string().min(50).max(5000).required(),
  requirements: Joi.array().items(Joi.string().max(500)).min(1).required(),
  salary: Joi.object({
    min: Joi.number().positive().optional(),
    max: Joi.number().positive().optional(),
    currency: Joi.string().length(3).optional(),
  }).optional(),
  benefits: Joi.array().items(Joi.string().max(500)).optional(),
  experienceLevel: Joi.string().valid('entry', 'mid', 'senior', 'lead', 'executive').optional(),
  skills: Joi.array().items(Joi.string().max(100)).optional(),
  status: Joi.string().valid('draft', 'active', 'closed').optional(),
});

const jobUpdateSchema = Joi.object({
  title: Joi.string().min(3).max(200),
  company: Joi.string().min(2).max(200),
  location: Joi.string().min(2).max(200),
  type: Joi.string().valid('full-time', 'part-time', 'contract', 'internship', 'remote'),
  description: Joi.string().min(50).max(5000),
  requirements: Joi.array().items(Joi.string().max(500)),
  salary: Joi.object({
    min: Joi.number().positive(),
    max: Joi.number().positive(),
    currency: Joi.string().length(3),
  }),
  benefits: Joi.array().items(Joi.string().max(500)),
  experienceLevel: Joi.string().valid('entry', 'mid', 'senior', 'lead', 'executive'),
  skills: Joi.array().items(Joi.string().max(100)),
  status: Joi.string().valid('draft', 'active', 'closed'),
}).min(1); // At least one field must be present

// Application validation
const applicationStatusSchema = Joi.object({
  status: Joi.string()
    .valid(
      'applied',
      'screening',
      'shortlisted',
      'interview_scheduled',
      'interview_completed',
      'offer_extended',
      'offer_accepted',
      'offer_declined',
      'rejected',
      'withdrawn'
    )
    .required(),
  note: Joi.string().max(1000).optional(),
});

const bulkStatusSchema = Joi.object({
  applicationIds: Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)).min(1).max(100).required(),
  status: Joi.string()
    .valid(
      'screening',
      'shortlisted',
      'interview_scheduled',
      'interview_completed',
      'offer_extended',
      'rejected'
    )
    .required(),
});

const bulkRejectSchema = Joi.object({
  applicationIds: Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)).min(1).max(100).required(),
  reason: Joi.string().max(1000).optional(),
});

// Interview validation
const interviewScheduleSchema = Joi.object({
  type: Joi.string().valid('phone', 'video', 'onsite', 'technical', 'hr').required(),
  scheduledAt: Joi.date().iso().greater('now').required(),
  duration: Joi.number().integer().min(15).max(480).optional(),
  interviewers: Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)).optional(),
  location: Joi.string().max(500).optional(),
  meetingLink: Joi.string().uri().optional(),
  notes: Joi.string().max(1000).optional(),
});

const interviewUpdateSchema = Joi.object({
  scheduledAt: Joi.date().iso(),
  location: Joi.string().max(500),
  meetingLink: Joi.string().uri(),
  status: Joi.string().valid('scheduled', 'completed', 'cancelled', 'rescheduled'),
  feedback: Joi.string().max(2000),
  rating: Joi.number().integer().min(1).max(5),
}).min(1);

// Offer validation
const offerSchema = Joi.object({
  salary: Joi.number().positive().required(),
  currency: Joi.string().length(3).default('INR'),
  benefits: Joi.array().items(Joi.string().max(500)).optional(),
  joiningDate: Joi.date().iso().greater('now').required(),
  validUntil: Joi.date().iso().greater('now').required(),
  notes: Joi.string().max(1000).optional(),
});

// Note validation
const noteSchema = Joi.object({
  note: Joi.string().min(1).max(2000).required(),
});

/**
 * Validation middleware factory
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }

    // Replace request data with validated and sanitized data
    req[property] = value;
    next();
  };
};

export {
  // Schemas
  jobCreateSchema,
  jobUpdateSchema,
  applicationStatusSchema,
  bulkStatusSchema,
  bulkRejectSchema,
  interviewScheduleSchema,
  interviewUpdateSchema,
  offerSchema,
  noteSchema,
  
  // Middleware
  validate,
  
  // Individual validators
  validateJobCreate,
  validateJobUpdate,
  validateApplicationStatus,
  validateBulkStatus,
  validateBulkReject,
  validateInterviewSchedule,
  validateInterviewUpdate,
  validateOffer,
  validateNote,
};

// Create individual validators
const validateJobCreate = validate(jobCreateSchema);
const validateJobUpdate = validate(jobUpdateSchema);
const validateApplicationStatus = validate(applicationStatusSchema);
const validateBulkStatus = validate(bulkStatusSchema);
const validateBulkReject = validate(bulkRejectSchema);
const validateInterviewSchedule = validate(interviewScheduleSchema);
const validateInterviewUpdate = validate(interviewUpdateSchema);
const validateOffer = validate(offerSchema);
const validateNote = validate(noteSchema);
