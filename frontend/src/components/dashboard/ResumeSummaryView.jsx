import { Mail, Phone, MapPin, Briefcase, GraduationCap, Brain, TrendingUp, Target, CheckCircle2, AlertCircle, Sparkles, ShieldCheck } from 'lucide-react'

const ResumeSummaryView = ({ resume, watsonSummary, skills: providedSkills }) => {
  if (!resume) {
    return (
      <div className="card-base rounded-[32px] p-8">
        <p className="text-center text-[var(--rg-text-secondary)] py-8">No resume data available. Please upload and parse your resume first.</p>
      </div>
    )
  }

  // Handle different resume data structures
  const resumeData = resume.parsed_resume || resume || {}
  const name = resumeData.name || resumeData.full_name || 'Name Not Provided'
  const email = resumeData.email || resumeData.contact_info?.email || null
  const phone = resumeData.phone || resumeData.contact_info?.phone || resumeData.contact_info?.mobile || null
  const location = resumeData.location || resumeData.contact_info?.location || null
  const summary = resumeData.summary || resumeData.professional_summary || null
  const experience = resumeData.experience || resumeData.work_experience || []
  const education = resumeData.education || []
  const resumeSkills = resumeData.skills || resumeData.technical_skills || []
  const skillSource = Array.isArray(providedSkills) && providedSkills.length ? providedSkills : resumeSkills
  const normalizedSkills = Array.isArray(skillSource)
    ? skillSource
        .map((skill, idx) => {
          if (typeof skill === 'string') return skill
          if (skill?.name) return skill.name
          if (skill?.skill) return skill.skill
          if (skill?.title) return skill.title
          return `Skill ${idx + 1}`
        })
        .filter(Boolean)
    : []

  const decoratedSkills = (() => {
    const source = Array.isArray(providedSkills) && providedSkills.length ? providedSkills : normalizedSkills
    return source
      .map((skill, idx) => {
        if (typeof skill === 'string') {
          return { label: skill, verified: false, score: null }
        }
        const label = skill.skill || skill.name || skill.title || skill.label || (typeof skill === 'string' ? skill : null) || `Skill ${idx + 1}`
        if (!label) {
          return null
        }
        const scoreValue = skill.score ?? skill.proficiency ?? skill.level ?? null
        return {
          label,
          verified: Boolean(skill.verified) || (skill.verificationScore || 0) >= 70,
          score: typeof scoreValue === 'number' ? Math.round(scoreValue) : null,
        }
      })
      .filter(Boolean)
  })()

  const verifiedSkillCount = decoratedSkills.filter((skill) => skill.verified).length
  const experienceEntries = Array.isArray(experience) ? experience : []
  const educationEntries = Array.isArray(education) ? education : []
  const recentRole = experienceEntries[0] || null
  const topEducation = educationEntries[0] || null
  const totalExperienceYears = resumeData.years_experience || resumeData.total_years_experience || null
  const primaryTitle = resumeData.current_title || resumeData.headline || resumeData.job_title || 'Role focus pending'

  const quickStats = [
    {
      label: 'Experience',
      value: totalExperienceYears ? `${totalExperienceYears}+ yrs` : experienceEntries.length ? `${experienceEntries.length} roles` : '—',
      hint: totalExperienceYears ? 'Career span' : 'Roles tracked'
    },
    {
      label: 'Verified skills',
      value: decoratedSkills.length ? `${verifiedSkillCount}/${decoratedSkills.length}` : '0',
      hint: 'Badges at 70%+'
    },
    {
      label: 'Latest role',
      value: recentRole?.position || recentRole?.title || recentRole?.role || '—',
      hint: recentRole?.company || recentRole?.organization || ''
    },
    {
      label: 'Top education',
      value: topEducation?.degree || topEducation?.qualification || topEducation?.school || '—',
      hint: topEducation?.year || topEducation?.graduation_year || ''
    }
  ]

  return (
    <div className="space-y-6">
      {/* Watson AI Summary - NEW */}
      {watsonSummary && watsonSummary.summary && (
        <div className="card-base rounded-[32px] p-8">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-6 h-6 text-[var(--rg-accent)]" />
            <h3 className="text-lg font-semibold text-[var(--rg-text-primary)]">AI-Powered Career Analysis</h3>
            <span className="ml-auto text-xs bg-[var(--rg-bg-muted)] text-[var(--rg-text-secondary)] px-3 py-1.5 rounded-full font-medium">
              {watsonSummary.source === 'watson' ? '🤖 Watson X.ai' : '✨ AI Analysis'}
            </span>
          </div>

          {/* Overall Assessment */}
          <div className="mb-4 p-4 bg-[var(--rg-bg-muted)] rounded-lg">
            <p className="text-[var(--rg-text-secondary)] leading-relaxed">{watsonSummary.summary.overallAssessment}</p>
          </div>

          {/* Strengths & Areas to Improve */}
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div className="bg-[var(--rg-surface)] rounded-lg p-4 border border-[var(--rg-border)]">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-5 h-5 text-[var(--rg-accent)]" />
                <h4 className="font-semibold text-[var(--rg-text-primary)]">Your Strengths</h4>
              </div>
              <ul className="space-y-2">
                {watsonSummary.summary.strengths?.map((strength, idx) => (
                  <li key={idx} className="text-sm text-[var(--rg-text-secondary)] flex items-start gap-2">
                    <span className="text-[var(--rg-accent)] mt-0.5">•</span>
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-[var(--rg-surface)] rounded-lg p-4 border border-[var(--rg-border)]">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-[var(--rg-accent)]" />
                <h4 className="font-semibold text-[var(--rg-text-primary)]">Areas to Improve</h4>
              </div>
              <ul className="space-y-2">
                {watsonSummary.summary.areasToImprove?.map((area, idx) => (
                  <li key={idx} className="text-sm text-[var(--rg-text-secondary)] flex items-start gap-2">
                    <span className="text-[var(--rg-accent)] mt-0.5">•</span>
                    <span>{area}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Career Advice */}
          <div className="mb-4 p-4 bg-[var(--rg-bg-muted)] rounded-lg border border-[var(--rg-border)]">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-[var(--rg-accent)]" />
              <h4 className="font-semibold text-[var(--rg-text-primary)]">Career Direction</h4>
            </div>
            <p className="text-sm text-[var(--rg-text-secondary)] leading-relaxed">{watsonSummary.summary.careerAdvice}</p>
          </div>

          {/* Skill Development Priority */}
          {watsonSummary.summary.skillDevelopmentPriority && watsonSummary.summary.skillDevelopmentPriority.length > 0 && (
            <div className="mb-4 p-4 bg-[var(--rg-surface)] rounded-lg border border-[var(--rg-border)]">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-[var(--rg-accent)]" />
                <h4 className="font-semibold text-[var(--rg-text-primary)]">Skill Development Priorities</h4>
              </div>
              <div className="space-y-3">
                {watsonSummary.summary.skillDevelopmentPriority.map((skillItem, idx) => (
                  <div key={idx} className="p-3 bg-[var(--rg-bg-muted)] rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-[var(--rg-text-primary)]">{skillItem.skill}</span>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        skillItem.priority === 'high' ? 'bg-[var(--rg-accent)] text-white' :
                        skillItem.priority === 'medium' ? 'bg-[var(--rg-bg-muted)] text-[var(--rg-text-primary)]' :
                        'bg-transparent text-[var(--rg-text-secondary)] border border-dashed border-[var(--rg-border)]'
                      }`}>
                        {skillItem.priority?.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--rg-text-secondary)] mb-1">{skillItem.reason}</p>
                    <p className="text-xs text-[var(--rg-accent)] font-medium">{skillItem.expectedImpact}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Next Steps */}
          {watsonSummary.summary.nextSteps && watsonSummary.summary.nextSteps.length > 0 && (
            <div className="p-4 bg-[var(--rg-bg-muted)] rounded-lg border border-[var(--rg-border)]">
              <h4 className="font-semibold text-[var(--rg-text-primary)] mb-2">Recommended Next Steps</h4>
              <ol className="space-y-2">
                {watsonSummary.summary.nextSteps.map((step, idx) => (
                  <li key={idx} className="text-sm text-[var(--rg-text-secondary)] flex items-start gap-2">
                    <span className="font-bold text-[var(--rg-accent)]">{idx + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {/* Resume Summary Card */}
      <div className="card-base overflow-hidden rounded-[32px]">
        <div className="bg-gradient-to-r from-[#0f172a] via-[#1a2238] to-[#233250] text-white px-6 py-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.4em] text-white/60">Candidate snapshot</p>
              <h3 className="text-3xl font-semibold mt-2">{name}</h3>
              <p className="text-white/80 text-lg">{primaryTitle}</p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-white/85">
                {email && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-1">
                    <Mail className="w-4 h-4" />
                    {email}
                  </span>
                )}
                {phone && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-1">
                    <Phone className="w-4 h-4" />
                    {phone}
                  </span>
                )}
                {location && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-1">
                    <MapPin className="w-4 h-4" />
                    {location}
                  </span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 min-w-[220px]">
              {quickStats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-center">
                  <p className="text-xs uppercase tracking-wide text-white/70">{stat.label}</p>
                  <p className="text-xl font-semibold text-white">{stat.value}</p>
                  {stat.hint && <p className="text-[11px] text-white/60">{stat.hint}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-8 bg-white">
          {summary && (
            <div className="rounded-3xl border border-[var(--rg-border)] bg-[var(--rg-bg-muted)] p-5">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-[var(--rg-accent)]" />
                <h5 className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--rg-text-secondary)]">Professional summary</h5>
              </div>
              <p className="text-[var(--rg-text-secondary)] leading-relaxed">{summary}</p>
            </div>
          )}

          {experienceEntries.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Briefcase className="w-5 h-5 text-[var(--rg-accent)]" />
                <h5 className="text-lg font-semibold text-[var(--rg-text-primary)]">Experience highlights</h5>
              </div>
              <div className="space-y-4">
                {experienceEntries.map((exp, idx) => (
                  <div key={idx} className="relative pl-6">
                    <span className="absolute left-0 top-2 h-3 w-3 rounded-full bg-[var(--rg-accent)]"></span>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-base font-semibold text-slate-900">{exp.position || exp.title || exp.role}</p>
                          <p className="text-sm text-slate-500">{exp.company || exp.organization}</p>
                        </div>
                        <span className="text-xs uppercase tracking-wide text-slate-400">{exp.duration || exp.period || exp.dates}</span>
                      </div>
                      {(exp.description || exp.responsibilities) && (
                        <p className="text-sm text-slate-600 mt-2">{exp.description || exp.responsibilities}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {educationEntries.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <GraduationCap className="w-5 h-5 text-[var(--rg-accent)]" />
                <h5 className="text-lg font-semibold text-[var(--rg-text-primary)]">Education</h5>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {educationEntries.map((edu, idx) => (
                  <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-base font-semibold text-slate-900">{edu.degree || edu.qualification}</p>
                    <p className="text-sm text-slate-500">{edu.school || edu.institution || edu.university}</p>
                    <p className="text-xs uppercase tracking-wide text-slate-400 mt-1">{edu.year || edu.graduation_year}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {decoratedSkills.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-lg font-semibold text-[var(--rg-text-primary)]">Skills matrix</h5>
                <span className="text-sm text-[var(--rg-text-secondary)]">{verifiedSkillCount} verified • {decoratedSkills.length} tracked</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {decoratedSkills.map((skill, idx) => (
                  <span
                    key={`${skill.label}-${idx}`}
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium ${
                      skill.verified
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        : 'bg-[var(--rg-bg-muted)] text-[var(--rg-text-primary)] border-[var(--rg-border)]'
                    }`}
                  >
                    {skill.label}
                    {skill.verified && <ShieldCheck className="w-3.5 h-3.5" />}
                    {typeof skill.score === 'number' && (
                      <span className="text-xs font-semibold text-[var(--rg-text-secondary)]">{skill.score}%</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ResumeSummaryView
