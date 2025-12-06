import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Download, FileText, Clock, CheckCircle, History, RotateCcw } from 'lucide-react'
import Navbar from '../components/ui/Navbar'
import Footer from '../components/ui/Footer'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useResumeContext } from '../hooks/useResumeContext'

const DataExportPage = () => {
  const { resumeId } = useResumeContext()
  const [loading, setLoading] = useState(false)
  const [versions, setVersions] = useState([])
  const [versionsLoading, setVersionsLoading] = useState(false)

  useEffect(() => {
    if (resumeId) {
      fetchVersions()
    }
  }, [resumeId])

  const fetchVersions = async () => {
    try {
      setVersionsLoading(true)
      const response = await api.get(`/export/resume/${resumeId}/versions`)
      if (response.data.success) {
        setVersions(response.data.versions || [])
      }
    } catch (error) {
      console.error('Failed to fetch versions:', error)
      toast.error('Failed to load resume versions')
    } finally {
      setVersionsLoading(false)
    }
  }

  const handleExportData = async () => {
    try {
      setLoading(true)
      const response = await api.get('/export/data')
      
      if (response.data.success) {
        // Create and download JSON file
        const dataStr = JSON.stringify(response.data.data, null, 2)
        const dataBlob = new Blob([dataStr], { type: 'application/json' })
        const url = window.URL.createObjectURL(dataBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = `resume-data-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
        
        toast.success('Data exported successfully!')
      }
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('Failed to export data')
    } finally {
      setLoading(false)
    }
  }

  const handleRestoreVersion = async (versionNumber) => {
    if (!confirm(`Restore to version ${versionNumber}? Your current resume will be saved in history.`)) {
      return
    }

    try {
      const response = await api.post(`/export/resume/${resumeId}/restore/${versionNumber}`)
      if (response.data.success) {
        toast.success(`Restored to version ${versionNumber}`)
        fetchVersions()
        window.location.reload() // Refresh to show restored resume
      }
    } catch (error) {
      console.error('Restore failed:', error)
      toast.error('Failed to restore version')
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
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Data Management</h1>
            <p className="text-gray-600 mb-8">Export your data and manage resume versions</p>

            {/* Export Data Card */}
            <Card className="mb-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <Download className="w-6 h-6 text-blue-600" />
                    <h2 className="text-xl font-bold text-gray-900">Export Your Data</h2>
                  </div>
                  <p className="text-gray-600 mb-4">
                    Download all your data including resumes, applications, interviews, and profile information in JSON format. 
                    Perfect for backup or transferring to another platform.
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-blue-900 font-medium mb-1">📦 What's Included:</p>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>✓ All uploaded resumes and parsed data</li>
                      <li>✓ Job application history with status</li>
                      <li>✓ Interview schedules and feedback</li>
                      <li>✓ Profile information and settings</li>
                      <li>✓ Skill verifications and badges</li>
                    </ul>
                  </div>
                  <Button 
                    onClick={handleExportData}
                    disabled={loading}
                    className="w-full sm:w-auto"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {loading ? 'Exporting...' : 'Export All Data (JSON)'}
                  </Button>
                </div>
              </div>
            </Card>

            {/* Resume Versions Card */}
            <Card>
              <div className="flex items-center gap-3 mb-4">
                <History className="w-6 h-6 text-purple-600" />
                <h2 className="text-xl font-bold text-gray-900">Resume Version History</h2>
              </div>
              
              {versionsLoading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  <p className="text-gray-600 mt-2">Loading versions...</p>
                </div>
              ) : versions.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No resume versions found</p>
                  <p className="text-sm text-gray-500 mt-1">Upload a resume to start tracking versions</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {versions.map((version) => (
                    <div 
                      key={version.versionNumber}
                      className={`p-4 rounded-lg border-2 ${
                        version.isCurrent 
                          ? 'bg-green-50 border-green-300' 
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <FileText className={`w-5 h-5 ${version.isCurrent ? 'text-green-600' : 'text-gray-600'}`} />
                            <h3 className="font-semibold text-gray-900">
                              Version {version.versionNumber}
                              {version.isCurrent && (
                                <span className="ml-2 inline-flex items-center gap-1 px-2 py-1 bg-green-600 text-white text-xs rounded-full">
                                  <CheckCircle className="w-3 h-3" />
                                  Current
                                </span>
                              )}
                            </h3>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {new Date(version.uploadedAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                            <div className="flex items-center gap-1">
                              <FileText className="w-4 h-4" />
                              {version.filename}
                            </div>
                          </div>
                        </div>
                        {!version.isCurrent && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRestoreVersion(version.versionNumber)}
                          >
                            <RotateCcw className="w-4 h-4 mr-1" />
                            Restore
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* GDPR Notice */}
            <div className="mt-6 p-4 bg-gray-100 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>Data Privacy:</strong> Your data is protected and stored securely. 
                You can export or delete your data at any time. For data deletion requests, 
                please contact support or use the account deletion option in Settings.
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      <Footer />
    </div>
  )
}

export default DataExportPage
