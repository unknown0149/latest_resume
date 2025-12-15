import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't return password in queries by default
  },
  avatar_url: {
    type: String,
    default: null
  },
  tagline: {
    type: String,
    maxlength: [200, 'Tagline cannot exceed 200 characters'],
    default: null
  },
  bio: {
    type: String,
    maxlength: [2000, 'Bio cannot exceed 2000 characters'],
    default: null
  },
  phone: {
    type: String,
    default: null
  },
  location: {
    type: String,
    default: null
  },
  social_links: {
    linkedin: { type: String, default: null },
    github: { type: String, default: null },
    portfolio: { type: String, default: null },
    twitter: { type: String, default: null }
  },
  preferences: {
    emailNotifications: { type: Boolean, default: true },
    jobAlerts: { type: Boolean, default: true },
    newsletter: { type: Boolean, default: false },
    theme: { type: String, enum: ['light', 'dark', 'auto'], default: 'auto' },
    twoFactorEnabled: { type: Boolean, default: false }
  },
  stats: {
    resumesUploaded: { type: Number, default: 0 },
    jobsViewed: { type: Number, default: 0 },
    jobsApplied: { type: Number, default: 0 },
    jobsSaved: { type: Number, default: 0 },
    profileCompleteness: { type: Number, default: 0 } // 0-100%
  },
  lastLoginAt: {
    type: Date,
    default: null
  },
  refreshToken: {
    type: String,
    select: false
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  role: {
    type: String,
    enum: ['user', 'recruiter', 'admin'],
    default: 'user',
    index: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    default: null,
    index: true
  },
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    default: null
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Indexes for performance (email index already created by unique: true)
userSchema.index({ createdAt: -1 });
userSchema.index({ lastLoginAt: -1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash password if it's modified or new
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password for login
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Method to get public profile (without sensitive data)
userSchema.methods.getPublicProfile = function() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    avatar_url: this.avatar_url,
    tagline: this.tagline,
    bio: this.bio,
    phone: this.phone,
    location: this.location,
    social_links: this.social_links,
    preferences: this.preferences,
    stats: this.stats,
    lastLoginAt: this.lastLoginAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Method to calculate profile completeness
userSchema.methods.calculateProfileCompleteness = function() {
  let score = 0;
  const weights = {
    name: 10,
    email: 10,
    avatar_url: 15,
    tagline: 10,
    bio: 15,
    phone: 5,
    location: 5,
    linkedin: 10,
    github: 10,
    portfolio: 10
  };
  
  if (this.name) score += weights.name;
  if (this.email) score += weights.email;
  if (this.avatar_url) score += weights.avatar_url;
  if (this.tagline) score += weights.tagline;
  if (this.bio && this.bio.length > 50) score += weights.bio;
  if (this.phone) score += weights.phone;
  if (this.location) score += weights.location;
  if (this.social_links?.linkedin) score += weights.linkedin;
  if (this.social_links?.github) score += weights.github;
  if (this.social_links?.portfolio) score += weights.portfolio;
  
  this.stats.profileCompleteness = score;
  return score;
};

// Static method to find user by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Virtual for getting initials from name
userSchema.virtual('initials').get(function() {
  if (!this.name) return '??';
  const parts = this.name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
});

// Ensure virtuals are included in JSON
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

const User = mongoose.model('User', userSchema);

export default User;
