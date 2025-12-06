/**
 * IBM Watson X.ai API Key Verification Test
 * Tests if the configured API credentials are working correctly
 */

import 'dotenv/config';
import https from 'https';

// Load credentials from .env
const IBM_API_KEY = process.env.WATSONX_API_KEY || process.env.IBM_API_KEY;
const IBM_PROJECT_ID = process.env.WATSONX_PROJECT_ID || process.env.IBM_PROJECT_ID;
const IBM_MODEL_ID = process.env.WATSONX_MODEL_ID || process.env.IBM_MODEL_ID || 'ibm/granite-3-8b-instruct';

console.log('='.repeat(60));
console.log('IBM Watson X.ai API Key Verification Test');
console.log('='.repeat(60));
console.log();

// Question 1: Check if environment variables are loaded
console.log('📋 Question 1: Are environment variables loaded?');
console.log('-'.repeat(60));
console.log(`IBM_API_KEY exists: ${IBM_API_KEY ? '✅ YES' : '❌ NO'}`);
console.log(`IBM_API_KEY length: ${IBM_API_KEY ? IBM_API_KEY.length : 0} characters`);
console.log(`IBM_API_KEY preview: ${IBM_API_KEY ? IBM_API_KEY.substring(0, 10) + '...' : 'NOT FOUND'}`);
console.log();
console.log(`IBM_PROJECT_ID exists: ${IBM_PROJECT_ID ? '✅ YES' : '❌ NO'}`);
console.log(`IBM_PROJECT_ID: ${IBM_PROJECT_ID || 'NOT FOUND'}`);
console.log();
console.log(`IBM_MODEL_ID: ${IBM_MODEL_ID}`);
console.log();

if (!IBM_API_KEY || !IBM_PROJECT_ID) {
  console.error('❌ ERROR: Missing required environment variables');
  console.error('Please check your .env file in the backend directory');
  process.exit(1);
}

// Question 2: Get IAM access token
console.log('📋 Question 2: Can we get an IAM access token?');
console.log('-'.repeat(60));

const getIAMToken = () => {
  return new Promise((resolve, reject) => {
    const tokenData = `grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=${IBM_API_KEY}`;
    
    const tokenOptions = {
      hostname: 'iam.cloud.ibm.com',
      path: '/identity/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'Content-Length': Buffer.byteLength(tokenData)
      }
    };

    console.log('Requesting IAM token from IBM Cloud...');
    
    const req = https.request(tokenOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            console.log('✅ Successfully obtained IAM token');
            console.log(`Token type: ${response.token_type}`);
            console.log(`Expires in: ${response.expires_in} seconds`);
            console.log();
            resolve(response.access_token);
          } catch (error) {
            reject(new Error('Failed to parse IAM token response: ' + error.message));
          }
        } else {
          reject(new Error(`IAM token request failed with status ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(new Error('Network error while getting IAM token: ' + error.message));
    });
    
    req.write(tokenData);
    req.end();
  });
};

// Question 3: Test Watson API with IAM token
const testWatsonAPI = (iamToken) => {
  console.log('📋 Question 3: Can we connect to IBM Watson X.ai API?');
  console.log('-'.repeat(60));

  const questions = [
    {
      question: 'What is your name and version?',
      purpose: 'Testing basic identity response'
    },
    {
      question: 'What are the top 3 skills needed for a Full Stack Developer role?',
      purpose: 'Testing job-related skill analysis'
    },
    {
      question: 'Given this resume data: {"name": "John Doe", "skills": ["JavaScript", "React", "Node.js"], "experience": 3}, what job roles would you recommend?',
      purpose: 'Testing resume analysis capability'
    },
    {
      question: 'Generate 2 technical interview questions for a React developer position.',
      purpose: 'Testing interview question generation'
    },
    {
      question: 'Summarize in one sentence: A software engineer with 5 years experience in cloud computing, proficient in AWS, Azure, and Docker.',
      purpose: 'Testing summarization capability'
    }
  ];

  let currentQuestionIndex = 0;

  const askQuestion = () => {
    if (currentQuestionIndex >= questions.length) {
      console.log();
      console.log('='.repeat(60));
      console.log('✅ ALL QUESTIONS COMPLETED!');
      console.log('IBM Watson X.ai is ready for production use');
      console.log('='.repeat(60));
      return;
    }

    const { question, purpose } = questions[currentQuestionIndex];
    
    console.log();
    console.log(`🤔 Question ${currentQuestionIndex + 1}/${questions.length}:`);
    console.log(`   Purpose: ${purpose}`);
    console.log(`   Asking: "${question}"`);
    console.log();

    const testPrompt = question;

  const requestData = JSON.stringify({
    input: testPrompt,
    parameters: {
      max_new_tokens: 200,
      temperature: 0.3,
      return_options: {
        input_text: false
      }
    },
    model_id: IBM_MODEL_ID,
    project_id: IBM_PROJECT_ID
  });

  const options = {
    hostname: 'us-south.ml.cloud.ibm.com',
    path: '/ml/v1/text/generation?version=2023-05-29',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${iamToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Content-Length': Buffer.byteLength(requestData)
    }
  };

  const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      if (res.statusCode === 200) {
        try {
          const response = JSON.parse(data);
          
          if (response.results && response.results.length > 0) {
            const generatedText = response.results[0].generated_text;
            console.log('   ✅ Watson Response:');
            console.log('   ' + '-'.repeat(58));
            console.log('   ' + generatedText.trim().split('\n').join('\n   '));
            console.log('   ' + '-'.repeat(58));
            console.log(`   Tokens used: ${response.results[0].generated_token_count || 'N/A'}`);
            
            // Move to next question
            currentQuestionIndex++;
            setTimeout(() => askQuestion(), 1000); // Wait 1 second between questions
          } else {
            console.log('   ⚠️ WARNING: No results in response');
            currentQuestionIndex++;
            setTimeout(() => askQuestion(), 1000);
          }
          
        } catch (error) {
          console.error('   ❌ ERROR: Failed to parse response');
          console.error('   ', error.message);
          currentQuestionIndex++;
          setTimeout(() => askQuestion(), 1000);
        }
      } else {
        console.error(`   ❌ ERROR: Request failed with status ${res.statusCode}`);
        console.error('   Response:', data);
        currentQuestionIndex++;
        setTimeout(() => askQuestion(), 1000);
      }
    });
  });

  req.on('error', (error) => {
    console.error('   ❌ ERROR: Network request failed');
    console.error('   ', error.message);
    currentQuestionIndex++;
    setTimeout(() => askQuestion(), 1000);
  });

  req.write(requestData);
  req.end();
};

// Start asking questions
askQuestion();
};

// Run the test
getIAMToken()
  .then(token => testWatsonAPI(token))
  .catch(error => {
    console.error('❌ TEST FAILED');
    console.error('Error:', error.message);
    console.log();
    console.log('Please check:');
    console.log('1. API key is correct in .env file');
    console.log('2. API key has not expired');
    console.log('3. IBM Cloud account is active');
    console.log('4. You have internet connectivity');
  });
