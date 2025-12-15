/**
 * Embedding Queue Service
 * Manages batch processing of embedding generation with rate limiting
 * Processes resumes and jobs in background queue
 */

import { generateCandidateEmbedding, generateJobEmbedding, getAPIUsageStats } from './embeddingService.js';
import Resume from '../models/Resume.js';
import Job from '../models/Job.js';
import { logger } from '../utils/logger.js';

// In-memory queue (replace with Bull/Redis for production scale)
const embeddingQueue = [];
let isProcessing = false;
let processingStats = {
  totalProcessed: 0,
  successCount: 0,
  failureCount: 0,
  lastProcessedAt: null,
};

/**
 * Queue resume for embedding generation
 */
export function queueResumeEmbedding(resumeId, priority = 'normal') {
  const exists = embeddingQueue.find(item => 
    item.type === 'resume' && item.id === resumeId
  );
  
  if (exists) {
    logger.info(`Resume ${resumeId} already in queue`);
    return { queued: false, reason: 'already_queued', position: embeddingQueue.indexOf(exists) + 1 };
  }
  
  const queueItem = {
    type: 'resume',
    id: resumeId,
    priority: priority === 'high' ? 1 : 0,
    queuedAt: new Date(),
    retries: 0,
  };
  
  // Insert based on priority
  if (priority === 'high') {
    embeddingQueue.unshift(queueItem);
  } else {
    embeddingQueue.push(queueItem);
  }
  
  logger.info(`Resume ${resumeId} queued (${priority} priority), queue size: ${embeddingQueue.length}`);
  return { queued: true, position: embeddingQueue.length, queueSize: embeddingQueue.length };
}

/**
 * Queue job for embedding generation
 */
export function queueJobEmbedding(jobId, priority = 'normal') {
  const exists = embeddingQueue.find(item => 
    item.type === 'job' && item.id === jobId
  );
  
  if (exists) {
    logger.info(`Job ${jobId} already in queue`);
    return { queued: false, reason: 'already_queued', position: embeddingQueue.indexOf(exists) + 1 };
  }
  
  const queueItem = {
    type: 'job',
    id: jobId,
    priority: priority === 'high' ? 1 : 0,
    queuedAt: new Date(),
    retries: 0,
  };
  
  if (priority === 'high') {
    embeddingQueue.unshift(queueItem);
  } else {
    embeddingQueue.push(queueItem);
  }
  
  logger.info(`Job ${jobId} queued (${priority} priority), queue size: ${embeddingQueue.length}`);
  return { queued: true, position: embeddingQueue.length, queueSize: embeddingQueue.length };
}

/**
 * Process a single queue item
 */
async function processQueueItem(item) {
  const startTime = Date.now();
  
  try {
    if (item.type === 'resume') {
      // Generate resume embedding
      const resume = await Resume.findOne({ resumeId: item.id });
      
      if (!resume) {
        throw new Error(`Resume not found: ${item.id}`);
      }
      
      if (resume.embedding && resume.embedding.length > 0) {
        logger.info(`Resume ${item.id} already has embedding, skipping`);
        return { success: true, skipped: true };
      }
      
      // Use parsed_resume if available, fallback to extracted_text
      const resumeData = resume.parsed_resume || resume.extracted_text || {};
      
      const result = await generateCandidateEmbedding(resumeData, false);
      
      // Update resume with embedding
      resume.embedding = result.embedding;
      resume.embedding_metadata = result.metadata;
      await resume.save();
      
      logger.info(`Resume ${item.id} embedding generated successfully (${Date.now() - startTime}ms)`);
      return { success: true };
      
    } else if (item.type === 'job') {
      // Generate job embedding
      const job = await Job.findOne({ jobId: item.id });
      
      if (!job) {
        throw new Error(`Job not found: ${item.id}`);
      }
      
      if (job.embedding && job.embedding.length > 0) {
        logger.info(`Job ${item.id} already has embedding, skipping`);
        return { success: true, skipped: true };
      }
      
      const result = await generateJobEmbedding(job, false);
      
      // Update job with embedding
      job.embedding = result.embedding;
      job.embedding_metadata = result.metadata;
      await job.save();
      
      logger.info(`Job ${item.id} embedding generated successfully (${Date.now() - startTime}ms)`);
      return { success: true };
      
    } else {
      throw new Error(`Unknown queue item type: ${item.type}`);
    }
    
  } catch (error) {
    logger.error(`Failed to process ${item.type} ${item.id}:`);
    logger.error(`Error message: ${error.message || 'No message'}`);
    logger.error(`Error name: ${error.name || 'No name'}`);
    logger.error(`Error stack: ${error.stack || 'No stack'}`);
    logger.error(`Full error object: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`);
    if (error.errors) {
      logger.error(`Validation errors:`, JSON.stringify(error.errors, null, 2));
    }
    return { success: false, error: error.message || error.toString() };
  }
}

/**
 * Process queue with rate limiting and exponential backoff
 */
export async function processQueue() {
  if (isProcessing) {
    logger.debug('Queue processing already in progress');
    return;
  }
  
  if (embeddingQueue.length === 0) {
    return;
  }
  
  isProcessing = true;
  
  try {
    logger.info(`Processing embedding queue: ${embeddingQueue.length} items`);
    
    // Check API usage
    const apiStats = getAPIUsageStats();
    logger.info(`API Usage: ${apiStats.apiCallsThisHour}/60 calls this hour (${apiStats.percentUsed}% used)`);
    
    // Process up to 10 items per batch (respects rate limit)
    const batchSize = Math.min(10, embeddingQueue.length);
    const batch = embeddingQueue.splice(0, batchSize);
    
    for (const item of batch) {
      const result = await processQueueItem(item);
      
      processingStats.totalProcessed++;
      
      if (result.success) {
        processingStats.successCount++;
      } else {
        processingStats.failureCount++;
        
        // Retry logic with exponential backoff
        if (item.retries < 3) {
          item.retries++;
          const delay = Math.pow(2, item.retries) * 1000; // 2s, 4s, 8s
          
          logger.info(`Retrying ${item.type} ${item.id} in ${delay}ms (attempt ${item.retries}/3)`);
          
          setTimeout(() => {
            embeddingQueue.push(item);
          }, delay);
        } else {
          logger.error(`${item.type} ${item.id} failed after 3 retries, removing from queue`);
        }
      }
      
      // Rate limiting: small delay between items
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    processingStats.lastProcessedAt = new Date();
    
    logger.info(`Batch complete: ${batch.length} items processed, ${embeddingQueue.length} remaining`);
    
  } catch (error) {
    logger.error('Queue processing error:', error);
  } finally {
    isProcessing = false;
  }
}

/**
 * Get queue statistics
 */
export function getQueueStats() {
  const resumeCount = embeddingQueue.filter(item => item.type === 'resume').length;
  const jobCount = embeddingQueue.filter(item => item.type === 'job').length;
  
  return {
    queueSize: embeddingQueue.length,
    resumesQueued: resumeCount,
    jobsQueued: jobCount,
    isProcessing,
    stats: processingStats,
    apiUsage: getAPIUsageStats(),
  };
}

/**
 * Clear queue (for testing/admin)
 */
export function clearQueue() {
  const size = embeddingQueue.length;
  embeddingQueue.length = 0;
  logger.info(`Queue cleared: ${size} items removed`);
  return { cleared: size };
}

/**
 * Start queue worker (runs every 30 seconds)
 */
let queueWorker = null;

export function startQueueWorker() {
  if (queueWorker) {
    logger.warn('Queue worker already running');
    return;
  }
  
  queueWorker = setInterval(() => {
    processQueue().catch(error => {
      logger.error('Queue worker error:', error);
    });
  }, 30000); // 30 seconds
  
  logger.info('Embedding queue worker started (30s interval)');
}

/**
 * Stop queue worker
 */
export function stopQueueWorker() {
  if (queueWorker) {
    clearInterval(queueWorker);
    queueWorker = null;
    logger.info('Embedding queue worker stopped');
  }
}
