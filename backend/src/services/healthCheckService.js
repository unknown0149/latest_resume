/**
 * Health Check Service
 * Comprehensive health monitoring for all system dependencies
 */

import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

/**
 * Check MongoDB connection health
 */
async function checkMongoDB() {
  try {
    if (mongoose.connection.readyState === 1) {
      // Ping database to verify connectivity
      await mongoose.connection.db.admin().ping();
      return {
        status: 'healthy',
        message: 'MongoDB connected',
        responseTime: Date.now(),
      };
    } else {
      return {
        status: 'unhealthy',
        message: 'MongoDB disconnected',
        readyState: mongoose.connection.readyState,
      };
    }
  } catch (error) {
    logger.error('MongoDB health check failed:', error);
    return {
      status: 'unhealthy',
      message: error.message,
      error: error.toString(),
    };
  }
}

/**
 * Check disk space (basic check)
 */
async function checkDiskSpace() {
  try {
    // Basic check - in production, use a proper disk space library
    return {
      status: 'unknown',
      message: 'Disk space check not implemented',
    };
  } catch (error) {
    return {
      status: 'unknown',
      message: error.message,
    };
  }
}

/**
 * Check memory usage
 */
function checkMemory() {
  try {
    const usage = process.memoryUsage();
    const totalMemoryMB = Math.round(usage.heapTotal / 1024 / 1024);
    const usedMemoryMB = Math.round(usage.heapUsed / 1024 / 1024);
    const percentUsed = Math.round((usage.heapUsed / usage.heapTotal) * 100);

    const status = percentUsed > 90 ? 'unhealthy' : percentUsed > 75 ? 'degraded' : 'healthy';

    return {
      status,
      message: `Memory usage: ${percentUsed}%`,
      metrics: {
        heapUsedMB: usedMemoryMB,
        heapTotalMB: totalMemoryMB,
        percentUsed,
        rssMB: Math.round(usage.rss / 1024 / 1024),
        externalMB: Math.round(usage.external / 1024 / 1024),
      },
    };
  } catch (error) {
    return {
      status: 'unknown',
      message: error.message,
    };
  }
}

/**
 * Check AI service availability (Gemini API)
 */
async function checkAIServices() {
  try {
    const hasGeminiKey = !!process.env.GEMINI_API_KEY;
    const hasHuggingFaceKey = !!process.env.HUGGINGFACE_API_KEY;

    if (!hasGeminiKey && !hasHuggingFaceKey) {
      return {
        status: 'degraded',
        message: 'No AI service keys configured',
        services: {
          gemini: 'not_configured',
          huggingface: 'not_configured',
        },
      };
    }

    return {
      status: 'healthy',
      message: 'AI services configured',
      services: {
        gemini: hasGeminiKey ? 'configured' : 'not_configured',
        huggingface: hasHuggingFaceKey ? 'configured' : 'not_configured',
      },
    };
  } catch (error) {
    return {
      status: 'unknown',
      message: error.message,
    };
  }
}

/**
 * Comprehensive health check
 */
export async function performHealthCheck() {
  const startTime = Date.now();

  const [mongoHealth, memoryHealth, aiHealth, diskHealth] = await Promise.all([
    checkMongoDB(),
    Promise.resolve(checkMemory()),
    checkAIServices(),
    checkDiskSpace(),
  ]);

  const allHealthy = [mongoHealth, memoryHealth, aiHealth].every(
    check => check.status === 'healthy'
  );

  const anyUnhealthy = [mongoHealth, memoryHealth, aiHealth].some(
    check => check.status === 'unhealthy'
  );

  const overallStatus = anyUnhealthy ? 'unhealthy' : allHealthy ? 'healthy' : 'degraded';

  const responseTime = Date.now() - startTime;

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    responseTime: `${responseTime}ms`,
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    dependencies: {
      mongodb: mongoHealth,
      memory: memoryHealth,
      aiServices: aiHealth,
      disk: diskHealth,
    },
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
    },
  };
}

/**
 * Basic health check for load balancers (fast response)
 */
export function performBasicHealthCheck() {
  const isMongoConnected = mongoose.connection.readyState === 1;
  
  return {
    status: isMongoConnected ? 'ok' : 'error',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };
}
