import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LayoutDashboard, Users, TrendingUp, BookOpen, Map, BarChart3, Upload, User, MapPin, Clock, Briefcase, ArrowRight, ShieldCheck, Award, ClipboardList, CalendarCheck2, Gift, FileText } from 'lucide-react'
import Navbar from '../components/ui/Navbar'
import Footer from '../components/ui/Footer'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import JobRoleCard from '../components/dashboard/JobRoleCard'
import SkillGapChart from '../components/dashboard/SkillGapChart'
import SalaryInsightsPanel from '../components/dashboard/SalaryInsightsPanel'
import RoadmapTimeline from '../components/dashboard/RoadmapTimeline'
import RoadmapSkillBreakdown from '../components/dashboard/RoadmapSkillBreakdown'
import ResourcesList from '../components/dashboard/ResourcesList'
import ResumeSummaryView from '../components/dashboard/ResumeSummaryView'
import MCQVerificationModal from '../components/dashboard/MCQVerificationModal'
import { useResumeContext } from '../hooks/useResumeContext'
import { useAuth } from '../hooks/useAuth'
import Modal from '../components/ui/Modal'
import api from '../services/api'

const ROADMAP_STAGE_ORDER = [
  { key: 'foundation', label: 'Foundation', timeframe: 'Days 1-30', color: 'blue' },
  { key: 'depth', label: 'Depth', timeframe: 'Days 31-60', color: 'green' },
  { key: 'polish', label: 'Polish', timeframe: 'Days 61-90', color: 'purple' }
]

const USD_TO_INR_RATE = Number(import.meta.env?.VITE_USD_TO_INR_RATE) || 83

const extractUsdRange = (absoluteUSD) => {
  if (!absoluteUSD) return { min: 0, max: 0 }
  if (typeof absoluteUSD === 'number') return { min: absoluteUSD, max: absoluteUSD }
  const min = absoluteUSD.min ?? absoluteUSD.max ?? 0
  const max = absoluteUSD.max ?? absoluteUSD.min ?? 0
  return { min, max: Math.max(min, max) }
}

const formatInrValue = (usdValue) => {
  if (usdValue === undefined || usdValue === null || Number.isNaN(Number(usdValue))) return '₹0'
  const inrValue = Number(usdValue) * USD_TO_INR_RATE
  if (inrValue >= 1e7) return `₹${(inrValue / 1e7).toFixed(1)}Cr`
  if (inrValue >= 1e5) return `₹${(inrValue / 1e5).toFixed(1)}L`
  return `₹${Math.round(inrValue).toLocaleString('en-IN')}`
}

const DashboardPage = () => {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [mcqModalOpen, setMcqModalOpen] = useState(false)
  const [selectedSkill, setSelectedSkill] = useState(null)
  const [showResumeSummary, setShowResumeSummary] = useState(false)
  const { 
    parsedResume, 
    setParsedResume,
    predictedRoles, 
    setPredictedRoles,
    matchedJobs,
    setMatchedJobs,
    skillGaps, 
    setSkillGaps,
    salaryBoost, 
    setSalaryBoost,
    roadmap, 
    setRoadmap,
    resources,
    setResources,
    resumeId,
    setResumeId,
    watsonSummary,
    setWatsonSummary
  } = useResumeContext()

  // Load resume data from API if not in context
  useEffect(() => {
    let isMounted = true;
    
    const loadResumeFromAPI = async () => {
      // Skip if already loaded
      if (parsedResume && skillGaps?.length > 0) {
        return
      }

      try {
        // Try to get resumeId from localStorage or user's latest resume
        const storedResumeId = resumeId || localStorage.getItem('lastResumeId')
        
        if (!storedResumeId) {
          // Try to fetch user's latest resume
          const resumesResponse = await api.get('/resume')
          const resumes = resumesResponse.data?.resumes || []
          
          if (resumes.length === 0) {
            console.log('No resumes found, redirecting to upload')
            if (isMounted) navigate('/upload')
            return
          }
          
          const latestResume = resumes[0]
          if (isMounted) {
            setResumeId(latestResume.resumeId)
            localStorage.setItem('lastResumeId', latestResume.resumeId)
          }
          
          // Load the resume data
          await loadResumeData(latestResume.resumeId)
        } else {
          // Load resume by ID
          await loadResumeData(storedResumeId)
        }
      } catch (error) {
        console.error('Failed to load resume:', error)
      }
    }

    const loadResumeData = async (id) => {
      try {
        const response = await api.get(`/resume/${id}`)
        const resumeData = response.data

        if (resumeData.parsed_resume) {
          setParsedResume(resumeData.parsed_resume)
        }

        if (resumeData.job_analysis) {
          const analysis = resumeData.job_analysis

          // Set predicted roles
          if (analysis.predictedRole) {
            setPredictedRoles([
              {
                ...analysis.predictedRole,
                isPrimary: true
              },
              ...(analysis.alternativeRoles || [])
            ])
          }

          // Set skill gaps (skillsHave and skillsMissing)
          if (analysis.skillsHave || analysis.skillsMissing) {
            setSkillGaps({
              skillsHave: analysis.skillsHave || [],
              skillsMissing: analysis.skillsMissing || []
            })
          }

          // Set salary boost opportunities
          if (analysis.salaryBoostOpportunities) {
            setSalaryBoost(analysis.salaryBoostOpportunities)
          }
        }

        console.log('✅ Loaded resume data from API')
      } catch (error) {
        console.error('Failed to load resume data:', error)
      }
    }

    if (isAuthenticated && !parsedResume) {
      loadResumeFromAPI()
    }
  }, [isAuthenticated])

  // Redirect to upload if no resume data, or to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
  }, [isAuthenticated, navigate])

  useEffect(() => {
    const fetchMatchedJobs = async () => {
      if (!resumeId) return
      try {
        // Fetch marketplace jobs (web-scraped)
        const marketplaceResponse = await api.get(`/jobs/match/${resumeId}?limit=10&useEmbeddings=true&generateAISummaries=true`)
        const marketplaceJobs = marketplaceResponse.data?.data?.matches || []
        
        // Fetch recruiter-posted jobs
        const recruiterResponse = await api.get(`/jobs/all`, {
          params: {
            limit: 20,
            status: 'active'
          }
        })
        
        const allJobs = recruiterResponse.data?.jobs || []
        
        // Filter for recruiter-posted jobs only
        const recruiterJobs = allJobs
          .filter(job => job.source?.platform === 'manual' || job.source?.platform === 'direct')
          .map(job => ({
            job: job,
            jobId: job.jobId,
            matchScore: 0, // No matching score for now
            matchedSkills: [],
            missingSkills: []
          }))
        
        // Combine both types
        const combined = [...marketplaceJobs, ...recruiterJobs]
        
        if (combined.length) {
          setMatchedJobs(combined)
        }
      } catch (error) {
        console.warn('Unable to refresh matched jobs:', error)
      }
    }

    if (resumeId && (!matchedJobs || matchedJobs.length === 0)) {
      fetchMatchedJobs()
    }
  }, [resumeId])

  const handleVerifyClick = (skill) => {
    if (!skill) return
    setSelectedSkill(skill)
    setMcqModalOpen(true)
  }

  const handleVerificationComplete = (skill, score) => {
    console.log(`Skill ${skill} verified with score: ${score}%`)
    // Optionally refresh skills data to show verified status
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'roles', label: 'Job Roles', icon: <Users className="w-4 h-4" /> },
    { id: 'skills', label: 'Skill Gaps', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'salary', label: 'Salary Boost', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'roadmap', label: 'Roadmap', icon: <Map className="w-4 h-4" /> },
    { id: 'resources', label: 'Resources', icon: <BookOpen className="w-4 h-4" /> },
  ]

  const workflowShortcuts = [
    {
      id: 'applications',
      title: 'Applications',
      description: 'Pipeline health, stats, and graceful withdrawals.',
      icon: <ClipboardList className="w-5 h-5 text-[var(--rg-accent)]" />,
      accent: 'bg-[var(--rg-surface)]',
      href: '/applications',
      action: 'Review pipeline',
    },
    {
      id: 'interviews',
      title: 'Interviews',
      description: 'Confirm slots, request reschedules, capture notes.',
      icon: <CalendarCheck2 className="w-5 h-5 text-[var(--rg-accent)]" />,
      accent: 'bg-[var(--rg-surface)]',
      href: '/interviews',
      action: 'Open schedule',
    },
    {
      id: 'offers',
      title: 'Offers',
      description: 'Compare packages and accept or negotiate quickly.',
      icon: <Gift className="w-5 h-5 text-[var(--rg-accent)]" />,
      accent: 'bg-[var(--rg-surface)]',
      href: '/offers',
      action: 'See packages',
    },
  ]

  const averageMatch = matchedJobs?.length
    ? Math.round(matchedJobs.reduce((sum, j) => sum + (j.matchScore || 0), 0) / matchedJobs.length)
    : 0

  const topJobMatch = matchedJobs && matchedJobs.length > 0 ? matchedJobs[0] : null
  const topMissingSkills = (skillGaps?.skillsMissing || []).slice(0, 3)
  const moreMissingSkills = (skillGaps?.skillsMissing?.length || 0) - topMissingSkills.length
  const topSalaryBoost = (salaryBoost || []).slice(0, 2)
  const predictedRoleList = Array.isArray(predictedRoles)
    ? predictedRoles
    : [predictedRoles?.primaryRole, ...(predictedRoles?.alternativeRoles || [])].filter(Boolean)

  const normalizedSkillInventory = useMemo(() => {
    const skills = skillGaps?.skillsHave || []
    return skills
      .map((skill, idx) => {
        const rawName = skill.skill ?? skill.name ?? skill.title ?? `Skill ${idx + 1}`
        const name = typeof rawName === 'string' ? rawName : rawName?.name || rawName?.skill || `Skill ${idx + 1}`
        return {
          name,
          verified: Boolean(skill.verified),
          score: skill.score ?? skill.level ?? 0,
          badge: skill.badge,
        }
      })
      .filter((entry) => Boolean(entry.name))
  }, [skillGaps])

  const verifiedSkills = useMemo(() => normalizedSkillInventory.filter((skill) => skill.verified), [normalizedSkillInventory])
  const pendingSkills = useMemo(() => normalizedSkillInventory.filter((skill) => !skill.verified), [normalizedSkillInventory])

  const jobSourceBuckets = useMemo(() => {
    if (!Array.isArray(matchedJobs) || matchedJobs.length === 0) {
      return { marketplace: [], recruiter: [] }
    }

    const marketplace = []
    const recruiter = []

    matchedJobs.forEach((entry) => {
      const job = entry.job || entry
      // Check if this is a recruiter-posted job (source.platform === 'manual')
      const isRecruiterJob = job?.source?.platform === 'manual' || job?.source?.platform === 'direct'
      if (isRecruiterJob) {
        recruiter.push(entry)
      } else {
        marketplace.push(entry)
      }
    })

    return { marketplace, recruiter }
  }, [matchedJobs])

  const marketplaceMatches = jobSourceBuckets.marketplace
  const recruiterMatches = jobSourceBuckets.recruiter

  const roadmapSkillPlan = useMemo(() => {
    const missingSkills = Array.isArray(skillGaps?.skillsMissing) ? skillGaps.skillsMissing : []
    if (!missingSkills.length) {
      return []
    }

    return missingSkills.map((skill, idx) => {
      const stageIndex = idx < 3 ? 0 : idx < 6 ? 1 : 2
      const stage = ROADMAP_STAGE_ORDER[Math.min(stageIndex, ROADMAP_STAGE_ORDER.length - 1)]
      return {
        ...skill,
        stageKey: stage.key,
        stageLabel: stage.label,
        stageTimeframe: stage.timeframe,
        stageColor: stage.color
      }
    })
  }, [skillGaps?.skillsMissing])

  const skillGapDerived = useMemo(() => {
    const missing = Array.isArray(skillGaps?.skillsMissing) ? skillGaps.skillsMissing : []
    const have = Array.isArray(skillGaps?.skillsHave) ? skillGaps.skillsHave : []

    const chartData = missing.slice(0, 10).map((gap) => {
      const match = have.find((h) => (h.skill || h.name || '').toLowerCase() === (gap.skill || '').toLowerCase())
      const current = match?.proficiency || match?.score || (match ? 65 : 35)
      const required = gap.type === 'required' ? 90 : 75
      return {
        skill: gap.skill,
        current,
        required,
        priority: gap.priority,
        reasons: gap.reasons,
        salaryLabel: gap.salaryBoost?.absoluteUSD ? formatInrValue(extractUsdRange(gap.salaryBoost.absoluteUSD).max) : null,
        salaryPct: gap.salaryBoost?.percentage,
        type: gap.type
      }
    })

    const summary = {
      totalMissing: missing.length,
      requiredMissing: missing.filter((s) => s.type === 'required').length,
      preferredMissing: missing.filter((s) => s.type === 'preferred').length,
      verified: verifiedSkills.length,
      tracked: have.length
    }

    return { chartData, summary, missingTop: missing.slice(0, 5) }
  }, [skillGaps?.skillsMissing, skillGaps?.skillsHave, verifiedSkills])

  const overviewStats = [
    {
      id: 'matches',
      label: 'Matching roles',
      value: matchedJobs?.length || 0,
      hint: 'ready for review',
    },
    {
      id: 'avgMatch',
      label: 'Average match',
      value: `${averageMatch}%`,
      hint: 'blended score',
    },
    {
      id: 'skills',
      label: 'Skills to strengthen',
      value: skillGaps?.skillsMissing?.length || 0,
      hint: 'priority focus',
    },
    {
      id: 'resources',
      label: 'Learning resources',
      value: resources?.length || 0,
      hint: 'curated picks',
    },
    {
      id: 'verifiedSkills',
      label: 'Verified skills',
      value: normalizedSkillInventory.length ? `${verifiedSkills.length}/${normalizedSkillInventory.length}` : '0',
      hint: 'MCQ badges live',
    },
  ]

  const handleRoleClick = (role) => {
    const job = role.job || role
    const isRecruiterJob = job?.source?.platform === 'manual' || job?.source?.platform === 'direct'
    
    if (isRecruiterJob) {
      // Navigate to jobs page where they can apply
      navigate('/jobs')
    } else {
      // Navigate to role details page for marketplace jobs
      navigate(`/job-role/${role.id}`, { state: { role } })
    }
  }

  // Show loading or empty state if no data
  if (!parsedResume) {
    return null // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-[var(--rg-bg)] text-[var(--rg-text-primary)]">
      <Navbar />
      
      <div className="pt-24 pb-12">
        <section className="px-4">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="relative overflow-hidden rounded-[32px] border border-[var(--rg-border)] bg-[var(--rg-surface)] text-[var(--rg-text-primary)] shadow-[0_25px_60px_rgba(15,18,25,0.1)]"
            >
              <div className="absolute inset-y-0 -right-10 hidden lg:block">
                <div className="h-full w-56 rotate-6 bg-gradient-to-b from-[rgba(47,61,76,0.12)] to-transparent" />
              </div>
              <div className="relative z-10 p-8 lg:p-10 flex flex-col gap-6">
                <div className="flex flex-wrap items-start justify-between gap-6">
                  <div className="max-w-2xl">
                    <p className="text-xs uppercase tracking-[0.35em] text-[var(--rg-text-secondary)]">Career Control Room</p>
                    <h1 className="mt-4 text-4xl font-semibold leading-snug text-[var(--rg-text-primary)]">
                      Welcome back, {parsedResume?.name || 'professional'}
                    </h1>
                    <p className="mt-3 text-lg text-[var(--rg-text-secondary)]">
                      Your resume insights, role matches, and next steps are refreshed and ready.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 w-full sm:w-auto">
                    <Button onClick={() => navigate('/upload')} className="justify-center">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload new resume
                    </Button>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setShowResumeSummary(true)} className="justify-center flex-1">
                        Review summary
                      </Button>
                      {resumeId && (
                        <Button variant="outline" onClick={() => navigate(`/resume/${resumeId}`)} className="justify-center flex-1">
                          <FileText className="w-4 h-4 mr-2" />
                          View Resume
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-[var(--rg-text-secondary)]">
                  <span className="inline-flex items-center gap-2 rounded-full border border-[var(--rg-border)] px-4 py-2">
                    <User className="w-4 h-4 text-[var(--rg-accent)]" />
                    {parsedResume?.current_title || 'Role focus pending'}
                  </span>
                  {parsedResume?.location && (
                    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--rg-border)] px-4 py-2">
                      <MapPin className="w-4 h-4 text-[var(--rg-accent)]" />
                      {parsedResume.location}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-2 rounded-full border border-[var(--rg-border)] px-4 py-2">
                    <Clock className="w-4 h-4 text-[var(--rg-accent)]" />
                    {parsedResume?.years_experience ? `${parsedResume.years_experience}+ yrs exp` : 'Experience syncing'}
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="px-4 mt-8">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
            {workflowShortcuts.map((shortcut) => (
              <button
                key={shortcut.id}
                onClick={() => navigate(shortcut.href)}
                className="group text-left"
              >
                <div className={`rounded-[24px] border border-[var(--rg-border)] ${shortcut.accent} p-5 shadow-[0_15px_40px_rgba(15,18,25,0.08)] transition-all group-hover:-translate-y-1 group-hover:shadow-[0_25px_55px_rgba(15,18,25,0.12)]`}>
                  <div className="flex items-center justify-between">
                    <div className="p-3 rounded-2xl bg-[var(--rg-bg-muted)] border border-[var(--rg-border)] text-[var(--rg-text-primary)]">
                      {shortcut.icon}
                    </div>
                    <ArrowRight className="w-4 h-4 text-[var(--rg-text-secondary)] transition-transform group-hover:translate-x-1" />
                  </div>
                  <h3 className="mt-4 text-xl font-semibold text-[var(--rg-text-primary)]">{shortcut.title}</h3>
                  <p className="mt-2 text-sm text-[var(--rg-text-secondary)]">{shortcut.description}</p>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--rg-text-primary)]">
                    {shortcut.action}
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Tabs */}
        <div className="sticky top-16 z-40 mt-10 border-y border-slate-200/60 bg-[var(--rg-bg)]/85 backdrop-blur-xl">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex flex-wrap gap-3 py-4 overflow-x-auto scrollbar-hide">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors border ${
                    activeTab === tab.id
                      ? 'bg-white text-slate-900 border-slate-200 shadow-[0_10px_30px_rgba(15,23,42,0.08)]'
                      : 'bg-transparent text-slate-500 border-transparent hover:border-slate-200 hover:text-slate-800'
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
        <div className="max-w-6xl mx-auto px-4 py-10">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-8"
            >
              {/* Privacy Notice Banner */}
              <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      🔒 Your Privacy is Protected
                    </h3>
                    <p className="text-sm text-gray-700 mb-3">
                      Your resume is <strong>completely private</strong> by default. Recruiters cannot see your profile unless you explicitly enable "Visible to Recruiters" in Settings.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate('/settings')}
                        className="text-sm"
                      >
                        Manage Privacy Settings
                      </Button>
                      <a 
                        href="#" 
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
                        onClick={(e) => {
                          e.preventDefault()
                          // Optional: Show more info modal
                        }}
                      >
                        Learn more →
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
                {overviewStats.map((stat) => (
                  <Card key={stat.id} tone="light" className="h-full">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-slate-500">{stat.label}</h3>
                      {stat.id === 'matches' && <Users className="w-5 h-5 text-[var(--rg-accent)]" />}
                      {stat.id === 'avgMatch' && <TrendingUp className="w-5 h-5 text-[var(--rg-accent)]" />}
                      {stat.id === 'skills' && <BarChart3 className="w-5 h-5 text-[var(--rg-accent)]" />}
                      {stat.id === 'resources' && <BookOpen className="w-5 h-5 text-[var(--rg-accent)]" />}
                    </div>
                    <p className="text-3xl font-semibold text-slate-900">{stat.value}</p>
                    <p className="text-sm text-slate-500 capitalize">{stat.hint}</p>
                  </Card>
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card tone="light" className="h-full">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Top match</p>
                      <h3 className="text-2xl font-semibold text-slate-900 mt-2">Your strongest role right now</h3>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setActiveTab('roles')}>
                      View roles
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                  {topJobMatch ? (
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-slate-200 bg-white p-5">
                        <div className="flex items-center justify-between gap-4 mb-3">
                          <div>
                            <h4 className="text-xl font-semibold text-slate-900">{topJobMatch.job?.title || 'Role match coming soon'}</h4>
                            <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                              <Briefcase className="w-4 h-4 text-slate-400" />
                              {topJobMatch.job?.company?.name || 'Company confidential'}
                            </p>
                          </div>
                          <span className="px-4 py-1.5 rounded-full text-sm font-semibold bg-[var(--rg-bg-muted)] text-[var(--rg-text-primary)] border border-[var(--rg-border)]">
                            {Math.round(topJobMatch.matchScore || 0)}% match
                          </span>
                        </div>
                        {topJobMatch.aiSummary && (
                          <p className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3">
                            {topJobMatch.aiSummary}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-3">
                          {(topJobMatch.matchedSkills || []).slice(0, 4).map((skill, idx) => (
                            <span key={idx} className="px-3 py-1 rounded-full bg-[var(--rg-bg-muted)] text-[var(--rg-text-primary)] text-xs font-medium border border-[var(--rg-border)]">
                              {skill}
                            </span>
                          ))}
                          {(topJobMatch.missingSkills || []).slice(0, 2).map((skill, idx) => (
                            <span key={`missing-${idx}`} className="px-3 py-1 rounded-full bg-transparent text-[var(--rg-text-secondary)] text-xs font-medium border border-dashed border-[var(--rg-border)]">
                              Improve: {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Button onClick={() => setActiveTab('roles')}>
                          See matching roles
                        </Button>
                        <Button variant="outline" onClick={() => navigate('/jobs?matched=true')}>
                          Browse full list
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500">
                      We do not have personalised matches yet. Run a fresh analysis or adjust your resume focus to see tailored roles.
                    </div>
                  )}
                </Card>

                <Card tone="light" className="h-full">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Skill focus</p>
                      <h3 className="text-2xl font-semibold text-slate-900 mt-2">Next capabilities to level up</h3>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setActiveTab('skills')}>
                      View all gaps
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                  {topMissingSkills.length > 0 ? (
                    <div className="space-y-4">
                      <div className="space-y-3">
                        {topMissingSkills.map((skill, idx) => (
                          <div key={skill.skill || skill.name || idx} className="rounded-2xl border border-slate-200 bg-white p-4">
                            <div className="flex items-center justify-between">
                              <p className="text-lg font-semibold text-slate-900">{skill.skill || skill.name || 'Skill'}</p>
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                (skill.priority || 1) >= 3 ? 'bg-[var(--rg-accent)] text-white border border-[var(--rg-accent)]' :
                                (skill.priority || 1) >= 2 ? 'bg-[var(--rg-bg-muted)] text-[var(--rg-text-primary)] border border-[var(--rg-border)]' :
                                'bg-transparent text-[var(--rg-text-secondary)] border border-dashed border-[var(--rg-border)]'
                              }`}>
                                Priority {(skill.priority || 1) >= 3 ? 'High' : (skill.priority || 1) >= 2 ? 'Medium' : 'Low'}
                              </span>
                            </div>
                            {skill.reasons && skill.reasons.length > 0 && (
                              <p className="text-sm text-slate-600 mt-2">{skill.reasons[0]}</p>
                            )}
                            {skill.alignedWith && skill.alignedWith.length > 0 && (
                              <p className="text-xs text-slate-500 mt-2">Leverage: {skill.alignedWith[0].skill}</p>
                            )}
                          </div>
                        ))}
                      </div>
                      {moreMissingSkills > 0 && (
                        <p className="text-sm text-slate-500">+ {moreMissingSkills} more opportunities in Skill Gaps.</p>
                      )}
                      {topSalaryBoost.length > 0 && (
                        <div className="rounded-2xl border border-[var(--rg-border)] bg-[var(--rg-bg-muted)] p-4">
                          <p className="text-sm font-semibold text-[var(--rg-text-primary)] mb-2">Quick salary wins</p>
                          <ul className="space-y-2 text-sm text-[var(--rg-text-secondary)]">
                            {topSalaryBoost.map((boost) => (
                              <li key={boost.id}>{boost.title || boost.skill}: {boost.impact}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-3">
                        <Button onClick={() => setActiveTab('roadmap')} variant="outline">
                          Check roadmap
                        </Button>
                        <Button onClick={() => handleVerifyClick(topMissingSkills[0])} disabled={topMissingSkills.length === 0}>
                          Verify progress
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500">
                      Great news — no major gaps detected. Explore the roadmap for stretch goals.
                    </div>
                  )}
                </Card>

                <Card tone="light" className="h-full">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Skill verification</p>
                      <h3 className="text-2xl font-semibold text-slate-900 mt-2">Your badge status</h3>
                      <p className="text-sm text-slate-500 mt-1">
                        {verifiedSkills.length} verified • {pendingSkills.length} pending
                      </p>
                    </div>
                    <ShieldCheck className="w-8 h-8 text-[var(--rg-accent)]" />
                  </div>
                  {normalizedSkillInventory.length ? (
                    <div className="space-y-3">
                      {normalizedSkillInventory.slice(0, 5).map((skill, idx) => (
                        <div key={`${skill.name}-${idx}`} className="rounded-2xl border border-slate-200 bg-white p-3 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{skill.name}</p>
                            <p className="text-xs text-slate-500">
                              {skill.verified ? 'Verified badge active' : 'Pending verification'} · {Math.round(skill.score) || 0}% proficiency
                            </p>
                          </div>
                          <button
                            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold border ${
                              skill.verified
                                ? 'bg-[var(--rg-bg-muted)] text-[var(--rg-text-primary)] border-[var(--rg-border)]'
                                : 'bg-transparent text-[var(--rg-text-secondary)] border border-dashed border-[var(--rg-border)]'
                            }`}
                            onClick={() => handleVerifyClick(skill.name)}
                          >
                            {skill.verified ? <ShieldCheck className="w-3 h-3" /> : <Award className="w-3 h-3" />}
                            {skill.verified ? 'Verified' : 'Verify'}
                          </button>
                        </div>
                      ))}
                      {normalizedSkillInventory.length > 5 && (
                        <p className="text-xs text-slate-500">+{normalizedSkillInventory.length - 5} more skills tracked</p>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500">
                      No skills detected yet. Upload a resume or complete analysis to start tracking badges.
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3 mt-4">
                    <Button size="sm" variant="outline" onClick={() => navigate('/profile')}>
                      Open profile
                    </Button>
                    <Button size="sm" onClick={() => setActiveTab('skills')}>
                      Manage skills
                    </Button>
                  </div>
                </Card>
              </div>

              {skillGaps?.skillGapSummary && (
                <Card tone="light">
                  <h3 className="text-xl font-semibold text-slate-900 mb-4">Skill Gap Summary</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="text-sm text-slate-500">Core skills covered</p>
                      <p className="text-2xl font-semibold text-slate-900">
                        {skillGaps.skillGapSummary.coreSkillsHave} / {skillGaps.skillGapSummary.coreSkillsTotal}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Match confidence</p>
                      <p className="text-2xl font-semibold text-slate-900">
                        {skillGaps.skillGapSummary.coreSkillMatch}%
                      </p>
                    </div>
                  </div>
                </Card>
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
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Matched Job Listings</h2>
              {predictedRoleList.length > 0 && (
                <Card tone="light" className="mb-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.35em] text-slate-400">AI predictions</p>
                      <h3 className="text-xl font-semibold text-slate-900 mt-1">Roles your profile already aligns with</h3>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setActiveTab('roadmap')}>
                      Align roadmap
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    {predictedRoleList.slice(0, 3).map((role, idx) => (
                      <div key={role?.name || role?.title || idx} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-sm uppercase tracking-[0.2em] text-slate-400">#{idx + 1}</p>
                        <h4 className="text-lg font-semibold text-slate-900 mt-2">{role?.name || role?.role || role?.title || 'Role insight'}</h4>
                        <p className="text-sm text-slate-600 mt-1">Fit score: {Math.round(role?.matchPercentage || role?.matchScore || role?.score || 0)}%</p>
                        {role?.description && (
                          <p className="text-xs text-slate-500 mt-2">{role.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              )}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-[28px] border border-[var(--rg-border)] bg-[var(--rg-surface)] p-6 shadow-[0_20px_45px_rgba(15,18,25,0.08)]">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Public web</p>
                      <h3 className="text-2xl font-semibold text-slate-900">Live online roles ({marketplaceMatches.length})</h3>
                      <p className="text-sm text-slate-500">Sourced from LinkedIn, Indeed, Glassdoor, and partner feeds.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate('/jobs')}>
                      Full marketplace
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {marketplaceMatches.length ? (
                      marketplaceMatches.map((job, index) => (
                        <JobRoleCard
                          key={`market-${job.job?._id || job.jobId || index}`}
                          role={job}
                          index={index}
                          onClick={() => handleRoleClick(job)}
                        />
                      ))
                    ) : (
                      <div className="text-center rounded-2xl border border-[var(--rg-border)] bg-[var(--rg-bg-muted)] p-8 text-sm text-[var(--rg-text-secondary)]">
                        We will surface curated web roles as soon as new matches stream in.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-[28px] border border-[var(--rg-border)] bg-[var(--rg-surface)] p-6 shadow-[0_20px_45px_rgba(15,18,25,0.08)]">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Portal exclusive</p>
                      <h3 className="text-2xl font-semibold text-slate-900">Recruiter posted roles ({recruiterMatches.length})</h3>
                      <p className="text-sm text-slate-500">Opportunities shared directly by Resume Genie partner recruiters.</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => navigate('/applications')}>
                      View pipeline
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {recruiterMatches.length ? (
                      recruiterMatches.map((job, index) => (
                        <JobRoleCard
                          key={`recruiter-${job.job?._id || job.jobId || index}`}
                          role={job}
                          index={index}
                          onClick={() => handleRoleClick(job)}
                        />
                      ))
                    ) : (
                      <div className="text-center rounded-2xl border border-[var(--rg-border)] bg-[var(--rg-bg-muted)] p-8 text-sm text-[var(--rg-text-secondary)]">
                        Recruiter-led openings will appear here once you apply or get invited to internal postings.
                      </div>
                    )}
                  </div>
                </div>
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
              <Card className="bg-[var(--rg-surface)] border-[var(--rg-border)]">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Gap summary</p>
                    <h3 className="text-2xl font-semibold text-slate-900">Where to focus first</h3>
                    <p className="text-sm text-slate-500 max-w-2xl">
                      Based on your resume + verified badges vs the role blueprint. Required gaps come first, then preferred, weighted by salary impact.
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 min-w-[260px] text-center">
                    <div className="rounded-2xl border px-4 py-3 bg-rose-50 text-rose-700 border-rose-100">
                      <p className="text-xs uppercase tracking-wide">Required</p>
                      <p className="text-2xl font-semibold">{skillGapDerived.summary.requiredMissing}</p>
                    </div>
                    <div className="rounded-2xl border px-4 py-3 bg-amber-50 text-amber-700 border-amber-100">
                      <p className="text-xs uppercase tracking-wide">Preferred</p>
                      <p className="text-2xl font-semibold">{skillGapDerived.summary.preferredMissing}</p>
                    </div>
                    <div className="rounded-2xl border px-4 py-3 bg-emerald-50 text-emerald-700 border-emerald-100">
                      <p className="text-xs uppercase tracking-wide">Verified</p>
                      <p className="text-2xl font-semibold">{skillGapDerived.summary.verified}/{skillGapDerived.summary.tracked}</p>
                    </div>
                  </div>
                </div>

                {skillGapDerived.missingTop.length === 0 ? (
                  <div className="text-sm text-slate-500 bg-[var(--rg-bg-muted)] border border-dashed border-[var(--rg-border)] rounded-xl p-4">
                    No priority gaps detected. Re-run analysis after updating your resume to refresh.
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {skillGapDerived.missingTop.map((gap, idx) => {
                      const reason = gap.reasons?.[0] || (gap.type === 'required' ? 'Required for target role' : 'Preferred for role')
                      return (
                        <div key={`${gap.skill}-${idx}`} className="rounded-2xl border border-[var(--rg-border)] bg-white p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{gap.type === 'required' ? 'Required' : 'Preferred'}</p>
                              <h4 className="text-lg font-semibold text-slate-900">{gap.skill}</h4>
                              <p className="text-sm text-slate-600 mt-1">{reason}</p>
                            </div>
                            <div className="text-right text-xs text-slate-500 space-y-1">
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">
                                Priority {gap.priority ?? '—'}
                              </span>
                              {gap.salaryLabel && (
                                <span className="block text-emerald-700 font-semibold">{gap.salaryLabel} upside</span>
                              )}
                              {gap.salaryPct && (
                                <span className="block text-emerald-600">{gap.salaryPct}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </Card>

              {skillGapDerived.chartData.length > 0 && (
                <SkillGapChart data={skillGapDerived.chartData} type="bar" />
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
              <SalaryInsightsPanel 
                suggestions={salaryBoost || []}
                skillGaps={skillGaps}
                parsedResume={parsedResume}
                onVerifySkill={handleVerifyClick}
              />
            </motion.div>
          )}

          {activeTab === 'roadmap' && (
            <motion.div
              key="roadmap"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="space-y-6">
                <RoadmapTimeline roadmap={roadmap} skillFocus={roadmapSkillPlan} />
                <RoadmapSkillBreakdown
                  skills={roadmapSkillPlan}
                  skillsHave={skillGaps?.skillsHave || []}
                />
              </div>
            </motion.div>
          )}

          {activeTab === 'resources' && (
            <motion.div
              key="resources"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {!resources || resources.length === 0 ? (
                <div className="text-center py-16 text-slate-500">
                  <BookOpen className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <h3 className="text-xl font-semibold text-slate-800 mb-2">No Learning Resources</h3>
                  <p className="mb-4">Resources will be generated based on your skill gaps</p>
                  <p className="text-sm">Complete your resume analysis to see personalized learning resources</p>
                </div>
              ) : (
                <ResourcesList resources={resources} />
              )}
            </motion.div>
          )}

        </div>
      </div>

      {/* MCQ Verification Modal */}
      <MCQVerificationModal 
        isOpen={mcqModalOpen}
        onClose={() => setMcqModalOpen(false)}
        skill={selectedSkill}
        resumeId={resumeId || parsedResume?.resumeId}
        onVerificationComplete={handleVerificationComplete}
      />

        <Modal
          isOpen={showResumeSummary}
          onClose={() => setShowResumeSummary(false)}
          title="Resume & AI Summary"
          size="xl"
        >
          <ResumeSummaryView
            resume={parsedResume}
            watsonSummary={watsonSummary}
            skills={normalizedSkillInventory}
          />
        </Modal>

      <Footer />
    </div>
  )
}

export default DashboardPage
