const http = require('http');

function testEndpoint(path, name) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 8000,
      path: path,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          console.log(`\n=== ${name} ===`);
          console.log('Success:', parsed.success);
          console.log('Total:', parsed.jobs?.length || 0);
          if (parsed.jobs?.length > 0) {
            console.log('Sample platforms:', parsed.jobs.slice(0, 3).map(j => j.source?.platform).join(', '));
            console.log('Has postedBy:', parsed.jobs.slice(0, 3).map(j => j.postedBy ? 'YES' : 'NO').join(', '));
          }
          resolve();
        } catch (e) {
          console.error('Parse error:', e.message);
          resolve();
        }
      });
    });
    
    req.on('error', (e) => {
      console.error(`${name} Error:`, e.message);
      resolve();
    });
    
    req.end();
  });
}

async function runTests() {
  await testEndpoint('/api/jobs/live?limit=5', 'LIVE JOBS');
  await testEndpoint('/api/jobs/recruiter-posted?limit=5', 'RECRUITER JOBS');
  await testEndpoint('/api/jobs/all?limit=5', 'ALL JOBS');
}

runTests();
