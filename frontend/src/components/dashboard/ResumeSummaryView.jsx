import { User, Mail, Phone, MapPin, Briefcase, GraduationCap } from 'lucide-react'
import Card from '../ui/Card'

const ResumeSummaryView = ({ resume }) => {
  if (!resume) {
    return (
      <Card>
        <p className="text-center text-gray-500 py-8">No resume data available</p>
      </Card>
    )
  }

  return (
    <Card>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Resume Summary</h3>
          <p className="text-gray-600">Parsed information from your resume</p>
        </div>

        {/* Personal Info */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6">
          <h4 className="text-xl font-bold text-gray-900 mb-4">{resume.name}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Mail className="w-4 h-4" />
              <span>{resume.email}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Phone className="w-4 h-4" />
              <span>{resume.phone}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 md:col-span-2">
              <MapPin className="w-4 h-4" />
              <span>{resume.location}</span>
            </div>
          </div>
        </div>

        {/* Summary */}
        {resume.summary && (
          <div>
            <h5 className="font-semibold text-gray-900 mb-2">Professional Summary</h5>
            <p className="text-gray-600 leading-relaxed">{resume.summary}</p>
          </div>
        )}

        {/* Experience */}
        {resume.experience && resume.experience.length > 0 && (
          <div>
            <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Work Experience
            </h5>
            <div className="space-y-4">
              {resume.experience.map((exp, idx) => (
                <div key={idx} className="border-l-4 border-primary-500 pl-4">
                  <h6 className="font-semibold text-gray-900">{exp.position}</h6>
                  <p className="text-sm text-gray-600">{exp.company} • {exp.duration}</p>
                  <p className="text-sm text-gray-600 mt-1">{exp.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Education */}
        {resume.education && resume.education.length > 0 && (
          <div>
            <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              Education
            </h5>
            <div className="space-y-3">
              {resume.education.map((edu, idx) => (
                <div key={idx} className="border-l-4 border-secondary-400 pl-4">
                  <h6 className="font-semibold text-gray-900">{edu.degree}</h6>
                  <p className="text-sm text-gray-600">{edu.school} • {edu.year}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skills */}
        {resume.skills && resume.skills.length > 0 && (
          <div>
            <h5 className="font-semibold text-gray-900 mb-3">Skills</h5>
            <div className="flex flex-wrap gap-2">
              {resume.skills.map((skill, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-gradient-primary text-white rounded-full text-sm font-medium"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

export default ResumeSummaryView
