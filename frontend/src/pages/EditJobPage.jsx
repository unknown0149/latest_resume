import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Briefcase, MapPin, DollarSign, Clock, Building2, FileText, Award, Users, ArrowLeft } from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'

export default function EditJobPage() {
  const navigate = useNavigate()
  const { jobId } = useParams()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    company: {
      name: '',
      logo: '',
      website: '',
      size: '51-200'
    },
    location: {
      city: '',
      state: '',
      country: 'India',
      isRemote: false
    },
    description: '',
    responsibilities: [''],
    requirements: [''],
    employmentType: 'full-time',
    experienceLevel: 'mid',
    experienceYears: {
      min: 2,
      max: 5
    },
    salary: {
      min: 600000,
      max: 1200000,
      currency: 'INR',
      period: 'annually'
    },
    skills: {
      required: [''],
      preferred: [''],
      nice_to_have: ['']
    },
    benefits: [''],
    applicationDeadline: '',
    tags: ['']
  })

  useEffect(() => {
    fetchJobDetails()
  }, [jobId])

  const fetchJobDetails = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/jobs/${jobId}`)
      const job = response.data.job || response.data.data?.job
      
      if (job) {
        setFormData({
          title: job.title || '',
          company: job.company || { name: '', logo: '', website: '', size: '51-200' },
          location: job.location || { city: '', state: '', country: 'United States', isRemote: false },
          description: job.description || '',
          responsibilities: job.responsibilities?.length ? job.responsibilities : [''],
          requirements: job.requirements?.length ? job.requirements : [''],
          employmentType: job.employmentType || 'full-time',
          experienceLevel: job.experienceLevel || 'mid',
          experienceYears: job.experienceYears || { min: 2, max: 5 },
          salary: job.salary || { min: 600000, max: 1200000, currency: 'INR', period: 'annually' },
          skills: {
            required: job.skills?.required?.length ? job.skills.required : [''],
            preferred: job.skills?.preferred?.length ? job.skills.preferred : [''],
            nice_to_have: job.skills?.nice_to_have?.length ? job.skills.nice_to_have : ['']
          },
          benefits: job.benefits?.length ? job.benefits : [''],
          applicationDeadline: job.applicationDeadline ? new Date(job.applicationDeadline).toISOString().split('T')[0] : '',
          tags: job.tags?.length ? job.tags : ['']
        })
      }
    } catch (err) {
      console.error('Failed to fetch job details:', err)
      toast.error('Failed to load job details')
      navigate('/recruiter/jobs')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.')
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent],
          [child]: type === 'checkbox' ? checked : value
        }
      })
    } else {
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : value
      })
    }
  }

  const handleArrayChange = (field, index, value) => {
    const newArray = [...formData[field]]
    newArray[index] = value
    setFormData({ ...formData, [field]: newArray })
  }

  const handleNestedArrayChange = (parent, field, index, value) => {
    const newArray = [...formData[parent][field]]
    newArray[index] = value
    setFormData({
      ...formData,
      [parent]: {
        ...formData[parent],
        [field]: newArray
      }
    })
  }

  const addArrayItem = (field) => {
    setFormData({ ...formData, [field]: [...formData[field], ''] })
  }

  const addNestedArrayItem = (parent, field) => {
    setFormData({
      ...formData,
      [parent]: {
        ...formData[parent],
        [field]: [...formData[parent][field], '']
      }
    })
  }

  const removeArrayItem = (field, index) => {
    const newArray = formData[field].filter((_, i) => i !== index)
    setFormData({ ...formData, [field]: newArray })
  }

  const removeNestedArrayItem = (parent, field, index) => {
    const newArray = formData[parent][field].filter((_, i) => i !== index)
    setFormData({
      ...formData,
      [parent]: {
        ...formData[parent],
        [field]: newArray
      }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      // Filter out empty strings from arrays
      const cleanedData = {
        ...formData,
        responsibilities: formData.responsibilities.filter(r => r.trim()),
        requirements: formData.requirements.filter(r => r.trim()),
        benefits: formData.benefits.filter(b => b.trim()),
        tags: formData.tags.filter(t => t.trim()),
        skills: {
          required: formData.skills.required.filter(s => s.trim()),
          preferred: formData.skills.preferred.filter(s => s.trim()),
          nice_to_have: formData.skills.nice_to_have.filter(s => s.trim())
        }
      }

      const response = await api.put(`/jobs/${jobId}`, cleanedData)

      if (response.data.success) {
        toast.success('Job updated successfully!')
        navigate('/recruiter/jobs')
      } else {
        toast.error(response.data.message || 'Failed to update job')
      }
    } catch (err) {
      console.error('Failed to update job:', err)
      toast.error(err.response?.data?.message || 'Failed to update job')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate('/recruiter/jobs')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Jobs
        </button>

        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Edit Job Posting</h1>
          
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Reuse the same form fields from PostJobPage */}
            {/* Basic Information */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Basic Information
              </h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Job Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Senior Full Stack Developer"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Employment Type *</label>
                  <select
                    name="employmentType"
                    value={formData.employmentType}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="full-time">Full-time</option>
                    <option value="part-time">Part-time</option>
                    <option value="contract">Contract</option>
                    <option value="internship">Internship</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Experience Level *</label>
                  <select
                    name="experienceLevel"
                    value={formData.experienceLevel}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="entry">Entry Level</option>
                    <option value="mid">Mid Level</option>
                    <option value="senior">Senior Level</option>
                    <option value="lead">Lead</option>
                    <option value="executive">Executive</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-6">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {submitting ? 'Updating...' : 'Update Job'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/recruiter/jobs')}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
