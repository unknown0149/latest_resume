import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ResumeProvider } from './hooks/useResumeContext'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import UploadPage from './pages/UploadPage'
import DashboardPage from './pages/DashboardPage'
import JobRoleDetailsPage from './pages/JobRoleDetailsPage'
import SettingsPage from './pages/SettingsPage'
import ErrorBoundary from './components/ui/ErrorBoundary'

function App() {
  return (
    <ErrorBoundary>
      <ResumeProvider>
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/job-role/:roleId" element={<JobRoleDetailsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </Router>
      </ResumeProvider>
    </ErrorBoundary>
  )
}

export default App
