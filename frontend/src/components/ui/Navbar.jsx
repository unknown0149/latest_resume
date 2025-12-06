import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, Upload, LogIn, LogOut, Moon, SunMedium, ChevronDown, Sparkles, Briefcase, CalendarClock, Handshake, UserCircle, FileText } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import Button from './Button'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isCareerMenuOpen, setIsCareerMenuOpen] = useState(false)
  const { isAuthenticated, user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const careerMenuRef = useRef(null)

  const isActive = (path) => location.pathname === path

  const handleLogout = async () => {
    await logout()
    setIsMenuOpen(false)
    navigate('/')
  }

  useEffect(() => {
    if (!isCareerMenuOpen) return
    const handleClickOutside = (event) => {
      if (careerMenuRef.current && !careerMenuRef.current.contains(event.target)) {
        setIsCareerMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isCareerMenuOpen])

  useEffect(() => {
    setIsMenuOpen(false)
    setIsCareerMenuOpen(false)
  }, [location.pathname])

  const primaryLinks = [
    { to: '/', label: 'Home' },
    { to: '/recruiter', label: 'Recruiter Dashboard', requiresAuth: true, requiresRole: 'recruiter' },
    { to: '/recruiter/jobs', label: 'Manage Jobs', requiresAuth: true, requiresRole: 'recruiter' },
    { to: '/dashboard', label: 'Dashboard', requiresAuth: true, requiresRole: 'user' },
    { to: '/jobs', label: 'Jobs', requiresAuth: true, requiresRole: 'user' },
    { to: '/upload', label: 'Upload Resume', requiresAuth: true, requiresRole: 'user' },
    { to: '/settings', label: 'Settings', requiresAuth: true, requiresRole: 'user' }
  ]

  const careerLinks = [
    { to: '/applications', label: 'Applications', icon: <Briefcase className="w-4 h-4" /> },
    { to: '/interviews', label: 'Interviews', icon: <CalendarClock className="w-4 h-4" /> },
    { to: `/resume/${user?.resumeId || 'view'}`, label: 'My Resume', icon: <FileText className="w-4 h-4" />, dynamic: true },
    { to: '/offers', label: 'Offers', icon: <Handshake className="w-4 h-4" /> },
    { to: '/data-export', label: 'Export Data', icon: <FileText className="w-4 h-4" /> },
    { to: '/profile', label: 'Profile', icon: <UserCircle className="w-4 h-4" /> }
  ]
  const isUser = user?.role === 'user'

  const canShowLink = (link) => {
    if (link.requiresAuth && !isAuthenticated) return false
    if (link.requiresRole && user?.role !== link.requiresRole) return false
    return true
  }

  const ThemeToggleButton = () => (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full border border-[var(--rg-border)] hover:bg-[var(--rg-surface-alt)] transition-colors"
      aria-label="Toggle theme"
    >
      {theme === 'light' ? <Moon className="w-4 h-4" /> : <SunMedium className="w-4 h-4" />}
    </button>
  )

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--rg-surface)]/92 backdrop-blur-xl border-b border-[var(--rg-border)] shadow-[0_12px_35px_rgba(15,23,42,0.08)] text-[var(--rg-text-primary)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-lg border border-[var(--rg-border-strong)] bg-[var(--rg-bg-muted)] flex items-center justify-center text-[var(--rg-accent)] font-semibold shadow-sm">
              RG
            </div>
            <span className="text-xl font-bold tracking-tight text-[var(--rg-text-primary)]">Resume Genie</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {primaryLinks.filter(canShowLink).map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`text-sm font-medium transition-colors ${isActive(to) ? 'text-[var(--rg-text-primary)]' : 'text-[var(--rg-text-secondary)] hover:text-[var(--rg-text-primary)]'}`}
              >
                {label}
              </Link>
            ))}
            {isUser && (
              <div className="relative" ref={careerMenuRef}>
                <button
                  onClick={() => setIsCareerMenuOpen((prev) => !prev)}
                  aria-expanded={isCareerMenuOpen}
                  className={`flex items-center gap-1.5 rounded-full border border-transparent px-4 py-2 text-sm font-semibold transition-colors ${isCareerMenuOpen ? 'bg-[var(--rg-surface-alt)] text-[var(--rg-text-primary)]' : 'text-[var(--rg-text-secondary)] hover:text-[var(--rg-text-primary)]'}`}
                >
                  Career Hub
                  <ChevronDown className={`w-4 h-4 transition-transform ${isCareerMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {isCareerMenuOpen && (
                  <div className="absolute left-0 top-full mt-3 w-72 rounded-2xl border border-[var(--rg-border)] bg-[var(--rg-surface)] shadow-xl">
                    <div className="grid grid-cols-2 gap-2 p-3">
                      {careerLinks.map(({ to, label, icon }) => (
                        <Link
                          key={to}
                          to={to}
                          onClick={() => setIsCareerMenuOpen(false)}
                          className={`group flex items-center gap-2 rounded-xl border border-transparent px-3 py-2 text-sm font-semibold transition-all ${isActive(to) ? 'bg-[var(--rg-bg-muted)] text-[var(--rg-text-primary)]' : 'text-[var(--rg-text-secondary)] hover:bg-[var(--rg-surface-alt)] hover:text-[var(--rg-text-primary)]'}`}
                        >
                          <span className="text-[var(--rg-accent)] group-hover:scale-110 transition-transform">{icon}</span>
                          {label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggleButton />
            {isAuthenticated && isUser && (
              <Link to="/dashboard">
                <Button size="sm" className="bg-[var(--rg-accent)] text-white shadow-sm hover:opacity-95">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Open Workspace
                </Button>
              </Link>
            )}
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-3 rounded-2xl border border-[var(--rg-border)] bg-[var(--rg-surface-alt)] px-3 py-1.5 shadow-sm">
                  <UserCircle className="w-5 h-5 text-[var(--rg-accent)]" />
                  <div className="leading-tight">
                    <p className="text-[10px] uppercase tracking-wide text-[var(--rg-text-secondary)]">Welcome</p>
                    <p className="text-sm font-semibold text-[var(--rg-text-primary)] max-w-[140px] truncate">{user?.name || 'Candidate'}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-1.5" />
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
            className="md:hidden p-2 rounded-lg border border-[var(--rg-border)] hover:bg-[var(--rg-surface-alt)] transition-colors"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-[var(--rg-border)] bg-[var(--rg-surface)]">
          <div className="px-4 py-5 space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold uppercase tracking-wide text-[var(--rg-text-secondary)]">Theme</span>
              <ThemeToggleButton />
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-[var(--rg-text-secondary)]">Quick Links</p>
              <div className="mt-3 space-y-2">
                {primaryLinks.filter(canShowLink).map(({ to, label }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center justify-between rounded-xl border border-[var(--rg-border)] px-4 py-3 text-sm font-semibold transition-colors ${isActive(to) ? 'bg-[var(--rg-bg-muted)] text-[var(--rg-text-primary)]' : 'text-[var(--rg-text-secondary)] hover:bg-[var(--rg-surface-alt)] hover:text-[var(--rg-text-primary)]'}`}
                  >
                    {label}
                    <ChevronDown className="w-4 h-4 -rotate-90" />
                  </Link>
                ))}
              </div>
            </div>

            {isUser && (
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-[var(--rg-text-secondary)]">Career Hub</p>
                <div className="mt-3 grid grid-cols-1 gap-2">
                  {careerLinks.map(({ to, label, icon }) => (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => setIsMenuOpen(false)}
                      className={`flex items-center gap-3 rounded-2xl border border-[var(--rg-border)] px-3 py-3 text-sm font-semibold transition-colors ${isActive(to) ? 'bg-[var(--rg-bg-muted)] text-[var(--rg-text-primary)]' : 'text-[var(--rg-text-secondary)] hover:bg-[var(--rg-surface-alt)] hover:text-[var(--rg-text-primary)]'}`}
                    >
                      <span className="text-[var(--rg-accent)]">{icon}</span>
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-[var(--rg-border)] space-y-3">
              {isAuthenticated ? (
                <>
                  <div className="flex items-center gap-3 rounded-2xl border border-[var(--rg-border)] bg-[var(--rg-bg-muted)] px-4 py-3">
                    <UserCircle className="w-5 h-5 text-[var(--rg-accent)]" />
                    <div className="leading-tight">
                      <p className="text-[11px] uppercase tracking-wide text-[var(--rg-text-secondary)]">Signed in</p>
                      <p className="text-sm font-semibold text-[var(--rg-text-primary)]">{user?.name || 'Candidate'}</p>
                    </div>
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
