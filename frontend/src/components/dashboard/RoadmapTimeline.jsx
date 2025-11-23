import { CheckCircle, Circle, Calendar, Target } from 'lucide-react'
import { motion } from 'framer-motion'
import Card from '../ui/Card'

const RoadmapTimeline = ({ roadmap }) => {
  if (!roadmap) {
    return (
      <Card>
        <p className="text-center text-gray-500 py-8">No roadmap data available</p>
      </Card>
    )
  }

  const phases = [
    { key: 'month30', data: roadmap.month30, color: 'blue' },
    { key: 'month60', data: roadmap.month60, color: 'green' },
    { key: 'month90', data: roadmap.month90, color: 'purple' },
  ]

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

  return (
    <Card>
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">30/60/90 Day Roadmap</h3>
        <p className="text-gray-600">Your personalized learning path to career success</p>
      </div>

      <div className="space-y-8">
        {phases.map((phase, phaseIndex) => {
          const colors = colorClasses[phase.color]
          
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
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold">{phase.data.title}</h4>
                      <p className="text-white/90 text-sm">
                        {phase.data.goals.length} main goals
                      </p>
                    </div>
                  </div>
                </div>

                {/* Phase Content */}
                <div className="p-6 bg-white">
                  {/* Goals */}
                  <div className="mb-6">
                    <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Goals
                    </h5>
                    <ul className="space-y-2">
                      {phase.data.goals.map((goal, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-gray-600">
                          <CheckCircle className={`w-4 h-4 ${colors.text}`} />
                          <span>{goal}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Tasks */}
                  <div className="mb-6">
                    <h5 className="font-semibold text-gray-900 mb-3">Tasks</h5>
                    <div className="space-y-3">
                      {phase.data.tasks.map((task) => (
                        <div
                          key={task.id}
                          className={`flex items-start gap-3 p-3 rounded-lg ${colors.bg} border ${colors.border} border-opacity-20`}
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            {task.completed ? (
                              <CheckCircle className={`w-5 h-5 ${colors.text}`} />
                            ) : (
                              <Circle className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className={`font-medium ${task.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                              {task.title}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              Estimated: {task.timeEstimate}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Milestones */}
                  <div>
                    <h5 className="font-semibold text-gray-900 mb-3">Milestones</h5>
                    <div className="flex flex-wrap gap-2">
                      {phase.data.milestones.map((milestone, idx) => (
                        <span
                          key={idx}
                          className={`px-3 py-1 ${colors.bg} ${colors.text} rounded-full text-sm font-medium`}
                        >
                          {milestone}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </Card>
  )
}

export default RoadmapTimeline
