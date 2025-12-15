import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Job from '../models/Job.js'
import { queueJobEmbedding } from './embeddingQueueService.js'
import { logger } from '../utils/logger.js'
import { extractJobSkillsWithWatson } from './watsonJobSkillService.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const JOBS_FILE_PATH = path.resolve(__dirname, '../../jobs.csv')

let cachedJobs = null
let cachedFileMtime = 0
const watsonSkillCache = new Map()

const employmentTypeMap = {
  'full-time': 'full-time',
  'part-time': 'part-time',
  'contract': 'contract',
  'internship': 'internship',
  'freelance': 'freelance',
  'varies': 'full-time',
  job: 'full-time'
}

const experienceMap = {
  entry: 'entry',
  junior: 'entry',
  'mid-level': 'mid',
  mid: 'mid',
  intermediate: 'mid',
  senior: 'senior',
  lead: 'lead',
  executive: 'executive',
  varies: 'mid'
}

const allowedTags = new Set(['internship', 'full-time', 'part-time', 'contract', 'freelance'])
const allowedSourcePlatforms = new Set(['linkedin', 'indeed', 'glassdoor', 'direct', 'api', 'manual', 'seed', 'real'])

const mapSourcePlatform = (value) => {
  const normalized = (value || '').toLowerCase().trim()
  if (allowedSourcePlatforms.has(normalized)) {
    return normalized
  }
  if (normalized === 'file' || normalized === 'official_notification') {
    return 'seed'
  }
  if (normalized === 'career_page') {
    return 'manual'
  }
  if (normalized === 'job_portal' || normalized === 'aggregator') {
    return 'api'
  }
  return 'seed'
}

const ensureDate = (value, fallback = new Date()) => {
  if (!value) return new Date(fallback)
  const candidate = new Date(value)
  return Number.isNaN(candidate.getTime()) ? new Date(fallback) : candidate
}

export const getJobsFilePath = () => JOBS_FILE_PATH

export async function loadJobsFromFile(options = {}) {
  const { forceReload = false, enrichSkills = false } = options
  const stats = await fs.promises.stat(JOBS_FILE_PATH)
  const shouldUseCache = !forceReload && cachedJobs && cachedFileMtime === stats.mtimeMs

  if (shouldUseCache) {
    return cachedJobs
  }

  const raw = await fs.promises.readFile(JOBS_FILE_PATH, 'utf8')
  const data = JSON.parse(raw)
  const enrichedJobs = []
  const seenJobKeys = new Set()

  for (let index = 0; index < data.length; index++) {
    const normalized = normalizeFileJob(data[index], index)

    if (enrichSkills) {
      await ensureJobSkills(normalized)
    }

    const dedupKey = buildJobDedupKey(normalized)
    if (seenJobKeys.has(dedupKey)) {
      logger.warn(`Duplicate job detected in jobs.csv. Skipping entry with key: ${dedupKey}`)
      continue
    }

    seenJobKeys.add(dedupKey)
    enrichedJobs.push(normalized)
  }

  cachedJobs = enrichedJobs
  cachedFileMtime = stats.mtimeMs
  return enrichedJobs
}

export async function reloadJobsFromFile() {
  const jobs = await loadJobsFromFile({ forceReload: true })
  await Job.deleteMany({})
  const inserted = await Job.insertMany(jobs)

  let queued = 0
  for (const job of inserted) {
    try {
      await queueJobEmbedding(job.jobId, 'normal')
      queued++
    } catch (error) {
      logger.warn(`Failed to queue embedding for ${job.jobId}: ${error.message}`)
    }
  }

  return {
    total: jobs.length,
    inserted: inserted.length,
    embeddingsQueued: queued
  }
}

async function ensureJobSkills(job) {
  const requiredCount = job.skills?.required?.length || 0
  const preferredCount = job.skills?.preferred?.length || 0
  const needsEnrichment = requiredCount < 3 && preferredCount < 3

  if (!needsEnrichment) {
    return job
  }

  const cachedSkills = watsonSkillCache.get(job.jobId)
  if (cachedSkills) {
    job.skills = cachedSkills
    return job
  }

  const watsonPayload = {
    title: job.title,
    company: job.company?.name,
    description: job.description,
    requirements: job.requirements,
    responsibilities: job.responsibilities,
    location: job.location?.city
  }

  const enrichment = await extractJobSkillsWithWatson(watsonPayload)

  if (enrichment.success) {
    const required = enrichment.required
    const preferred = enrichment.preferred.length ? enrichment.preferred : required
    const allSkills = Array.from(new Set([...required, ...preferred]))

    job.skills = {
      required,
      preferred,
      allSkills
    }
  }

  watsonSkillCache.set(job.jobId, job.skills)
  return job
}

export function normalizeFileJob(job, fallbackIndex = 0) {
  const employmentType = employmentTypeMap[(job.employment_type || job.tag || 'full-time').toLowerCase()] || 'full-time'
  const experienceLevel = experienceMap[(job.experience_level || 'mid').toLowerCase()] || 'mid'
  const skills = Array.isArray(job.skills) ? job.skills.map((s) => s.toLowerCase().trim()) : []
  const preferredSkills = Array.isArray(job.preferred_skills)
    ? job.preferred_skills.map((s) => s.toLowerCase().trim())
    : []
  const allSkills = [...new Set([...skills, ...preferredSkills])]
  const locationString = job.location || 'India'
  const isRemote = String(job.is_remote || '').toLowerCase() === 'remote' || locationString.toLowerCase().includes('remote')
  const postedDate = ensureDate(job.posted_date, Date.now())
  const expiresAtRaw = job.expires_at ? ensureDate(job.expires_at, null) : null
  const expiresAt = expiresAtRaw || new Date(postedDate.getTime() + 30 * 24 * 60 * 60 * 1000)

  const sourcePlatform = mapSourcePlatform(job.source)

  return {
    jobId: job.jobId || `file_${fallbackIndex}`,
    title: job.title || 'Untitled Position',
    company: {
      name: job.company || 'Company Confidential'
    },
    location: {
      city: locationString,
      state: null,
      country: 'India',
      isRemote,
      locationType: isRemote ? 'remote' : 'on-site'
    },
    description: job.description || '',
    requirements: Array.isArray(job.requirements) ? job.requirements : [],
    responsibilities: Array.isArray(job.responsibilities) ? job.responsibilities : [],
    employmentType,
    experienceLevel,
    salary: {
      min: job.salary_min || 0,
      max: job.salary_max || 0,
      currency: job.currency || 'INR',
      period: 'annually'
    },
    skills: {
      required: skills,
      preferred: preferredSkills.length ? preferredSkills : skills,
      allSkills
    },
    source: {
      platform: sourcePlatform,
      sourceUrl: job.application_url || null
    },
    applicationUrl: job.application_url || null,
    tag: allowedTags.has((job.tag || '').toLowerCase()) ? job.tag.toLowerCase() : null,
    postedDate,
    expiresAt,
    status: 'active',
    isVerified: true
  }
}

function buildJobDedupKey(job) {
  const explicitId = job.jobId?.toString().trim().toLowerCase()
  if (explicitId && explicitId !== 'file_undefined') {
    return explicitId
  }

  const title = (job.title || '').trim().toLowerCase()
  const company = (job.company?.name || '').trim().toLowerCase()
  const city = (job.location?.city || '').trim().toLowerCase()

  return `${title}|${company}|${city}`
}
