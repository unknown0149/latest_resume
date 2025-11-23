import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LayoutDashboard, Users, TrendingUp, BookOpen, Map, FileText, BarChart3, Upload } from 'lucide-react'
import Navbar from '../components/ui/Navbar'
import Footer from '../components/ui/Footer'
import Button from '../components/ui/Button'
import JobRoleCard from '../components/dashboard/JobRoleCard'
import SkillGapChart from '../components/dashboard/SkillGapChart'
import SalaryBoostList from '../components/dashboard/SalaryBoostList'
import RoadmapTimeline from '../components/dashboard/RoadmapTimeline'
import ResourcesList from '../components/dashboard/ResourcesList'
import ResumeSummaryView from '../components/dashboard/ResumeSummaryView'
import { useResumeContext } from '../hooks/useResumeContext'

const DashboardPage = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const { 
    parsedResume, 
    predictedRoles, 
    matchedJobs,
    skillGaps, 
    salaryBoost, 
    roadmap, 
    resources 
  } = useResumeContext()

  // Redirect to upload if no resume data, or to login if not authenticated
  useEffect(() => {
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true'
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    if (!parsedResume) {
      navigate('/upload')
    }
  }, [parsedResume, navigate])

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'roles', label: 'Job Roles', icon: <Users className="w-4 h-4" /> },
    { id: 'skills', label: 'Skill Gaps', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'salary', label: 'Salary Boost', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'roadmap', label: 'Roadmap', icon: <Map className="w-4 h-4" /> },
    { id: 'resources', label: 'Resources', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'resume', label: 'Resume', icon: <FileText className="w-4 h-4" /> },
  ]

  const handleRoleClick = (role) => {
    navigate(`/job-role/${role.id}`, { state: { role } })
  }

  // Show loading or empty state if no data
  if (!parsedResume) {
    return null // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="pt-20">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary-500 to-purple-600 text-white py-12 px-4">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl font-bold mb-2">Welcome back, {parsedResume?.name || 'User'}!</h1>
              <p className="text-white/90 text-lg">Here's your personalized career analysis</p>
            </motion.div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-gray-200 sticky top-16 z-40">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex overflow-x-auto scrollbar-hide">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-8"
            >
              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-gray-600 text-sm font-medium">Matching Jobs</h3>
                    <Users className="w-5 h-5 text-primary-500" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{matchedJobs?.length || 0}</p>
                </div>
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-gray-600 text-sm font-medium">Avg Match</h3>
                    <TrendingUp className="w-5 h-5 text-green-500" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">
                    {matchedJobs?.length 
                      ? Math.round(matchedJobs.reduce((sum, j) => sum + (j.matchScore || 0), 0) / matchedJobs.length)
                      : 0}%
                  </p>
                </div>
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-gray-600 text-sm font-medium">Skills to Learn</h3>
                    <BarChart3 className="w-5 h-5 text-orange-500" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">
                    {skillGaps?.skillsMissing?.length || 0}
                  </p>
                </div>
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-gray-600 text-sm font-medium">Learning Resources</h3>
                    <BookOpen className="w-5 h-5 text-purple-500" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{resources?.length || 0}</p>
                </div>
              </div>

              {/* Top Jobs */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Top Matching Jobs</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {matchedJobs?.slice(0, 2).map((job, index) => (
                    <JobRoleCard 
                      key={job.job?._id || job.jobId || index} 
                      role={job} 
                      index={index}
                      onClick={() => handleRoleClick(job)}
                    />
                  ))}
                </div>
              </div>

              {/* Skill Gap Preview */}
              {skillGaps?.skillGapSummary && (
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                  <h3 className="text-xl font-bold mb-4">Skill Gap Summary</h3>
                  <div className="space-y-2">
                    <p>Core Skills: {skillGaps.skillGapSummary.coreSkillsHave} / {skillGaps.skillGapSummary.coreSkillsTotal}</p>
                    <p>Match: {skillGaps.skillGapSummary.coreSkillMatch}%</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'roles' && (
            <motion.div
              key="roles"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Matched Job Listings</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {matchedJobs?.map((job, index) => (
                  <JobRoleCard 
                    key={job.job?._id || job.jobId || index} 
                    role={job} 
                    index={index}
                    onClick={() => handleRoleClick(job)}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'skills' && (
            <motion.div
              key="skills"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              {Object.values(skillGaps)[0]?.chartData && (
                <>
                  <SkillGapChart data={Object.values(skillGaps)[0].chartData} type="bar" />
                  <SkillGapChart data={Object.values(skillGaps)[0].chartData} type="radar" />
                </>
              )}
            </motion.div>
          )}

          {activeTab === 'salary' && (
            <motion.div
              key="salary"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <SalaryBoostList suggestions={salaryBoost} />
            </motion.div>
          )}

          {activeTab === 'roadmap' && (
            <motion.div
              key="roadmap"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <RoadmapTimeline roadmap={roadmap} />
            </motion.div>
          )}

          {activeTab === 'resources' && (
            <motion.div
              key="resources"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <ResourcesList resources={resources} />
            </motion.div>
          )}

          {activeTab === 'resume' && (
            <motion.div
              key="resume"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <ResumeSummaryView resume={parsedResume} />
            </motion.div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  )
}

export default DashboardPage
