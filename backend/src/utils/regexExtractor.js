/**
 * Regex Extraction Utilities
 * High-confidence deterministic extraction of structured data from resume text
 */

/**
 * Extract email addresses (confidence: 0.98)
 */
export function extractEmails(text) {
  if (!text) return { emails: [], confidence: 0 };
  
  const emailRegex = /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/gi;
  const matches = text.match(emailRegex) || [];
  
  // Deduplicate and normalize
  const emails = [...new Set(matches.map(email => email.toLowerCase()))];
  
  return {
    emails: emails,
    confidence: emails.length > 0 ? 0.98 : 0,
  };
}

/**
 * Extract phone numbers with country awareness (confidence: 0.95)
 */
export function extractPhones(text) {
  if (!text) return { phones: [], confidence: 0 };
  
  const patterns = [
    // Indian: +91-9876543210, +91 9876543210, 09876543210, 9876543210
    /(?:\+91[-\s]?)?[6-9]\d{9}\b/g,
    // US: +1-234-567-8900, (234) 567-8900, 234-567-8900
    /(?:\+1[-\s]?)?\(?\d{3}\)?[-\s]?\d{3}[-\s]?\d{4}\b/g,
    // UK: +44 20 7946 0958, +44-20-7946-0958
    /(?:\+44[-\s]?)?(?:\d{2,4}[-\s]?){2,4}\d{4}\b/g,
    // Generic international: +XX-XXX-XXXX-XXXX
    /\+\d{1,3}[-\s]?\d{1,4}[-\s]?\d{1,4}[-\s]?\d{1,9}\b/g,
  ];
  
  const phones = new Set();
  
  for (const pattern of patterns) {
    const matches = text.match(pattern) || [];
    matches.forEach(phone => {
      // Normalize: remove common separators but keep +
      const normalized = phone.replace(/[\s\-().]/g, '');
      if (normalized.length >= 10) {
        phones.add(normalized);
      }
    });
  }
  
  return {
    phones: [...phones],
    confidence: phones.size > 0 ? 0.95 : 0,
  };
}

/**
 * Extract URLs (GitHub, LinkedIn, portfolio, etc.) (confidence: 0.98)
 */
export function extractURLs(text) {
  if (!text) return { urls: [], confidence: 0 };
  
  const patterns = [
    // Full URLs
    /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)/gi,
    // GitHub without http
    /github\.com\/[a-zA-Z0-9_-]+/gi,
    // LinkedIn without http
    /linkedin\.com\/in\/[a-zA-Z0-9_-]+/gi,
    // Portfolio domains
    /(?:portfolio|website|blog):\s*([a-zA-Z0-9-]+\.(?:com|io|dev|me|net|org))/gi,
  ];
  
  const urls = new Set();
  
  for (const pattern of patterns) {
    const matches = text.match(pattern) || [];
    matches.forEach(url => {
      // Ensure URLs start with http/https
      let normalized = url.trim();
      if (!normalized.startsWith('http')) {
        normalized = 'https://' + normalized;
      }
      urls.add(normalized);
    });
  }
  
  return {
    urls: [...urls],
    confidence: urls.size > 0 ? 0.98 : 0,
  };
}

/**
 * Extract date ranges and convert to structured format
 * Handles: "2019 - 2021", "May 2018 – Present", "Jan 2020 - Dec 2022"
 */
export function extractDateRange(text) {
  if (!text) return null;
  
  const months = {
    'jan': '01', 'january': '01',
    'feb': '02', 'february': '02',
    'mar': '03', 'march': '03',
    'apr': '04', 'april': '04',
    'may': '05',
    'jun': '06', 'june': '06',
    'jul': '07', 'july': '07',
    'aug': '08', 'august': '08',
    'sep': '09', 'sept': '09', 'september': '09',
    'oct': '10', 'october': '10',
    'nov': '11', 'november': '11',
    'dec': '12', 'december': '12',
  };
  
  // Pattern: Month Year - Month Year or Year - Year
  const patterns = [
    // "May 2018 - December 2022" or "May 2018 - Present"
    /(?<startMonth>jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\.?\s+(?<startYear>\d{4})\s*[-–—to]\s*(?:(?<endMonth>jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\.?\s+)?(?<endYear>\d{4}|present|current)/gi,
    // "2019 - 2021"
    /(?<startYear>\d{4})\s*[-–—to]\s*(?<endYear>\d{4}|present|current)/gi,
  ];
  
  for (const pattern of patterns) {
    const match = pattern.exec(text.toLowerCase());
    if (match && match.groups) {
      const { startMonth, startYear, endMonth, endYear } = match.groups;
      
      const start = startMonth 
        ? `${startYear}-${months[startMonth.toLowerCase()]}` 
        : startYear;
      
      let end;
      if (endYear === 'present' || endYear === 'current') {
        const now = new Date();
        end = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      } else {
        end = endMonth 
          ? `${endYear}-${months[endMonth.toLowerCase()]}` 
          : endYear;
      }
      
      return { start, end };
    }
  }
  
  return null;
}

/**
 * Extract years of experience from text patterns
 * Handles: "5 years of experience", "3+ years", "2-4 years"
 */
export function extractYearsExperience(text) {
  if (!text) return { years: null, confidence: 0 };
  
  const patterns = [
    // "5 years of experience" or "5+ years"
    /(\d+\.?\d*)\+?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)/gi,
    // "2-4 years"
    /(\d+)\s*[-–]\s*(\d+)\s*(?:years?|yrs?)/gi,
  ];
  
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) {
      if (match[2]) {
        // Range: take average
        const avg = (parseInt(match[1]) + parseInt(match[2])) / 2;
        return { years: avg, confidence: 0.90 };
      } else {
        return { years: parseFloat(match[1]), confidence: 0.92 };
      }
    }
  }
  
  return { years: null, confidence: 0 };
}

/**
 * Extract education keywords and institutions
 * Returns matches with high confidence education patterns
 */
export function extractEducationKeywords(text) {
  if (!text) return { matches: [], confidence: 0 };
  
  const degreePatterns = [
    /\b(?:b\.?tech|bachelor of technology|be|bachelor of engineering)\b/gi,
    /\b(?:m\.?tech|master of technology|me|master of engineering)\b/gi,
    /\b(?:b\.?sc|bachelor of science|m\.?sc|master of science)\b/gi,
    /\b(?:bca|bachelor of computer applications|mca|master of computer applications)\b/gi,
    /\b(?:mba|master of business administration)\b/gi,
    /\b(?:phd|ph\.d|doctorate)\b/gi,
    /\b(?:bachelor|bachelors|master|masters|diploma|associate)\b/gi,
  ];
  
  const institutionKeywords = [
    /\b(?:university|college|institute|iit|nit|bits)\b/gi,
  ];
  
  const matches = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    for (const pattern of degreePatterns) {
      if (pattern.test(line)) {
        matches.push({
          type: 'degree',
          text: line.trim(),
          line: line.trim(),
        });
        break;
      }
    }
    
    for (const pattern of institutionKeywords) {
      if (pattern.test(line)) {
        matches.push({
          type: 'institution',
          text: line.trim(),
          line: line.trim(),
        });
        break;
      }
    }
  }
  
  return {
    matches: matches,
    confidence: matches.length > 0 ? 0.85 : 0,
  };
}

/**
 * Extract name from resume (usually first line or after "Name:")
 */
export function extractName(text) {
  if (!text) return { name: null, confidence: 0 };
  
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // Try "Name:" pattern first
  const namePattern = /(?:name|full name)\s*:?\s*([a-z\s]+)/gi;
  const nameMatch = namePattern.exec(text);
  if (nameMatch && nameMatch[1]) {
    const name = nameMatch[1].trim();
    if (name.length > 2 && name.length < 50 && /^[a-z\s]+$/i.test(name)) {
      return { name: name, confidence: 0.95 };
    }
  }
  
  // First line heuristic: assume name if it's short and has no special chars
  if (lines.length > 0) {
    const firstLine = lines[0];
    // Name should be 2-50 chars, contain only letters and spaces, have 1-4 words
    const words = firstLine.split(/\s+/);
    if (words.length >= 1 && words.length <= 4 && 
        firstLine.length > 2 && firstLine.length < 50 &&
        /^[a-z\s]+$/i.test(firstLine)) {
      return { name: firstLine, confidence: 0.80 };
    }
  }
  
  return { name: null, confidence: 0 };
}

/**
 * Extract location from text
 * Handles: "Location: Bengaluru, India", "Based in New York, USA"
 */
export function extractLocation(text) {
  if (!text) return { location: null, confidence: 0 };
  
  const patterns = [
    /(?:location|based in|current location|city)\s*:?\s*([a-z\s,]+(?:india|usa|uk|canada|australia|germany|france|singapore)?)/gi,
    // City, Country pattern
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),\s*(India|USA|UK|Canada|Australia|Germany|France|Singapore)\b/g,
  ];
  
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match && match[1]) {
      const location = match[1].trim();
      if (location.length > 2 && location.length < 100) {
        return { location: location, confidence: 0.88 };
      }
    }
  }
  
  return { location: null, confidence: 0 };
}

/**
 * Extract current job title
 * Looks for patterns like "Software Engineer at Company" or "Current: Senior Developer"
 */
export function extractCurrentTitle(text) {
  if (!text) return { title: null, confidence: 0 };
  
  const patterns = [
    /(?:current(?:ly)?|present)\s*(?:position|role|title)?\s*:?\s*([a-z\s]+(?:engineer|developer|architect|manager|analyst|consultant|designer|lead|scientist))/gi,
    // Look for title patterns in first 500 chars
    /\b((?:senior|junior|lead|principal|staff)?\s*(?:software|full stack|backend|frontend|devops|data|machine learning|ml)\s*(?:engineer|developer|architect))\b/gi,
  ];
  
  const firstPart = text.substring(0, 500);
  
  for (const pattern of patterns) {
    const match = pattern.exec(firstPart);
    if (match && match[1]) {
      const title = match[1].trim();
      if (title.length > 3 && title.length < 80) {
        return { title: title, confidence: 0.75 };
      }
    }
  }
  
  return { title: null, confidence: 0 };
}

/**
 * Extract skills using keyword matching
 * Returns array of potential skills found in text
 */
export function extractSkillKeywords(text) {
  if (!text) return { skills: [], confidence: 0 };
  
  // Pre-process text to handle bullet points and special characters
  let processedText = text
    .replace(/[•●○◦▪▫■□]/g, ' ') // Remove bullet points
    .replace(/[\n\r]/g, ' ')      // Replace newlines with spaces
    .replace(/\s+/g, ' ')         // Normalize multiple spaces
    .toLowerCase();
  
  // Order matters: Check more specific skills first to avoid false matches
  const commonSkills = [
    // Programming Languages
    'java', 'python', 'javascript', 'typescript', 'c++', 'c#', 'go', 'rust', 'php', 'ruby', 'kotlin', 'swift', 'r',
    
    // Web Frameworks & Libraries (check compound names first)
    'react native', 'react.js', 'node.js', 'nodejs', 'vue.js', 'next.js', 'express.js', 'spring boot',
    'react', 'angular', 'vue', 'express', 'spring', 'django', 'flask', 'fastapi', 'laravel', 'asp.net', '.net',
    
    // Databases (check specific ones before generic SQL/NoSQL)
    'postgresql', 'mongodb', 'elasticsearch', 'dynamodb', 'cassandra', 'mariadb',
    'mysql', 'sqlite', 'oracle', 'redis', 'neo4j', 'nosql', 'sql',
    
    // Cloud & DevOps
    'google cloud', 'github actions', 'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'k8s', 
    'terraform', 'ansible', 'jenkins', 'ci/cd', 'gitlab', 'circleci',
    
    // Version Control & Collaboration
    'github', 'gitlab', 'bitbucket', 'git', 'svn', 'agile', 'scrum', 'jira', 'confluence',
    
    // API & Architecture
    'rest api', 'restful', 'graphql', 'microservices', 'soap', 'grpc',
    
    // Frontend
    'html5', 'css3', 'tailwindcss', 'google sheets', 'html', 'css', 'sass', 'scss', 'less', 
    'tailwind', 'bootstrap', 'jquery', 'webpack', 'vite', 'redux', 'mobx',
    
    // Data Science & ML
    'scikit-learn', 'machine learning', 'deep learning', 'computer vision', 'data science', 
    'data analysis', 'data visualization', 'jupyter notebook', 'tensorflow', 'pytorch', 'keras',
    'pandas', 'numpy', 'matplotlib', 'seaborn', 'nlp', 'jupyter', 'anaconda',
    
    // BI & Analytics
    'power bi', 'powerbi', 'tableau', 'looker', 'qlik', 'excel', 'google analytics',
    
    // Testing
    'jest', 'mocha', 'chai', 'pytest', 'junit', 'selenium', 'cypress', 'postman',
    
    // Mobile
    'react native', 'flutter', 'android', 'ios', 'swift', 'kotlin',
    
    // Other Tools
    'visual studio code', 'vscode', 'intellij', 'linux', 'unix', 'bash', 'powershell', 'vim', 'eclipse'
  ];
  
  const foundSkills = new Set();
  
  // Process skills in order - longer/more specific phrases first
  for (const skill of commonSkills) {
    // Use word boundary for accurate matching
    const escapedSkill = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`\\b${escapedSkill}\\b`, 'gi');
    
    if (pattern.test(processedText)) {
      // Only add if not a substring match of already found skills
      const isSubstring = [...foundSkills].some(found => {
        return (found.length > skill.length && found.includes(skill)) || 
               (skill.length > found.length && skill.includes(found));
      });
      
      if (!isSubstring) {
        foundSkills.add(skill);
      }
    }
  }
  
  return {
    skills: [...foundSkills],
    confidence: foundSkills.size > 0 ? 0.70 : 0,
  };
}

export default {
  extractEmails,
  extractPhones,
  extractURLs,
  extractDateRange,
  extractYearsExperience,
  extractEducationKeywords,
  extractName,
  extractLocation,
  extractCurrentTitle,
  extractSkillKeywords,
};
