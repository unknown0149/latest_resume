import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sparkles, ArrowRight, ShieldCheck, Cpu, BarChart3 } from 'lucide-react'
import Navbar from '../components/ui/Navbar'
import Footer from '../components/ui/Footer'
import FileUpload from '../components/ui/FileUpload'
import Button from '../components/ui/Button'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { useResumeContext } from '../hooks/useResumeContext'
import { useAuth } from '../hooks/useAuth'
import { resumeAPI } from '../services/api'

const UploadPage = () => {
  const navigate = useNavigate()
  const { isAuthenticated, loading } = useAuth()
  const [file, setFile] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState(null)
  const [heroStats, setHeroStats] = useState([])
  const [previewRoles, setPreviewRoles] = useState([])
  const [salarySignals, setSalarySignals] = useState([])
  const {
    setResumeId,
    setUploadedResume,
    setParsedResume,
    setPredictedRoles,
    setMatchedJobs,
    skillGaps,
    setSkillGaps,
    setSalaryBoost,
    setRoadmap,
    setResources,
    setWatsonSummary,
    resetAnalysis
  } = useResumeContext()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login', { replace: true })
    }
  }, [loading, isAuthenticated, navigate])

  const handleFileSelect = (selectedFile) => {
    setFile(selectedFile)
    setError(null)
    resetAnalysis()
    setHeroStats([])
    setPreviewRoles([])
    setSalarySignals([])
  }

  const handleAnalyze = async () => {
    if (!file) return

    setIsAnalyzing(true)
    setError(null)
    setHeroStats([])
    setPreviewRoles([])
    setSalarySignals([])

    let resumeId = null

    try {
      console.log('📤 Uploading resume...')
      const uploadResponse = await resumeAPI.uploadResume(file)
      console.log('✅ Upload response:', uploadResponse)

      resumeId = uploadResponse.resumeId
      setResumeId(resumeId)

      console.log('🔍 Parsing resume...')
      const parseResponse = await resumeAPI.parseResume(resumeId, 'deep')
      console.log('✅ Parse response:', parseResponse)

      console.log('🎯 Analyzing role...')
      const roleResponse = await resumeAPI.analyzeRole(resumeId)
      console.log('✅ Role response:', roleResponse)

      console.log('💼 Finding matching jobs...')
      const jobsResponse = await resumeAPI.getMatchingJobs(resumeId, {
        limit: 20,
        minMatchScore: 50,
        useEmbeddings: true,
        generateAISummaries: true,
      })
      console.log('✅ Jobs response:', jobsResponse)

      // Set all context data
      setUploadedResume(file)
      
      const parsedResumeData = {
        resumeId,
        ...uploadResponse,
        parsed_resume: parseResponse.parsed_resume,
        metadata: parseResponse.metadata,
      }
      setParsedResume(parsedResumeData)

      if (roleResponse.success && roleResponse.data) {
        const { rolePrediction, skillAnalysis, recommendations: salaryBoostRecommendations, roadmap, watsonSummary } = roleResponse.data
        
        // Save Watson AI summary
        if (watsonSummary) {
          setWatsonSummary(watsonSummary)
        }
        
        const normalizedRoles = [rolePrediction.primaryRole, ...(rolePrediction.alternativeRoles || [])].filter(Boolean)
        setPredictedRoles(normalizedRoles)
        
        // Transform skills data for chart visualization with REAL proficiency levels
        const allSkills = new Map()
        
        // Get skill verifications from resume if available
        const skillVerifications = parseResponse.parsed_resume?.profile?.skillVerifications || []
        const verificationMap = new Map(skillVerifications.map(v => [v.skill.toLowerCase(), v]))
        
        // Add skills you have with actual proficiency from backend (0-100)
        skillAnalysis.skillsHave?.forEach(skillObj => {
          const skillName = skillObj.skill || skillObj
          const verification = verificationMap.get(skillName.toLowerCase())
          const verificationScore = verification?.score
          const hasNumericScore = typeof verificationScore === 'number' && !Number.isNaN(verificationScore)
          const proficiency = hasNumericScore ? verificationScore : null

          allSkills.set(skillName, {
            skill: skillName,
            current: hasNumericScore ? verificationScore : 0,
            required: 100,
            level: skillObj.level || 'Intermediate',
            verified: verification?.verified || false,
            verificationScore: verificationScore || null,
            needsVerification: !hasNumericScore
          })
        })

        // Re-attach previously verified skills from cache even if resume text omitted them
        const previousVerified = (skillGaps?.skillsHave || []).filter(entry => entry?.verified)
        previousVerified.forEach(prev => {
          const name = prev.skill || prev.name
          if (!name) return
          const key = name.toLowerCase()
          if (!allSkills.has(name)) {
            const prevScore = prev.verificationScore || prev.score
            allSkills.set(name, {
              skill: name,
              current: typeof prevScore === 'number' ? prevScore : 0,
              required: 100,
              level: prev.level || 'Verified',
              verified: true,
              verificationScore: typeof prevScore === 'number' ? prevScore : null,
              needsVerification: !(typeof prevScore === 'number')
            })
          } else {
            const existing = allSkills.get(name)
            const mergedScore = existing.verificationScore || prev.verificationScore || prev.score
            allSkills.set(name, {
              ...existing,
              verified: true,
              verificationScore: typeof mergedScore === 'number' ? mergedScore : existing.verificationScore || null,
              needsVerification: !(typeof mergedScore === 'number')
            })
          }
          // Also seed verification map so downstream enrichedSkillsHave marks it verified
          if (!verificationMap.has(key)) {
            verificationMap.set(key, { skill: name, verified: true, score: prev.verificationScore || prev.score })
          }
        })
        
        // Add missing skills with proficiency = 0
        skillAnalysis.skillsMissing?.forEach(skillObj => {
          const skillName = skillObj.skill || skillObj
          if (!allSkills.has(skillName)) {
            allSkills.set(skillName, {
              skill: skillName,
              current: skillObj.proficiency || 0, // Missing = 0 proficiency
              required: 100,
              priority: skillObj.priority || 2
            })
          }
        })
        
        // Convert to array and limit to top 15 skills for readability
        const chartData = Array.from(allSkills.values()).slice(0, 15)
        
        // Merge verification status into skillsHave
        const enrichedSkillsHave = (skillAnalysis.skillsHave || []).map(skillObj => {
          const skillName = skillObj.skill || skillObj
          const verification = verificationMap.get(skillName.toLowerCase())
          const hasNumericScore = typeof verification?.score === 'number' && !Number.isNaN(verification.score)
          return {
            ...skillObj,
            skill: skillName,
            verified: verification?.verified || false,
            verificationScore: hasNumericScore ? verification.score : null,
            score: hasNumericScore ? verification.score : null,
            proficiency: hasNumericScore ? verification.score : null,
            needsVerification: !hasNumericScore
          }
        })

        // Add previously verified skills that were not in this parse
        const existingNames = new Set(enrichedSkillsHave.map(s => s.skill?.toLowerCase()))
        previousVerified.forEach(prev => {
          const name = prev.skill || prev.name
          if (!name) return
          if (existingNames.has(name.toLowerCase())) return
          const cachedScore = prev.verificationScore || prev.score
          enrichedSkillsHave.push({
            ...prev,
            skill: name,
            verified: true,
            verificationScore: typeof cachedScore === 'number' ? cachedScore : null,
            score: typeof cachedScore === 'number' ? cachedScore : null,
            proficiency: typeof cachedScore === 'number' ? cachedScore : null,
            needsVerification: !(typeof cachedScore === 'number'),
            source: 'cached-verification'
          })
        })
        
        setSkillGaps({
          skillsHave: enrichedSkillsHave,
          skillsMissing: skillAnalysis.skillsMissing,
          skillGapSummary: skillAnalysis.skillGapSummary,
          chartData: chartData
        })
        
        const usdToInr = (value) => (typeof value === 'number' ? Math.round(value * 83) : value)
        const formatInrRange = (absoluteUSD) => {
          if (!absoluteUSD) return '+₹10L - ₹20L'
          const normalize = (val) => {
            if (typeof val !== 'number') return null
            const inrVal = usdToInr(val)
            return inrVal >= 100000 ? `₹${(inrVal / 100000).toFixed(1)}L` : `₹${inrVal.toLocaleString('en-IN')}`
          }

          if (typeof absoluteUSD === 'number') {
            return `+${normalize(absoluteUSD)}`
          }
          const min = absoluteUSD.min ?? absoluteUSD.max
          const max = absoluteUSD.max ?? absoluteUSD.min
          if (!min && !max) return '+₹10L - ₹20L'
          const minFormatted = normalize(min)
          const maxFormatted = normalize(max)
          if (min && max && min !== max) {
            return `+${minFormatted} - ${maxFormatted}`
          }
          const value = max || min
          const single = normalize(value)
          return single ? `+${single}` : '+₹10L - ₹20L'
        }

        const normalizedSalaryBoost = (salaryBoostRecommendations || []).map((boost, idx) => {
          const absoluteUSD = boost.salaryBoost?.absoluteUSD
          const percentage = boost.salaryBoost?.percentage
          const impactLabel = percentage
            ? `${formatInrRange(absoluteUSD)} (${percentage})`
            : formatInrRange(absoluteUSD)

          return {
            ...boost,
            id: boost.id || `boost-${idx}`,
            impact: impactLabel,
            timeframe: boost.timeframe || '0-3 months sprint',
            priority: boost.priority || 'High',
            description: boost.description || `${boost.title} drives premium offers across top employers. Focused study unlocks rapid compensation gains.`,
            recommendedHoursPerWeek: boost.recommendedHoursPerWeek || 6,
            actionSteps: boost.actionSteps || []
          }
        })

        const fallbackFromOpportunities = () => {
          const formatFromOpportunity = (opportunity, idx) => {
            const absoluteUSD = opportunity.potentialIncrease?.USD
            const percentage = opportunity.impact
            const impactLabel = percentage
              ? `${formatInrRange(absoluteUSD)} (${percentage})`
              : formatInrRange(absoluteUSD)
            const title = `Level up ${opportunity.skill}`
            return {
              id: opportunity.id || `opportunity-${idx}`,
              title,
              impact: impactLabel,
              timeframe: '3-5 months',
              priority: 'Medium',
              description: opportunity.reasoning || `${title} unlocks premium offers across ${opportunity.type || 'the'} market.`,
              category: opportunity.type || 'General',
              salaryBoost: {
                percentage,
                absoluteUSD: absoluteUSD || null
              },
              leverageSkill: null,
              actionSteps: [],
              recommendedHoursPerWeek: 6
            }
          }

          return (skillAnalysis.salaryBoostOpportunities || []).map(formatFromOpportunity)
        }

        const salaryBoostCards = normalizedSalaryBoost.length > 0
          ? normalizedSalaryBoost
          : fallbackFromOpportunities()

        setSalaryBoost(salaryBoostCards)
        setSalarySignals(salaryBoostCards.slice(0, 2))
        setRoadmap(roadmap || null)
        setResources(roleResponse.data.resources || [])

        const liveStats = []
        const primaryRole = rolePrediction?.primaryRole
        const confidenceValue = primaryRole?.matchPercentage ?? primaryRole?.confidence
        if (typeof confidenceValue === 'number') {
          const percent = confidenceValue > 1 ? confidenceValue : confidenceValue * 100
          liveStats.push({
            label: 'Match confidence',
            value: `${Math.round(percent)}%`,
            description: primaryRole?.title || 'Primary predicted role'
          })
        }

        const skillsAudited = (skillAnalysis?.skillsHave?.length || 0) + (skillAnalysis?.skillsMissing?.length || 0)
        if (skillsAudited) {
          liveStats.push({
            label: 'Skills audited',
            value: `${skillsAudited}+`,
            description: 'NER categories reviewed'
          })
        }

        if (salaryBoostCards.length) {
          liveStats.push({
            label: 'Salary lift',
            value: salaryBoostCards[0].impact,
            description: salaryBoostCards[0].timeframe || 'Projected timeframe'
          })
        }

        setHeroStats(liveStats)

        const roleCards = []
        if (primaryRole) {
          roleCards.push({
            id: primaryRole.id || 'primary',
            company: primaryRole.company || primaryRole.industry || 'Primary role',
            title: primaryRole.title || primaryRole.role || 'Primary match',
            matchPercentage: Math.max(0, Math.round(primaryRole.matchPercentage ?? primaryRole.confidence ?? 0))
          })
        }
        ;(rolePrediction?.alternativeRoles || []).slice(0, 2).forEach((role, idx) => {
          roleCards.push({
            id: role.id || `alt-${idx}`,
            company: role.company || role.industry || 'Alternative role',
            title: role.title || role.role || 'Alternative match',
            matchPercentage: Math.max(0, Math.round(role.matchPercentage ?? role.confidence ?? 0))
          })
        })
        setPreviewRoles(roleCards.slice(0, 2))
      }
      
      if (jobsResponse.success && jobsResponse.data) {
        setMatchedJobs(jobsResponse.data?.data?.matches || [])
      }

      console.log('✅ Analysis complete! Navigating to dashboard...')
      console.log('📊 Context data:', {
        resumeId,
        hasParsedResume: !!parsedResumeData,
        parsedSkills: parseResponse.parsed_resume?.skills?.length || 0,
        hasRoles: !!roleResponse.success,
        hasJobs: !!jobsResponse.success,
        jobCount: jobsResponse.data?.data?.matches?.length || 0
      })
      
      // Ensure state is updated before navigation
      setIsAnalyzing(false)
      
      // Force state to propagate by using flushSync-like behavior
      await new Promise(resolve => setTimeout(resolve, 100))
      
      console.log('🚀 Navigating to dashboard now...')
      navigate('/dashboard', { replace: true })
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

      // Check if we at least got the resume parsed
      if (resumeId) {
        console.log('⚠️ Partial success - resumeId exists, trying to navigate anyway')
        setTimeout(() => navigate('/dashboard'), 500)
        return
      }

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
    <div className="relative page-shell">
      <div className="noise-overlay" aria-hidden="true"></div>
      <Navbar />

      <div className="pt-28 pb-24 px-4">
        <div className="max-w-6xl mx-auto grid gap-12 lg:grid-cols-[1.1fr_0.9fr] items-start">
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-10"
          >
            <div>
              <div className="pill-badge inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-secondary">
                <Sparkles className="w-4 h-4" />
                Precision Intake
              </div>
              <h1 className="mt-6 text-4xl lg:text-5xl font-semibold text-primary leading-tight">
                Drop your resume. We weaponize it into a job magnet.
              </h1>
              <p className="mt-4 text-lg text-secondary max-w-2xl">
                Resume Genie runs multi-model parsing, skill NER, and salary lift simulations the second your file hits the runway. No cryptic UI, no downtime, just elite signal.
              </p>
            </div>

            <div className="stat-grid">
              {heroStats.length ? (
                heroStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-3xl bg-[var(--rg-surface)] border border-[var(--rg-border)] p-5 shadow-soft"
                  >
                    <p className="text-xs uppercase tracking-[0.35em] text-secondary mb-3">{stat.label}</p>
                    <p className="text-3xl font-semibold text-primary">{stat.value}</p>
                    <p className="text-sm text-secondary mt-1">{stat.description}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-3xl bg-[var(--rg-surface-alt)] border border-dashed border-[var(--rg-border)] p-6 text-center col-span-full">
                  <p className="text-sm text-secondary">
                    Upload a resume to unlock live confidence, skill coverage, and salary projections.
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-[32px] bg-[var(--rg-surface)] border border-[var(--rg-border)] p-6 lg:p-8 shadow-soft">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-secondary">Live Preview</p>
                  <h3 className="text-2xl font-semibold text-primary mt-2">Next-best roles in queue</h3>
                </div>
                <span className="pill-badge text-xs">Populates post-parse</span>
              </div>
              <div className="mt-6 space-y-4">
                {previewRoles.length ? (
                  previewRoles.map((role) => (
                    <div key={role.id} className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-[var(--rg-surface-alt)] border border-[var(--rg-border)]">
                      <div>
                        <p className="text-sm text-secondary">{role.company}</p>
                        <p className="text-lg font-semibold text-primary">{role.title}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs uppercase tracking-[0.3em] text-secondary">Match</p>
                        <p className="text-3xl font-semibold text-sky-700">{role.matchPercentage}%</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl bg-[var(--rg-surface-alt)] border border-dashed border-[var(--rg-border)] p-6 text-sm text-secondary">
                    Live preview appears as soon as we finish parsing your upload.
                  </div>
                )}
              </div>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="relative rounded-[32px] bg-[var(--rg-surface)] border border-[var(--rg-border-strong)] p-6 lg:p-8 overflow-hidden shadow-soft"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-fuchsia-500/5 pointer-events-none"></div>
            <div className="relative z-10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-secondary">Phase Zero</p>
                  <h2 className="text-3xl font-semibold text-primary mt-2">Upload & lock-in</h2>
                  <p className="text-sm text-secondary mt-2">
                    We hash your resume, run checks, and isolate PII before inference touches it.
                  </p>
                </div>
                <div className="pill-badge text-[11px]">SOC 2 ready</div>
              </div>

              <div className="mt-8">
                <FileUpload onFileSelect={handleFileSelect} mode="light" />
              </div>

              {file && !isAnalyzing && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Button size="lg" className="w-full mt-8 justify-center" onClick={handleAnalyze}>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Analyze with AI
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </motion.div>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100"
                >
                  {error}
                </motion.div>
              )}

              <div className="mt-8 flex flex-wrap items-center gap-4 text-xs text-secondary">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                  Zero data resale policy
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-fuchsia-300" />
                  Deep scan averages 47s
                </div>
              </div>
            </div>
          </motion.section>
        </div>

        {isAnalyzing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-5xl mx-auto mt-16"
          >
            <div className="rounded-[32px] bg-[var(--rg-surface)] border border-[var(--rg-border-strong)] p-10 text-center shadow-soft">
              <LoadingSpinner size="xl" className="mb-6" />
              <h3 className="text-2xl font-semibold text-primary mb-2">Analyzing your resume...</h3>
              <p className="text-secondary">Full-stack parsing, embeddings, and salary projections are running.</p>
              <p className="text-sm text-secondary mt-1">Deep scans typically finish in under a minute.</p>
              <div className="mt-8 grid gap-4 md:grid-cols-2 text-left">
                <div className="rounded-2xl bg-[var(--rg-surface-alt)] border border-[var(--rg-border)] p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-400/15 flex items-center justify-center">
                    <Cpu className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm text-secondary">Parsing resume content</p>
                    <p className="text-sm text-emerald-600 font-medium">Completed</p>
                  </div>
                </div>
                <div className="rounded-2xl bg-[var(--rg-surface-alt)] border border-[var(--rg-border)] p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-cyan-400/15 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-sky-500" />
                  </div>
                  <div>
                    <p className="text-sm text-secondary">Predicting roles</p>
                    <p className="text-sm text-emerald-600 font-medium">Completed</p>
                  </div>
                </div>
                <div className="rounded-2xl bg-[var(--rg-surface-alt)] border border-[var(--rg-border)] p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-fuchsia-400/15 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-fuchsia-600" />
                  </div>
                  <div>
                    <p className="text-sm text-secondary">Analyzing skill gaps</p>
                    <p className="text-sm text-amber-600 font-medium">In progress</p>
                  </div>
                </div>
                <div className="rounded-2xl bg-[var(--rg-surface-alt)] border border-[var(--rg-border)] p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border border-dashed border-[var(--rg-border)] flex items-center justify-center">
                    <ArrowRight className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <p className="text-sm text-secondary">Building roadmap</p>
                    <p className="text-sm text-secondary font-medium">Queued</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="max-w-6xl mx-auto mt-20"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-secondary">Why teams trust RG</p>
              <h2 className="text-3xl font-semibold text-primary mt-3">Enterprise-grade ingest, boutique experience.</h2>
            </div>
            <div className="pill-badge text-xs text-secondary">No endpoints touched</div>
          </div>

            <div className="shell-grid">
              <div className="rounded-[28px] bg-[var(--rg-surface)] border border-[var(--rg-border)] p-6 shadow-soft">
                <ShieldCheck className="w-10 h-10 text-emerald-500 mb-4" />
                <h3 className="text-xl font-semibold text-primary mb-2">Compliance obsessed</h3>
                <p className="text-sm text-secondary">SOC 2, GDPR, and ISO-ready workflows with region-locked storage. All analysis stays within your tenancy.</p>
              </div>
              <div className="rounded-[28px] bg-[var(--rg-surface)] border border-[var(--rg-border)] p-6 shadow-soft">
                <Cpu className="w-10 h-10 text-sky-600 mb-4" />
                <h3 className="text-xl font-semibold text-primary mb-2">Multi-model parsing</h3>
                <p className="text-sm text-secondary">Hybrid Watson + HuggingFace stack for extraction, embeddings, and semantic scoring tuned for resumes.</p>
              </div>
              <div className="rounded-[28px] bg-[var(--rg-surface)] border border-[var(--rg-border)] p-6 shadow-soft">
                <BarChart3 className="w-10 h-10 text-fuchsia-600 mb-4" />
                <h3 className="text-xl font-semibold text-primary mb-2">Salary boost intel</h3>
                {salarySignals.length ? (
                  salarySignals.map((signal) => (
                    <div key={signal.id} className="mt-3 p-3 rounded-2xl bg-[var(--rg-surface-alt)] border border-[var(--rg-border)]">
                      <p className="text-sm text-secondary">{signal.title}</p>
                      <p className="text-base text-primary font-medium">{signal.impact}</p>
                      <p className="text-xs text-secondary">{signal.timeframe}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-secondary">Upload a resume to surface the highest-leverage salary boost plays.</p>
                )}
              </div>
            </div>
        </motion.section>
      </div>

      <Footer />
    </div>
  )
}

export default UploadPage
