import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, MapPin, DollarSign, Clock, Building2, FileText, Award, Users, Sparkles } from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'

export default function PostJobPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
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
      country: 'United States',
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
      min: 60000,
      max: 100000,
      currency: 'USD',
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

  const skillLibrary = [
    'JavaScript','TypeScript','React','Node.js','Next.js','Vue','Angular','HTML','CSS','Tailwind CSS','Sass','Webpack','Vite','Babel','Git','CI/CD','Jest','Cypress','Playwright','React Native','Expo','Flutter','Swift','Kotlin','Java','Spring Boot','Python','Django','Flask','FastAPI','Ruby on Rails','PHP','Laravel','Go','Rust','C#','ASP.NET','SQL','PostgreSQL','MySQL','MongoDB','Redis','GraphQL','REST','gRPC','Kubernetes','Docker','AWS','GCP','Azure','Terraform','Ansible','Kafka','RabbitMQ','Elasticsearch','Snowflake','Airflow','Figma','Jira'
  ]

  const titleLibrary = ['Software Engineer','Full Stack Developer','Frontend Engineer','Backend Engineer','Mobile Engineer','Product Manager','Data Engineer','Data Scientist','ML Engineer','DevOps Engineer','Site Reliability Engineer','QA Engineer','Automation Engineer','UI/UX Designer']

  const cityLibrary = ['Bengaluru','Hyderabad','Mumbai','Pune','Delhi','Gurgaon','Chennai','Kolkata','Noida','San Francisco','New York','London','Singapore','Toronto']
  const stateLibrary = ['Karnataka','Maharashtra','Telangana','Tamil Nadu','Delhi','Uttar Pradesh','California','New York','Texas','Ontario']
  const countryLibrary = ['India','United States','United Kingdom','Canada','Singapore','Germany','Australia','Remote']
  const tagLibrary = ['AI/ML','Data','Cloud','DevOps','Security','Fintech','E-commerce','Healthtech','Edtech','Gaming','IoT','Blockchain','B2B','B2C','SaaS','Marketplace']

  const getSuggestions = (value, list) => {
    const input = value?.toLowerCase?.() || ''
    if (!input) return []
    return list.filter((item) => item.toLowerCase().startsWith(input)).slice(0, 6)
  }

  const SuggestionList = ({ value, list, onSelect }) => {
    const suggestions = getSuggestions(value, list)
    if (!suggestions.length) return null

    return (
      <div className="absolute inset-x-0 top-full mt-1 rounded-lg border border-gray-200 bg-white shadow-lg z-10">
        <div className="max-h-48 overflow-y-auto">
          {suggestions.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onSelect(item)}
              className="w-full text-left px-3 py-2 hover:bg-blue-50"
            >
              <span className="flex items-center gap-2 text-sm text-gray-800">
                <Sparkles className="w-4 h-4 text-blue-500" />
                {item}
              </span>
            </button>
          ))}
        </div>
      </div>
    )
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
    setLoading(true)

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

      // Generate unique jobId
      const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      const response = await api.post('/jobs/create', {
        ...cleanedData,
        jobId,
        status: 'active',
        source: {
          platform: 'manual'
        }
      })

      if (response.data.success) {
        toast.success('Job posted successfully!')
        // Add a small delay before navigating to ensure backend processing completes
        setTimeout(() => {
          navigate('/recruiter/jobs', { replace: true })
        }, 500)
      }
    } catch (error) {
      console.error('Error posting job:', error)
      toast.error(error.response?.data?.message || 'Failed to post job')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Post a New Job</h1>
            <p className="text-gray-600 mt-2">Fill in the details to create a job listing</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="border-b pb-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Basic Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Job Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g. Senior Full Stack Developer"
                    required
                  />
                  <SuggestionList
                    value={formData.title}
                    list={titleLibrary}
                    onSelect={(item) => setFormData({ ...formData, title: item })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Employment Type *
                  </label>
                  <select
                    name="employmentType"
                    value={formData.employmentType}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="full-time">Full Time</option>
                    <option value="part-time">Part Time</option>
                    <option value="contract">Contract</option>
                    <option value="internship">Internship</option>
                    <option value="freelance">Freelance</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Company Information */}
            <div className="border-b pb-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Company Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    name="company.name"
                    value={formData.company.name}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g. TechCorp Inc."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Website
                  </label>
                  <input
                    type="url"
                    name="company.website"
                    value={formData.company.website}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://company.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Size
                  </label>
                  <select
                    name="company.size"
                    value={formData.company.size}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="1-50">1-50 employees</option>
                    <option value="51-200">51-200 employees</option>
                    <option value="201-500">201-500 employees</option>
                    <option value="501-1000">501-1000 employees</option>
                    <option value="1001-5000">1001-5000 employees</option>
                    <option value="5000+">5000+ employees</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="border-b pb-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Location
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    name="location.city"
                    value={formData.location.city}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g. San Francisco"
                  />
                  <SuggestionList
                    value={formData.location.city}
                    list={cityLibrary}
                    onSelect={(item) => setFormData({
                      ...formData,
                      location: { ...formData.location, city: item }
                    })}
                  />
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State
                  </label>
                  <input
                    type="text"
                    name="location.state"
                    value={formData.location.state}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g. CA"
                  />
                  <SuggestionList
                    value={formData.location.state}
                    list={stateLibrary}
                    onSelect={(item) => setFormData({
                      ...formData,
                      location: { ...formData.location, state: item }
                    })}
                  />
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country
                  </label>
                  <input
                    type="text"
                    name="location.country"
                    value={formData.location.country}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <SuggestionList
                    value={formData.location.country}
                    list={countryLibrary}
                    onSelect={(item) => setFormData({
                      ...formData,
                      location: { ...formData.location, country: item }
                    })}
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="location.isRemote"
                    checked={formData.location.isRemote}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Remote Position</span>
                </label>
              </div>
            </div>

            {/* Experience & Salary */}
            <div className="border-b pb-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Award className="w-5 h-5" />
                Experience & Compensation
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Experience Level
                  </label>
                  <select
                    name="experienceLevel"
                    value={formData.experienceLevel}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="entry">Entry Level</option>
                    <option value="mid">Mid Level</option>
                    <option value="senior">Senior Level</option>
                    <option value="lead">Lead</option>
                    <option value="executive">Executive</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Min Years
                    </label>
                    <input
                      type="number"
                      name="experienceYears.min"
                      value={formData.experienceYears.min}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Years
                    </label>
                    <input
                      type="number"
                      name="experienceYears.max"
                      value={formData.experienceYears.max}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Min Salary ($)
                    </label>
                    <input
                      type="number"
                      name="salary.min"
                      value={formData.salary.min}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                      step="1000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Salary ($)
                    </label>
                    <input
                      type="number"
                      name="salary.max"
                      value={formData.salary.max}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                      step="1000"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Job Description */}
            <div className="border-b pb-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Job Description
              </h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="6"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe the role and company..."
                  required
                />
              </div>
            </div>

            {/* Skills Required */}
            <div className="border-b pb-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Required Skills *
              </h2>
              
              <div className="space-y-3">
                {formData.skills.required.map((skill, index) => (
                  <div key={index} className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={skill}
                        onChange={(e) => handleNestedArrayChange('skills', 'required', index, e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g. JavaScript, React, Node.js"
                      />
                      <SuggestionList
                        value={skill}
                        list={skillLibrary}
                        onSelect={(item) => handleNestedArrayChange('skills', 'required', index, item)}
                      />
                    </div>
                    {formData.skills.required.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeNestedArrayItem('skills', 'required', index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addNestedArrayItem('skills', 'required')}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  + Add Skill
                </button>
              </div>
            </div>

            {/* Preferred Skills */}
            <div className="border-b pb-6">
              <h2 className="text-xl font-semibold mb-4">Preferred Skills</h2>
              
              <div className="space-y-3">
                {formData.skills.preferred.map((skill, index) => (
                  <div key={index} className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={skill}
                        onChange={(e) => handleNestedArrayChange('skills', 'preferred', index, e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g. TypeScript, GraphQL"
                      />
                      <SuggestionList
                        value={skill}
                        list={skillLibrary}
                        onSelect={(item) => handleNestedArrayChange('skills', 'preferred', index, item)}
                      />
                    </div>
                    {formData.skills.preferred.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeNestedArrayItem('skills', 'preferred', index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addNestedArrayItem('skills', 'preferred')}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  + Add Preferred Skill
                </button>
              </div>
            </div>

            {/* Nice to have Skills */}
            <div className="border-b pb-6">
              <h2 className="text-xl font-semibold mb-4">Nice-to-have Skills</h2>
              
              <div className="space-y-3">
                {formData.skills.nice_to_have.map((skill, index) => (
                  <div key={index} className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={skill}
                        onChange={(e) => handleNestedArrayChange('skills', 'nice_to_have', index, e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g. Docker, Terraform"
                      />
                      <SuggestionList
                        value={skill}
                        list={skillLibrary}
                        onSelect={(item) => handleNestedArrayChange('skills', 'nice_to_have', index, item)}
                      />
                    </div>
                    {formData.skills.nice_to_have.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeNestedArrayItem('skills', 'nice_to_have', index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addNestedArrayItem('skills', 'nice_to_have')}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  + Add Nice-to-have Skill
                </button>
              </div>
            </div>

            {/* Responsibilities */}
            <div className="border-b pb-6">
              <h2 className="text-xl font-semibold mb-4">Responsibilities</h2>
              
              <div className="space-y-3">
                {formData.responsibilities.map((resp, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={resp}
                      onChange={(e) => handleArrayChange('responsibilities', index, e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g. Develop and maintain web applications"
                    />
                    {formData.responsibilities.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeArrayItem('responsibilities', index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addArrayItem('responsibilities')}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  + Add Responsibility
                </button>
              </div>
            </div>

            {/* Requirements */}
            <div className="border-b pb-6">
              <h2 className="text-xl font-semibold mb-4">Requirements</h2>
              
              <div className="space-y-3">
                {formData.requirements.map((req, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={req}
                      onChange={(e) => handleArrayChange('requirements', index, e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g. Bachelor's degree in Computer Science"
                    />
                    {formData.requirements.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeArrayItem('requirements', index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addArrayItem('requirements')}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  + Add Requirement
                </button>
              </div>
            </div>

            {/* Benefits */}
            <div className="border-b pb-6">
              <h2 className="text-xl font-semibold mb-4">Benefits</h2>
              
              <div className="space-y-3">
                {formData.benefits.map((benefit, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={benefit}
                      onChange={(e) => handleArrayChange('benefits', index, e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g. Health insurance, 401k, Remote work"
                    />
                    {formData.benefits.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeArrayItem('benefits', index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addArrayItem('benefits')}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  + Add Benefit
                </button>
              </div>
            </div>

            {/* Tags */}
            <div className="border-b pb-6">
              <h2 className="text-xl font-semibold mb-4">Tags</h2>
              
              <div className="space-y-3">
                {formData.tags.map((tag, index) => (
                  <div key={index} className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={tag}
                        onChange={(e) => handleArrayChange('tags', index, e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g. AI/ML, Fintech"
                      />
                      <SuggestionList
                        value={tag}
                        list={tagLibrary}
                        onSelect={(item) => handleArrayChange('tags', index, item)}
                      />
                    </div>
                    {formData.tags.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeArrayItem('tags', index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addArrayItem('tags')}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  + Add Tag
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-6">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {loading ? 'Posting Job...' : 'Post Job'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/recruiter')}
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
