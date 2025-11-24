const roadmapResources = {
  "react": {
    "difficulty": "medium",
    "description": "React is a JavaScript library for building dynamic user interfaces. Required for most frontend roles.",
    "core_topics": [
      "JSX",
      "Props & State",
      "Hooks (useState, useEffect, useContext)",
      "Component lifecycle",
      "Routing",
      "API integration",
      "State management"
    ],
    "resources": [
      {
        "title": "React Official Docs",
        "type": "docs",
        "url": "https://react.dev/learn"
      },
      {
        "title": "React Crash Course (Traversy Media)",
        "type": "video",
        "url": "https://www.youtube.com/watch?v=w7ejDZ8SWv8"
      },
      {
        "title": "Scrimba React Course (Free)",
        "type": "course",
        "url": "https://scrimba.com/learn/learnreact"
      }
    ],
    "practice_tasks": [
      "Create a counter app using useState",
      "Build a data table with search & filters using an API",
      "Implement custom hooks for API fetching"
    ],
    "projects": [
      "Todo App with CRUD & localStorage",
      "Weather App using a public API",
      "Dashboard UI with charts"
    ]
  },

  "nodejs": {
    "difficulty": "medium",
    "description": "Node.js is used to build scalable backend applications and APIs.",
    "core_topics": [
      "HTTP basics",
      "Express.js",
      "Middleware",
      "Authentication (JWT)",
      "Database integration",
      "Error handling",
      "File uploads",
      "REST API design"
    ],
    "resources": [
      {
        "title": "Node.js Official Docs",
        "type": "docs",
        "url": "https://nodejs.org/en/docs"
      },
      {
        "title": "Express.js Docs",
        "type": "docs",
        "url": "https://expressjs.com/"
      },
      {
        "title": "Node.js Full Course (FreeCodeCamp)",
        "type": "video",
        "url": "https://www.youtube.com/watch?v=Oe421EPjeBE"
      }
    ],
    "practice_tasks": [
      "Build a REST API with CRUD operations",
      "Add JWT authentication to an Express API",
      "Implement file uploads"
    ],
    "projects": [
      "Notes API backend",
      "Auth system with JWT",
      "Blog API with user roles"
    ]
  },

  "javascript": {
    "difficulty": "medium",
    "description": "JavaScript is the core language of the web and essential for any frontend/backend role.",
    "core_topics": [
      "Variables & Functions",
      "Objects & Arrays",
      "Asynchronous JS (Promises, async/await)",
      "DOM manipulation",
      "Fetch API",
      "ES6+ features"
    ],
    "resources": [
      {
        "title": "JavaScript Info",
        "type": "docs",
        "url": "https://javascript.info/"
      },
      {
        "title": "JS Crash Course (Traversy Media)",
        "type": "video",
        "url": "https://www.youtube.com/watch?v=hdI2bqOjy3c"
      },
      {
        "title": "FreeCodeCamp JavaScript Algorithms & DS",
        "type": "course",
        "url": "https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/"
      }
    ],
    "practice_tasks": [
      "Build a calculator",
      "Implement debouncing & throttling",
      "Work with APIs using fetch"
    ],
    "projects": [
      "Image search app",
      "Expense tracker",
      "Mini dashboard using charts"
    ]
  },

  "html_css": {
    "difficulty": "easy",
    "description": "Core technology for structuring and styling web pages.",
    "core_topics": [
      "Semantic HTML",
      "Flexbox",
      "Grid",
      "Responsive design",
      "Media queries",
      "CSS variables",
      "Basic UI components"
    ],
    "resources": [
      {
        "title": "MDN HTML Guide",
        "type": "docs",
        "url": "https://developer.mozilla.org/en-US/docs/Web/HTML"
      },
      {
        "title": "MDN CSS Guide",
        "type": "docs",
        "url": "https://developer.mozilla.org/en-US/docs/Web/CSS"
      },
      {
        "title": "HTML & CSS Crash Course",
        "type": "video",
        "url": "https://www.youtube.com/watch?v=UB1O30fR-EE"
      }
    ],
    "practice_tasks": [
      "Build a responsive navbar",
      "Create a card layout with CSS Grid",
      "Design a personal portfolio section"
    ],
    "projects": [
      "Portfolio website",
      "Landing page",
      "Responsive blog layout"
    ]
  },

  "sql": {
    "difficulty": "medium",
    "description": "SQL is used to store, retrieve, and manipulate data for database-driven applications.",
    "core_topics": [
      "CRUD queries",
      "Joins",
      "Indexes",
      "Constraints",
      "Aggregation",
      "Subqueries",
      "Transactions"
    ],
    "resources": [
      {
        "title": "PostgreSQL Tutorial",
        "type": "docs",
        "url": "https://www.postgresql.org/docs/current/tutorial.html"
      },
      {
        "title": "SQLBolt Interactive Lessons",
        "type": "course",
        "url": "https://sqlbolt.com/"
      },
      {
        "title": "FreeCodeCamp SQL Course",
        "type": "video",
        "url": "https://www.youtube.com/watch?v=HXV3zeQKqGY"
      }
    ],
    "practice_tasks": [
      "Write joins between 2–3 tables",
      "Create indexes and measure performance",
      "Design a relational schema"
    ],
    "projects": [
      "Library management DB",
      "E-commerce order SQL schema",
      "Social media relational design"
    ]
  },

  "mongodb": {
    "difficulty": "easy",
    "description": "MongoDB is a NoSQL document database often paired with Node.js.",
    "core_topics": [
      "Documents & Collections",
      "CRUD operations",
      "Aggregation pipelines",
      "Indexes",
      "Schema design"
    ],
    "resources": [
      {
        "title": "MongoDB University Free Course",
        "type": "course",
        "url": "https://learn.mongodb.com/"
      },
      {
        "title": "MongoDB Crash Course",
        "type": "video",
        "url": "https://www.youtube.com/watch?v=-56x56UppqQ"
      }
    ],
    "practice_tasks": [
      "Insert and query documents",
      "Build aggregation pipeline",
      "Design a flexible schema"
    ],
    "projects": [
      "Blog database",
      "Analytics pipeline",
      "User profile DB"
    ]
  },

  "git": {
    "difficulty": "easy",
    "description": "Git and GitHub are essential for collaboration and version control.",
    "core_topics": [
      "Commits",
      "Branches",
      "Merging",
      "Pull requests",
      "Rebasing",
      "Stashing"
    ],
    "resources": [
      {
        "title": "Git Docs",
        "type": "docs",
        "url": "https://git-scm.com/doc"
      },
      {
        "title": "Git & GitHub Crash Course",
        "type": "video",
        "url": "https://www.youtube.com/watch?v=RGOj5yH7evk"
      }
    ],
    "practice_tasks": [
      "Create a branch & merge it",
      "Resolve merge conflicts",
      "Work with pull requests"
    ],
    "projects": [
      "Version-control your portfolio",
      "Collaborate on open-source repo"
    ]
  },

  "algorithms": {
    "difficulty": "hard",
    "description": "Data Structures & Algorithms are important for technical interviews and coding strength.",
    "core_topics": [
      "Arrays & Strings",
      "Hashmaps",
      "Stacks & Queues",
      "Linked Lists",
      "Trees & Graphs",
      "Sorting & Searching",
      "Dynamic Programming"
    ],
    "resources": [
      {
        "title": "NeetCode Roadmap",
        "type": "course",
        "url": "https://neetcode.io/practice"
      },
      {
        "title": "FreeCodeCamp DSA Course",
        "type": "video",
        "url": "https://www.youtube.com/watch?v=8hly31xKli0"
      }
    ],
    "practice_tasks": [
      "Solve 10 array problems",
      "Implement BFS & DFS",
      "Solve 5 DP questions"
    ],
    "projects": [
      "Pathfinding visualizer",
      "Sorting visualizer"
    ]
  },

  "api_backend": {
    "difficulty": "medium",
    "description": "Understanding APIs and backend concepts is essential for both frontend and backend devs.",
    "core_topics": [
      "HTTP methods",
      "Request/response cycle",
      "REST design",
      "Authentication",
      "Rate limiting"
    ],
    "resources": [
      {
        "title": "RESTful APIs Crash Course",
        "type": "video",
        "url": "https://www.youtube.com/watch?v=Q-BpqyOT3a8"
      }
    ],
    "practice_tasks": [
      "Build a REST API for notes",
      "Add JWT authentication",
      "Add pagination & filters"
    ],
    "projects": [
      "Full CRUD REST API",
      "Auth server with roles"
    ]
  },

  "typescript": {
    "difficulty": "medium",
    "description": "TypeScript adds static typing to JavaScript and is used in most modern projects.",
    "core_topics": [
      "Types",
      "Interfaces",
      "Generics",
      "Type narrowing",
      "Utility types"
    ],
    "resources": [
      {
        "title": "TypeScript Handbook",
        "type": "docs",
        "url": "https://www.typescriptlang.org/docs/"
      }
    ],
    "practice_tasks": [
      "Convert a JS file to TS",
      "Define interfaces for API data",
      "Use generics with functions"
    ],
    "projects": [
      "Build a TypeScript Node API",
      "Convert React app to TypeScript"
    ]
  }
};

export default roadmapResources;
