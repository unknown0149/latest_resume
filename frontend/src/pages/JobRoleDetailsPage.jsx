import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Briefcase, MapPin, IndianRupee, XCircle, Target, Lightbulb, ExternalLink, BadgeCheck, Users } from 'lucide-react'
import { motion } from 'framer-motion'
import Navbar from '../components/ui/Navbar'
import Footer from '../components/ui/Footer'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import SkillGapChart from '../components/dashboard/SkillGapChart'
import { useResumeContext } from '../hooks/useResumeContext'

const JobRoleDetailsPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { skillGaps, parsedResume } = useResumeContext()
  const role = location.state?.role

  if (!role) {
    navigate('/dashboard')
    return null
  }

  const job = role.job || role;
  const matchedSkills = Array.isArray(role.matchedSkills) ? role.matchedSkills : []
  const missingSkills = Array.isArray(role.missingSkills) ? role.missingSkills : []
  const requiredSkills = Array.isArray(role.requiredSkills) ? role.requiredSkills : []
  const applicationUrl = job.applicationUrl || role.applicationUrl;
  const roleSkillGaps = skillGaps?.[role.id]
  const applicationsCount = job.applications ?? 0

  const verifiedSkillSet = useMemo(() => {
    const set = new Set()
    const pushSkill = (skillName) => {
      if (!skillName || typeof skillName !== 'string') {
        return
      }
      const normalized = skillName.trim().toLowerCase()
      if (!normalized || set.has(normalized)) {
        return
      }
      set.add(normalized)
    }

    const ownedSkills = Array.isArray(skillGaps?.skillsHave) ? skillGaps.skillsHave : []
    ownedSkills
      .filter((skill) => skill?.verified)
      .forEach((skill) => pushSkill(skill.skill || skill.name || skill.title))

    const verificationStatusSkills = parsedResume?.parsed_resume?.verification_status?.verifiedSkills || []
    verificationStatusSkills.forEach((skill) => pushSkill(skill.skill || skill.name || skill.title))

    return set
  }, [skillGaps, parsedResume])

  const verifiedMatchedSkills = useMemo(() => {
    if (!verifiedSkillSet.size) {
      return []
    }
    return matchedSkills.filter((skill) => typeof skill === 'string' && verifiedSkillSet.has(skill.toLowerCase()))
  }, [matchedSkills, verifiedSkillSet])
  
  // Format salary with currency symbol
  const toInr = (value, currency) => {
    if (!value) return 0
    if (currency && currency.toUpperCase() === 'USD') {
      return Math.round(value * 83)
    }
    return value
  }

  const formatSalary = (salaryObj) => {
    if (!salaryObj) return role.salary
    const min = toInr(salaryObj.min, salaryObj.currency)
    const max = toInr(salaryObj.max, salaryObj.currency)
    const format = (val) => (val ? `₹${val.toLocaleString('en-IN')}` : null)
    if (min && max) return `${format(min)} - ${format(max)}`
    if (min) return `From ${format(min)}`
    if (max) return `Up to ${format(max)}`
    return role.salary || 'Not specified'
  }
  
  const displaySalary = formatSalary(job.salary);

  const projectSuggestions = [
    'Build a full-stack e-commerce platform with microservices architecture',
    'Create a real-time chat application using WebSockets',
    'Develop a CI/CD pipeline with automated testing and deployment',
    'Design and implement a scalable REST API with authentication',
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="pt-24 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-primary-600 mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Card gradient className="mb-8">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                      role.matchPercentage >= 90 
                        ? 'bg-green-100 text-green-700'
                        : role.matchPercentage >= 75
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}>
                      {role.matchPercentage}% Match
                    </span>
                  </div>
                  
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">{role.title}</h1>
                  <p className="text-lg text-gray-600 mb-6">{role.description}</p>
                  
                  <div className="flex flex-wrap items-center gap-6 text-gray-600">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-5 h-5" />
                      <span className="font-medium">{role.company}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-5 h-5" />
                      <span>{role.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-primary-600 font-semibold">
                      <IndianRupee className="w-5 h-5" />
                      <span>{displaySalary}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex-shrink-0">
                  {applicationUrl ? (
                    <Button 
                      size="lg"
                      onClick={() => window.open(applicationUrl, '_blank', 'noopener,noreferrer')}
                    >
                      Apply to Job
                      <ExternalLink className="w-5 h-5 ml-2" />
                    </Button>
                  ) : (
                    <Button size="lg" disabled>
                      No Application Link
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-8">
              {/* Skills Breakdown */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <Card>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Skills Breakdown</h2>
                  
                  <div className="space-y-6">
                    {/* Matched Skills */}
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <BadgeCheck className="w-5 h-5 text-emerald-600" />
                        Verified Skills You Have ({verifiedMatchedSkills.length})
                      </h3>
                      {verifiedMatchedSkills.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {verifiedMatchedSkills.map((skill, idx) => (
                            <span
                              key={`${skill}-${idx}`}
                              className="px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium border border-emerald-200"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">
                          None of your verified skills are matched yet. Complete more verifications to showcase them here.
                        </p>
                      )}
                    </div>

                    {/* Missing Skills */}
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <XCircle className="w-5 h-5 text-red-600" />
                        Skills to Learn ({missingSkills.length})
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {missingSkills.map((skill, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium border border-red-200"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>

              {/* Skill Gap Chart */}
              {roleSkillGaps?.chartData && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  <SkillGapChart data={roleSkillGaps.chartData} type="radar" />
                </motion.div>
              )}

              {/* Project Suggestions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <Card>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Lightbulb className="w-6 h-6 text-yellow-500" />
                    Recommended Projects
                  </h2>
                  <p className="text-gray-600 mb-6">
                    Build these projects to demonstrate your skills and stand out to employers
                  </p>
                  <div className="space-y-3">
                    {projectSuggestions.map((project, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100"
                      >
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-500 text-white flex items-center justify-center text-sm font-bold mt-0.5">
                          {idx + 1}
                        </div>
                        <p className="text-gray-700 font-medium">{project}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Quick Stats */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <Card>
                  <h3 className="font-bold text-gray-900 mb-4">Quick Stats</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Total Skills</span>
                      <span className="font-bold text-gray-900">{requiredSkills.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">You Have</span>
                      <span className="font-bold text-emerald-600">{verifiedMatchedSkills.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">To Learn</span>
                      <span className="font-bold text-red-600">{missingSkills.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Applicants</span>
                      <span className="font-bold text-gray-900 flex items-center gap-1">
                        <Users className="w-4 h-4 text-gray-500" />
                        {applicationsCount}
                      </span>
                    </div>
                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-600">Match Score</span>
                        <span className="font-bold text-primary-600">{role.matchPercentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-gradient-primary rounded-full h-3 transition-all duration-500"
                          style={{ width: `${role.matchPercentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>

              {/* Learning Path */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <Card>
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary-500" />
                    Learning Path
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Estimated time to reach 100% match
                  </p>
                  <div className="space-y-3">
                    {roleSkillGaps?.missing?.map((skill, idx) => (
                      <div key={idx} className="border-l-4 border-orange-500 pl-3">
                        <p className="font-medium text-gray-900">{skill.name}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                          <span className={`px-2 py-0.5 rounded-full ${
                            skill.priority === 'High' 
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {skill.priority}
                          </span>
                          <span>{skill.estimatedLearningTime}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}

export default JobRoleDetailsPage
