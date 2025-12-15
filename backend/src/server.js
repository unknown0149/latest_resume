import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import mongoose from 'mongoose'
import { fileURLToPath } from 'url'
import { logger } from './utils/logger.js'
import connectDB from './config/database.js'
import resumeRoutes from './routes/resume.routes.js'
import jobRoutes from './routes/job.routes.js'
import authRoutes from './routes/auth.routes.js'
import userRoutes from './routes/user.routes.js'
import interviewRoutes from './routes/interview.routes.js'
import interviewUserRoutes from './routes/interview.user.routes.js'
import quizRoutes from './routes/quiz.routes.js'
import roadmapRoutes from './routes/roadmap.routes.js'
import notificationRoutes from './routes/notification.routes.js'
import subscriptionRoutes from './routes/subscription.routes.js'
import organizationRoutes from './routes/organization.routes.js'
import recruiterRoutes from './routes/recruiter.routes.js'
import savedJobsRoutes from './routes/savedJobs.routes.js'
import applicationRoutes from './routes/application.routes.js'
import exportRoutes from './routes/export.routes.js'
import { startJobScheduler, stopJobScheduler } from './services/jobFetchService.js'
import { startQueueWorker, stopQueueWorker } from './services/embeddingQueueService.js'
import { helmetConfig, generalLimiter } from './middleware/securityMiddleware.js'
import { performHealthCheck, performBasicHealthCheck } from './services/healthCheckService.js'
import { errorHandler, notFoundHandler } from './utils/errorHandler.js'
import { initializeNotificationListeners } from './utils/notificationEmitter.js'
import Notification from './models/Notification.js'
import User from './models/User.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config()

// Validate critical environment variables
if (!process.env.JWT_SECRET) {
  logger.error('FATAL: JWT_SECRET is not set in environment variables')
  process.exit(1)
}

if (!process.env.MONGODB_URI) {
  logger.error('FATAL: MONGODB_URI is not set in environment variables')
  process.exit(1)
}

// Create Express app
const app = express()
const PORT = process.env.PORT || 8000

// CORS configuration (supports comma-separated multiple origins)
const allowedOrigins = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true)
    }
    return callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
}

// Middleware
app.use(cors(corsOptions))
app.use(helmetConfig) // Security headers
app.use(express.json({ limit: '10mb' })) // Limit JSON payload size
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
// Skip rate limit for health checks to avoid noisy monitoring outages
app.use((req, res, next) => {
  if (req.path.startsWith('/health')) return next()
  return generalLimiter(req, res, next)
})

// Request timeout middleware (120 seconds for resume processing)
app.use((req, res, next) => {
  req.setTimeout(120000) // 120 seconds
  res.setTimeout(120000)
  next()
})

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  })
  next()
})

// Health check endpoints
app.get('/health', async (req, res) => {
  try {
    const health = await performHealthCheck();
    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'error',
      message: 'Health check failed',
      error: error.message,
    });
  }
});

// Basic health check for load balancers (fast)
app.get('/health/basic', (req, res) => {
  const health = performBasicHealthCheck();
  res.status(health.status === 'ok' ? 200 : 503).json(health);
});

// API Routes
app.use('/api/auth', authRoutes) // Authentication routes (per-route rate limiting inside router)
app.use('/api/user', userRoutes) // User profile routes
app.use('/api/interview', interviewRoutes) // AI Interview verification routes
app.use('/api/interviews', interviewUserRoutes) // Candidate interview tracking routes
app.use('/api/quiz', quizRoutes) // MCQ Quiz system routes
app.use('/api/notifications', notificationRoutes) // Notification system routes
app.use('/api/subscriptions', subscriptionRoutes) // Subscription & payment routes
app.use('/api/organizations', organizationRoutes) // Multi-tenancy organization routes
app.use('/api/recruiter', recruiterRoutes) // Recruiter portal routes
app.use('/api/saved-jobs', savedJobsRoutes) // Saved jobs & bookmarks routes
app.use('/api', roadmapRoutes) // Learning roadmap routes
app.use('/api/resume', resumeRoutes)
app.use('/api/applications', applicationRoutes)
app.use('/api/export', exportRoutes) // Data export & portability routes
app.use('/api', jobRoutes) // Phase 2: Job matching and role analysis routes

// Serve static files (avatars, uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// 404 handler - must be after all routes
app.use(notFoundHandler)

// Global error handler - must be last
app.use(errorHandler)

// Connect to MongoDB and start server
let server

const startServer = async () => {
  try {
    // Connect to MongoDB first
    await connectDB()
    
    // Start server after successful DB connection
    server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`)
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`)
      logger.info(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`)
      
      // Initialize notification listeners
      initializeNotificationListeners(Notification, User)
      
      // Start job scheduler for Phase 2
      startJobScheduler()
      
      // Start embedding queue worker for Phase 3
      startQueueWorker()
      logger.info('Embedding queue worker started')
    })
  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
}

// Start the server
startServer()

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Shutting down gracefully...`)
  try {
    logger.info('Stopping job scheduler...')
    stopJobScheduler()
    logger.info('Stopping embedding queue worker...')
    stopQueueWorker()

    if (server) {
      await new Promise((resolve) => server.close(resolve))
      logger.info('HTTP server closed')
    }

    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close()
      logger.info('MongoDB connection closed')
    }
  } catch (err) {
    logger.error('Error during graceful shutdown:', err)
  } finally {
    process.exit(0)
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err)
  // In production, you might want to gracefully shutdown
  // process.exit(1)
})

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err)
  // Gracefully shutdown
  process.exit(1)
})

export default app
