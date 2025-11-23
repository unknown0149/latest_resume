import { TrendingUp, Briefcase, MapPin, DollarSign } from 'lucide-react'
import { motion } from 'framer-motion'
import Card from '../ui/Card'

const JobRoleCard = ({ role, index, onClick }) => {
  // Handle both job match format and role format
  const job = role.job || role;
  const matchScore = role.matchScore || role.matchPercentage || 0;
  const title = job.title;
  const company = job.company?.name || job.company;
  const location = `${job.location?.city || ''}, ${job.location?.state || ''}`.trim().replace(/^,\s*/, '') || job.location;
  const description = job.description;
  const salary = job.salary ? `$${job.salary.min?.toLocaleString()}-$${job.salary.max?.toLocaleString()}` : job.salary;
  const matchedSkills = role.matchedSkills || job.matchedSkills || [];
  const missingSkills = role.missingSkills || job.missingSkills || [];
  
  const getMatchColor = (percentage) => {
    if (percentage >= 90) return 'text-green-600 bg-green-100'
    if (percentage >= 75) return 'text-blue-600 bg-blue-100'
    return 'text-orange-600 bg-orange-100'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card 
        hover 
        onClick={onClick}
        className="group cursor-pointer"
      >
        {/* Match Badge */}
        <div className="flex items-center justify-between mb-4">
          <span className={`px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 ${getMatchColor(matchScore)}`}>
            <TrendingUp className="w-4 h-4" />
            {matchScore}% Match
          </span>
        </div>

        {/* Role Info */}
        <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
          {title}
        </h3>
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {description}
        </p>

        {/* Company & Location */}
        <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Briefcase className="w-4 h-4" />
            <span>{company}</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            <span>{location}</span>
          </div>
        </div>

        {/* Salary */}
        {salary && (
          <div className="flex items-center gap-2 mb-4 text-primary-600 font-semibold">
            <DollarSign className="w-5 h-5" />
            <span>{salary}</span>
          </div>
        )}

        {/* Skills */}
        <div className="flex flex-wrap gap-2">
          {matchedSkills.slice(0, 3).map((skill, idx) => (
            <span 
              key={idx}
              className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-md font-medium"
            >
              {skill}
            </span>
          ))}
          {missingSkills.length > 0 && (
            <span className="px-2 py-1 bg-red-50 text-red-700 text-xs rounded-md font-medium">
              +{missingSkills.length} to learn
            </span>
          )}
        </div>
      </Card>
    </motion.div>
  )
}

export default JobRoleCard
