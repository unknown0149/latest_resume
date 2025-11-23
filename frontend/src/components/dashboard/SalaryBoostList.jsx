import { TrendingUp, Clock, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import Card from '../ui/Card'

const SalaryBoostCard = ({ suggestion, index }) => {
  const getPriorityColor = (priority) => {
    if (!priority) return 'bg-blue-100 text-blue-700 border-blue-200'
    switch (priority.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      default:
        return 'bg-blue-100 text-blue-700 border-blue-200'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card hover className="group">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <h4 className="text-lg font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
                {suggestion.title}
              </h4>
              <span className={`px-2 py-1 rounded-md text-xs font-semibold border ${getPriorityColor(suggestion.priority)}`}>
                {suggestion.priority || 'Medium'}
              </span>
            </div>
            
            <p className="text-gray-600 text-sm mb-3">
              {suggestion.description}
            </p>
            
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1 text-green-600 font-semibold">
                <TrendingUp className="w-4 h-4" />
                <span>{suggestion.impact || '+$15k-$25k'}</span>
              </div>
              <div className="flex items-center gap-1 text-gray-600">
                <Clock className="w-4 h-4" />
                <span>{suggestion.timeframe || '2-4 months'}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

const SalaryBoostList = ({ suggestions }) => {
  if (!suggestions || suggestions.length === 0) {
    return (
      <Card>
        <p className="text-center text-gray-500 py-8">No salary boost suggestions available</p>
      </Card>
    )
  }

  const totalImpact = suggestions.reduce((sum, s) => {
    const match = s.impact.match(/\$(\d+)k/)
    return sum + (match ? parseInt(match[1]) : 0)
  }, 0)

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card gradient>
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">
              Potential Increase: ${totalImpact}k+
            </h3>
            <p className="text-gray-600">
              By completing these {suggestions.length} recommendations
            </p>
          </div>
        </div>
      </Card>

      {/* Suggestions List */}
      <div className="space-y-4">
        {suggestions.map((suggestion, index) => (
          <SalaryBoostCard key={suggestion.id || suggestion.skill || index} suggestion={suggestion} index={index} />
        ))}
      </div>
    </div>
  )
}

export default SalaryBoostList
