import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { logger } from './utils/logger.js'
import connectDB from './config/database.js'
import resumeRoutes from './routes/resume.routes.js'
import jobRoutes from './routes/job.routes.js'
import authRoutes from './routes/auth.routes.js'
import userRoutes from './routes/user.routes.js'
import interviewRoutes from './routes/interview.routes.js'
import quizRoutes from './routes/quiz.routes.js'
import roadmapRoutes from './routes/roadmap.routes.js'
import { startJobScheduler, stopJobScheduler } from './services/jobFetchService.js'
import { startQueueWorker, stopQueueWorker } from './services/embeddingQueueService.js'

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

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200,
}

// Middleware
app.use(cors(corsOptions))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb: connectDB ? 'connected' : 'disconnected',
  })
})

// API Routes
app.use('/api/auth', authRoutes) // Authentication routes
app.use('/api/user', userRoutes) // User profile routes
app.use('/api/interview', interviewRoutes) // AI Interview verification routes
app.use('/api/quiz', quizRoutes) // MCQ Quiz system routes
app.use('/api', roadmapRoutes) // Learning roadmap routes
app.use('/api/resume', resumeRoutes)
app.use('/api', jobRoutes) // Phase 2: Job matching and role analysis routes

// Serve static files (avatars, uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`,
    statusCode: 404,
  })
})

// Global error handler
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`, {
    stack: err.stack,
    path: req.path,
  })

  const statusCode = err.statusCode || 500
  res.status(statusCode).json({
    error: err.name || 'Internal Server Error',
    message: err.message || 'An unexpected error occurred',
    statusCode,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
})

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`)
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`)
  logger.info(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`)
  
  // Start job scheduler for Phase 2
  startJobScheduler()
  
  // Start embedding queue worker for Phase 3
  startQueueWorker()
  logger.info('Embedding queue worker started')
})

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...')
  logger.info('Stopping job scheduler...')
  stopJobScheduler()
  logger.info('Stopping embedding queue worker...')
  stopQueueWorker()
  process.exit(0)
})

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...')
  logger.info('Stopping job scheduler...')
  stopJobScheduler()
  logger.info('Stopping embedding queue worker...')
  stopQueueWorker()
  process.exit(0)
})

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
