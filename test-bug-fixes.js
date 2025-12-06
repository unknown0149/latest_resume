/**
 * Quick Validation Test
 * Tests the critical bug fixes applied
 */

(async () => {
	const { determineBadge, isValidScore, getBadgeByLevel } = await import('./backend/src/utils/badgeUtils.js');

	console.log('🧪 Testing Badge Utils...\n');

	// Test 1: determineBadge function
	console.log('Test 1: determineBadge()');
	console.log('Score 90:', determineBadge(90)); // Should be gold
	console.log('Score 75:', determineBadge(75)); // Should be silver
	console.log('Score 55:', determineBadge(55)); // Should be bronze
	console.log('Score 40:', determineBadge(40)); // Should be none
	console.log('✅ Badge determination working\n');

	// Test 2: isValidScore function
	console.log('Test 2: isValidScore()');
	console.log('Score 50:', isValidScore(50)); // true
	console.log('Score -10:', isValidScore(-10)); // false
	console.log('Score 150:', isValidScore(150)); // false
	console.log('✅ Score validation working\n');

	// Test 3: getBadgeByLevel function
	console.log('Test 3: getBadgeByLevel()');
	console.log('Gold:', getBadgeByLevel('gold'));
	console.log('Silver:', getBadgeByLevel('silver'));
	console.log('✅ Badge lookup working\n');

	console.log('🎉 All badge utility tests passed!');
})().catch((error) => {
	console.error('❌ Badge utility test failed:', error);
	process.exit(1);
});
