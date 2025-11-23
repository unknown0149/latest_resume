import { ExternalLink, Star, Clock, DollarSign } from 'lucide-react'
import { motion } from 'framer-motion'
import Card from '../ui/Card'
import Button from '../ui/Button'

const ResourceCard = ({ resource, index }) => {
  const isFree = resource.price.toLowerCase() === 'free'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card hover className="h-full flex flex-col">
        {/* Badge */}
        <div className="flex items-center justify-between mb-3">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
            isFree 
              ? 'bg-green-100 text-green-700' 
              : 'bg-blue-100 text-blue-700'
          }`}>
            {resource.type}
          </span>
          <div className="flex items-center gap-1 text-yellow-500">
            <Star className="w-4 h-4 fill-current" />
            <span className="text-sm font-semibold text-gray-700">{resource.rating}</span>
          </div>
        </div>

        {/* Title & Provider */}
        <h4 className="text-lg font-bold text-gray-900 mb-1 line-clamp-2">
          {resource.title}
        </h4>
        <p className="text-sm text-gray-600 mb-4">{resource.provider}</p>

        {/* Skills */}
        <div className="flex flex-wrap gap-2 mb-4">
          {resource.skills.map((skill, idx) => (
            <span
              key={idx}
              className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded-md font-medium"
            >
              {skill}
            </span>
          ))}
        </div>

        {/* Meta Info */}
        <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{resource.duration}</span>
          </div>
          <div className="flex items-center gap-1">
            <DollarSign className="w-4 h-4" />
            <span className={isFree ? 'text-green-600 font-semibold' : ''}>
              {resource.price}
            </span>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-auto">
          <Button 
            variant="outline" 
            className="w-full group-hover:bg-primary-500 group-hover:text-white group-hover:border-primary-500"
            onClick={() => window.open(resource.url, '_blank')}
          >
            <span>View Course</span>
            <ExternalLink className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </Card>
    </motion.div>
  )
}

const ResourcesList = ({ resources }) => {
  if (!resources || resources.length === 0) {
    return (
      <Card>
        <p className="text-center text-gray-500 py-8">No learning resources available</p>
      </Card>
    )
  }

  const freeResources = resources.filter(r => r.price.toLowerCase() === 'free')
  const paidResources = resources.filter(r => r.price.toLowerCase() !== 'free')

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Learning Resources</h3>
        <p className="text-gray-600">
          Curated courses and materials to help you bridge skill gaps
        </p>
      </div>

      {/* Free Resources */}
      {freeResources.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h4 className="text-xl font-bold text-gray-900">Free Resources</h4>
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
              {freeResources.length} courses
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {freeResources.map((resource, index) => (
              <ResourceCard key={resource.id} resource={resource} index={index} />
            ))}
          </div>
        </div>
      )}

      {/* Paid Resources */}
      {paidResources.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h4 className="text-xl font-bold text-gray-900">Premium Resources</h4>
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
              {paidResources.length} courses
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paidResources.map((resource, index) => (
              <ResourceCard key={resource.id} resource={resource} index={index} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ResourcesList
