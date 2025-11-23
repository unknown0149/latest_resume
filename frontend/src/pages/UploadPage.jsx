import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sparkles, ArrowRight } from 'lucide-react'
import Navbar from '../components/ui/Navbar'
import Footer from '../components/ui/Footer'
import FileUpload from '../components/ui/FileUpload'
import Button from '../components/ui/Button'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { useResumeContext } from '../hooks/useResumeContext'
import { resumeAPI } from '../services/api'
import { parseResumeText } from '../utils/resumeParser'
import { mockPredictedRoles, mockSkillGaps, mockSalaryBoost, mockRoadmap, mockResources } from '../mocks/data'

const UploadPage = () => {
  const navigate = useNavigate()
  const [file, setFile] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState(null)
  const { 
    setUploadedResume, 
    setParsedResume, 
    setPredictedRoles,
    setMatchedJobs,
    setSkillGaps,
    setSalaryBoost,
    setRoadmap,
    setResources
  } = useResumeContext()

  // Check authentication on mount
  useEffect(() => {
    const isAuthenticated = localStorage.getItem('isAuthenticated')
    if (!isAuthenticated) {
      navigate('/login')
    }
  }, [navigate])

  const handleFileSelect = (selectedFile) => {
    setFile(selectedFile)
    setError(null)
  }

  const handleAnalyze = async () => {
    if (!file) return

    setIsAnalyzing(true)
    setError(null)

    try {
      // Step 1: Upload resume to backend
      console.log('📤 Uploading resume...')
      const uploadResponse = await resumeAPI.uploadResume(file)
      console.log('✅ Upload response:', uploadResponse)
      
      const resumeId = uploadResponse.resumeId

      // Step 2: Parse resume with deep analysis
      console.log('🔍 Parsing resume...')
      const parseResponse = await resumeAPI.parseResume(resumeId, 'deep')
      console.log('✅ Parse response:', parseResponse)

      // Step 3: Analyze role and get predictions
      console.log('🎯 Analyzing role...')
      const roleResponse = await resumeAPI.analyzeRole(resumeId)
      console.log('✅ Role response:', roleResponse)

      // Step 4: Get job matches with hybrid scoring
      console.log('💼 Finding matching jobs...')
      const jobsResponse = await resumeAPI.getMatchingJobs(resumeId, {
        limit: 20,
        minMatchScore: 50,
        useEmbeddings: true, // Use Phase 3 hybrid scoring
        generateAISummaries: true,
      })
      console.log('✅ Jobs response:', jobsResponse)

      // Store all data in context
      setUploadedResume(file)
      setParsedResume({
        resumeId,
        ...uploadResponse,
        parsed_resume: parseResponse.parsed_resume,
        metadata: parseResponse.metadata,
      })
      
      // Store role analysis data
      if (roleResponse.success && roleResponse.data) {
        const { rolePrediction, skillAnalysis, recommendations } = roleResponse.data
        
        setPredictedRoles({
          primaryRole: rolePrediction.primaryRole,
          alternativeRoles: rolePrediction.alternativeRoles,
          confidence: rolePrediction.primaryRole.confidence
        })
        
        setSkillGaps({
          skillsHave: skillAnalysis.skillsHave,
          skillsMissing: skillAnalysis.skillsMissing,
          skillGapSummary: skillAnalysis.skillGapSummary
        })
        
        // Transform salary boost opportunities to match frontend format
        const transformedSalaryBoost = (skillAnalysis.salaryBoostOpportunities || []).map((boost, idx) => ({
          id: idx + 1,
          title: `Learn ${boost.skill}`,
          impact: typeof boost.impact === 'string' ? `+${boost.impact} annually` : '+$15k - $25k annually',
          timeframe: '2-4 months',
          priority: boost.type === 'framework' || boost.type === 'language' ? 'High' : 'Medium',
          description: `${boost.skill} is a high-impact skill that can significantly increase your earning potential.`
        }))
        setSalaryBoost(transformedSalaryBoost)
        setRoadmap(recommendations || [])
        setResources([]) // Resources can be generated client-side based on missing skills
      }
      
      // Store matched jobs
      if (jobsResponse.success && jobsResponse.data) {
        setMatchedJobs(jobsResponse.data.matches || [])
      }

      console.log('✅ Analysis complete! Navigating to dashboard...')
      setIsAnalyzing(false)
      navigate('/dashboard')
    } catch (err) {
      console.error('❌ Analysis error:', err)
      console.error('Error details:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        message: err.message,
        code: err.code
      })
      
      setIsAnalyzing(false)
      
      // Provide helpful error messages
      let errorMessage = 'Failed to analyze resume. Please try again.'
      
      if (err.code === 'ECONNREFUSED' || err.code === 'ERR_NETWORK') {
        errorMessage = '❌ Cannot connect to backend server. Make sure the backend is running on http://localhost:8000'
      } else if (err.response?.status === 404) {
        errorMessage = '❌ Resume not found. Please upload your resume again.'
      } else if (err.response?.status === 500) {
        errorMessage = `❌ Server error: ${err.response?.data?.error || 'Internal server error'}`
      } else if (err.response?.data?.error) {
        errorMessage = `❌ ${err.response.data.error}`
      } else if (err.message) {
        errorMessage = `❌ ${err.message}`
      }
      
      setError(errorMessage)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Navbar />
      
      <div className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 rounded-full text-purple-600 text-sm font-semibold mb-6">
              <Sparkles className="w-4 h-4" />
              AI-Powered Analysis
            </div>
            
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Upload Your Resume
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Our AI will analyze your resume and provide personalized insights, 
              job recommendations, and a complete career roadmap
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <FileUpload onFileSelect={handleFileSelect} />
          </motion.div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg"
            >
              <p className="text-red-600 text-center">{error}</p>
            </motion.div>
          )}

          {file && !isAnalyzing && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mt-8 text-center"
            >
              <Button size="lg" onClick={handleAnalyze}>
                <Sparkles className="w-5 h-5 mr-2" />
                Analyze with AI
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </motion.div>
          )}

          {isAnalyzing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-12 text-center"
            >
              <div className="bg-white rounded-2xl shadow-xl p-12">
                <LoadingSpinner size="xl" className="mb-6" />
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Analyzing Your Resume...
                </h3>
                <p className="text-gray-600 mb-6">
                  Our AI is processing your resume and generating insights
                </p>
                <div className="max-w-md mx-auto space-y-3">
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-gray-600">Parsing resume content</span>
                  </div>
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-gray-600">Predicting job roles</span>
                  </div>
                  <div className="flex items-center gap-3 text-left">
                    <LoadingSpinner size="sm" />
                    <span className="text-gray-600">Analyzing skill gaps</span>
                  </div>
                  <div className="flex items-center gap-3 text-left text-gray-400">
                    <div className="w-6 h-6 rounded-full border-2 border-gray-300"></div>
                    <span>Generating roadmap</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Features */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Instant Analysis</h3>
              <p className="text-sm text-gray-600">Results in under 30 seconds</p>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Secure & Private</h3>
              <p className="text-sm text-gray-600">Your data is encrypted</p>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                  <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Detailed Insights</h3>
              <p className="text-sm text-gray-600">Comprehensive analysis</p>
            </div>
          </motion.div>
        </div>
      </div>

      <Footer />
    </div>
  )
}

export default UploadPage
