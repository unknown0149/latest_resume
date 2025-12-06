/**
 * Onboarding Wizard Component
 * Multi-step guided setup for new users
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const OnboardingWizard = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [onboardingData, setOnboardingData] = useState({
    personalInfo: {
      name: '',
      email: '',
      phone: '',
      location: '',
    },
    careerInfo: {
      currentRole: '',
      yearsOfExperience: '',
      desiredRole: '',
      industries: [],
    },
    preferences: {
      jobTypes: [],
      workMode: '',
      salaryExpectation: '',
      notifications: {
        email: true,
        push: true,
      },
    },
  });

  const totalSteps = 4;

  // Calculate profile completeness
  const calculateCompleteness = () => {
    const fields = [
      onboardingData.personalInfo.name,
      onboardingData.personalInfo.email,
      onboardingData.personalInfo.phone,
      onboardingData.personalInfo.location,
      onboardingData.careerInfo.currentRole,
      onboardingData.careerInfo.yearsOfExperience,
      onboardingData.careerInfo.desiredRole,
      onboardingData.careerInfo.industries.length > 0,
      onboardingData.preferences.jobTypes.length > 0,
      onboardingData.preferences.workMode,
    ];

    const completed = fields.filter(Boolean).length;
    return Math.round((completed / fields.length) * 100);
  };

  const handleNext = async () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      await handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    setError('');

    try {
      // Save onboarding data to user profile
      await api.put('/user/profile', {
        ...onboardingData.personalInfo,
        ...onboardingData.careerInfo,
        preferences: onboardingData.preferences,
        onboardingCompleted: true,
      });

      // Redirect to dashboard
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to complete onboarding');
      setLoading(false);
    }
  };

  const updateData = (section, field, value) => {
    setOnboardingData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const completeness = calculateCompleteness();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
          <h1 className="text-2xl font-bold mb-2">Welcome to Resume Intelligence Platform! 🎉</h1>
          <p className="text-purple-100">Let's set up your profile in {totalSteps} simple steps</p>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Step {currentStep} of {totalSteps}</span>
              <span>{completeness}% Complete</span>
            </div>
            <div className="w-full bg-purple-400 rounded-full h-2">
              <div
                className="bg-white rounded-full h-2 transition-all duration-300"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Step 1: Welcome & Personal Info */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Tell us about yourself</h2>
                <p className="text-gray-600">This helps us personalize your experience</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={onboardingData.personalInfo.name}
                  onChange={(e) => updateData('personalInfo', 'name', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={onboardingData.personalInfo.email}
                  onChange={(e) => updateData('personalInfo', 'email', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="john@example.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={onboardingData.personalInfo.phone}
                    onChange={(e) => updateData('personalInfo', 'phone', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="+1 234 567 8900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={onboardingData.personalInfo.location}
                    onChange={(e) => updateData('personalInfo', 'location', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="New York, USA"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Career Information */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Your Career Journey</h2>
                <p className="text-gray-600">Help us understand your professional background</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Role *
                </label>
                <input
                  type="text"
                  value={onboardingData.careerInfo.currentRole}
                  onChange={(e) => updateData('careerInfo', 'currentRole', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Software Engineer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Years of Experience *
                </label>
                <select
                  value={onboardingData.careerInfo.yearsOfExperience}
                  onChange={(e) => updateData('careerInfo', 'yearsOfExperience', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Select experience</option>
                  <option value="0-1">0-1 years</option>
                  <option value="1-3">1-3 years</option>
                  <option value="3-5">3-5 years</option>
                  <option value="5-10">5-10 years</option>
                  <option value="10+">10+ years</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Desired Role
                </label>
                <input
                  type="text"
                  value={onboardingData.careerInfo.desiredRole}
                  onChange={(e) => updateData('careerInfo', 'desiredRole', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Senior Software Engineer"
                />
              </div>
            </div>
          )}

          {/* Step 3: Preferences */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Job Preferences</h2>
                <p className="text-gray-600">What are you looking for in your next opportunity?</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Work Mode
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {['Remote', 'Hybrid', 'On-site'].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => updateData('preferences', 'workMode', mode)}
                      className={`px-4 py-3 rounded-lg border-2 transition-all ${
                        onboardingData.preferences.workMode === mode
                          ? 'border-purple-600 bg-purple-50 text-purple-700'
                          : 'border-gray-300 hover:border-purple-300'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Salary Expectation (Annual)
                </label>
                <input
                  type="text"
                  value={onboardingData.preferences.salaryExpectation}
                  onChange={(e) => updateData('preferences', 'salaryExpectation', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="$80,000 - $100,000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Notification Preferences
                </label>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={onboardingData.preferences.notifications.email}
                      onChange={(e) => {
                        setOnboardingData(prev => ({
                          ...prev,
                          preferences: {
                            ...prev.preferences,
                            notifications: {
                              ...prev.preferences.notifications,
                              email: e.target.checked,
                            },
                          },
                        }));
                      }}
                      className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span className="text-gray-700">Email notifications for job matches</span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={onboardingData.preferences.notifications.push}
                      onChange={(e) => {
                        setOnboardingData(prev => ({
                          ...prev,
                          preferences: {
                            ...prev.preferences,
                            notifications: {
                              ...prev.preferences.notifications,
                              push: e.target.checked,
                            },
                          },
                        }));
                      }}
                      className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span className="text-gray-700">Push notifications for new opportunities</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Upload Resume */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Almost There! 🎯</h2>
                <p className="text-gray-600">Upload your resume to get personalized job matches</p>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-400 transition-colors cursor-pointer">
                <div className="space-y-4">
                  <div className="text-6xl">📄</div>
                  <div>
                    <p className="text-lg font-semibold text-gray-700">Drop your resume here</p>
                    <p className="text-sm text-gray-500">or click to browse</p>
                  </div>
                  <p className="text-xs text-gray-400">Supported formats: PDF, DOCX (Max 10MB)</p>
                  <button className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                    Choose File
                  </button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  💡 <strong>Tip:</strong> You can skip this step and upload your resume later from your dashboard.
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t">
            <button
              onClick={handleBack}
              disabled={currentStep === 1}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                currentStep === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ← Back
            </button>

            <button
              onClick={handleNext}
              disabled={loading}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50"
            >
              {loading ? (
                'Saving...'
              ) : currentStep === totalSteps ? (
                'Complete Setup →'
              ) : (
                'Next →'
              )}
            </button>
          </div>

          {/* Skip Option */}
          {currentStep < totalSteps && (
            <div className="text-center mt-4">
              <button
                onClick={() => setCurrentStep(totalSteps)}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Skip to resume upload
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;
