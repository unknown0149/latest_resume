import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import { logger } from '../utils/logger.js'

/**
 * Middleware to verify JWT token from Authorization header
 * For Phase 1, this is optional - can be enabled later
 */
export const authenticateToken = (req, res, next) => {
  // Get token from Authorization header
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

  // For Phase 1, make authentication optional
  if (!token) {
    logger.warn('No authentication token provided, proceeding without auth')
    req.user = null
    return next()
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET)
    req.user = {
      ...user,
      _id: user.userId || user._id,
      userId: user.userId || user._id
    }
    next()
  } catch (error) {
    logger.error(`JWT verification failed: ${error.message}`)
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token',
      statusCode: 401,
    })
  }
}

/**
 * Alias for authenticateToken - optional authentication
 */
export const optionalAuth = authenticateToken;

/**
 * Middleware to require authentication (strict mode)
 * Use this when authentication is mandatory
 */
export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'No authentication token provided',
      statusCode: 401,
    })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.userId).select('-password')

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found',
        statusCode: 401,
      })
    }

    if (user.isActive === false) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Account is inactive',
        statusCode: 403,
      })
    }

    req.user = user
    req.user.userId = user._id

    next()
  } catch (error) {
    logger.error(`JWT verification failed: ${error.message}`)
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token',
      statusCode: 401,
    })
  }
}

export const authenticate = requireAuth

/**
 * Generate JWT token for user
 * @param {object} payload - User data to encode
 * @returns {string} - JWT token
 */
export const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  })
}
