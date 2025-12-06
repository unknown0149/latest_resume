import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { ResumeProvider } from './hooks/useResumeContext'
import { AuthProvider, ProtectedRoute } from './hooks/useAuth'
import LoginPage from './pages/LoginPage'
import LandingPageNew from './pages/LandingPageNew'
import RegisterPage from './pages/RegisterPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import UploadPage from './pages/UploadPage'
import DashboardPage from './pages/DashboardPage'
import JobRoleDetailsPage from './pages/JobRoleDetailsPage'
import JobsListingPage from './pages/JobsListingPage'
import SettingsPage from './pages/SettingsPage'
import ProfilePage from './pages/ProfilePage'
import PricingPage from './pages/PricingPage'
import SavedJobsPage from './pages/SavedJobsPage'
import VerificationHistoryPage from './pages/VerificationHistoryPage'
import OnboardingWizard from './components/onboarding/OnboardingWizard'
import RecruiterDashboard from './pages/RecruiterDashboard'
import OrganizationManagement from './pages/OrganizationManagement'
import PostJobPage from './pages/PostJobPage'
import EditJobPage from './pages/EditJobPage'
import RecruiterJobsPage from './pages/RecruiterJobsPage'
import JobApplicantsPage from './pages/JobApplicantsPage'
import RecruiterApplicationsPage from './pages/RecruiterApplicationsPage'
import DiscoverCandidatesPage from './pages/DiscoverCandidatesPage'
import ErrorBoundary from './components/ui/ErrorBoundary'
import ApplicationsPage from './pages/ApplicationsPage'
import InterviewsPage from './pages/InterviewsPage'
import OffersPage from './pages/OffersPage'
import ResumeViewPage from './pages/ResumeViewPage'
import DataExportPage from './pages/DataExportPage'

function App() {
  return (
    <ErrorBoundary>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <AuthProvider> 
        <ResumeProvider>
          <Router>
            <Routes>
              <Route path="/" element={<LandingPageNew />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route 
                path="/onboarding" 
                element={(
                  <ProtectedRoute allowedRoles={['user']}>
                    <OnboardingWizard />
                  </ProtectedRoute>
                )}
              />
              <Route 
                path="/upload" 
                element={(
                  <ProtectedRoute allowedRoles={['user']}>
                    <UploadPage />
                  </ProtectedRoute>
                )}
              />
              <Route 
                path="/dashboard" 
                element={(
                  <ProtectedRoute allowedRoles={['user']}>
                    <DashboardPage />
                  </ProtectedRoute>
                )}
              />
              <Route 
                path="/job-role/:roleId" 
                element={(
                  <ProtectedRoute allowedRoles={['user']}>
                    <JobRoleDetailsPage />
                  </ProtectedRoute>
                )}
              />
              <Route 
                path="/jobs" 
                element={(
                  <ProtectedRoute allowedRoles={['user']}>
                    <JobsListingPage />
                  </ProtectedRoute>
                )}
              />
              <Route 
                path="/saved-jobs" 
                element={(
                  <ProtectedRoute allowedRoles={['user']}>
                    <SavedJobsPage />
                  </ProtectedRoute>
                )}
              />
              <Route 
                path="/verification-history" 
                element={(
                  <ProtectedRoute allowedRoles={['user']}>
                    <VerificationHistoryPage />
                  </ProtectedRoute>
                )}
              />
              <Route path="/pricing" element={<PricingPage />} />
              <Route 
                path="/settings" 
                element={(
                  <ProtectedRoute allowedRoles={['user']}>
                    <SettingsPage />
                  </ProtectedRoute>
                )}
              />
              <Route 
                path="/data-export" 
                element={(
                  <ProtectedRoute allowedRoles={['user']}>
                    <DataExportPage />
                  </ProtectedRoute>
                )}
              />
              <Route 
                path="/profile" 
                element={(
                  <ProtectedRoute allowedRoles={['user']}>
                    <ProfilePage />
                  </ProtectedRoute>
                )}
              />
              <Route 
                path="/applications" 
                element={(
                  <ProtectedRoute allowedRoles={['user']}>
                    <ApplicationsPage />
                  </ProtectedRoute>
                )}
              />
              <Route 
                path="/interviews" 
                element={(
                  <ProtectedRoute allowedRoles={['user']}>
                    <InterviewsPage />
                  </ProtectedRoute>
                )}
              />
              <Route 
                path="/offers" 
                element={(
                  <ProtectedRoute allowedRoles={['user']}>
                    <OffersPage />
                  </ProtectedRoute>
                )}
              />
              <Route 
                path="/resume/:resumeId" 
                element={(
                  <ProtectedRoute allowedRoles={['user', 'recruiter', 'admin']}>
                    <ResumeViewPage />
                  </ProtectedRoute>
                )}
              />
              <Route 
                path="/recruiter" 
                element={(
                  <ProtectedRoute allowedRoles={['recruiter', 'admin']}>
                    <RecruiterDashboard />
                  </ProtectedRoute>
                )}
              />
              <Route 
                path="/recruiter/jobs" 
                element={(
                  <ProtectedRoute allowedRoles={['recruiter', 'admin']}>
                    <RecruiterJobsPage />
                  </ProtectedRoute>
                )}
              />
              <Route 
                path="/recruiter/post-job" 
                element={(
                  <ProtectedRoute allowedRoles={['recruiter', 'admin']}>
                    <PostJobPage />
                  </ProtectedRoute>
                )}
              />
              <Route 
                path="/recruiter/edit-job/:jobId" 
                element={(
                  <ProtectedRoute allowedRoles={['recruiter', 'admin']}>
                    <EditJobPage />
                  </ProtectedRoute>
                )}
              />
              <Route 
                path="/recruiter/job/:jobId/candidates" 
                element={(
                  <ProtectedRoute allowedRoles={['recruiter', 'admin']}>
                    <JobApplicantsPage />
                  </ProtectedRoute>
                )}
              />
              <Route 
                path="/recruiter/applications" 
                element={(
                  <ProtectedRoute allowedRoles={['recruiter', 'admin']}>
                    <RecruiterApplicationsPage />
                  </ProtectedRoute>
                )}
              />
              <Route 
                path="/recruiter/discover-candidates" 
                element={(
                  <ProtectedRoute allowedRoles={['recruiter', 'admin']}>
                    <DiscoverCandidatesPage />
                  </ProtectedRoute>
                )}
              />
              <Route 
                path="/organization" 
                element={(
                  <ProtectedRoute allowedRoles={['recruiter', 'admin']}>
                    <OrganizationManagement />
                  </ProtectedRoute>
                )}
              />
            </Routes>
          </Router>
        </ResumeProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
