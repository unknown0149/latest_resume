import { logger } from '../utils/logger.js';

/**
 * Redis Caching Service
 * Provides high-performance caching for:
 * - Job listings and searches
 * - Resume analysis results
 * - Semantic embeddings
 * - User sessions
 * - API rate limiting
 */

let redisClient = null;
let isRedisAvailable = false;

/**
 * Initialize Redis client
 */
export const initializeRedis = async () => {
  try {
    // Only initialize if Redis is configured
    if (!process.env.REDIS_URL && !process.env.REDIS_HOST) {
      logger.info('⚠️ Redis not configured. Caching disabled (falling back to memory cache)');
      return null;
    }

    // Dynamic import for optional dependency
    const redis = await import('redis');
    
    // Create Redis client
    const redisUrl = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`;
    
    redisClient = redis.createClient({
      url: redisUrl,
      password: process.env.REDIS_PASSWORD || undefined,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis connection failed after 10 retries');
            return new Error('Redis connection failed');
          }
          return Math.min(retries * 100, 3000);
        }
      }
    });

    // Error handling
    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err);
      isRedisAvailable = false;
    });

    redisClient.on('connect', () => {
      logger.info('✅ Redis client connected');
      isRedisAvailable = true;
    });

    redisClient.on('ready', () => {
      logger.info('✅ Redis client ready');
      isRedisAvailable = true;
    });

    redisClient.on('reconnecting', () => {
      logger.warn('⚠️ Redis client reconnecting...');
      isRedisAvailable = false;
    });

    // Connect
    await redisClient.connect();
    
    return redisClient;
  } catch (error) {
    logger.warn('⚠️ Redis initialization failed:', error.message);
    logger.info('📝 Install redis: npm install redis');
    logger.info('💡 App will continue without caching');
    isRedisAvailable = false;
    return null;
  }
};

/**
 * In-memory cache fallback (when Redis is not available)
 */
const memoryCache = new Map();
const memoryCacheTTL = new Map();

const cleanMemoryCache = () => {
  const now = Date.now();
  for (const [key, expiry] of memoryCacheTTL.entries()) {
    if (expiry < now) {
      memoryCache.delete(key);
      memoryCacheTTL.delete(key);
    }
  }
};

// Clean memory cache every 60 seconds
setInterval(cleanMemoryCache, 60000);

/**
 * Get value from cache
 */
export const get = async (key) => {
  try {
    if (isRedisAvailable && redisClient) {
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } else {
      // Fallback to memory cache
      cleanMemoryCache();
      return memoryCache.get(key) || null;
    }
  } catch (error) {
    logger.error('Cache get error:', error);
    return null;
  }
};

/**
 * Set value in cache with TTL (in seconds)
 */
export const set = async (key, value, ttl = 3600) => {
  try {
    if (isRedisAvailable && redisClient) {
      await redisClient.setEx(key, ttl, JSON.stringify(value));
      return true;
    } else {
      // Fallback to memory cache
      memoryCache.set(key, value);
      memoryCacheTTL.set(key, Date.now() + ttl * 1000);
      return true;
    }
  } catch (error) {
    logger.error('Cache set error:', error);
    return false;
  }
};

/**
 * Delete key from cache
 */
export const del = async (key) => {
  try {
    if (isRedisAvailable && redisClient) {
      await redisClient.del(key);
      return true;
    } else {
      memoryCache.delete(key);
      memoryCacheTTL.delete(key);
      return true;
    }
  } catch (error) {
    logger.error('Cache delete error:', error);
    return false;
  }
};

/**
 * Delete multiple keys matching pattern
 */
export const delPattern = async (pattern) => {
  try {
    if (isRedisAvailable && redisClient) {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
      return keys.length;
    } else {
      // Memory cache pattern deletion
      let count = 0;
      const regex = new RegExp(pattern.replace('*', '.*'));
      for (const key of memoryCache.keys()) {
        if (regex.test(key)) {
          memoryCache.delete(key);
          memoryCacheTTL.delete(key);
          count++;
        }
      }
      return count;
    }
  } catch (error) {
    logger.error('Cache delete pattern error:', error);
    return 0;
  }
};

/**
 * Check if key exists
 */
export const exists = async (key) => {
  try {
    if (isRedisAvailable && redisClient) {
      return await redisClient.exists(key) === 1;
    } else {
      cleanMemoryCache();
      return memoryCache.has(key);
    }
  } catch (error) {
    logger.error('Cache exists error:', error);
    return false;
  }
};

/**
 * Increment counter
 */
export const incr = async (key) => {
  try {
    if (isRedisAvailable && redisClient) {
      return await redisClient.incr(key);
    } else {
      const current = memoryCache.get(key) || 0;
      const newValue = current + 1;
      memoryCache.set(key, newValue);
      return newValue;
    }
  } catch (error) {
    logger.error('Cache incr error:', error);
    return 0;
  }
};

/**
 * Set expiry on key
 */
export const expire = async (key, ttl) => {
  try {
    if (isRedisAvailable && redisClient) {
      await redisClient.expire(key, ttl);
      return true;
    } else {
      if (memoryCache.has(key)) {
        memoryCacheTTL.set(key, Date.now() + ttl * 1000);
        return true;
      }
      return false;
    }
  } catch (error) {
    logger.error('Cache expire error:', error);
    return false;
  }
};

/**
 * Get time to live
 */
export const ttl = async (key) => {
  try {
    if (isRedisAvailable && redisClient) {
      return await redisClient.ttl(key);
    } else {
      const expiry = memoryCacheTTL.get(key);
      if (expiry) {
        return Math.floor((expiry - Date.now()) / 1000);
      }
      return -1;
    }
  } catch (error) {
    logger.error('Cache ttl error:', error);
    return -1;
  }
};

/**
 * Cache wrapper for functions
 */
export const cached = (keyPrefix, ttl = 3600) => {
  return (target, propertyKey, descriptor) => {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args) {
      const cacheKey = `${keyPrefix}:${JSON.stringify(args)}`;
      
      // Try to get from cache
      const cachedResult = await get(cacheKey);
      if (cachedResult !== null) {
        logger.debug(`Cache hit: ${cacheKey}`);
        return cachedResult;
      }
      
      // Execute original function
      logger.debug(`Cache miss: ${cacheKey}`);
      const result = await originalMethod.apply(this, args);
      
      // Store in cache
      await set(cacheKey, result, ttl);
      
      return result;
    };
    
    return descriptor;
  };
};

/**
 * High-level caching functions for common use cases
 */

// Cache job listings
export const cacheJobs = async (query, jobs, ttl = 1800) => {
  const key = `jobs:query:${JSON.stringify(query)}`;
  return await set(key, jobs, ttl);
};

export const getCachedJobs = async (query) => {
  const key = `jobs:query:${JSON.stringify(query)}`;
  return await get(key);
};

// Cache resume analysis
export const cacheResumeAnalysis = async (resumeId, analysis, ttl = 86400) => {
  const key = `resume:analysis:${resumeId}`;
  return await set(key, analysis, ttl);
};

export const getCachedResumeAnalysis = async (resumeId) => {
  const key = `resume:analysis:${resumeId}`;
  return await get(key);
};

export const invalidateResumeCache = async (resumeId) => {
  return await delPattern(`resume:*:${resumeId}`);
};

// Cache job matches
export const cacheJobMatches = async (resumeId, matches, ttl = 3600) => {
  const key = `matches:${resumeId}`;
  return await set(key, matches, ttl);
};

export const getCachedJobMatches = async (resumeId) => {
  const key = `matches:${resumeId}`;
  return await get(key);
};

// Cache user session data
export const cacheUserSession = async (userId, sessionData, ttl = 86400) => {
  const key = `session:${userId}`;
  return await set(key, sessionData, ttl);
};

export const getCachedUserSession = async (userId) => {
  const key = `session:${userId}`;
  return await get(key);
};

export const invalidateUserSession = async (userId) => {
  const key = `session:${userId}`;
  return await del(key);
};

// Rate limiting helpers
export const checkRateLimit = async (identifier, limit, window) => {
  const key = `ratelimit:${identifier}`;
  const current = await incr(key);
  
  if (current === 1) {
    await expire(key, window);
  }
  
  return {
    count: current,
    remaining: Math.max(0, limit - current),
    exceeded: current > limit
  };
};

// Cache statistics
export const getCacheStats = async () => {
  if (isRedisAvailable && redisClient) {
    const info = await redisClient.info('stats');
    return {
      type: 'redis',
      available: true,
      info
    };
  } else {
    return {
      type: 'memory',
      available: true,
      size: memoryCache.size,
      keys: Array.from(memoryCache.keys())
    };
  }
};

// Graceful shutdown
export const closeRedis = async () => {
  if (redisClient) {
    await redisClient.quit();
    logger.info('Redis connection closed');
  }
};

export default {
  initializeRedis,
  get,
  set,
  del,
  delPattern,
  exists,
  incr,
  expire,
  ttl,
  cached,
  cacheJobs,
  getCachedJobs,
  cacheResumeAnalysis,
  getCachedResumeAnalysis,
  invalidateResumeCache,
  cacheJobMatches,
  getCachedJobMatches,
  cacheUserSession,
  getCachedUserSession,
  invalidateUserSession,
  checkRateLimit,
  getCacheStats,
  closeRedis
};
