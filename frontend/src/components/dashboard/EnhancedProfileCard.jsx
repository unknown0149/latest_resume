import React, { useState, useEffect } from 'react';
import { 
  User, Mail, Phone, MapPin, Briefcase, GraduationCap, 
  Award, TrendingUp, Edit2, Save, X, Upload, Plus, Trash2,
  Quote, Link as LinkIcon, Linkedin, Github, Globe, Shield
} from 'lucide-react';
import api, { interviewAPI } from '../../services/api';
import VerificationBadge from '../ui/VerificationBadge';
import InterviewModal from '../InterviewModal';

const BADGE_PILL_STYLES = {
  gold: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  silver: 'bg-gray-100 text-gray-800 border-gray-300',
  bronze: 'bg-orange-100 text-orange-800 border-orange-300'
};

const EnhancedProfileCard = ({ resumeId, analysis, parsedResume, onProfileLoaded, refreshToken }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [showInterviewModal, setShowInterviewModal] = useState(false);

  // Fetch profile data
  useEffect(() => {
    if (resumeId) {
      fetchProfile();
    }
  }, [resumeId, refreshToken]);

  const fetchProfile = async () => {
    try {
      const response = await api.get(`/resume/${resumeId}/profile`);
      setProfileData(response.data.profile);
      if (onProfileLoaded) {
        onProfileLoaded(response.data.profile);
      }
      if (response.data.profile.photoUrl) {
        const baseURL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8000';
        setPhotoPreview(`${baseURL}${response.data.profile.photoUrl}`);
      }
      
      // Fetch verification status
      try {
        const verificationResponse = await interviewAPI.getVerificationStatus(resumeId);
        if (verificationResponse.success) {
          setVerificationStatus(verificationResponse.verification);
        }
      } catch (verError) {
        console.log('No verification data yet');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Initialize with default data
      const fallbackProfile = {
        name: parsedResume?.name || 'Your Name',
        headline: analysis?.tagline || 'Professional',
        summary: analysis?.professionalSummary || '',
        quote: '',
        customSkills: (parsedResume?.skills || []).slice(0, 12).map(skill => ({
          name: skill,
          level: 70,
          category: 'Technical',
          verified: false,
          badge: { level: 'none', label: 'Needs Practice' }
        })),
        strengths: [
          { name: 'Technical Skills', value: 75 },
          { name: 'Communication', value: 65 },
          { name: 'Problem Solving', value: 80 },
          { name: 'Teamwork', value: 70 },
          { name: 'Leadership', value: 60 },
        ],
        socialLinks: {
          linkedin: parsedResume?.contact?.linkedin || '',
          github: parsedResume?.contact?.github || '',
          portfolio: '',
        },
        skillVerifications: []
      };
      setProfileData(fallbackProfile);
      if (onProfileLoaded) {
        onProfileLoaded(fallbackProfile);
      }
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadPhoto = async () => {
    if (!selectedPhoto) return;
    
    const formData = new FormData();
    formData.append('photo', selectedPhoto);

    try {
      const response = await api.post(`/resume/${resumeId}/profile/photo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const baseURL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8000';
      setPhotoPreview(`${baseURL}${response.data.photoUrl}`);
      setSelectedPhoto(null);
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Failed to upload photo');
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Upload photo if selected
      if (selectedPhoto) {
        await uploadPhoto();
      }

      // Update profile data
      await api.patch(`/resume/${resumeId}/profile`, profileData);
      
      setIsEditing(false);
      alert('Profile updated successfully!');
      await fetchProfile();
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateSkill = (index, field, value) => {
    setProfileData(prev => ({
      ...prev,
      customSkills: prev.customSkills.map((skill, i) => 
        i === index ? { ...skill, [field]: value } : skill
      )
    }));
  };

  const addSkill = () => {
    setProfileData(prev => ({
      ...prev,
      customSkills: [...prev.customSkills, { name: '', level: 50, category: 'Technical' }]
    }));
  };

  const removeSkill = (index) => {
    setProfileData(prev => ({
      ...prev,
      customSkills: prev.customSkills.filter((_, i) => i !== index)
    }));
  };

  const updateStrength = (index, value) => {
    setProfileData(prev => ({
      ...prev,
      strengths: prev.strengths.map((s, i) => 
        i === index ? { ...s, value: parseInt(value) } : s
      )
    }));
  };

  if (!profileData) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  const profileStrength = calculateStrength(profileData);
  const matchScore = analysis?.bestRole?.score || 75;
  const skillVerifications = profileData.skillVerifications || [];

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header with Gradient */}
      <div className="relative h-32 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
        <div className="absolute -bottom-16 left-8">
          <div className="relative">
            {photoPreview ? (
              <img 
                src={photoPreview} 
                alt="Profile" 
                className="w-32 h-32 rounded-full border-4 border-white object-cover shadow-xl"
              />
            ) : (
              <div className="w-32 h-32 rounded-full border-4 border-white bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center shadow-xl">
                <span className="text-4xl font-bold text-white">
                  {profileData.name?.charAt(0) || 'U'}
                </span>
              </div>
            )}
            
            {isEditing && (
              <label className="absolute bottom-0 right-0 bg-blue-500 rounded-full p-2 cursor-pointer hover:bg-blue-600 shadow-lg">
                <Upload className="w-4 h-4 text-white" />
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handlePhotoChange} 
                  className="hidden" 
                />
              </label>
            )}
            
            {/* Verification Badge */}
            {verificationStatus && verificationStatus.badge?.level !== 'none' && (
              <div className="absolute -bottom-2 -right-2">
                <VerificationBadge 
                  badge={verificationStatus.badge}
                  credibilityScore={verificationStatus.credibilityScore}
                  trustLevel={verificationStatus.trustLevel}
                  size="sm"
                />
              </div>
            )}
          </div>
        </div>

        {/* Edit/Save Button */}
        <div className="absolute top-4 right-4">
          {isEditing ? (
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={loading}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setSelectedPhoto(null);
                  fetchProfile(); // Reset data
                }}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="bg-white hover:bg-gray-100 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg"
            >
              <Edit2 className="w-4 h-4" />
              Edit Profile
            </button>
          )}
        </div>
      </div>

      {/* Profile Content */}
      <div className="pt-20 px-8 pb-8">
        {/* Name and Headline */}
        <div className="mb-6">
          {isEditing ? (
            <>
              <input
                type="text"
                value={profileData.name}
                onChange={(e) => updateField('name', e.target.value)}
                className="text-3xl font-bold text-gray-900 w-full border-b-2 border-blue-500 focus:outline-none mb-2"
                placeholder="Your Name"
              />
              <input
                type="text"
                value={profileData.headline || ''}
                onChange={(e) => updateField('headline', e.target.value)}
                className="text-lg text-gray-600 w-full border-b border-gray-300 focus:outline-none"
                placeholder="Your Professional Headline"
              />
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-gray-900">{profileData.name}</h1>
              <p className="text-lg text-gray-600">{profileData.headline}</p>
            </>
          )}
        </div>

        {/* Profile Strength & Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Profile Strength */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Profile Strength</span>
              <span className="text-2xl font-bold text-blue-600">{profileStrength}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${profileStrength}%` }}
              ></div>
            </div>
          </div>

          {/* Role Match */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Role Match</span>
              <span className="text-2xl font-bold text-green-600">{matchScore}%</span>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {analysis?.bestRole?.name || 'Analyzing...'}
            </p>
          </div>

          {/* Skills Count */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Skills</span>
              <span className="text-2xl font-bold text-purple-600">
                {profileData.customSkills?.length || 0}
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-1">Technical & Soft Skills</p>
          </div>
        </div>

        {/* Quote Section */}
        {(isEditing || profileData.quote) && (
          <div className="mb-8 bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg border-l-4 border-purple-500">
            <Quote className="w-6 h-6 text-purple-500 mb-2" />
            {isEditing ? (
              <textarea
                value={profileData.quote || ''}
                onChange={(e) => updateField('quote', e.target.value)}
                className="w-full bg-transparent text-gray-700 italic focus:outline-none resize-none"
                placeholder="Add a personal quote or motto..."
                rows="2"
              />
            ) : (
              <p className="text-gray-700 italic">"{profileData.quote}"</p>
            )}
          </div>
        )}

        {/* Professional Summary */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-500" />
            Professional Summary
          </h2>
          {isEditing ? (
            <textarea
              value={profileData.summary || ''}
              onChange={(e) => updateField('summary', e.target.value)}
              className="w-full border-2 border-gray-300 rounded-lg p-3 focus:border-blue-500 focus:outline-none resize-none"
              placeholder="Write a brief professional summary..."
              rows="4"
            />
          ) : (
            <p className="text-gray-700 leading-relaxed">
              {profileData.summary || 'No summary available'}
            </p>
          )}
        </div>

        {/* Contact Information */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          {parsedResume?.contact?.email && (
            <div className="flex items-center gap-3 text-gray-700">
              <Mail className="w-5 h-5 text-blue-500" />
              <span>{parsedResume.contact.email}</span>
            </div>
          )}
          {parsedResume?.contact?.phone && (
            <div className="flex items-center gap-3 text-gray-700">
              <Phone className="w-5 h-5 text-green-500" />
              <span>{parsedResume.contact.phone}</span>
            </div>
          )}
          {parsedResume?.contact?.location && (
            <div className="flex items-center gap-3 text-gray-700">
              <MapPin className="w-5 h-5 text-red-500" />
              <span>{parsedResume.contact.location}</span>
            </div>
          )}
        </div>

        {/* Social Links */}
        {isEditing && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-blue-500" />
              Social Links
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <Linkedin className="w-4 h-4" /> LinkedIn
                </label>
                <input
                  type="url"
                  value={profileData.socialLinks?.linkedin || ''}
                  onChange={(e) => updateField('socialLinks', { ...profileData.socialLinks, linkedin: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                  placeholder="https://linkedin.com/in/..."
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <Github className="w-4 h-4" /> GitHub
                </label>
                <input
                  type="url"
                  value={profileData.socialLinks?.github || ''}
                  onChange={(e) => updateField('socialLinks', { ...profileData.socialLinks, github: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                  placeholder="https://github.com/..."
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                  <Globe className="w-4 h-4" /> Portfolio
                </label>
                <input
                  type="url"
                  value={profileData.socialLinks?.portfolio || ''}
                  onChange={(e) => updateField('socialLinks', { ...profileData.socialLinks, portfolio: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                  placeholder="https://yourportfolio.com"
                />
              </div>
            </div>
          </div>
        )}

        {/* Skills with Strength Levels */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-500" />
              Skills & Proficiency
            </h2>
            {isEditing && (
              <button
                onClick={addSkill}
                className="flex items-center gap-2 text-blue-500 hover:text-blue-600"
              >
                <Plus className="w-4 h-4" />
                Add Skill
              </button>
            )}
          </div>

          <div className="space-y-4">
            {profileData.customSkills?.map((skill, index) => {
              const badgeLevel = skill.badge?.level;
              const badgeLabel = skill.badge?.label;
              const pillClass = badgeLevel && badgeLevel !== 'none' ? BADGE_PILL_STYLES[badgeLevel] : null;

              return (
                <div key={index} className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    {isEditing ? (
                      <div className="flex-1 flex items-center gap-3">
                        <input
                          type="text"
                          value={skill.name}
                          onChange={(e) => updateSkill(index, 'name', e.target.value)}
                          className="flex-1 border border-gray-300 rounded px-3 py-1 focus:border-blue-500 focus:outline-none"
                          placeholder="Skill name"
                        />
                        <button
                          onClick={() => removeSkill(index)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{skill.name}</span>
                        {pillClass && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${pillClass}`}>
                            {badgeLabel || badgeLevel}
                          </span>
                        )}
                        {skill.score !== undefined && skill.score !== null && (
                          <span className="text-xs text-gray-500">{skill.score}%</span>
                        )}
                      </div>
                    )}
                    <span className="text-sm font-semibold text-blue-600 ml-3">
                      {skill.level}%
                    </span>
                  </div>
                  
                  {isEditing ? (
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={skill.level}
                      onChange={(e) => updateSkill(index, 'level', parseInt(e.target.value))}
                      className="w-full"
                    />
                  ) : (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${skill.level}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Strengths Graph */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            Strength Analysis
          </h2>
          
          <div className="space-y-4">
            {profileData.strengths?.map((strength, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">{strength.name}</span>
                  <span className="text-sm font-semibold text-green-600">{strength.value}%</span>
                </div>
                {isEditing ? (
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={strength.value}
                    onChange={(e) => updateStrength(index, e.target.value)}
                    className="w-full"
                  />
                ) : (
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-500 ${
                        strength.value >= 80 ? 'bg-green-500' :
                        strength.value >= 60 ? 'bg-blue-500' :
                        strength.value >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${strength.value}%` }}
                    ></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Experience (Read-only) */}
        {parsedResume?.experience?.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-purple-500" />
              Experience
            </h2>
            <div className="space-y-4">
              {parsedResume.experience.slice(0, 3).map((exp, index) => (
                <div key={index} className="border-l-4 border-purple-500 pl-4 py-2">
                  <h3 className="font-semibold text-gray-900">{exp.title}</h3>
                  <p className="text-gray-600">{exp.company}</p>
                  <p className="text-sm text-gray-500">{exp.duration || `${exp.start_date} - ${exp.end_date || 'Present'}`}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Education (Read-only) */}
        {parsedResume?.education?.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-blue-500" />
              Education
            </h2>
            <div className="space-y-3">
              {parsedResume.education.slice(0, 2).map((edu, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900">{edu.degree}</h3>
                  <p className="text-gray-600">{edu.institution}</p>
                  {edu.field && <p className="text-sm text-gray-500">{edu.field}</p>}
                  {edu.year && <p className="text-sm text-gray-500">{edu.year}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skill Verification Section */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-lg border-2 border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-500" />
                Skill Verification
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {verificationStatus?.badge?.level !== 'none' 
                  ? `${verificationStatus?.trustLevel || 'Verified'} • ${verificationStatus?.credibilityScore || 0}% credibility`
                  : 'Verify your skills with AI-powered interviews'}
              </p>
            </div>
            {!verificationStatus || verificationStatus?.badge?.level === 'none' ? (
              <button
                onClick={() => setShowInterviewModal(true)}
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 shadow-lg transition-all"
              >
                <Shield className="w-5 h-5" />
                Start Verification
              </button>
            ) : (
              <button
                onClick={() => setShowInterviewModal(true)}
                className="bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-300 px-6 py-3 rounded-lg flex items-center gap-2 shadow transition-all"
              >
                <Shield className="w-5 h-5" />
                Re-verify Skills
              </button>
            )}
          </div>
          
          {verificationStatus && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              <div className="bg-white p-3 rounded-lg">
                <p className="text-xs text-gray-500">Verified Skills</p>
                <p className="text-xl font-bold text-green-600">
                  {verificationStatus.verifiedSkills?.length || 0}
                </p>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <p className="text-xs text-gray-500">Interviews</p>
                <p className="text-xl font-bold text-blue-600">
                  {verificationStatus.totalInterviews || 0}
                </p>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <p className="text-xs text-gray-500">Score</p>
                <p className="text-xl font-bold text-purple-600">
                  {verificationStatus.interviewScore || 0}%
                </p>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <p className="text-xs text-gray-500">Badge</p>
                <p className="text-xl font-bold text-yellow-600 uppercase">
                  {verificationStatus.badge?.level || 'None'}
                </p>
              </div>
            </div>
          )}
          {skillVerifications.length > 0 && (
            <div className="mt-4 bg-white p-4 rounded-lg border border-blue-100">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Per-skill badges</h4>
              <div className="flex flex-wrap gap-2">
                {skillVerifications.map((entry, idx) => {
                  const level = entry.badge?.level;
                  const pill = level && level !== 'none' ? BADGE_PILL_STYLES[level] : 'bg-gray-100 text-gray-700 border-gray-300';
                  return (
                    <span
                      key={`${entry.skill}-${idx}`}
                      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${pill}`}
                    >
                      <span>{entry.skill}</span>
                      {entry.score !== undefined && entry.score !== null && <span>{entry.score}%</span>}
                      {entry.badge?.label && <span>{entry.badge.label}</span>}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Interview Modal */}
      <InterviewModal
        isOpen={showInterviewModal}
        resumeId={resumeId}
        skills={parsedResume?.skills || []}
        onClose={() => setShowInterviewModal(false)}
        onComplete={() => {
          setShowInterviewModal(false);
          fetchProfile();
        }}
      />
    </div>
  );
};

// Helper function to calculate profile strength
const calculateStrength = (profile) => {
  let score = 0;
  
  if (profile.name && profile.name !== 'Your Name') score += 15;
  if (profile.headline) score += 10;
  if (profile.summary && profile.summary.length > 50) score += 20;
  if (profile.customSkills && profile.customSkills.length >= 5) score += 25;
  if (profile.customSkills && profile.customSkills.length >= 10) score += 10;
  if (profile.quote) score += 5;
  if (profile.socialLinks?.linkedin) score += 5;
  if (profile.socialLinks?.github) score += 5;
  if (profile.photoUrl) score += 15;
  
  return Math.min(score, 100);
};

export default EnhancedProfileCard;
