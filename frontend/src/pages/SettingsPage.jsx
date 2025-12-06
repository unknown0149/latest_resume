import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { User, Mail, Lock, Bell, Shield, Trash2, Eye, Briefcase } from 'lucide-react'
import Navbar from '../components/ui/Navbar'
import Footer from '../components/ui/Footer'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useResumeContext } from '../hooks/useResumeContext'
import { useAuth } from '../hooks/useAuth'

const SettingsPage = () => {
  const { parsedResume } = useResumeContext()
  const { user, updateUser, logout } = useAuth()
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [notifications, setNotifications] = useState({
    email: true,
    roadmapReminders: true,
    newRoles: false,
    weeklyDigest: true,
  })
  
  const [privacy, setPrivacy] = useState({
    visibleToRecruiters: false,
    openToWork: false,
    loading: true,
  })
  
  const [savingPrivacy, setSavingPrivacy] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' })
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Fetch profile + privacy settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const profileRes = await api.get('/user/profile')
        if (profileRes.data?.user) {
          setProfile(profileRes.data)
          setName(profileRes.data.user.name || '')
          setEmail(profileRes.data.user.email || '')
          const prefs = profileRes.data.user.preferences || {}
          setNotifications((prev) => ({
            ...prev,
            email: prefs.emailNotifications ?? prev.email,
            newRoles: prefs.jobAlerts ?? prev.newRoles,
            weeklyDigest: prefs.newsletter ?? prev.weeklyDigest,
            roadmapReminders: prev.roadmapReminders,
          }))
          // Resume privacy from active resume if available
          const resumeIdForPrivacy = parsedResume?.resumeId || profileRes.data?.latestResume?.id
          if (resumeIdForPrivacy) {
            const resumeRes = await api.get(`/resume/${resumeIdForPrivacy}/parsed`)
            const privacyData = resumeRes.data?.privacy || {}
            setPrivacy({
              visibleToRecruiters: !!privacyData.visibleToRecruiters,
              openToWork: !!privacyData.openToWork,
              loading: false,
            })
          } else {
            setPrivacy((prev) => ({ ...prev, loading: false }))
          }
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error)
        setPrivacy((prev) => ({ ...prev, loading: false }))
      } finally {
        setProfileLoading(false)
      }
    }

    fetchSettings()
  }, [parsedResume?.resumeId])

  const handlePrivacyToggle = async (field) => {
    if (!parsedResume?.resumeId) {
      toast.error('Please upload a resume first')
      return
    }

    const newValue = !privacy[field]
    const previousValue = privacy[field]
    
    // Optimistic update
    setPrivacy({ ...privacy, [field]: newValue })
    
    try {
      setSavingPrivacy(true)
      await api.patch(`/resume/${parsedResume.resumeId}/privacy`, {
        [field]: newValue
      })
      
      toast.success(
        field === 'visibleToRecruiters' 
          ? newValue 
            ? '✅ Your resume is now visible to recruiters'
            : '🔒 Your resume is now private'
          : newValue
            ? '💼 Open to work status enabled'
            : 'Open to work status disabled'
      )
    } catch (error) {
      console.error('Failed to update privacy:', error)
      // Revert on error
      setPrivacy({ ...privacy, [field]: previousValue })
      toast.error('Failed to update privacy settings')
    } finally {
      setSavingPrivacy(false)
    }
  }

  const handleProfileSave = async () => {
    setSavingProfile(true)
    try {
      const payload = {
        name: name.trim(),
        preferences: {
          emailNotifications: notifications.email,
          jobAlerts: notifications.newRoles,
          newsletter: notifications.weeklyDigest,
        }
      }
      const res = await api.put('/user/profile', payload)
      if (res.data?.success && res.data?.user) {
        updateUser(res.data.user)
        toast.success('Profile updated')
      } else {
        toast.error(res.data?.message || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Failed to update profile:', error)
      toast.error(error.response?.data?.message || 'Could not save profile')
    } finally {
      setSavingProfile(false)
    }
  }

  const handlePasswordChange = async () => {
    if (!passwordForm.current || !passwordForm.next || !passwordForm.confirm) {
      toast.error('Fill all password fields')
      return
    }
    if (passwordForm.next !== passwordForm.confirm) {
      toast.error('New passwords do not match')
      return
    }
    setPasswordLoading(true)
    try {
      const res = await api.put('/user/password', {
        currentPassword: passwordForm.current,
        newPassword: passwordForm.next
      })
      if (res.data?.success) {
        toast.success('Password updated')
        setPasswordForm({ current: '', next: '', confirm: '' })
      } else {
        toast.error(res.data?.message || 'Failed to update password')
      }
    } catch (error) {
      console.error('Password update failed:', error)
      toast.error(error.response?.data?.message || 'Could not update password')
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!window.confirm('Delete your account and all resumes? This cannot be undone.')) return
    setDeleting(true)
    try {
      const res = await api.delete('/user/account')
      if (res.data?.success) {
        toast.success('Account deleted')
        await logout()
        window.location.href = '/'
      } else {
        toast.error(res.data?.message || 'Delete failed')
      }
    } catch (error) {
      console.error('Delete account failed:', error)
      toast.error(error.response?.data?.message || 'Could not delete account')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="pt-24 pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Settings</h1>
            <p className="text-lg text-gray-600">Manage your account and preferences</p>
          </motion.div>

          <div className="space-y-6">
            {/* Profile Settings */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Card>
                <div className="flex items-center gap-3 mb-6">
                  <User className="w-6 h-6 text-primary-500" />
                  <h2 className="text-xl font-bold text-gray-900">Profile Information</h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      disabled={profileLoading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      readOnly
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                    />
                    <p className="text-xs text-gray-500 mt-1">Email changes are disabled in this build.</p>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border bg-gray-50 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Resume status</p>
                      <p className="text-xs text-gray-600">
                        {profile?.latestResume ? `Active resume: ${profile.latestResume.name || profile.latestResume.id}` : 'No resume uploaded yet'}
                      </p>
                    </div>
                    {!profile?.latestResume && (
                      <span className="text-xs text-amber-700 bg-amber-100 px-3 py-1 rounded-full">Upload required</span>
                    )}
                  </div>
                  <Button onClick={handleProfileSave} disabled={savingProfile || profileLoading}>
                    {savingProfile ? 'Saving…' : 'Save Changes'}
                  </Button>
                </div>
              </Card>
            </motion.div>

            {/* Notifications */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card>
                <div className="flex items-center gap-3 mb-6">
                  <Bell className="w-6 h-6 text-primary-500" />
                  <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
                </div>
                <div className="space-y-4">
                  {Object.entries(notifications).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </p>
                        <p className="text-sm text-gray-600">
                          Receive notifications about this
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => setNotifications({ ...notifications, [key]: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                    </div>
                  ))}
                  <div className="text-right">
                    <Button variant="outline" onClick={handleProfileSave} disabled={savingProfile || profileLoading}>
                      {savingProfile ? 'Saving…' : 'Save Notification Preferences'}
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Privacy Settings */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
            >
              <Card className="border-blue-200 bg-blue-50/50">
                <div className="flex items-center gap-3 mb-4">
                  <Eye className="w-6 h-6 text-blue-600" />
                  <h2 className="text-xl font-bold text-gray-900">Resume Privacy</h2>
                </div>
                <div className="mb-4 p-4 bg-blue-100 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-900 font-medium mb-1">
                    🔒 Your Privacy Matters
                  </p>
                  <p className="text-xs text-blue-800">
                    By default, your resume is <strong>completely private</strong>. Recruiters can only see your profile if you explicitly enable "Visible to Recruiters" below.
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start justify-between p-4 bg-white rounded-lg border border-gray-200">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Briefcase className="w-5 h-5 text-emerald-600" />
                        <p className="font-semibold text-gray-900">Visible to Recruiters</p>
                      </div>
                      <p className="text-sm text-gray-600">
                        Allow recruiters to discover your profile and contact you for matching job opportunities. 
                        Your resume will appear in their "Suggested Candidates" list when you're a good fit.
                      </p>
                      {privacy.visibleToRecruiters && (
                        <p className="text-xs text-emerald-600 font-medium mt-2">
                          ✅ Recruiters can see your profile
                        </p>
                      )}
                      {!privacy.visibleToRecruiters && (
                        <p className="text-xs text-gray-500 font-medium mt-2">
                          🔒 Your profile is private
                        </p>
                      )}
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-4">
                      <input
                        type="checkbox"
                        checked={privacy.visibleToRecruiters}
                        onChange={() => handlePrivacyToggle('visibleToRecruiters')}
                        disabled={savingPrivacy || !parsedResume?.resumeId}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600 peer-disabled:opacity-50"></div>
                    </label>
                  </div>

                  <div className="flex items-start justify-between p-4 bg-white rounded-lg border border-gray-200">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Briefcase className="w-5 h-5 text-blue-600" />
                        <p className="font-semibold text-gray-900">Open to Work</p>
                      </div>
                      <p className="text-sm text-gray-600">
                        Signal to recruiters that you're actively looking for new opportunities. 
                        This increases your visibility in search results.
                      </p>
                      {privacy.openToWork && (
                        <p className="text-xs text-blue-600 font-medium mt-2">
                          💼 Actively seeking opportunities
                        </p>
                      )}
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-4">
                      <input
                        type="checkbox"
                        checked={privacy.openToWork}
                        onChange={() => handlePrivacyToggle('openToWork')}
                        disabled={savingPrivacy || !parsedResume?.resumeId}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
                    </label>
                  </div>
                </div>
                {!parsedResume?.resumeId && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800">
                      ⚠️ Upload your resume first to manage privacy settings
                    </p>
                  </div>
                )}
              </Card>
            </motion.div>

            {/* Security */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Card>
                <div className="flex items-center gap-3 mb-6">
                  <Shield className="w-6 h-6 text-primary-500" />
                  <h2 className="text-xl font-bold text-gray-900">Security</h2>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                      <input
                        type="password"
                        value={passwordForm.current}
                        onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                      <input
                        type="password"
                        value={passwordForm.next}
                        onChange={(e) => setPasswordForm({ ...passwordForm, next: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                      <input
                        type="password"
                        value={passwordForm.confirm}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                  <Button variant="outline" onClick={handlePasswordChange} disabled={passwordLoading}>
                    {passwordLoading ? 'Updating…' : (<span className="inline-flex items-center"><Lock className="w-4 h-4 mr-2" /> Update Password</span>)}
                  </Button>
                </div>
              </Card>
            </motion.div>

            {/* Danger Zone */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Card className="border-red-200">
                <div className="flex items-center gap-3 mb-6">
                  <Trash2 className="w-6 h-6 text-red-600" />
                  <h2 className="text-xl font-bold text-gray-900">Danger Zone</h2>
                </div>
                <p className="text-gray-600 mb-4">
                  Once you delete your account, there is no going back. Please be certain.
                </p>
                <Button variant="danger" onClick={handleDeleteAccount} disabled={deleting}>
                  {deleting ? 'Deleting…' : 'Delete Account'}
                </Button>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}

export default SettingsPage
