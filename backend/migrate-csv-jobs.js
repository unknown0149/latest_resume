/**
 * Migration Script: Update CSV-imported jobs from 'manual' to 'seed' platform
 * Run this once to fix existing jobs in database
 */

import mongoose from 'mongoose';
import Job from './src/models/Job.js';
import { logger } from './src/utils/logger.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/resume_analyzer';

async function migrateCSVJobs() {
  try {
    await mongoose.connect(MONGO_URI);
    logger.info('Connected to MongoDB');

    // Update jobs that were imported from CSV (have jobId starting with 'file_' or 'csv_')
    // and currently have 'manual' platform to 'seed' platform
    const result = await Job.updateMany(
      {
        'source.platform': 'manual',
        $or: [
          { jobId: /^file_/ },
          { jobId: /^csv_/ }
        ]
      },
      {
        $set: { 'source.platform': 'seed' }
      }
    );

    logger.info(`Migration complete: Updated ${result.modifiedCount} jobs from 'manual' to 'seed' platform`);

    // Show breakdown after migration
    const seedCount = await Job.countDocuments({ 'source.platform': 'seed' });
    const manualCount = await Job.countDocuments({ 'source.platform': 'manual' });
    const directCount = await Job.countDocuments({ 'source.platform': 'direct' });

    logger.info('Platform breakdown after migration:');
    logger.info(`  - seed (CSV jobs): ${seedCount}`);
    logger.info(`  - manual (recruiter posts): ${manualCount}`);
    logger.info(`  - direct (direct posts): ${directCount}`);

    await mongoose.connection.close();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateCSVJobs();
