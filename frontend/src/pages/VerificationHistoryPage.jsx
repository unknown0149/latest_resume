/**
 * Verification History Page
 * Display skill verification badges with timeline and history
 */

import React, { useState, useEffect } from 'react'
import api from '../services/api'

const VerificationHistoryPage = () => {
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, verified, expired
  const [sortBy, setSortBy] = useState('date'); // date, score, skill

  useEffect(() => {
    fetchVerifications();
  }, []);

  const fetchVerifications = async () => {
    try {
      const resumeId = localStorage.getItem('currentResumeId');
      if (!resumeId) {
        console.error('No resume ID found');
        return;
      }

      const response = await api.get(`/resume/${resumeId}/verifications`);
      setVerifications(response.data.verifications || []);
    } catch (error) {
      console.error('Failed to fetch verifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBadgeIcon = (level) => {
    const icons = {
      gold: '🥇',
      silver: '🥈',
      bronze: '🥉',
      none: '🎯',
    };
    return icons[level] || '🎯';
  };

  const getBadgeColor = (level) => {
    const colors = {
      gold: 'from-yellow-400 to-yellow-600',
      silver: 'from-gray-300 to-gray-500',
      bronze: 'from-orange-400 to-orange-600',
      none: 'from-gray-400 to-gray-600',
    };
    return colors[level] || 'from-gray-400 to-gray-600';
  };

  const filterVerifications = () => {
    let filtered = [...verifications];

    // Apply filter
    if (filter === 'verified') {
      filtered = filtered.filter(v => v.verified);
    } else if (filter === 'expired') {
      // Check if verification is older than 1 year (expired)
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      filtered = filtered.filter(v => new Date(v.lastVerifiedAt) < oneYearAgo);
    }

    // Apply sort
    if (sortBy === 'date') {
      filtered.sort((a, b) => new Date(b.lastVerifiedAt) - new Date(a.lastVerifiedAt));
    } else if (sortBy === 'score') {
      filtered.sort((a, b) => b.score - a.score);
    } else if (sortBy === 'skill') {
      filtered.sort((a, b) => a.skill.localeCompare(b.skill));
    }

    return filtered;
  };

  const filteredVerifications = filterVerifications();

  const stats = {
    total: verifications.length,
    verified: verifications.filter(v => v.verified).length,
    gold: verifications.filter(v => v.badge?.level === 'gold').length,
    silver: verifications.filter(v => v.badge?.level === 'silver').length,
    bronze: verifications.filter(v => v.badge?.level === 'bronze').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading verification history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🏆 Skill Verification History
          </h1>
          <p className="text-gray-600">
            Track your verified skills and earned badges
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-3xl font-bold text-purple-600">{stats.total}</div>
            <div className="text-sm text-gray-600 mt-1">Total Skills</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-3xl font-bold text-green-600">{stats.verified}</div>
            <div className="text-sm text-gray-600 mt-1">Verified</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-3xl">🥇 {stats.gold}</div>
            <div className="text-sm text-gray-600 mt-1">Gold Badges</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-3xl">🥈 {stats.silver}</div>
            <div className="text-sm text-gray-600 mt-1">Silver Badges</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-3xl">🥉 {stats.bronze}</div>
            <div className="text-sm text-gray-600 mt-1">Bronze Badges</div>
          </div>
        </div>

        {/* Filters and Sort */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Filter:</label>
            <div className="flex gap-2">
              {['all', 'verified', 'expired'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filter === f
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="date">Date (Newest)</option>
              <option value="score">Score (Highest)</option>
              <option value="skill">Skill (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Verification Cards */}
        {filteredVerifications.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Verifications Yet</h3>
            <p className="text-gray-600 mb-6">
              Start verifying your skills through quizzes and interviews to earn badges!
            </p>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:shadow-lg transition-all"
            >
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVerifications.map((verification, index) => (
              <div
                key={index}
                className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all overflow-hidden"
              >
                {/* Badge Header */}
                <div className={`bg-gradient-to-r ${getBadgeColor(verification.badge?.level)} p-4 text-white`}>
                  <div className="flex items-center justify-between">
                    <div className="text-4xl">{getBadgeIcon(verification.badge?.level)}</div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{verification.score}%</div>
                      <div className="text-sm opacity-90">{verification.badge?.label}</div>
                    </div>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-4">{verification.skill}</h3>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Status:</span>
                      <span className={`font-semibold ${verification.verified ? 'text-green-600' : 'text-gray-600'}`}>
                        {verification.verified ? '✓ Verified' : 'Not Verified'}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Score:</span>
                      <span className="font-semibold text-gray-800">
                        {verification.correct}/{verification.total} correct
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Last Verified:</span>
                      <span className="font-semibold text-gray-800">
                        {new Date(verification.lastVerifiedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`bg-gradient-to-r ${getBadgeColor(verification.badge?.level)} rounded-full h-2 transition-all`}
                        style={{ width: `${verification.score}%` }}
                      />
                    </div>
                  </div>

                  {/* Action Button */}
                  <button className="w-full mt-4 px-4 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors text-sm font-medium">
                    Re-verify Skill
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Timeline View Toggle */}
        <div className="mt-8 text-center">
          <button className="text-purple-600 hover:text-purple-700 font-medium text-sm underline">
            View Timeline
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerificationHistoryPage;
