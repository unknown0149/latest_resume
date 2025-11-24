import { User, Mail, Phone, MapPin, Briefcase, GraduationCap } from 'lucide-react'
import Card from '../ui/Card'

const ResumeSummaryView = ({ resume }) => {
  console.log('📄 ResumeSummaryView received:', resume)
  
  if (!resume) {
    return (
      <Card>
        <p className="text-center text-gray-500 py-8">No resume data available</p>
      </Card>
    )
  }

  // Extract data with fallbacks for different field names
  const name = resume.name || resume.full_name || 'Name not found'
  const email = resume.email || (resume.emails && resume.emails[0]) || 'Email not found'
  const phone = resume.phone || (resume.phones && resume.phones[0]) || 'Phone not found'
  const location = resume.location || resume.address || 'Location not found'
  const summary = resume.summary || resume.professional_summary || null
  const experience = resume.experience || resume.work_experience || []
  const education = resume.education || []
  const skills = resume.skills || []

  console.log('📊 Extracted fields:', { name, email, phone, location, hasSkills: skills.length, hasExperience: experience.length, hasEducation: education.length })

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
          <h4 className="text-xl font-bold text-gray-900 mb-4">{name}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            {email && email !== 'Email not found' && (
              <div className="flex items-center gap-2 text-gray-600">
                <Mail className="w-4 h-4" />
                <span>{email}</span>
              </div>
            )}
            {phone && phone !== 'Phone not found' && (
              <div className="flex items-center gap-2 text-gray-600">
                <Phone className="w-4 h-4" />
                <span>{phone}</span>
              </div>
            )}
            {location && location !== 'Location not found' && (
              <div className="flex items-center gap-2 text-gray-600 md:col-span-2">
                <MapPin className="w-4 h-4" />
                <span>{location}</span>
              </div>
            )}
          </div>
        </div>

        {/* Summary */}
        {summary && (
          <div>
            <h5 className="font-semibold text-gray-900 mb-2">Professional Summary</h5>
            <p className="text-gray-600 leading-relaxed">{summary}</p>
          </div>
        )}

        {/* Skills */}
        {skills && skills.length > 0 && (
          <div>
            <h5 className="font-semibold text-gray-900 mb-3">Skills</h5>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill, idx) => (
                <span 
                  key={idx} 
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                >
                  {typeof skill === 'string' ? skill : skill.name || skill.skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Experience */}
        {experience && experience.length > 0 && (
          <div>
            <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Work Experience
            </h5>
            <div className="space-y-4">
              {experience.map((exp, idx) => (
                <div key={idx} className="border-l-4 border-primary-500 pl-4">
                  <h6 className="font-semibold text-gray-900">
                    {exp.position || exp.title || exp.role || 'Position'}
                  </h6>
                  <p className="text-sm text-gray-600">
                    {exp.company || exp.organization || 'Company'} 
                    {(exp.duration || exp.dates || exp.years) && ` • ${exp.duration || exp.dates || exp.years}`}
                  </p>
                  {exp.description && (
                    <p className="text-sm text-gray-600 mt-1">{exp.description}</p>
                  )}
                  {exp.responsibilities && exp.responsibilities.length > 0 && (
                    <ul className="text-sm text-gray-600 mt-2 list-disc list-inside">
                      {exp.responsibilities.slice(0, 3).map((resp, i) => (
                        <li key={i}>{resp}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Education */}
        {education && education.length > 0 && (
          <div>
            <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              Education
            </h5>
            <div className="space-y-3">
              {education.map((edu, idx) => (
                <div key={idx} className="border-l-4 border-secondary-400 pl-4">
                  <h6 className="font-semibold text-gray-900">
                    {edu.degree || edu.qualification || 'Degree'}
                  </h6>
                  <p className="text-sm text-gray-600">
                    {edu.school || edu.institution || edu.university || 'School'}
                    {(edu.year || edu.graduation_year || edu.dates) && ` • ${edu.year || edu.graduation_year || edu.dates}`}
                  </p>
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
