/**
 * Parse extracted resume text into structured data
 * This is a basic parser - in production, you'd use IBM Watson or NLP
 */

export const parseResumeText = (rawText, resumeId) => {
  if (!rawText) {
    return null
  }

  // Basic extraction patterns
  const emailRegex = /[\w.-]+@[\w.-]+\.\w+/
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/
  
  // Extract email
  const emailMatch = rawText.match(emailRegex)
  const email = emailMatch ? emailMatch[0] : ''

  // Extract phone
  const phoneMatch = rawText.match(phoneRegex)
  const phone = phoneMatch ? phoneMatch[0] : ''

  // Extract name (usually first line or near top)
  const lines = rawText.split('\n').filter(line => line.trim().length > 0)
  const name = lines[0]?.trim() || 'User'

  // Extract skills (look for common skill keywords)
  const skillKeywords = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'React', 'Node.js', 
    'Angular', 'Vue', 'SQL', 'MongoDB', 'AWS', 'Azure', 'Docker', 
    'Kubernetes', 'Git', 'HTML', 'CSS', 'Express', 'Django', 'Flask',
    'Spring', 'C++', 'C#', 'PHP', 'Ruby', 'Go', 'Rust', 'Swift',
    'Machine Learning', 'AI', 'Data Science', 'DevOps', 'REST', 'GraphQL'
  ]
  
  const skills = skillKeywords.filter(skill => 
    rawText.toLowerCase().includes(skill.toLowerCase())
  )

  // Extract experience (look for year patterns)
  const experienceMatches = rawText.match(/\d{4}\s*[-–—]\s*(\d{4}|present|current)/gi)
  const experience = experienceMatches ? experienceMatches.map(match => ({
    company: 'Company', // Would need more parsing
    position: 'Position', // Would need more parsing
    duration: match,
    description: 'Description would be extracted here'
  })) : []

  // Extract education
  const educationKeywords = ['university', 'college', 'bachelor', 'master', 'phd', 'degree', 'b.s.', 'm.s.', 'b.a.', 'm.a.']
  const hasEducation = educationKeywords.some(keyword => 
    rawText.toLowerCase().includes(keyword)
  )
  
  const education = hasEducation ? [{
    degree: 'Degree',
    school: 'University',
    year: '2020'
  }] : []

  // Extract location (look for city, state patterns)
  const locationMatch = rawText.match(/[A-Z][a-z]+,\s*[A-Z]{2}/)
  const location = locationMatch ? locationMatch[0] : ''

  // Extract summary (first paragraph after name)
  const summary = lines.slice(1, 3).join(' ').substring(0, 200)

  return {
    id: resumeId,
    name,
    email,
    phone,
    location,
    summary: summary || 'Professional with diverse experience',
    experience,
    education,
    skills,
    raw_text: rawText
  }
}

/**
 * In production, this would call IBM Watson X.ai for better parsing
 */
export const parseResumeWithAI = async (rawText, resumeId) => {
  // TODO: Implement IBM Watson X.ai parsing
  // For now, use basic parsing
  return parseResumeText(rawText, resumeId)
}
