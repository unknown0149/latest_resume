import { CheckCircle, Circle, Calendar, Target, Clock, BookOpen } from 'lucide-react'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import Card from '../ui/Card'

const RoadmapTimeline = ({ roadmap, skillFocus = [] }) => {
  const [completedGoals, setCompletedGoals] = useState({})

  // Load progress from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('roadmap_progress')
    if (saved) {
      setCompletedGoals(JSON.parse(saved))
    }
  }, [])

  // Toggle goal completion
  const toggleGoal = (goalId) => {
    const updated = {
      ...completedGoals,
      [goalId]: !completedGoals[goalId]
    }
    setCompletedGoals(updated)
    localStorage.setItem('roadmap_progress', JSON.stringify(updated))
  }

  if (!roadmap || !roadmap.month30) {
    return (
      <Card>
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg mb-2">No roadmap available yet</p>
          <p className="text-gray-400 text-sm">Upload your resume and analyze your role to generate a personalized learning roadmap</p>
        </div>
      </Card>
    )
  }

  const phases = [
    { key: 'month30', data: roadmap.month30, color: 'blue', days: '1-30' },
    { key: 'month60', data: roadmap.month60, color: 'green', days: '31-60' },
    { key: 'month90', data: roadmap.month90, color: 'purple', days: '61-90' },
  ]

  // Calculate overall progress
  const totalGoals = phases.reduce((sum, phase) => sum + (phase.data?.goals?.length || 0), 0)
  const completedCount = Object.values(completedGoals).filter(Boolean).length
  const overallProgress = totalGoals > 0 ? Math.round((completedCount / totalGoals) * 100) : 0

  const colorClasses = {
    blue: {
      bg: 'bg-blue-100',
      text: 'text-blue-600',
      border: 'border-blue-500',
      gradient: 'from-blue-500 to-blue-600',
    },
    green: {
      bg: 'bg-green-100',
      text: 'text-green-600',
      border: 'border-green-500',
      gradient: 'from-green-500 to-green-600',
    },
    purple: {
      bg: 'bg-purple-100',
      text: 'text-purple-600',
      border: 'border-purple-500',
      gradient: 'from-purple-500 to-purple-600',
    },
  }

  const stageInfo = {
    foundation: { title: 'Foundation', timeframe: 'Days 1-30' },
    depth: { title: 'Depth', timeframe: 'Days 31-60' },
    polish: { title: 'Polish', timeframe: 'Days 61-90' }
  }

  const stageChipClasses = {
    foundation: 'bg-blue-50 text-blue-700 border-blue-100',
    depth: 'bg-green-50 text-green-700 border-green-100',
    polish: 'bg-purple-50 text-purple-700 border-purple-100'
  }

  const stageOrder = ['foundation', 'depth', 'polish']

  const totalEstimatedHours = roadmap.estimatedTotalHours || phases.reduce((sum, phase) => sum + (phase.data?.estimatedHours || 0), 0)
  const weeklyHours = totalEstimatedHours ? Math.round(totalEstimatedHours / 13) : 5
  const dailyHours = Math.max(1, Math.round(weeklyHours / 5))
  const skillFocusByStage = stageOrder.map((stageKey) => ({
    stageKey,
    skills: skillFocus.filter((s) => s.stageKey === stageKey)
  }))

  return (
    <Card>
      <div className="mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">30/60/90 Day Roadmap</h3>
            <p className="text-gray-600">Your personalized learning path to career success</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-600">{overallProgress}%</div>
            <div className="text-sm text-gray-600">{completedCount}/{totalGoals} goals</div>
          </div>
        </div>
        
        {/* Overall Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${overallProgress}%` }}
          ></div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Time budget</p>
          <p className="text-xl font-semibold text-slate-900 mt-1">{totalEstimatedHours ? `${totalEstimatedHours} hrs` : 'Calibrating'}</p>
          <p className="text-sm text-slate-600">~{weeklyHours} hrs/week • ~{dailyHours} hrs/day</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Goals</p>
          <p className="text-xl font-semibold text-slate-900 mt-1">{completedCount}/{totalGoals} complete</p>
          <p className="text-sm text-slate-600">Tap goals to mark done</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Skill focus</p>
          <div className="flex flex-wrap gap-2 mt-2 text-xs text-slate-700">
            {skillFocusByStage.map(({ stageKey, skills }) => (
              <span key={stageKey} className="inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 px-3 py-1">
                <span className="font-semibold capitalize">{stageKey}</span>
                <span className="text-slate-500">{skills.length} skills</span>
              </span>
            ))}
            {!skillFocus.length && <span className="text-slate-500">Auto-fills once analysis runs</span>}
          </div>
        </div>
      </div>

      {skillFocus.length > 0 && (
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {stageOrder.map((stageKey) => {
            const stageSkills = skillFocus.filter((skill) => skill.stageKey === stageKey)
            const chipClass = stageChipClasses[stageKey]
            const info = stageInfo[stageKey]
            const visibleSkills = stageSkills.slice(0, 4)
            const extraCount = stageSkills.length - visibleSkills.length

            return (
              <div key={stageKey} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{info.timeframe}</p>
                <h4 className="text-lg font-semibold text-slate-900 mt-1">{info.title} focus</h4>
                {stageSkills.length ? (
                  <>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {visibleSkills.map((skill) => (
                        <span key={`${stageKey}-${skill.skill}`} className={`rounded-full border px-3 py-1 text-xs font-semibold ${chipClass}`}>
                          {skill.skill}
                        </span>
                      ))}
                      {extraCount > 0 && (
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${chipClass}`}>
                          +{extraCount} more
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-3">
                      Primary reason: {stageSkills[0].reasons?.[0] || 'Role blueprint marked this capability as missing in your resume scan.'}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-slate-500 mt-3">Fully covered for now—keep the cadence going.</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="space-y-8">
        {phases.map((phase, phaseIndex) => {
          if (!phase.data || !phase.data.goals) return null
          
          const colors = colorClasses[phase.color]
          const phaseGoals = phase.data.goals
          const phaseCompleted = phaseGoals.filter(g => completedGoals[g.id]).length
          const phaseProgress = phaseGoals.length > 0 ? Math.round((phaseCompleted / phaseGoals.length) * 100) : 0
          
          return (
            <motion.div
              key={phase.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: phaseIndex * 0.2 }}
              className="relative"
            >
              {/* Timeline Line */}
              {phaseIndex < phases.length - 1 && (
                <div className="absolute left-6 top-20 bottom-0 w-0.5 bg-gray-200 -mb-8"></div>
              )}

              {/* Phase Card */}
              <div className={`relative rounded-xl border-2 ${colors.border} overflow-hidden`}>
                {/* Phase Header */}
                <div className={`bg-gradient-to-r ${colors.gradient} text-white px-6 py-4`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-xl font-bold">{phase.data.title}</h4>
                        <p className="text-white/90 text-sm">Days {phase.days} • {phaseGoals.length} goals</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{phaseProgress}%</div>
                      <div className="text-sm text-white/80">{phaseCompleted}/{phaseGoals.length}</div>
                    </div>
                  </div>
                  
                  {/* Phase Progress Bar */}
                  <div className="mt-3 w-full bg-white/20 rounded-full h-2">
                    <div
                      className="bg-white h-2 rounded-full transition-all duration-500"
                      style={{ width: `${phaseProgress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Phase Content */}
                <div className="p-6 bg-white">
                  {/* Focus Area */}
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h5 className="font-semibold text-gray-900 mb-2">Focus</h5>
                    <p className="text-gray-600">{phase.data.focus}</p>
                  </div>

                  {/* Goals */}
                  <div className="mb-6">
                    <h5 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      Learning Goals
                    </h5>
                    <div className="space-y-3">
                      {phaseGoals.map((goal) => {
                        const isCompleted = completedGoals[goal.id]
                        
                        return (
                          <div
                            key={goal.id}
                            onClick={() => toggleGoal(goal.id)}
                            className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                              isCompleted
                                ? `${colors.bg} ${colors.border} border-opacity-50`
                                : 'bg-white border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 mt-1">
                                {isCompleted ? (
                                  <CheckCircle className={`w-6 h-6 ${colors.text}`} />
                                ) : (
                                  <Circle className="w-6 h-6 text-gray-400" />
                                )}
                              </div>
                              <div className="flex-1">
                                <h6 className={`font-semibold mb-2 ${
                                  isCompleted ? 'line-through text-gray-500' : 'text-gray-900'
                                }`}>
                                  {goal.title}
                                </h6>
                                <p className={`text-sm mb-3 ${
                                  isCompleted ? 'line-through text-gray-400' : 'text-gray-600'
                                }`}>
                                  {goal.description}
                                </p>
                                
                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    <span>{goal.estimatedHours} hours</span>
                                  </div>
                                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                                    goal.priority === 'high' ? 'bg-red-100 text-red-700' :
                                    goal.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {goal.priority} priority
                                  </div>
                                </div>
                                
                                {goal.resources && goal.resources.length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-gray-200">
                                    <p className="text-xs font-semibold text-gray-700 mb-2">Resources:</p>
                                    <ul className="space-y-1">
                                      {goal.resources.map((resource, idx) => (
                                        <li key={idx} className="text-xs text-gray-600 flex items-start gap-2">
                                          <span className="text-blue-500">•</span>
                                          <span>{resource}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Milestones */}
                  {phase.data.milestones && phase.data.milestones.length > 0 && (
                    <div>
                      <h5 className="font-semibold text-gray-900 mb-3">🎯 Milestones</h5>
                      <div className="space-y-2">
                        {phase.data.milestones.map((milestone) => (
                          <div
                            key={milestone.id}
                            className={`p-3 rounded-lg ${colors.bg} border ${colors.border} border-opacity-20`}
                          >
                            <h6 className={`font-semibold ${colors.text} mb-1`}>{milestone.title}</h6>
                            <p className="text-sm text-gray-600">{milestone.description}</p>
                            <p className="text-xs text-gray-500 mt-2">Due: {milestone.dueDate}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
      
      {/* Summary */}
      <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl">
        <h4 className="text-lg font-bold text-gray-900 mb-2">💡 Tips for Success</h4>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>• Click on any goal to mark it as complete and track your progress</li>
          <li>• Focus on high-priority skills first for maximum impact</li>
          <li>• Dedicate {roadmap.estimatedTotalHours ? Math.round(roadmap.estimatedTotalHours / 90) : 5} hours per day to stay on track</li>
          <li>• Build projects to reinforce your learning and create a portfolio</li>
          <li>• Join communities and forums related to your target skills</li>
        </ul>
      </div>
    </Card>
  )
}

export default RoadmapTimeline
