/**
 * Quick test for HuggingFace embedding service
 */

import { generateEmbedding } from './src/services/aiRouter.js';

const testText = 'Senior Software Engineer with 5 years of experience in Python, React, and Node.js';

console.log('Testing HuggingFace embedding generation...');
console.log('Input:', testText);
console.log('\nGenerating embedding (this may take 30-90 seconds on first run)...\n');

const startTime = Date.now();

try {
  const result = await generateEmbedding(testText);
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  if (result.success) {
    console.log('✅ SUCCESS!');
    console.log('Duration:', duration, 'seconds');
    console.log('Embedding dimensions:', result.dimensions);
    console.log('First 5 values:', result.embedding.slice(0, 5));
    console.log('Provider:', result.provider);
    console.log('Model:', result.model);
  } else {
    console.log('❌ FAILED!');
    console.log('Error:', result.error);
    console.log('Duration:', duration, 'seconds');
  }
} catch (error) {
  console.log('❌ ERROR!');
  console.log('Error:', error.message);
  console.log('Duration:', ((Date.now() - startTime) / 1000).toFixed(2), 'seconds');
}
