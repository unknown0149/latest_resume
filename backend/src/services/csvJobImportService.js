/**
 * CSV/JSON Job Import Service
 * Imports job listings from CSV or JSON file into MongoDB
 */

import fs from 'fs';
import csv from 'csv-parser';
import Job from '../models/Job.js';
import { logger } from '../utils/logger.js';
import { queueJobEmbedding } from './embeddingQueueService.js';

/**
 * Parse CSV file and import jobs to MongoDB
 * Expected CSV format: title,company,description,required_skills,location,salary_min,salary_max,job_type
 */
export async function importJobsFromCSV(filePath) {
  return new Promise((resolve, reject) => {
    const jobs = [];
    let rowCount = 0;
    let errorCount = 0;

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        try {
          rowCount++;
          
          // Parse required_skills (comma-separated)
          const requiredSkills = row.required_skills 
            ? row.required_skills.split(',').map(s => s.trim().toLowerCase()).filter(s => s)
            : [];
          
          // Parse preferred_skills if available
          const preferredSkills = row.preferred_skills 
            ? row.preferred_skills.split(',').map(s => s.trim().toLowerCase()).filter(s => s)
            : [];
          
          // Generate unique job ID
          const jobId = `csv_${Date.now()}_${rowCount}`;
          
          // Parse dates
          const postedDate = row.posted_date ? new Date(row.posted_date) : new Date();
          const expiresAt = new Date(postedDate);
          expiresAt.setDate(expiresAt.getDate() + 30); // Expire in 30 days
          
          // Map experience level
          const expLevelMap = {
            'junior': 'entry',
            'mid-level': 'mid',
            'mid': 'mid',
            'senior': 'senior',
            'lead': 'lead',
            'executive': 'executive'
          };
          const experienceLevel = expLevelMap[(row.experience_level || 'mid').toLowerCase()] || 'mid';
          
          // Create job object matching Job schema
          const job = {
            jobId,
            title: row.title || 'Untitled Position',
            company: {
              name: row.company || 'Unknown Company',
              website: row.company_website || null,
            },
            location: {
              city: row.location || 'Remote',
              state: row.state || null,
              country: 'United States',
              isRemote: row.remote === 'true' || row.remote === 'TRUE' || row.location?.toLowerCase().includes('remote'),
              locationType: (row.remote === 'true' || row.location?.toLowerCase().includes('remote')) ? 'remote' : 'on-site',
            },
            description: row.description || '',
            requirements: row.requirements ? row.requirements.split(';').map(s => s.trim()) : [],
            employmentType: (row.job_type || 'full-time').toLowerCase(),
            experienceLevel: experienceLevel,
            salary: {
              min: parseInt(row.salary_min) || 50000,
              max: parseInt(row.salary_max) || 100000,
              currency: 'USD',
              period: 'annually',
            },
            skills: {
              required: requiredSkills,
              preferred: preferredSkills,
              allSkills: [...new Set([...requiredSkills, ...preferredSkills])],
            },
            source: {
              platform: 'seed',
              sourceUrl: row.source_url || null,
            },
            postedDate,
            expiresAt,
            status: 'active',
            isVerified: true,
          };
          
          jobs.push(job);
        } catch (error) {
          errorCount++;
          logger.error(`Error parsing row ${rowCount}:`, error.message);
        }
      })
      .on('end', async () => {
        logger.info(`CSV parsing complete: ${jobs.length} jobs parsed, ${errorCount} errors`);
        
        try {
          // Clear existing CSV-imported jobs (seed platform)
          await Job.deleteMany({ 'source.platform': 'seed' });
          logger.info('Cleared existing CSV-imported jobs');
          
          // Insert new jobs
          if (jobs.length > 0) {
            const result = await Job.insertMany(jobs);
            logger.info(`Successfully imported ${result.length} jobs into MongoDB`);
            
            // Queue embedding generation for all imported jobs
            let embeddingsQueued = 0;
            for (const job of result) {
              try {
                await queueJobEmbedding(job.jobId, 'normal');
                embeddingsQueued++;
              } catch (error) {
                logger.warn(`Failed to queue embedding for job ${job.jobId}: ${error.message}`);
              }
            }
            logger.info(`Queued ${embeddingsQueued}/${result.length} jobs for embedding generation`);
            
            resolve({
              success: true,
              imported: result.length,
              errors: errorCount,
              total: rowCount,
              embeddingsQueued: embeddingsQueued
            });
          } else {
            resolve({
              success: false,
              imported: 0,
              errors: errorCount,
              total: rowCount,
              message: 'No valid jobs to import'
            });
          }
        } catch (error) {
          logger.error('Database import error:', error.message);
          reject(error);
        }
      })
      .on('error', (error) => {
        logger.error('CSV reading error:', error.message);
        reject(error);
      });
  });
}

/**
 * Create sample CSV file for testing
 */
export async function createSampleJobsCSV(filePath) {
  const sampleData = `title,company,description,required_skills,preferred_skills,location,salary_min,salary_max,job_type,experience_level,remote,posted_date
Senior Full Stack Developer,Tech Solutions Inc,"We are seeking an experienced Full Stack Developer to join our team. You will work on building scalable web applications using modern JavaScript technologies.","JavaScript,React,Node.js,MongoDB,REST API","TypeScript,Docker,AWS,GraphQL",San Francisco,120000,180000,Full-time,Senior,false,2024-11-20
Frontend Developer,StartUp Ventures,"Looking for a creative Frontend Developer to build beautiful user interfaces. Experience with React and modern CSS is essential.","React,JavaScript,HTML,CSS,Redux","TypeScript,Next.js,Tailwind CSS",Remote,90000,130000,Full-time,Mid-level,true,2024-11-21
Backend Engineer,Cloud Systems,"Join our backend team to build robust APIs and microservices. Strong knowledge of Node.js and databases required.","Node.js,Express,MongoDB,PostgreSQL,REST API","Docker,Kubernetes,AWS,Redis",New York,110000,160000,Full-time,Mid-level,false,2024-11-19
DevOps Engineer,Infrastructure Co,"We need a DevOps Engineer to manage our cloud infrastructure and CI/CD pipelines.","Docker,Kubernetes,AWS,Linux,CI/CD","Terraform,Ansible,Python,Jenkins",Austin,130000,190000,Full-time,Senior,false,2024-11-18
Python Developer,Data Analytics Corp,"Seeking Python developer for data processing and API development. Experience with Django or Flask required.","Python,Django,Flask,PostgreSQL,REST API","Docker,AWS,Redis,Celery",Boston,100000,150000,Full-time,Mid-level,false,2024-11-22
React Native Developer,Mobile Apps Inc,"Build cross-platform mobile applications using React Native. iOS and Android experience preferred.","React Native,JavaScript,Redux,REST API","TypeScript,Firebase,GraphQL",Remote,95000,140000,Full-time,Mid-level,true,2024-11-20
Data Engineer,Analytics Platform,"Looking for Data Engineer to build ETL pipelines and data warehouses.","Python,SQL,Spark,Airflow,AWS","Kafka,Snowflake,dbt,Redshift",Seattle,125000,175000,Full-time,Senior,false,2024-11-17
UI/UX Engineer,Design Studio,"We need a UI/UX Engineer who can design and implement beautiful interfaces.","React,JavaScript,HTML,CSS,Figma","TypeScript,Tailwind CSS,Storybook",Los Angeles,85000,125000,Full-time,Mid-level,false,2024-11-23
Full Stack Engineer,E-commerce Co,"Join our team to build scalable e-commerce platforms. MERN stack experience required.","JavaScript,React,Node.js,MongoDB,Express","TypeScript,Redis,Docker,AWS",Chicago,105000,155000,Full-time,Mid-level,false,2024-11-19
Cloud Architect,Enterprise Systems,"Design and implement cloud infrastructure for enterprise applications.","AWS,Azure,Kubernetes,Terraform,Python","GCP,Docker,Ansible,CI/CD",Remote,150000,220000,Full-time,Senior,true,2024-11-16
Junior Full Stack Developer,Learning Platform,"Great opportunity for junior developers to grow. Mentorship provided.","JavaScript,React,Node.js,HTML,CSS","MongoDB,Express,Git",Remote,60000,85000,Full-time,Junior,true,2024-11-22
Software Engineer,FinTech Solutions,"Build financial software applications. Java or JavaScript experience needed.","JavaScript,Java,SQL,REST API,Git","Spring Boot,React,Docker,AWS",New York,115000,165000,Full-time,Mid-level,false,2024-11-21
Machine Learning Engineer,AI Research Lab,"Develop ML models and deploy them to production. Python and deep learning frameworks required.","Python,TensorFlow,PyTorch,scikit-learn,Docker","Kubernetes,AWS,FastAPI,MLflow",San Francisco,140000,200000,Full-time,Senior,false,2024-11-15
QA Automation Engineer,Quality Assurance Co,"Build automated testing frameworks and ensure software quality.","JavaScript,Selenium,Cypress,Jest,Git","Python,Docker,CI/CD,Playwright",Remote,85000,120000,Full-time,Mid-level,true,2024-11-20
GraphQL Developer,API Services Inc,"Design and implement GraphQL APIs. Node.js and database experience required.","Node.js,GraphQL,MongoDB,PostgreSQL,REST API","TypeScript,Docker,AWS,Redis",Austin,100000,145000,Full-time,Mid-level,false,2024-11-18`;

  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, sampleData, 'utf8', (error) => {
      if (error) {
        logger.error('Error creating sample CSV:', error.message);
        reject(error);
      } else {
        logger.info(`Sample jobs CSV created at: ${filePath}`);
        resolve(filePath);
      }
    });
  });
}

/**
 * Import jobs from JSON file
 * @param {string} filePath - Path to JSON file
 * @returns {Promise<Object>} Import results
 */
export async function importJobsFromJSON(filePath) {
  try {
    logger.info(`Reading JSON file: ${filePath}`);
    const rawData = fs.readFileSync(filePath, 'utf8');
    const jobsData = JSON.parse(rawData);
    
    if (!Array.isArray(jobsData)) {
      throw new Error('JSON file must contain an array of job objects');
    }
    
    const jobs = [];
    let errorCount = 0;
    
    for (let i = 0; i < jobsData.length; i++) {
      const row = jobsData[i];
      try {
        // Parse skills array
        const skills = Array.isArray(row.skills) 
          ? row.skills.map(s => s.toLowerCase().trim()) 
          : [];
        
        // Parse required and preferred skills
        const requiredSkills = Array.isArray(row.required_skills)
          ? row.required_skills.map(s => s.toLowerCase().trim())
          : skills.slice(0, Math.ceil(skills.length / 2));
        
        const preferredSkills = Array.isArray(row.preferred_skills)
          ? row.preferred_skills.map(s => s.toLowerCase().trim())
          : skills.slice(Math.ceil(skills.length / 2));
        
        // Generate unique job ID
        const jobId = `json_${Date.now()}_${i}`;
        
        // Parse dates
        const postedDate = row.posted_date ? new Date(row.posted_date) : new Date();
        const expiresAt = new Date(postedDate);
        expiresAt.setDate(expiresAt.getDate() + 60); // Expire in 60 days
        
        // Map experience level
        const expLevelMap = {
          'entry': 'entry',
          'junior': 'entry',
          'mid-level': 'mid',
          'mid': 'mid',
          'intermediate': 'mid',
          'senior': 'senior',
          'lead': 'lead',
          'executive': 'executive',
          'varies': 'mid'
        };
        const experienceLevel = expLevelMap[(row.experience_level || 'mid').toLowerCase()] || 'mid';
        
        // Map employment type
        const employmentTypeMap = {
          'full-time': 'full-time',
          'part-time': 'part-time',
          'contract': 'contract',
          'internship': 'internship',
          'freelance': 'freelance',
          'varies': 'full-time',
          'job': 'full-time' // Map generic 'job' tag to full-time
        };
        const employmentType = employmentTypeMap[(row.employment_type || row.tag || 'full-time').toLowerCase()] || 'full-time';
        
        // Map tag field (same as employment type but keep it separate)
        const tagMap = {
          'internship': 'internship',
          'full-time': 'full-time',
          'part-time': 'part-time',
          'contract': 'contract',
          'freelance': 'freelance',
          'job': null // Generic 'job' becomes null
        };
        const mappedTag = row.tag ? (tagMap[row.tag.toLowerCase()] || null) : null;
        
        // Determine location type
        let locationType = 'on-site';
        let isRemote = false;
        if (row.is_remote === 'depends' || row.is_remote === true || row.location?.toLowerCase().includes('remote')) {
          locationType = 'hybrid';
          isRemote = true;
        } else if (row.is_remote === 'remote' || row.location === 'Remote') {
          locationType = 'remote';
          isRemote = true;
        }
        
        // Parse location
        const locationParts = (row.location || 'India').split(',').map(s => s.trim());
        const city = locationParts[0] || 'India';
        const state = locationParts[1] || null;
        
        // Parse salary (handle INR)
        const salaryMin = parseInt(row.salary_min) || 0;
        const salaryMax = parseInt(row.salary_max) || 0;
        const currency = row.currency || 'INR';
        
        // Create job object
        const job = {
          jobId,
          title: row.title || 'Untitled Position',
          company: {
            name: row.company || 'Unknown Company',
            website: row.company_website || null,
          },
          location: {
            city,
            state,
            country: 'India',
            isRemote,
            locationType,
          },
          description: row.description || '',
          responsibilities: Array.isArray(row.responsibilities) ? row.responsibilities : [],
          requirements: Array.isArray(row.requirements) ? row.requirements : [],
          employmentType,
          experienceLevel,
          salary: {
            min: salaryMin,
            max: salaryMax,
            currency,
            period: 'annually',
          },
          skills: {
            required: requiredSkills,
            preferred: preferredSkills,
            allSkills: [...new Set([...requiredSkills, ...preferredSkills])],
          },
          source: {
            platform: row.source || 'real',
            sourceUrl: row.application_url || null,
          },
          applicationUrl: row.application_url || null,
          benefits: row.benefits || null,
          applicationDeadline: row.application_deadline ? new Date(row.application_deadline) : null,
          tag: mappedTag,
          postedDate,
          expiresAt,
          status: 'active',
          isVerified: true,
        };
        
        jobs.push(job);
      } catch (error) {
        errorCount++;
        logger.error(`Error parsing job ${i}:`, error.message);
      }
    }
    
    logger.info(`JSON parsing complete: ${jobs.length} jobs parsed, ${errorCount} errors`);
    
    // Clear existing real jobs
    await Job.deleteMany({ 'source.platform': 'real' });
    logger.info('Cleared existing JSON-imported jobs');
    
    // Insert new jobs
    if (jobs.length > 0) {
      const result = await Job.insertMany(jobs);
      logger.info(`Successfully imported ${result.length} jobs into MongoDB`);
      
      // Queue embedding generation
      let embeddingsQueued = 0;
      for (const job of result) {
        try {
          await queueJobEmbedding(job.jobId, 'normal');
          embeddingsQueued++;
        } catch (error) {
          logger.warn(`Failed to queue embedding for job ${job.jobId}: ${error.message}`);
        }
      }
      logger.info(`Queued ${embeddingsQueued}/${result.length} jobs for embedding generation`);
      
      return {
        success: true,
        imported: result.length,
        errors: errorCount,
        total: jobsData.length,
        embeddingsQueued
      };
    } else {
      return {
        success: false,
        imported: 0,
        errors: errorCount,
        total: jobsData.length,
        message: 'No valid jobs to import'
      };
    }
  } catch (error) {
    logger.error('JSON import error:', error.message);
    throw error;
  }
}

export default {
  importJobsFromCSV,
  importJobsFromJSON,
  createSampleJobsCSV
};
