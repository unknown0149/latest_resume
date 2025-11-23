import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, Upload, LayoutDashboard, Settings, LogIn, LogOut, User } from 'lucide-react'
import { useState, useEffect } from 'react'
import Button from './Button'

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userName, setUserName] = useState('')
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (path) => location.pathname === path

  // Check authentication on mount and route change
  useEffect(() => {
    const checkAuth = () => {
      const authStatus = localStorage.getItem('isAuthenticated') === 'true'
      const name = localStorage.getItem('userName') || 'User'
      setIsAuthenticated(authStatus)
      setUserName(name)
    }
    
    checkAuth()
    // Re-check on route change
    window.addEventListener('storage', checkAuth)
    return () => window.removeEventListener('storage', checkAuth)
  }, [location])

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated')
    localStorage.removeItem('userName')
    localStorage.removeItem('auth_token')
    setIsAuthenticated(false)
    setIsMenuOpen(false)
    navigate('/')
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white">
                <path d="M7 9L12 14L17 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-xl font-bold gradient-text">Resume Genie</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link 
              to="/" 
              className={`text-sm font-medium transition-colors ${isActive('/') ? 'text-primary-500' : 'text-gray-600 hover:text-primary-500'}`}
            >
              Home
            </Link>
            <Link 
              to="/upload" 
              className={`text-sm font-medium transition-colors ${isActive('/upload') ? 'text-primary-500' : 'text-gray-600 hover:text-primary-500'}`}
            >
              Upload Resume
            </Link>
            <Link 
              to="/dashboard" 
              className={`text-sm font-medium transition-colors ${isActive('/dashboard') ? 'text-primary-500' : 'text-gray-600 hover:text-primary-500'}`}
            >
              Dashboard
            </Link>
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link to="/dashboard">
                  <Button variant="outline" size="sm">
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
                  <User className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">{userName}</span>
                </div>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="outline" size="sm">
                    <LogIn className="w-4 h-4 mr-2" />
                    Login
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm">
                    <Upload className="w-4 h-4 mr-2" />
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="px-4 py-4 space-y-3">
            <Link 
              to="/" 
              className="block px-4 py-2 text-sm font-medium rounded-lg hover:bg-gray-50"
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            {isAuthenticated && (
              <>
                <Link 
                  to="/upload" 
                  className="block px-4 py-2 text-sm font-medium rounded-lg hover:bg-gray-50"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Upload Resume
                </Link>
                <Link 
                  to="/dashboard" 
                  className="block px-4 py-2 text-sm font-medium rounded-lg hover:bg-gray-50"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Dashboard
                </Link>
              </>
            )}
            <div className="pt-3 border-t border-gray-200 space-y-2">
              {isAuthenticated ? (
                <>
                  <div className="px-4 py-2 bg-gray-100 rounded-lg flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">{userName}</span>
                  </div>
                  <Button variant="outline" className="w-full" onClick={handleLogout}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/login" className="block" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="outline" className="w-full">
                      <LogIn className="w-4 h-4 mr-2" />
                      Login
                    </Button>
                  </Link>
                  <Link to="/register" className="block" onClick={() => setIsMenuOpen(false)}>
                    <Button className="w-full">
                      <Upload className="w-4 h-4 mr-2" />
                      Get Started
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

export default Navbar
