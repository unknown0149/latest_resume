/**
 * Test analyze endpoint
 */

import 'dotenv/config';

const RESUME_ID = '90fb75e6-9df3-4d73-a40a-de31a5e3de06';
const API_URL = 'http://localhost:5000';

console.log('\n🧪 Testing /analyze endpoint\n');
console.log('═'.repeat(70));

async function testAnalyze() {
  try {
    console.log(`📤 POST ${API_URL}/api/resume/${RESUME_ID}/analyze\n`);
    
    const response = await fetch(`${API_URL}/api/resume/${RESUME_ID}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      console.log('❌ Error:', error.message || error.error);
      return;
    }

    const data = await response.json();
    
    console.log('✅ Analysis Complete!\n');
    console.log('📊 Role Prediction:');
    console.log(`   Primary: ${data.data.rolePrediction.primaryRole.name} (${data.data.rolePrediction.primaryRole.matchScore}%)`);
    console.log(`   Alternatives: ${data.data.rolePrediction.alternativeRoles.length}`);
    
    console.log('\n📋 Skills Analysis:');
    console.log(`   Skills Have: ${data.data.skillAnalysis.skillsHave.length}`);
    console.log(`   Skills Missing: ${data.data.skillAnalysis.skillsMissing.length}`);
    
    if (data.data.skillAnalysis.skillsHave.length > 0) {
      console.log('\n   Top Skills:');
      data.data.skillAnalysis.skillsHave.slice(0, 5).forEach((skill, idx) => {
        console.log(`      ${idx + 1}. ${skill.skill} (${skill.level}, ${skill.proficiency}%)`);
      });
    }
    
    if (data.data.skillAnalysis.skillsMissing.length > 0) {
      console.log('\n   Skills to Learn:');
      data.data.skillAnalysis.skillsMissing.slice(0, 5).forEach((skill, idx) => {
        const priority = skill.priority === 3 ? 'HIGH' : skill.priority === 2 ? 'MED' : 'LOW';
        console.log(`      ${idx + 1}. ${skill.skill} (${priority})`);
      });
    }
    
    console.log('\n💰 Salary Boost Opportunities:', data.data.skillAnalysis.salaryBoostOpportunities?.length || 0);
    console.log('🗺️  Roadmap Stages:', Object.keys(data.data.roadmap || {}).length);
    console.log('📚 Resources:', data.data.resources?.length || 0);
    
    console.log('\n' + '═'.repeat(70));
    console.log('✅ Test Complete!\n');
    
    // Now check if it's saved to database
    console.log('🔍 Checking if analysis was saved to database...\n');
    
    const checkResponse = await fetch(`${API_URL}/api/resume/${RESUME_ID}`, {
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });
    
    if (checkResponse.ok) {
      const resumeData = await checkResponse.json();
      if (resumeData.job_analysis) {
        console.log('✅ Analysis saved to database!');
        console.log(`   Skills Have: ${resumeData.job_analysis.skillsHave?.length || 0}`);
        console.log(`   Skills Missing: ${resumeData.job_analysis.skillsMissing?.length || 0}`);
        console.log(`   Predicted Role: ${resumeData.job_analysis.predictedRole?.name || 'None'}`);
      } else {
        console.log('⚠️  Analysis not found in database');
      }
    }
    
    console.log('\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAnalyze();
