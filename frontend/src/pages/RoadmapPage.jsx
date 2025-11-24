import { useState } from 'react'
import { motion } from 'framer-motion'
import { Target, BookOpen, Code, Video, FileText, ExternalLink, CheckCircle, Search } from 'lucide-react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Navbar from '../components/ui/Navbar'
import Footer from '../components/ui/Footer'
import roadmapResources from '../roadmapresources.js'

const RoadmapPage = () => {
  const [selectedRole, setSelectedRole] = useState('')
  const [customSkills, setCustomSkills] = useState([])
  const [generatedRoadmap, setGeneratedRoadmap] = useState(null)

  // Available job roles with their required skills
  const jobRoles = {
    'Frontend Developer': ['react', 'javascript', 'html_css', 'typescript', 'git'],
    'Full Stack Developer': ['react', 'nodejs', 'javascript', 'html_css', 'sql', 'mongodb', 'git', 'api_backend'],
    'Backend Developer': ['nodejs', 'javascript', 'sql', 'mongodb', 'git', 'api_backend', 'algorithms'],
    'MERN Stack Developer': ['mongodb', 'react', 'nodejs', 'javascript', 'git', 'api_backend'],
    'Web Developer': ['react', 'javascript', 'html_css', 'nodejs', 'git', 'sql'],
    'JavaScript Developer': ['javascript', 'react', 'nodejs', 'typescript', 'git'],
    'Software Engineer': ['javascript', 'typescript', 'algorithms', 'git', 'api_backend', 'sql'],
    'React Developer': ['react', 'javascript', 'html_css', 'typescript', 'git', 'api_backend'],
    'Node.js Developer': ['nodejs', 'javascript', 'typescript', 'sql', 'mongodb', 'git', 'api_backend'],
    'Database Developer': ['sql', 'mongodb', 'nodejs', 'git', 'algorithms'],
    'API Developer': ['nodejs', 'javascript', 'api_backend', 'sql', 'mongodb', 'git', 'typescript'],
    'TypeScript Developer': ['typescript', 'javascript', 'nodejs', 'react', 'git', 'api_backend'],
    'UI/UX Developer': ['react', 'html_css', 'javascript', 'typescript', 'git'],
    'Web Designer & Developer': ['html_css', 'javascript', 'react', 'git'],
    'Junior Developer': ['javascript', 'html_css', 'git', 'react', 'nodejs'],
    'Mobile Web Developer': ['react', 'javascript', 'html_css', 'typescript', 'api_backend', 'git'],
    'Solutions Developer': ['javascript', 'nodejs', 'react', 'sql', 'mongodb', 'git', 'api_backend', 'algorithms'],
    'Technical Lead': ['javascript', 'typescript', 'react', 'nodejs', 'sql', 'mongodb', 'git', 'api_backend', 'algorithms'],
  }

  const difficultyColors = {
    easy: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
    medium: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
    hard: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
  }

  const handleGenerateRoadmap = () => {
    if (!selectedRole) return

    const requiredSkills = jobRoles[selectedRole]
    const roadmapData = requiredSkills.map(skillKey => ({
      skillKey,
      ...roadmapResources[skillKey]
    }))

    setGeneratedRoadmap({
      role: selectedRole,
      skills: roadmapData
    })
  }

  const getResourceIcon = (type) => {
    switch(type) {
      case 'video': return <Video className="w-4 h-4" />
      case 'course': return <BookOpen className="w-4 h-4" />
      case 'docs': return <FileText className="w-4 h-4" />
      default: return <ExternalLink className="w-4 h-4" />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Career Roadmap Generator
          </h1>
          <p className="text-xl text-gray-600">
            Choose your target role and get a personalized learning path
          </p>
        </motion.div>

        {/* Role Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="mb-8">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Target className="w-6 h-6 text-blue-600" />
                Select Your Target Role
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {Object.keys(jobRoles).map((role) => (
                  <button
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      selectedRole === role
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300 bg-white'
                    }`}
                  >
                    <div className="font-semibold text-gray-900 mb-2">{role}</div>
                    <div className="text-sm text-gray-600">
                      {jobRoles[role].length} skills required
                    </div>
                  </button>
                ))}
              </div>

              <Button
                onClick={handleGenerateRoadmap}
                disabled={!selectedRole}
                className="w-full md:w-auto"
              >
                <Search className="w-4 h-4 mr-2" />
                Generate Roadmap
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Generated Roadmap */}
        {generatedRoadmap && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            {/* Role Header */}
            <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <div className="p-6">
                <h2 className="text-3xl font-bold mb-2">
                  {generatedRoadmap.role} Learning Path
                </h2>
                <p className="text-white/90">
                  Master {generatedRoadmap.skills.length} essential skills for your career
                </p>
              </div>
            </Card>

            {/* Skills Roadmap */}
            {generatedRoadmap.skills.map((skill, index) => {
              const colors = difficultyColors[skill.difficulty] || difficultyColors.medium
              
              return (
                <motion.div
                  key={skill.skillKey}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                >
                  <Card>
                    <div className="p-6">
                      {/* Skill Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-2xl font-bold text-gray-900 capitalize">
                              {skill.skillKey.replace('_', ' & ')}
                            </h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors.bg} ${colors.text} ${colors.border} border`}>
                              {skill.difficulty}
                            </span>
                          </div>
                          <p className="text-gray-600">{skill.description}</p>
                        </div>
                        <div className="text-blue-600 font-bold text-lg ml-4">
                          Step {index + 1}
                        </div>
                      </div>

                      {/* Core Topics */}
                      <div className="mb-6">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <Code className="w-5 h-5 text-blue-600" />
                          Core Topics to Learn
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {skill.core_topics.map((topic, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-gray-700">
                              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                              <span>{topic}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Learning Resources */}
                      <div className="mb-6">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <BookOpen className="w-5 h-5 text-purple-600" />
                          Learning Resources
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {skill.resources.map((resource, idx) => (
                            <a
                              key={idx}
                              href={resource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-start gap-2 p-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all group"
                            >
                              <div className="mt-1 text-gray-500 group-hover:text-blue-600">
                                {getResourceIcon(resource.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 text-sm group-hover:text-blue-600 truncate">
                                  {resource.title}
                                </div>
                                <div className="text-xs text-gray-500 capitalize">
                                  {resource.type}
                                </div>
                              </div>
                              <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-blue-600 flex-shrink-0 mt-1" />
                            </a>
                          ))}
                        </div>
                      </div>

                      {/* Practice Tasks */}
                      <div className="mb-6">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <Target className="w-5 h-5 text-orange-600" />
                          Practice Tasks
                        </h4>
                        <div className="space-y-2">
                          {skill.practice_tasks.map((task, idx) => (
                            <div key={idx} className="flex items-start gap-2 p-3 bg-orange-50 rounded-lg">
                              <span className="font-semibold text-orange-600 text-sm">
                                {idx + 1}.
                              </span>
                              <span className="text-gray-700">{task}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Projects */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <Code className="w-5 h-5 text-green-600" />
                          Build These Projects
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {skill.projects.map((project, idx) => (
                            <div
                              key={idx}
                              className="p-4 bg-green-50 rounded-lg border border-green-200"
                            >
                              <div className="font-medium text-green-900 mb-1">
                                Project {idx + 1}
                              </div>
                              <div className="text-sm text-gray-700">{project}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )
            })}

            {/* Success Message */}
            <Card className="bg-gradient-to-r from-green-600 to-teal-600 text-white">
              <div className="p-6 text-center">
                <CheckCircle className="w-12 h-12 mx-auto mb-3" />
                <h3 className="text-2xl font-bold mb-2">
                  You're Ready to Start!
                </h3>
                <p className="text-white/90">
                  Follow this roadmap step by step, complete the practice tasks, and build the projects.
                  Consistency is key to success!
                </p>
              </div>
            </Card>
          </motion.div>
        )}
      </div>

      <Footer />
    </div>
  )
}

export default RoadmapPage
