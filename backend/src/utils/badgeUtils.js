/**
 * Badge Utilities
 * Centralized badge determination logic for skill verification
 */

/**
 * Determine badge level based on verification score
 * @param {number} score - Score percentage (0-100)
 * @returns {Object} Badge information (level, label, color, icon)
 */
export function determineBadge(score) {
  if (score >= 85) {
    return { level: 'gold', label: 'Gold Badge', color: '#fbbf24', icon: '🥇' };
  } else if (score >= 70) {
    return { level: 'silver', label: 'Silver Badge', color: '#d1d5db', icon: '🥈' };
  } else if (score >= 50) {
    return { level: 'bronze', label: 'Bronze Badge', color: '#fb923c', icon: '🥉' };
  } else {
    return { level: 'none', label: 'Needs Practice', color: '#94a3b8', icon: '🎯' };
  }
}

/**
 * Get badge by level name
 * @param {string} level - Badge level ('gold', 'silver', 'bronze', 'none')
 * @returns {Object} Badge information
 */
export function getBadgeByLevel(level) {
  const badges = {
    gold: { level: 'gold', label: 'Gold Badge', color: '#fbbf24', icon: '🥇' },
    silver: { level: 'silver', label: 'Silver Badge', color: '#d1d5db', icon: '🥈' },
    bronze: { level: 'bronze', label: 'Bronze Badge', color: '#fb923c', icon: '🥉' },
    none: { level: 'none', label: 'Needs Practice', color: '#94a3b8', icon: '🎯' }
  };
  
  return badges[level] || badges.none;
}

/**
 * Validate score range
 * @param {number} score - Score to validate
 * @returns {boolean} True if valid
 */
export function isValidScore(score) {
  return typeof score === 'number' && score >= 0 && score <= 100;
}

/**
 * Get badge description for display
 * @param {Object} badge - Badge object
 * @returns {string} Formatted description
 */
export function getBadgeDescription(badge) {
  if (!badge || !badge.level) return 'No badge earned';
  
  const descriptions = {
    gold: 'Expert level - Outstanding performance (85%+)',
    silver: 'Proficient level - Strong skills demonstrated (70-84%)',
    bronze: 'Competent level - Basic skills verified (50-69%)',
    none: 'Needs improvement - Continue practicing (<50%)'
  };
  
  return descriptions[badge.level] || descriptions.none;
}
