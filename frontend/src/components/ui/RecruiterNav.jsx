import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { 
  LayoutDashboard, 
  Briefcase, 
  Users, 
  UserPlus, 
  Building2, 
  PlusCircle,
  LogOut,
  Sparkles,
  Search
} from 'lucide-react'

export default function RecruiterNav() {
  const { logout, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path) => location.pathname === path

  const navLinks = [
    { to: '/recruiter', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/recruiter/jobs', label: 'Jobs', icon: Briefcase },
    { to: '/recruiter/applications', label: 'Applications', icon: Users },
    { to: '/recruiter/discover-candidates', label: 'Discover Candidates', icon: Search },
    { to: '/recruiter/post-job', label: 'Post Job', icon: PlusCircle },
    { to: '/organization', label: 'Organization', icon: Building2 }
  ]

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <nav className="bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/recruiter" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center text-white font-bold shadow-lg">
              RG
            </div>
            <div>
              <span className="text-lg font-bold text-slate-900">Resume Genie</span>
              <span className="ml-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Recruiter</span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-2">
            {navLinks.map(({ to, label, icon: Icon }) => {
              const active = isActive(to)
              return (
                <Link
                  key={to}
                  to={to}
                  className={`
                    inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all
                    ${active 
                      ? 'bg-slate-900 text-white shadow-lg' 
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              )
            })}
          </div>

          {/* User Info & Logout */}
          <div className="flex items-center gap-4">
            <div className="hidden md:block text-right">
              <p className="text-sm font-semibold text-slate-900">{user?.name || 'Recruiter'}</p>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-sm font-semibold transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden pb-4 flex flex-wrap gap-2">
          {navLinks.map(({ to, label, icon: Icon }) => {
            const active = isActive(to)
            return (
              <Link
                key={to}
                to={to}
                className={`
                  inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                  ${active 
                    ? 'bg-slate-900 text-white' 
                    : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
                  }
                `}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
