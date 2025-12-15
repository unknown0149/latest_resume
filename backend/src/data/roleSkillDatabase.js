/**
 * Role-Skill Database
 * Predefined job roles with required/preferred skills, experience ranges, and salary info
 * Used for backend-first role prediction before Watson fallback
 */

export const roles = [
  {
    role: 'Backend Java Developer',
    category: 'Backend',
    description: 'Develops server-side Java applications, REST APIs, and microservices',
    requiredSkills: [
      'Java',
      'Spring Boot',
      'SQL',
      'REST API',
      'Git',
    ],
    preferredSkills: [
      'Microservices',
      'Docker',
      'Hibernate',
      'AWS',
      'PostgreSQL',
      'MongoDB',
      'Kubernetes',
      'Redis',
      'Kafka',
      'JUnit',
    ],
    experienceRange: { min: 0, max: 10 },
    salaryRange: {
      USD: { min: 70000, max: 150000 },
      INR: { min: 600000, max: 2500000 }, // ₹6-25 LPA
    },
    demandScore: 85, // 0-100 scale for market demand
  },
  {
    role: 'Full Stack Developer',
    category: 'Full Stack',
    description: 'Builds complete web applications handling both frontend and backend',
    requiredSkills: [
      'JavaScript',
      'React',
      'Node.js',
      'SQL',
      'REST API',
      'Git',
    ],
    preferredSkills: [
      'TypeScript',
      'Express.js',
      'MongoDB',
      'Docker',
      'AWS',
      'PostgreSQL',
      'Redux',
      'Next.js',
      'Tailwind CSS',
      'Jest',
      'CI/CD',
    ],
    experienceRange: { min: 0, max: 10 },
    salaryRange: {
      USD: { min: 75000, max: 160000 },
      INR: { min: 700000, max: 2800000 },
    },
    demandScore: 90,
  },
  {
    role: 'Frontend Developer',
    category: 'Frontend',
    description: 'Creates user interfaces and interactive web experiences',
    requiredSkills: [
      'JavaScript',
      'React',
      'HTML5',
      'CSS3',
      'Git',
    ],
    preferredSkills: [
      'TypeScript',
      'Vue.js',
      'Angular',
      'Redux',
      'Tailwind CSS',
      'SASS',
      'Webpack',
      'Next.js',
      'Jest',
      'Figma',
      'Responsive Design',
    ],
    experienceRange: { min: 0, max: 8 },
    salaryRange: {
      USD: { min: 65000, max: 140000 },
      INR: { min: 500000, max: 2200000 },
    },
    demandScore: 88,
  },
  {
    role: 'DevOps Engineer',
    category: 'DevOps',
    description: 'Manages infrastructure, CI/CD pipelines, and deployment automation',
    requiredSkills: [
      'Docker',
      'Kubernetes',
      'CI/CD',
      'Linux',
      'Git',
    ],
    preferredSkills: [
      'AWS',
      'Terraform',
      'Jenkins',
      'Ansible',
      'Python',
      'Bash',
      'Monitoring',
      'ELK Stack',
      'Prometheus',
      'Grafana',
      'Helm',
    ],
    experienceRange: { min: 1, max: 12 },
    salaryRange: {
      USD: { min: 80000, max: 170000 },
      INR: { min: 800000, max: 3000000 },
    },
    demandScore: 92,
  },
  {
    role: 'Data Engineer',
    category: 'Data',
    description: 'Builds data pipelines, ETL processes, and manages data infrastructure',
    requiredSkills: [
      'Python',
      'SQL',
      'ETL',
      'Data Warehousing',
    ],
    preferredSkills: [
      'Apache Spark',
      'Kafka',
      'Airflow',
      'AWS',
      'Big Data',
      'Pandas',
      'PostgreSQL',
      'Snowflake',
      'dbt',
      'Redis',
      'Docker',
    ],
    experienceRange: { min: 1, max: 10 },
    salaryRange: {
      USD: { min: 85000, max: 180000 },
      INR: { min: 900000, max: 3200000 },
    },
    demandScore: 87,
  },
  {
    role: 'Data Scientist',
    category: 'Data',
    description: 'Builds predictive models, experiments with data, and communicates insights',
    requiredSkills: [
      'Python',
      'Machine Learning',
      'Statistics',
      'SQL',
      'Data Analysis',
    ],
    preferredSkills: [
      'Pandas',
      'NumPy',
      'Scikit-learn',
      'TensorFlow',
      'PyTorch',
      'Data Visualization',
      'Jupyter',
      'Apache Spark',
      'AWS',
      'Feature Engineering',
    ],
    experienceRange: { min: 0, max: 12 },
    salaryRange: {
      USD: { min: 85000, max: 190000 },
      INR: { min: 900000, max: 3500000 },
    },
    demandScore: 91,
  },
  {
    role: 'Mobile Developer',
    category: 'Mobile',
    description: 'Creates native or cross-platform mobile applications',
    requiredSkills: [
      'React Native',
      'JavaScript',
      'Mobile Development',
      'Git',
    ],
    preferredSkills: [
      'TypeScript',
      'iOS Development',
      'Android Development',
      'Flutter',
      'Swift',
      'Kotlin',
      'Redux',
      'Firebase',
      'REST API',
      'Jest',
    ],
    experienceRange: { min: 0, max: 8 },
    salaryRange: {
      USD: { min: 70000, max: 155000 },
      INR: { min: 650000, max: 2600000 },
    },
    demandScore: 83,
  },
  {
    role: 'Machine Learning Engineer',
    category: 'AI/ML',
    description: 'Develops and deploys machine learning models and AI systems',
    requiredSkills: [
      'Python',
      'Machine Learning',
      'TensorFlow',
      'PyTorch',
    ],
    preferredSkills: [
      'Deep Learning',
      'Keras',
      'Scikit-Learn',
      'NumPy',
      'Pandas',
      'NLP',
      'Computer Vision',
      'AWS',
      'Docker',
      'MLOps',
      'Jupyter',
    ],
    experienceRange: { min: 1, max: 10 },
    salaryRange: {
      USD: { min: 90000, max: 200000 },
      INR: { min: 1000000, max: 3500000 },
    },
    demandScore: 95,
  },
  {
    role: 'Cloud Architect',
    category: 'Cloud',
    description: 'Designs and implements cloud infrastructure and architecture',
    requiredSkills: [
      'AWS',
      'Cloud Architecture',
      'Microservices',
      'Docker',
    ],
    preferredSkills: [
      'Kubernetes',
      'Terraform',
      'Azure',
      'GCP',
      'Serverless',
      'CI/CD',
      'Security',
      'Networking',
      'Python',
      'Lambda',
      'S3',
    ],
    experienceRange: { min: 3, max: 15 },
    salaryRange: {
      USD: { min: 110000, max: 220000 },
      INR: { min: 1500000, max: 4000000 },
    },
    demandScore: 91,
  },
  {
    role: 'QA/Test Engineer',
    category: 'Testing',
    description: 'Ensures software quality through testing and automation',
    requiredSkills: [
      'Testing',
      'Test Automation',
      'Selenium',
      'Git',
    ],
    preferredSkills: [
      'Jest',
      'Cypress',
      'JUnit',
      'PyTest',
      'API Testing',
      'CI/CD',
      'Performance Testing',
      'Security Testing',
      'Postman',
      'JavaScript',
      'Python',
    ],
    experienceRange: { min: 0, max: 8 },
    salaryRange: {
      USD: { min: 60000, max: 130000 },
      INR: { min: 500000, max: 2000000 },
    },
    demandScore: 80,
  },
  {
    role: 'Software Engineer',
    category: 'General',
    description: 'General software development across various technologies',
    requiredSkills: [
      'Programming',
      'Git',
      'Problem Solving',
    ],
    preferredSkills: [
      'JavaScript',
      'Python',
      'Java',
      'SQL',
      'REST API',
      'Algorithms',
      'Data Structures',
      'OOP',
      'Testing',
      'Agile',
    ],
    experienceRange: { min: 0, max: 10 },
    salaryRange: {
      USD: { min: 70000, max: 160000 },
      INR: { min: 600000, max: 2800000 },
    },
    demandScore: 85,
  },
];

/**
 * Get all roles
 * @returns {Array} - All roles
 */
export const getAllRoles = () => roles;

/**
 * Get role by name
 * @param {string} roleName - Role name
 * @returns {Object|null} - Role object or null
 */
export const getRoleByName = (roleName) => {
  if (!roleName) return null;
  
  const normalizedName = roleName.toLowerCase().trim();
  
  // Try exact match first
  let role = roles.find(r => r.role.toLowerCase() === normalizedName);
  if (role) return role;
  
  // Try fuzzy matching - match at least 2 words
  role = roles.find(r => {
    const roleWords = r.role.toLowerCase().split(' ');
    const nameWords = normalizedName.split(' ');
    
    const matchingWords = nameWords.filter(word => 
      roleWords.some(rw => rw.includes(word) || word.includes(rw))
    );
    
    return matchingWords.length >= 2;
  });
  
  if (role) return role;
  
  // Fallback: return Software Engineer for any developer role
  if (normalizedName.includes('developer') || normalizedName.includes('software')) {
    return roles.find(r => r.role === 'Software Engineer');
  }
  
  return null;
};

/**
 * Get roles by category
 * @param {string} category - Category (Backend, Frontend, Full Stack, etc.)
 * @returns {Array} - Filtered roles
 */
export const getRolesByCategory = (category) => {
  return roles.filter(r => r.category.toLowerCase() === category.toLowerCase());
};

/**
 * Get roles matching experience level
 * @param {number} years - Years of experience
 * @returns {Array} - Suitable roles
 */
export const getRolesByExperience = (years) => {
  return roles.filter(r => years >= r.experienceRange.min && years <= r.experienceRange.max);
};

/**
 * Calculate skill match percentage for a role
 * @param {string[]} userSkills - User's normalized skills
 * @param {Object} role - Role object
 * @returns {number} - Match percentage (0-100)
 */
export const calculateRoleMatch = (userSkills, role) => {
  if (!userSkills || userSkills.length === 0) return 0;
  
  const normalizedUserSkills = userSkills.map(s => s.toLowerCase());
  const requiredSkills = role.requiredSkills.map(s => s.toLowerCase());
  const preferredSkills = role.preferredSkills.map(s => s.toLowerCase());
  
  // Required skills: 70% weight
  const requiredMatches = requiredSkills.filter(skill => 
    normalizedUserSkills.includes(skill)
  ).length;
  const requiredScore = (requiredMatches / requiredSkills.length) * 70;
  
  // Preferred skills: 30% weight
  const preferredMatches = preferredSkills.filter(skill => 
    normalizedUserSkills.includes(skill)
  ).length;
  const preferredScore = preferredSkills.length > 0
    ? (preferredMatches / preferredSkills.length) * 30
    : 30; // Full points if no preferred skills defined
  
  return Math.round(requiredScore + preferredScore);
};

/**
 * Find best matching roles for user skills
 * @param {string[]} userSkills - User's normalized skills
 * @param {number} limit - Maximum roles to return
 * @returns {Array} - Top matching roles with scores
 */
export const findBestMatchingRoles = (userSkills, limit = 3) => {
  const rolesWithScores = roles.map(role => ({
    ...role,
    matchScore: calculateRoleMatch(userSkills, role),
  }));
  
  return rolesWithScores
    .filter(r => r.matchScore > 0)
    .sort((a, b) => {
      // Sort by match score, then by demand score
      if (b.matchScore !== a.matchScore) {
        return b.matchScore - a.matchScore;
      }
      return b.demandScore - a.demandScore;
    })
    .slice(0, limit);
};

export default {
  roles,
  getAllRoles,
  getRoleByName,
  getRolesByCategory,
  getRolesByExperience,
  calculateRoleMatch,
  findBestMatchingRoles,
};
