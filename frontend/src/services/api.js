import axios from 'axios'

// Create axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      localStorage.removeItem('auth_token')
      window.location.href = '/'
    }
    return Promise.reject(error)
  }
)

// API functions
export const resumeAPI = {
  // Upload resume
  uploadResume: async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post('/resume/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  // Parse resume (Phase 2)
  parseResume: async (resumeId, mode = 'deep') => {
    const response = await api.post(`/resume/${resumeId}/parse`, { mode })
    return response.data
  },

  // Analyze role (Phase 2)
  analyzeRole: async (resumeId) => {
    console.log('🔍 API Call: analyzeRole', { resumeId, url: `/resume/${resumeId}/analyze-role` })
    try {
      const response = await api.post(`/resume/${resumeId}/analyze-role`)
      console.log('✅ analyzeRole response:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ analyzeRole error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        code: error.code
      })
      throw error
    }
  },

  // Get matching jobs (Phase 2)
  getMatchingJobs: async (resumeId, options = {}) => {
    const params = new URLSearchParams({
      limit: options.limit || 20,
      minMatchScore: options.minMatchScore || 50,
      includeRemote: options.includeRemote !== false,
      generateAISummaries: options.generateAISummaries !== false,
      useEmbeddings: options.useEmbeddings || false, // Phase 3
    })
    const response = await api.get(`/jobs/match/${resumeId}?${params}`)
    return response.data
  },

  // Get semantic job matches (Phase 3)
  getSemanticMatches: async (resumeId, threshold = 0.70, limit = 20) => {
    const params = new URLSearchParams({ threshold, limit })
    const response = await api.get(`/jobs/semantic-match/${resumeId}?${params}`)
    return response.data
  },

  // Get job details
  getJobDetails: async (jobId, resumeId = null) => {
    const params = resumeId ? `?resumeId=${resumeId}` : ''
    const response = await api.get(`/jobs/${jobId}${params}`)
    return response.data
  },

  // Get similar jobs (Phase 3)
  getSimilarJobs: async (jobId, limit = 5) => {
    const params = new URLSearchParams({ limit })
    const response = await api.get(`/jobs/${jobId}/similar?${params}`)
    return response.data
  },

  // Track job interaction
  trackJobInteraction: async (jobId, resumeId, action) => {
    const response = await api.post(`/jobs/${jobId}/track`, { resumeId, action })
    return response.data
  },

  // Get saved jobs
  getSavedJobs: async (resumeId) => {
    const response = await api.get(`/jobs/saved/${resumeId}`)
    return response.data
  },

  // Get applied jobs
  getAppliedJobs: async (resumeId) => {
    const response = await api.get(`/jobs/applied/${resumeId}`)
    return response.data
  },

  // Generate embedding manually (Phase 3)
  generateEmbedding: async (resumeId) => {
    const response = await api.post(`/resume/${resumeId}/generate-embedding`)
    return response.data
  },

  // Predict job roles (legacy - for backward compatibility)
  predictRoles: async (resumeId) => {
    return resumeAPI.analyzeRole(resumeId)
  },

  // Get skill gaps (legacy)
  getSkillGaps: async (resumeId, roleId) => {
    const response = await api.post('/analysis/skill-gaps', { resumeId, roleId })
    return response.data
  },

  // Get career roadmap (legacy)
  getRoadmap: async (resumeId, roleId) => {
    const response = await api.post('/analysis/roadmap', { resumeId, roleId })
    return response.data
  },

  // Get learning resources (legacy)
  getResources: async (skills) => {
    const response = await api.post('/analysis/resources', { skills })
    return response.data
  },

  // Get salary boost suggestions (legacy)
  getSalaryBoost: async (resumeId, roleId) => {
    const response = await api.post('/analysis/salary-boost', { resumeId, roleId })
    return response.data
  },
}

export default api
