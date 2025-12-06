import { Info, Target, TrendingUp } from 'lucide-react'
import Card from '../ui/Card'

const priorityLabel = (priority = 1) => {
  if (priority >= 3) return 'High'
  if (priority === 2) return 'Medium'
  return 'Low'
}

const badgeClass = (variant = 'default') => {
  if (variant === 'solid') {
    return 'bg-slate-900 text-white border-slate-900'
  }
  if (variant === 'outline') {
    return 'bg-transparent text-slate-600 border-slate-200'
  }
  return 'bg-slate-100 text-slate-700 border-slate-200'
}

const RoadmapSkillBreakdown = ({ skills = [], skillsHave = [] }) => {
  const trackedSkillCount = Array.isArray(skillsHave) ? skillsHave.length : 0
  const verifiedCount = Array.isArray(skillsHave)
    ? skillsHave.filter((skill) => skill?.verified || (skill?.verificationScore || 0) >= 70).length
    : 0

  const requiredCount = skills.filter((skill) => skill.type === 'required').length
  const preferredCount = skills.filter((skill) => skill.type === 'preferred').length

  if (!skills.length) {
    return (
      <Card tone="light">
        <div className="text-center py-10 text-slate-500">
          <p className="text-lg font-semibold">No urgent gaps detected</p>
          <p className="text-sm mt-2">
            All required skills are currently covered. Re-run the analysis after updating your resume to refresh the roadmap.
          </p>
        </div>
      </Card>
    )
  }

  const summaryChips = [
    { label: 'Required gaps', value: requiredCount, accent: 'bg-rose-50 text-rose-700 border-rose-100' },
    { label: 'Preferred gaps', value: preferredCount, accent: 'bg-amber-50 text-amber-700 border-amber-100' },
    { label: 'Verified skills', value: `${verifiedCount}/${trackedSkillCount || 0}`, accent: 'bg-emerald-50 text-emerald-700 border-emerald-100' }
  ]

  return (
    <Card tone="light" className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Skill requirement breakdown</p>
          <h3 className="text-2xl font-semibold text-slate-900 mt-2">Why these skills are on your roadmap</h3>
          <p className="text-sm text-slate-500 mt-2 max-w-2xl">
            We cross-reference the target role blueprint with your parsed resume, verified badges, and Watson AI insights. Anything not
            matched (or verified below 70%) is flagged as a gap and prioritized by role criticality plus potential salary impact.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 min-w-[240px] text-center">
          {summaryChips.map((chip) => (
            <div key={chip.label} className={`rounded-2xl border px-4 py-3 ${chip.accent}`}>
              <p className="text-xs uppercase tracking-wide">{chip.label}</p>
              <p className="text-2xl font-semibold">{chip.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <Info className="w-4 h-4 text-slate-500" />
          <p>How we detect gaps</p>
        </div>
        <ul className="mt-3 space-y-2 text-sm text-slate-600 list-disc pl-6">
          <li>Resume parsing + verified skill badges create the baseline “skills you have” list.</li>
          <li>Role templates provide required and preferred skills which we match using fuzzy search.</li>
          <li>
            Missing or unverified skills inherit a priority blended from role criticality, salary boost data, and Watson-strength insights.
          </li>
        </ul>
      </div>

      <div className="space-y-4">
        {skills.map((skill) => {
          const reason = skill.reasons?.[0]
            || `Marked as a ${skill.type === 'required' ? 'required' : 'preferred'} capability for your predicted role.`
          const leverage = skill.leverage?.skill || skill.alignedWith?.[0]?.skill
          const priorityText = priorityLabel(skill.priority)
          const stageLabel = skill.stageLabel || 'Roadmap focus'
          const stageTimeframe = skill.stageTimeframe || 'Days 1-90'
          return (
            <div
              key={`${skill.stageKey || 'stage'}-${skill.skill}`}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_15px_35px_rgba(15,23,42,0.06)]"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-xl font-semibold text-slate-900">{skill.skill}</h4>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                    {stageLabel} • {stageTimeframe}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                  <span className={`rounded-full border px-3 py-1 ${badgeClass('solid')}`}>
                    {skill.type === 'required' ? 'Required' : 'Preferred'}
                  </span>
                  <span className={`rounded-full border px-3 py-1 ${badgeClass('default')}`}>
                    Priority {priorityText}
                  </span>
                  {skill.salaryBoost?.percentage && (
                    <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 ${badgeClass('outline')}`}>
                      <TrendingUp className="w-3 h-3" />
                      {skill.salaryBoost.percentage}
                    </span>
                  )}
                </div>
              </div>
              <p className="text-sm text-slate-600 mt-3">{reason}</p>
              <div className="mt-3 text-xs text-slate-500 flex flex-wrap gap-3">
                <span>
                  Evidence: not detected in resume text or verified badges during the latest scan, so it is scheduled for the {stageLabel.toLowerCase()} window.
                </span>
                {leverage && (
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                    <Target className="w-3 h-3" />
                    Build on {leverage}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

export default RoadmapSkillBreakdown
