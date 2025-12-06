import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, ArrowRight, AlertCircle, ShieldCheck, Sparkles, Zap, CheckCircle2 } from 'lucide-react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { useAuth } from '../hooks/useAuth'

const LOGIN_BASE_COPY = {
  title: 'Welcome back, chief architect',
  subtitle: 'Resume Genie kept the runway warm. Pick up exactly where your playbook left off.'
}

const CHAD_LINES = [
  {
    title: 'Secure session ignited.',
    subtitle: 'We lock the door, dim the lights, and surface the next lofty target.'
  },
  {
    title: 'Signal synced to the boardroom.',
    subtitle: 'Every recruiter pulse is streaming to your console. Glide in with confidence.'
  },
  {
    title: 'Precision throttle engaged.',
    subtitle: 'Optimizing your resume intelligence stack before we hand you the controls.'
  },
  {
    title: 'Chad clearance received.',
    subtitle: 'We whisper to the hiring graph, then swing the doors wide open for you.'
  }
]

const HERO_HIGHLIGHTS = [
  { label: 'Time to offer', value: '31 days avg', icon: Zap },
  { label: 'Fit score accuracy', value: '97.2%', icon: ShieldCheck },
  { label: 'AI calibrations', value: '2,400+ /month', icon: Sparkles }
]

const HERO_BULLETS = [
  'Live calibration with every upload',
  'Private talent intelligence feed',
  'Designer-grade resume orchestration'
]

const FORM_ASSURANCES = [
  { label: 'SOC 2 Type II', detail: 'Independent audit complete' },
  { label: 'SSO ready', detail: 'Okta • Google • email link' }
]

const SESSION_TESTIMONIAL = {
  quote: 'Resume Genie quietly replaced three disjointed tools and keeps my resume market-ready in the background.',
  author: 'Anjali Singh',
  role: 'Growth PM, Verse Labs'
}

const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isAuthenticated, loading, user } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [requiresVerification, setRequiresVerification] = useState(false)
  const [resendingEmail, setResendingEmail] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [heroCopy, setHeroCopy] = useState(LOGIN_BASE_COPY)
  const [chadPulse, setChadPulse] = useState(false)

  const getPathFromState = (fallback) => {
    const fromState = location.state?.from
    if (!fromState) return fallback
    if (typeof fromState === 'string') return fromState
    if (typeof fromState.pathname === 'string') {
      return `${fromState.pathname}${fromState.search || ''}${fromState.hash || ''}`
    }
    return fallback
  }

  const getRecruiterDestination = () => {
    const intended = getPathFromState('/recruiter')
    return intended.startsWith('/recruiter') ? intended : '/recruiter'
  }

  const getCandidateDestination = () => getPathFromState('/upload')

  // Redirect if already authenticated (only after initial auth check is complete)
  useEffect(() => {
    if (!loading && isAuthenticated) {
      if (user?.role === 'recruiter' || user?.role === 'admin') {
        navigate(getRecruiterDestination(), { replace: true })
      } else {
        navigate(getCandidateDestination(), { replace: true })
      }
    }
  }, [isAuthenticated, loading, user, navigate, location])

  const triggerChadCopy = () => {
    const nextLine = CHAD_LINES[Math.floor(Math.random() * CHAD_LINES.length)]
    setHeroCopy(nextLine)
    setChadPulse(true)
  }

  const resetHeroCopy = () => {
    setHeroCopy({ ...LOGIN_BASE_COPY })
    setChadPulse(false)
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('')
    setRequiresVerification(false)
    setResendSuccess(false)
  }

  const handleResendVerification = async () => {
    if (!formData.email) {
      setError('Please enter your email address')
      return
    }

    setResendingEmail(true)
    setError('')
    setResendSuccess(false)

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email })
      })

      const data = await response.json()

      if (data.success) {
        setResendSuccess(true)
        setError('')
      } else {
        setError(data.message || 'Failed to resend verification email')
      }
    } catch (err) {
      console.error('Resend verification error:', err)
      setError('Failed to resend verification email. Please try again.')
    } finally {
      setResendingEmail(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.email || !formData.password) {
      setError('Email and password are required')
      return
    }

    triggerChadCopy()
    setIsLoading(true)

    try {
      const result = await login(formData.email, formData.password)
      
      if (result.success) {
        if (['recruiter', 'admin'].includes(result.user?.role)) {
          navigate(getRecruiterDestination(), { replace: true })
        } else {
          navigate(getCandidateDestination(), { replace: true })
        }
      } else {
        setError(result.message || 'Invalid email or password')
        // Check if the error is about email verification
        if (result.message?.toLowerCase().includes('verify your email')) {
          setRequiresVerification(true)
        }
        setIsLoading(false)
        resetHeroCopy()
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('Login failed. Please try again.')
      setIsLoading(false)
      resetHeroCopy()
    }
  }

  return (
    <div className="page-shell relative min-h-screen px-6 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(31,122,236,0.08),transparent_55%),radial-gradient(circle_at_20%_40%,rgba(15,78,169,0.08),transparent_50%)]" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(15,23,42,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.03) 1px, transparent 1px)",
          backgroundSize: '44px 44px',
          opacity: 0.25
        }}
      />
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr]"
      >
        <div className="relative flex flex-col justify-between overflow-hidden rounded-[24px] border border-[var(--rg-border)] bg-[var(--rg-surface)] p-8 shadow-soft">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent opacity-35" />
          <div className="relative space-y-8">
            <div className="flex items-center justify-between gap-4">
              <Link
                to="/"
                className="inline-flex items-center gap-3 rounded-full border border-[var(--rg-border)] bg-[var(--rg-surface-alt)] px-5 py-2 text-sm font-semibold text-[var(--rg-text-primary)] visited:text-[var(--rg-text-primary)]"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-xs font-black text-slate-900">
                  RG
                </span>
                Back to site
              </Link>
              <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[11px] font-semibold tracking-wide ${chadPulse ? 'border-emerald-300/60 text-emerald-700' : 'border-[var(--rg-border)] text-[var(--rg-text-secondary)]'}`}>
                <span className={`h-2 w-2 rounded-full ${chadPulse ? 'bg-emerald-400 animate-pulse' : 'bg-[var(--rg-border)]'}`} />
                {chadPulse ? 'Syncing credentials' : 'Perimeter idle'}
              </div>
            </div>

            <div className="space-y-5">
              <p className="text-[11px] uppercase tracking-[0.5em] text-[var(--rg-text-secondary)]">Client console</p>
              <div className="min-h-[160px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={heroCopy.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                  >
                    <h1 className="text-4xl font-semibold leading-tight text-[var(--rg-text-primary)] md:text-[46px]">
                      {heroCopy.title}
                    </h1>
                    <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--rg-text-secondary)]">
                      {heroCopy.subtitle}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            <div className="rounded-3xl border border-[var(--rg-border)] bg-[var(--rg-surface-alt)] p-6 shadow-soft">
              <p className="text-[11px] uppercase tracking-[0.4em] text-[var(--rg-text-secondary)]">This session unlocks</p>
              <div className="mt-4 space-y-4">
                {HERO_BULLETS.map((bullet) => (
                  <div key={bullet} className="flex items-start gap-3 text-sm text-[var(--rg-text-primary)]">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-500" />
                    <span>{bullet}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="relative mt-8 space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              {HERO_HIGHLIGHTS.map(({ label, value, icon: Icon }) => (
                <motion.div
                  key={label}
                  whileHover={{ y: -4 }}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <Icon className="mb-2 h-5 w-5 text-white" />
                  <p className="text-[11px] uppercase tracking-[0.35em] text-white/55">{label}</p>
                  <p className="mt-1 text-lg font-semibold text-white">{value}</p>
                </motion.div>
              ))}
            </div>

            <div className="rounded-3xl border border-white/15 bg-gradient-to-br from-white/10 to-transparent p-6">
              <p className="text-sm italic text-white/80">“{SESSION_TESTIMONIAL.quote}”</p>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/25 text-sm font-semibold text-white">
                  {SESSION_TESTIMONIAL.author
                    .split(' ')
                    .map((word) => word[0])
                    .join('')}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{SESSION_TESTIMONIAL.author}</p>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/60">{SESSION_TESTIMONIAL.role}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.6 }}
          className="w-full"
        >
          <Card className="!bg-white/95 rounded-[34px] border border-slate-100/80 p-10 shadow-[0_50px_140px_rgba(8,12,22,0.15)]">
            <div className="mb-8">
              <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.4em] text-slate-400">
                <span>Login</span>
                <span className="text-slate-300">Single sign-on ready</span>
              </div>
              <h2 className="mt-3 text-[34px] font-semibold text-slate-900">Access your control tower</h2>
              <p className="mt-2 text-sm text-slate-500">We pre-load your resume intelligence layers before you land.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                  {requiresVerification && (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={handleResendVerification}
                        disabled={resendingEmail}
                        className="w-full rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-600 hover:bg-blue-100 disabled:opacity-50 transition-colors"
                      >
                        {resendingEmail ? 'Sending...' : 'Resend Verification Email'}
                      </button>
                      <Link
                        to="/verify-email"
                        className="block text-center text-sm text-blue-600 hover:underline"
                      >
                        Already have a verification code? Enter it here
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {resendSuccess && (
                <div className="flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  Verification email sent! Please check your inbox.
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="email" className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300" />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-12 py-3 text-base text-slate-900 placeholder:text-slate-300 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                    placeholder="you@studio.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300" />
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-12 py-3 text-base text-slate-900 placeholder:text-slate-300 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>Need a hint? Use the email you registered with.</span>
                <button type="button" className="font-semibold text-slate-900 hover:underline">
                  Forgot?
                </button>
              </div>

              <Button
                type="submit"
                className="group relative w-full overflow-hidden rounded-2xl bg-slate-900 px-6 py-4 text-base font-semibold text-white"
                disabled={isLoading}
              >
                <span className="relative z-10 flex w-full items-center justify-center gap-2">
                  {isLoading ? 'Verifying session…' : 'Continue to dashboard'}
                  <ArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" />
                </span>
                <span className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </Button>
            </form>

            <div className="mt-8 grid gap-4 rounded-2xl bg-slate-50/70 p-4 text-sm text-slate-600 sm:grid-cols-2">
              {FORM_ASSURANCES.map(({ label, detail }) => (
                <div key={label}>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">{label}</p>
                  <p className="mt-1 text-sm text-slate-600">{detail}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between text-sm text-slate-500">
              <span>Need to onboard someone new?</span>
              <Link to="/register" className="font-semibold text-slate-900 visited:text-slate-900">
                Create access
              </Link>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}

export default LoginPage
