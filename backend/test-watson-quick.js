/**
 * Quick Watson X.ai API Test
 * Tests if Watson credentials are working with a simple API call
 */

import 'dotenv/config';
import fetch from 'node-fetch';

const WATSON_API_KEY = process.env.WATSONX_API_KEY || process.env.IBM_API_KEY;
const WATSON_PROJECT_ID = process.env.WATSONX_PROJECT_ID || process.env.IBM_PROJECT_ID;
const WATSON_MODEL_ID = process.env.WATSONX_MODEL_ID || 'ibm/granite-3-8b-instruct';
const IAM_TOKEN_URL = 'https://iam.cloud.ibm.com/identity/token';
const WATSON_API_URL = process.env.WATSONX_URL || 'https://us-south.ml.cloud.ibm.com/ml/v1/text/generation?version=2023-05-29';

console.log('\n========================================');
console.log('🔍 Watson X.ai Quick API Test');
console.log('========================================\n');

// Step 1: Check credentials
console.log('📝 Step 1: Checking credentials...');
console.log(`   API Key: ${WATSON_API_KEY ? '✅ Found (' + WATSON_API_KEY.substring(0, 10) + '...)' : '❌ Missing'}`);
console.log(`   Project ID: ${WATSON_PROJECT_ID ? '✅ Found (' + WATSON_PROJECT_ID + ')' : '❌ Missing'}`);
console.log(`   Model ID: ${WATSON_MODEL_ID}`);
console.log(`   API URL: ${WATSON_API_URL}\n`);

if (!WATSON_API_KEY || !WATSON_PROJECT_ID) {
  console.error('❌ ERROR: Missing Watson credentials in .env file');
  console.error('   Please check WATSONX_API_KEY and WATSONX_PROJECT_ID\n');
  process.exit(1);
}

// Step 2: Get IAM token
async function getIAMToken() {
  console.log('🔐 Step 2: Getting IAM access token...');
  
  try {
    const response = await fetch(IAM_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: `grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=${WATSON_API_KEY}`
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`IAM token request failed (${response.status}): ${errorData}`);
    }

    const data = await response.json();
    console.log(`   ✅ IAM token obtained successfully`);
    console.log(`   Token expires in: ${data.expires_in} seconds\n`);
    return data.access_token;
  } catch (error) {
    console.error(`   ❌ Failed to get IAM token: ${error.message}\n`);
    throw error;
  }
}

// Step 3: Test Watson API
async function testWatsonAPI(token) {
  console.log('🤖 Step 3: Testing Watson X.ai API...');
  console.log('   Sending test prompt...\n');

  const testPrompt = 'Respond with exactly: "Watson is working correctly"';

  try {
    const response = await fetch(WATSON_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        model_id: WATSON_MODEL_ID,
        input: testPrompt,
        parameters: {
          max_new_tokens: 100,
          temperature: 0.3,
          decoding_method: 'greedy'
        },
        project_id: WATSON_PROJECT_ID
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Watson API request failed (${response.status}): ${errorData}`);
    }

    const data = await response.json();
    
    console.log('========================================');
    console.log('✅ SUCCESS - Watson API is Working!');
    console.log('========================================\n');
    
    console.log('📋 API Response:');
    console.log('   Generated Text:', data.results?.[0]?.generated_text?.trim() || 'No response');
    console.log('   Model ID:', data.model_id);
    console.log('   Tokens Generated:', data.results?.[0]?.generated_token_count || 0);
    console.log('   Stop Reason:', data.results?.[0]?.stop_reason || 'N/A');
    
    console.log('\n========================================');
    console.log('🎉 Watson X.ai is configured correctly!');
    console.log('========================================\n');
    
    return true;
  } catch (error) {
    console.error('\n========================================');
    console.error('❌ FAILED - Watson API Error');
    console.error('========================================\n');
    console.error('Error Details:', error.message);
    console.error('\n');
    throw error;
  }
}

// Run the test
(async () => {
  try {
    const token = await getIAMToken();
    await testWatsonAPI(token);
    process.exit(0);
  } catch (error) {
    console.error('💥 Test Failed:', error.message);
    console.error('\n📝 Troubleshooting Tips:');
    console.error('   1. Check your .env file has the correct credentials');
    console.error('   2. Verify WATSONX_API_KEY is valid');
    console.error('   3. Verify WATSONX_PROJECT_ID is correct');
    console.error('   4. Check your IBM Cloud account is active');
    console.error('   5. Ensure the model ID is correct\n');
    process.exit(1);
  }
})();
