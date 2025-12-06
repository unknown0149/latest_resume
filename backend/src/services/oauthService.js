import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as LinkedInStrategy } from 'passport-linkedin-oauth2';
import { Strategy as GitHubStrategy } from 'passport-github2';
import User from '../models/User.js';
import { logger } from '../utils/logger.js';

/**
 * OAuth Service
 * Configures social authentication strategies
 * Supports: Google, LinkedIn, GitHub
 */

/**
 * Initialize Passport strategies
 */
export const initializePassport = () => {
  // Serialize user for session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: `${process.env.BACKEND_URL || 'http://localhost:8000'}/api/auth/google/callback`,
          scope: ['profile', 'email']
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const result = await handleOAuthProfile('google', profile, accessToken);
            done(null, result);
          } catch (error) {
            done(error, null);
          }
        }
      )
    );
    logger.info('✅ Google OAuth configured');
  } else {
    logger.warn('⚠️ Google OAuth not configured (missing credentials)');
  }

  // LinkedIn OAuth Strategy
  if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) {
    passport.use(
      new LinkedInStrategy(
        {
          clientID: process.env.LINKEDIN_CLIENT_ID,
          clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
          callbackURL: `${process.env.BACKEND_URL || 'http://localhost:8000'}/api/auth/linkedin/callback`,
          scope: ['r_emailaddress', 'r_liteprofile'],
          state: true
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const result = await handleOAuthProfile('linkedin', profile, accessToken);
            done(null, result);
          } catch (error) {
            done(error, null);
          }
        }
      )
    );
    logger.info('✅ LinkedIn OAuth configured');
  } else {
    logger.warn('⚠️ LinkedIn OAuth not configured (missing credentials)');
  }

  // GitHub OAuth Strategy
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
          callbackURL: `${process.env.BACKEND_URL || 'http://localhost:8000'}/api/auth/github/callback`,
          scope: ['user:email']
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const result = await handleOAuthProfile('github', profile, accessToken);
            done(null, result);
          } catch (error) {
            done(error, null);
          }
        }
      )
    );
    logger.info('✅ GitHub OAuth configured');
  } else {
    logger.warn('⚠️ GitHub OAuth not configured (missing credentials)');
  }
};

/**
 * Handle OAuth profile from any provider
 */
const handleOAuthProfile = async (provider, profile, accessToken) => {
  try {
    // Extract email from profile
    const email = profile.emails?.[0]?.value || profile.email || `${profile.id}@${provider}.oauth`;
    
    // Extract name
    const displayName = profile.displayName || `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim() || email.split('@')[0];
    
    // Extract avatar
    const avatar = profile.photos?.[0]?.value || profile.picture || profile.avatar_url || null;

    // Check if user exists
    let user = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { [`oauth.${provider}.id`]: profile.id }
      ]
    });

    if (user) {
      // Update existing user with OAuth info
      user.oauth = user.oauth || {};
      user.oauth[provider] = {
        id: profile.id,
        accessToken,
        profile: {
          displayName,
          email,
          avatar,
          profileUrl: profile.profileUrl || profile.url || null
        },
        lastLogin: new Date()
      };

      // Update avatar if not set
      if (!user.avatar && avatar) {
        user.avatar = avatar;
      }

      // Update name if not set
      if (!user.name && displayName) {
        user.name = displayName;
      }

      user.lastLoginAt = new Date();
      await user.save();

      logger.info(`Existing user logged in via ${provider}: ${email}`);
    } else {
      // Create new user
      user = new User({
        email: email.toLowerCase(),
        name: displayName,
        avatar,
        role: 'candidate',
        isActive: true,
        emailVerified: true, // OAuth emails are pre-verified
        oauth: {
          [provider]: {
            id: profile.id,
            accessToken,
            profile: {
              displayName,
              email,
              avatar,
              profileUrl: profile.profileUrl || profile.url || null
            },
            lastLogin: new Date()
          }
        },
        lastLoginAt: new Date()
      });

      await user.save();
      logger.info(`New user created via ${provider}: ${email}`);
    }

    return {
      user,
      isNewUser: !user.oauth?.[provider]?.lastLogin
    };
  } catch (error) {
    logger.error(`OAuth profile handling error (${provider}):`, error);
    throw error;
  }
};

/**
 * Import LinkedIn profile data
 * Extracts work experience, education, skills for auto-filling resume
 */
export const importLinkedInProfile = async (accessToken) => {
  try {
    // Note: LinkedIn API v2 requires specific endpoints
    // This is a placeholder for LinkedIn profile import
    // Actual implementation requires LinkedIn API calls
    
    logger.info('LinkedIn profile import requested');
    
    return {
      success: true,
      message: 'LinkedIn profile import coming soon',
      data: null
    };
  } catch (error) {
    logger.error('LinkedIn profile import error:', error);
    throw error;
  }
};

/**
 * Revoke OAuth access
 */
export const revokeOAuthAccess = async (userId, provider) => {
  try {
    const user = await User.findById(userId);
    
    if (!user || !user.oauth?.[provider]) {
      throw new Error(`No ${provider} OAuth connection found`);
    }

    // Remove OAuth data
    delete user.oauth[provider];
    await user.save();

    logger.info(`OAuth access revoked for user ${userId}: ${provider}`);
    
    return {
      success: true,
      message: `${provider} connection removed successfully`
    };
  } catch (error) {
    logger.error('OAuth revoke error:', error);
    throw error;
  }
};

/**
 * Get user's connected OAuth providers
 */
export const getConnectedProviders = async (userId) => {
  try {
    const user = await User.findById(userId).select('oauth');
    
    if (!user) {
      throw new Error('User not found');
    }

    const providers = [];
    
    if (user.oauth) {
      for (const [provider, data] of Object.entries(user.oauth)) {
        providers.push({
          provider,
          connectedAt: data.lastLogin,
          profile: {
            displayName: data.profile?.displayName,
            email: data.profile?.email,
            avatar: data.profile?.avatar
          }
        });
      }
    }

    return providers;
  } catch (error) {
    logger.error('Get connected providers error:', error);
    throw error;
  }
};

export default {
  initializePassport,
  importLinkedInProfile,
  revokeOAuthAccess,
  getConnectedProviders
};
