import mongoose from 'mongoose'
import { logger } from '../utils/logger.js'

let connectionPromise = null

const getMongoOptions = () => ({
  serverSelectionTimeoutMS: Number(process.env.MONGODB_TIMEOUT_MS || 10000),
  heartbeatFrequencyMS: Number(process.env.MONGODB_HEARTBEAT_MS || 10000),
  maxPoolSize: Number(process.env.MONGODB_MAX_POOL || 10),
})

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection
  }

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined in environment variables')
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(process.env.MONGODB_URI, getMongoOptions())
  }

  try {
    const conn = await connectionPromise
    logger.info(`MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`)
    return conn
  } catch (error) {
    logger.error(`MongoDB Connection Error: ${error.message}`)
    throw error
  } finally {
    connectionPromise = null
  }
}

export const ensureDatabaseConnection = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection
  }

  logger.warn('MongoDB connection not ready. Attempting reconnection...')
  return connectDB()
}

// Handle connection events
mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected')
})

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB reconnected')
})

mongoose.connection.on('error', (err) => {
  logger.error(`MongoDB error: ${err}`)
})

export default connectDB
