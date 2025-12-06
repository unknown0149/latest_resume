import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import { Upload, ArrowRight, Check, Zap, Layout, MousePointer2 } from 'lucide-react'
import Button from '../components/ui/Button'

const tearLines = [
  { top: '8%', rotate: -2 },
  { top: '18%', rotate: 3 },
  { top: '33%', rotate: -4 },
  { top: '48%', rotate: 2 },
  { top: '66%', rotate: -3 },
  { top: '78%', rotate: 1 },
]

const ashParticles = [
  { top: '12%', left: '18%', size: 6, opacity: 0.4 },
  { top: '22%', left: '72%', size: 4, opacity: 0.35 },
  { top: '40%', left: '32%', size: 5, opacity: 0.3 },
  { top: '58%', left: '64%', size: 7, opacity: 0.45 },
  { top: '70%', left: '22%', size: 4, opacity: 0.35 },
  { top: '82%', left: '56%', size: 5, opacity: 0.4 },
  { top: '30%', left: '48%', size: 3, opacity: 0.25 },
]

const messyLines = [65, 45, 30, 55, 38, 70]

const chadSentences = [
  'From singed scraps to signed offers.',
  'ResumeGenie writes evidence, not filler.',
  'Bots skim it. Designers craft it.',
  'Recruiters feel the story instantly.',
  'Every bullet now sells impact.',
  'Chaos edited into cinematic clarity.',
  'Hiring managers read, pause, reply.',
  'Proof stacks higher than buzzwords.'
]

const wordFragments = [
  { text: 'Unscored Skills', start: { x: 32, y: 70 }, end: { x: 80, y: 150 }, rotation: -10 },
  { text: '0% MATCH', start: { x: 280, y: 90 }, end: { x: 220, y: 150 }, rotation: 8 },
  { text: 'Buzzwords', start: { x: 60, y: 220 }, end: { x: 120, y: 240 }, rotation: -6 },
  { text: 'Typos', start: { x: 300, y: 220 }, end: { x: 250, y: 230 }, rotation: 10 },
  { text: 'Soft Skills Only', start: { x: 60, y: 330 }, end: { x: 150, y: 300 }, rotation: -15 },
  { text: 'Rejected', start: { x: 280, y: 340 }, end: { x: 220, y: 320 }, rotation: 14 },
  { text: 'ATS ERROR', start: { x: 160, y: 420 }, end: { x: 180, y: 360 }, rotation: -9 },
  { text: 'Outdated Fonts', start: { x: 300, y: 460 }, end: { x: 230, y: 400 }, rotation: 6 }
]

const scrollNarratives = [
  {
    badge: 'Phase 01',
    title: 'We interrogate the chaos',
    description: 'Heat maps, recruiter heuristics, and ATS parsers expose exactly why your resume keeps dying in inboxes.'
  },
  {
    badge: 'Phase 02',
    title: 'We choreograph every word',
    description: 'Fragments get magnetized into quantified impact statements. Nothing survives unless it proves value.'
  },
  {
    badge: 'Phase 03',
    title: 'We weaponize delivery',
    description: 'Personalized story arcs, skill clustering, and layout discipline so your resume looks hand-built for every role.'
  }
]

const LandingPageNew = () => {
  const navigate = useNavigate()
  const [isHovering, setIsHovering] = useState(false)
  const [currentSentence, setCurrentSentence] = useState(0)
  const heroRef = useRef(null)
  const { scrollYProgress: heroProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroScale = useTransform(heroProgress, [0, 1], [1, 0.92])
  const heroOpacity = useTransform(heroProgress, [0, 1], [1, 0.6])

  useEffect(() => {
    if (!isHovering) return
    const interval = setInterval(() => {
      setCurrentSentence((prev) => (prev + 1) % chadSentences.length)
    }, 2200)
    return () => clearInterval(interval)
  }, [isHovering])

  const burntClipPath = isHovering
    ? 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)'
    : 'polygon(6% 4%, 94% 0%, 99% 82%, 6% 100%, 0% 18%)'

  return (
    <div className="page-shell font-sans selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden">
      
      {/* Navigation (Minimal) */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-[var(--rg-surface)]/90 backdrop-blur-md border-b border-[var(--rg-border)] shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
        <div className="max-w-[1200px] mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-[var(--rg-accent)] rounded-lg flex items-center justify-center text-white shadow-sm">
              <Zap size={16} fill="currentColor" />
            </div>
            <span className="font-semibold tracking-tight text-lg text-[var(--rg-text-primary)]">ResumeAI</span>
          </div>
          <div className="flex gap-4">
            <button onClick={() => navigate('/login')} className="text-sm font-semibold text-[var(--rg-text-secondary)] hover:text-[var(--rg-text-primary)] transition-colors">
              Sign in
            </button>
            <button onClick={() => navigate('/register')} className="text-sm font-semibold bg-[var(--rg-accent)] text-white px-4 py-2 rounded-full shadow-sm hover:opacity-95 transition-colors">
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <motion.main
        ref={heroRef}
        style={{ scale: heroScale, opacity: heroOpacity }}
        className="relative overflow-hidden pt-32 pb-20 lg:pt-48 lg:pb-32 px-6"
      >
        <motion.div
          className="absolute inset-0 -z-10 pointer-events-none"
          animate={{ opacity: [0.35, 0.5, 0.35], scale: [1, 1.05, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            background: 'radial-gradient(circle at 20% 20%, rgba(59,130,246,0.15), transparent 55%), radial-gradient(circle at 80% 0%, rgba(236,72,153,0.12), transparent 60%), radial-gradient(circle at 50% 80%, rgba(16,185,129,0.12), transparent 50%)'
          }}
        />
        <div className="max-w-[1200px] mx-auto grid lg:grid-cols-12 gap-16 items-center">
          
          {/* Left Content - Typography Focused */}
          <div className="lg:col-span-5 flex flex-col justify-center z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-8"
            >
              <p className="uppercase tracking-[0.4em] text-xs text-gray-400">Resume revival studio</p>
              <h1 className="text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.05] text-black">
                When your resume<br />
                looks burnt to ash,<br />
                we forge a masterpiece.
              </h1>
              
              <p className="text-xl text-gray-600 leading-relaxed max-w-md font-semibold">
                <span className="font-bold text-gray-900">Singed corners, coffee stains, highlight chaos—</span>Recruiters can spot AI fluff instantly. Our human-trained models rebuild the document with discipline, storytelling, and recruiter psychology.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="xl" 
                  onClick={() => navigate('/register')}
                  className="relative overflow-hidden rounded-full px-12 h-16 text-lg font-semibold text-white bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 shadow-[0_25px_60px_-12px_rgba(15,23,42,0.55)] transition-all duration-500 hover:shadow-[0_30px_80px_-12px_rgba(15,23,42,0.65)] hover:translate-y-[-3px] before:absolute before:inset-0 before:bg-white/10 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500"
                >
                  <span className="font-bold tracking-tight">Rebuild my resume</span>
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button 
                  size="xl" 
                  variant="outline"
                  onClick={() => navigate('/login')}
                  className="rounded-full px-12 h-16 text-lg font-semibold backdrop-blur-sm bg-white/70 border border-gray-200 shadow-[0_20px_45px_-15px_rgba(15,23,42,0.45)] text-gray-800 hover:border-gray-900 hover:text-gray-900 hover:bg-white/90 transition-all duration-500"
                >
                  <span className="font-bold tracking-tight">Watch it happen</span>
                </Button>
              </div>

              <div className="flex flex-wrap gap-8 pt-6 text-sm text-gray-500">
                <div>
                  <p className="font-semibold text-gray-900">Before ✗</p>
                  <p>Burn marks • ATS fails • 0 callbacks</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">After ✓</p>
                  <p>Story arcs • Verified skills • 98% match</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Content - Burnt & Torn Resume */}
          <div className="lg:col-span-7 relative h-[650px] flex items-center justify-center">
            <motion.div
              className="absolute inset-0 -z-10"
              animate={{ opacity: isHovering ? 0.7 : 0.4 }}
              transition={{ duration: 1 }}
              style={{
                background: 'radial-gradient(circle at 60% 40%, rgba(15,23,42,0.15), transparent 55%)'
              }}
            />

            <motion.div
              className="relative w-[440px] h-[600px] cursor-pointer"
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
              initial={{ opacity: 0, scale: 0.92, rotateX: 15 }}
              animate={{ opacity: 1, scale: 1, rotateX: 0 }}
              transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="absolute -top-10 left-10 w-40 h-10 bg-amber-100/80 rounded-md rotate-[-6deg] shadow-md shadow-amber-800/20" />
              <div className="absolute -top-6 right-12 w-32 h-8 bg-gray-200/80 rounded-md rotate-[8deg] shadow shadow-gray-500/30" />

              <motion.div
                className="absolute inset-0 rounded-[32px] border border-amber-200/40 shadow-[0_30px_80px_rgba(15,15,15,0.35)] overflow-hidden"
                animate={{
                  clipPath: burntClipPath,
                  rotateZ: isHovering ? 0 : -2,
                  scale: isHovering ? 1.02 : 0.97,
                  filter: isHovering ? 'saturate(1)' : 'saturate(0.75)',
                }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                style={{ background: 'linear-gradient(135deg, #fff4e4, #f4d9b7)' }}
              >
                <div className="absolute inset-0" style={{ background: "url('https://www.transparenttextures.com/patterns/french-stucco.png')", opacity: 0.35 }} />

                <div className="absolute inset-0" style={{
                  background: 'radial-gradient(circle at 10% 10%, rgba(96,42,7,0.6) 0%, transparent 30%), radial-gradient(circle at 90% 8%, rgba(96,42,7,0.4) 0%, transparent 28%), radial-gradient(circle at 95% 95%, rgba(96,42,7,0.45) 0%, transparent 35%), radial-gradient(circle at 5% 85%, rgba(96,42,7,0.5) 0%, transparent 38%)'
                }} />

                {tearLines.map((line, idx) => (
                  <motion.div
                    key={`tear-${idx}`}
                    className="absolute left-6 right-6 h-[2px] bg-amber-900/40"
                    style={{ top: line.top, transformOrigin: 'center' }}
                    animate={{ rotate: isHovering ? 0 : line.rotate, opacity: isHovering ? 0 : 0.6 }}
                    transition={{ duration: 0.6, delay: idx * 0.05 }}
                  />
                ))}

                {ashParticles.map((ash, idx) => (
                  <motion.span
                    key={`ash-${idx}`}
                    className="absolute bg-amber-900 rounded-full"
                    style={{ top: ash.top, left: ash.left, width: ash.size, height: ash.size, opacity: ash.opacity }}
                    animate={{ opacity: isHovering ? ash.opacity * 0.3 : ash.opacity, scale: isHovering ? 0.8 : 1 }}
                  />
                ))}

                <div className="absolute inset-0 p-8 pt-24 flex flex-col z-10 text-gray-900">
                  <motion.div
                    className="absolute top-6 left-6 text-[38px] font-serif font-black text-amber-900/90 tracking-tight"
                    animate={{ scale: isHovering ? 0.95 : 1, letterSpacing: isHovering ? '-0.08em' : '-0.04em' }}
                  >
                    Dear Hiring Lead,
                  </motion.div>
                  <motion.p
                    className="absolute top-16 left-6 max-w-[260px] text-sm font-medium text-amber-900/80"
                    animate={{ opacity: isHovering ? 0.7 : 1, y: isHovering ? -2 : 0 }}
                  >
                    I rebuilt every section until the evidence spoke louder than the formatting. Here is the version worth your time.
                  </motion.p>
                  <div className="flex items-start justify-between">
                    <div>
                      <motion.p
                        className="uppercase text-xs tracking-[0.4em] text-amber-800/70 mb-2"
                        animate={{ letterSpacing: isHovering ? '0.6em' : '0.4em' }}
                        transition={{ duration: 0.6 }}
                      >
                        resume_final_v7.pdf
                      </motion.p>
                      <motion.h3
                        className="text-2xl font-semibold"
                        animate={{ color: isHovering ? '#111827' : '#7f1d1d' }}
                        transition={{ duration: 0.6 }}
                      >
                        Status: {isHovering ? 'Designer-Rebuilt' : 'Chaotic Draft'}
                      </motion.h3>
                    </div>
                    <motion.div
                      className="text-right"
                      animate={{
                        color: isHovering ? '#16a34a' : '#b91c1c',
                        y: isHovering ? 0 : -8
                      }}
                    >
                      <p className="text-3xl font-black">{isHovering ? '98%' : '03%'}</p>
                      <p className="text-xs tracking-wide">Match Score</p>
                    </motion.div>
                  </div>

                  <div className="relative flex-1 my-6">
                    <div className="absolute inset-0 pointer-events-none select-none">
                      {wordFragments.map((fragment, idx) => (
                        <motion.span
                          key={fragment.text}
                          className="absolute text-sm sm:text-lg font-semibold text-amber-900/80 tracking-[0.18em] drop-shadow-sm"
                          style={{
                            left: isHovering ? fragment.end.x : fragment.start.x,
                            top: isHovering ? fragment.end.y : fragment.start.y,
                          }}
                          animate={{
                            rotate: isHovering ? 0 : fragment.rotation,
                            color: isHovering ? '#0f172a' : '#7f1d1d',
                            letterSpacing: isHovering ? '0.22em' : '0.08em',
                            opacity: isHovering ? 0.2 : 0.65,
                            scale: isHovering ? 0.9 : 1,
                          }}
                          transition={{ duration: 0.7, delay: idx * 0.04, type: 'spring', stiffness: 140, damping: 18 }}
                        >
                          {fragment.text}
                        </motion.span>
                      ))}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-center px-6">
                      <AnimatePresence mode="wait">
                        {isHovering ? (
                          <motion.div
                            key={currentSentence}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.6 }}
                          >
                            <p className="text-xs sm:text-sm uppercase tracking-[0.4em] text-emerald-600/80 mb-4 font-semibold">ResumeGenie Verdict</p>
                            <motion.h4
                              initial={{ letterSpacing: '-0.04em' }}
                              animate={{ letterSpacing: '-0.08em' }}
                              className="text-3xl lg:text-4xl font-semibold leading-tight text-slate-900"
                            >
                              {chadSentences[currentSentence]}
                            </motion.h4>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="prompt"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            transition={{ duration: 0.6 }}
                          >
                            <p className="text-sm sm:text-base font-semibold text-red-700/90 tracking-[0.3em] mb-3 uppercase">Before Hover</p>
                            <p className="text-xl text-amber-900/90 font-semibold">Watch every messy word obey.</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {messyLines.map((width, idx) => (
                      <motion.div
                        key={idx}
                        className="h-3 rounded-full"
                        style={{ background: idx % 2 === 0 ? '#f97316' : '#fcd34d' }}
                        animate={{
                          width: isHovering ? '100%' : `${width}%`,
                          opacity: isHovering ? 0.25 : 0.8,
                          x: isHovering ? 0 : idx % 2 === 0 ? -10 : 16
                        }}
                        transition={{ duration: 0.5, delay: idx * 0.05 }}
                      />
                    ))}
                  </div>

                  <AnimatePresence mode="wait">
                    {isHovering ? (
                      <motion.div
                        key="after"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.6 }}
                        className="mt-8 rounded-2xl border border-emerald-200 bg-white/80 p-5 shadow-inner"
                      >
                        <p className="text-xs uppercase tracking-[0.4em] text-emerald-500 mb-4">After</p>
                        <ul className="space-y-2 text-sm text-gray-700">
                          <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Narrative-led achievements</li>
                          <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Skills grouped + verified</li>
                          <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> ATS scan ready</li>
                        </ul>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="before"
                        initial={{ opacity: 0, rotate: -2 }}
                        animate={{ opacity: 1, rotate: -2 }}
                        exit={{ opacity: 0, rotate: -6 }}
                        transition={{ duration: 0.5 }}
                        className="mt-8 rounded-2xl border border-red-200 bg-amber-100/70 p-5 shadow-inner shadow-amber-900/20"
                      >
                        <p className="text-xs uppercase tracking-[0.4em] text-red-500 mb-4">Before</p>
                        <ul className="space-y-2 text-sm text-red-700">
                          <li>✗ Burnt edges flagged by ATS</li>
                          <li>✗ Random bold text, zero structure</li>
                          <li>✗ Skills hidden under filler words</li>
                        </ul>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.div
                    className="mt-8 pt-6 border-t border-amber-200 text-sm flex items-center justify-between"
                    animate={{ color: isHovering ? '#065f46' : '#92400e' }}
                  >
                    <span>{isHovering ? 'Clean typography restored' : 'Paper is still burnt'}</span>
                    <span className="font-semibold">{isHovering ? 'Ready to send' : 'Needs rescue'}</span>
                  </motion.div>
                </div>

                <motion.div
                  className="absolute inset-0"
                  animate={{ opacity: isHovering ? 0.15 : 0.4 }}
                  style={{
                    background: 'radial-gradient(circle, rgba(0,0,0,0.55) 0%, transparent 60%)',
                    mixBlendMode: 'multiply'
                  }}
                />

                <motion.div
                  className="absolute inset-0 bg-gradient-to-b from-transparent via-white/10 to-transparent"
                  animate={{ y: isHovering ? '120%' : '-120%' }}
                  transition={{ duration: 1.8, repeat: isHovering ? Infinity : 0, ease: 'linear' }}
                />
              </motion.div>

              <motion.div
                className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-sm text-gray-500 flex items-center gap-2"
                animate={{ opacity: isHovering ? 0 : 1 }}
              >
                <MousePointer2 className="w-4 h-4" />
                Hover to resurrect
              </motion.div>
            </motion.div>
          </div>
        </div>
      </motion.main>

      {/* Scroll Storytelling Section */}
      <section className="py-32 px-6 bg-[#05070d] text-white overflow-hidden relative">
        <motion.div
          className="absolute inset-0 opacity-40"
          animate={{ backgroundPosition: ['0% 0%', '100% 100%'] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
          style={{
            backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(59,130,246,0.2), transparent 45%), radial-gradient(circle at 80% 0%, rgba(236,72,153,0.15), transparent 55%), radial-gradient(circle at 60% 80%, rgba(16,185,129,0.18), transparent 45%)'
          }}
        />
        <div className="max-w-[1200px] mx-auto relative z-10">
          <div className="lg:flex gap-16">
            <div className="lg:w-1/3 sticky top-28 space-y-6 mb-12 lg:mb-0">
              <p className="text-xs uppercase tracking-[0.4em] text-gray-400">Scroll Narrative</p>
              <h2 className="text-4xl lg:text-5xl font-semibold leading-tight">
                Every flick of your scroll<br />
                reveals how we rebuild belief.
              </h2>
              <p className="text-gray-400 text-lg">
                The landing page stays alive even when you leave the hero. Keep scrolling to watch the transformation blueprint unfold.
              </p>
            </div>
            <div className="lg:w-2/3 space-y-12">
              {scrollNarratives.map((step, idx) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -6, borderColor: 'rgba(255,255,255,0.25)' }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 0.6, delay: idx * 0.1 }}
                  className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur"
                >
                  <div className="text-xs uppercase tracking-[0.4em] text-emerald-300 mb-4">{step.badge}</div>
                  <h3 className="text-2xl font-semibold mb-3">{step.title}</h3>
                  <p className="text-gray-300 text-lg leading-relaxed">{step.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Bento Grid Features Section */}
      <section className="py-32 px-6 bg-white">
        <div className="max-w-[1200px] mx-auto">
          <div className="mb-20">
            <h2 className="text-4xl lg:text-5xl font-semibold tracking-tight mb-6 text-black">
              Designed for <br />
              <span className="text-gray-400">ambitious professionals.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-auto md:h-[600px]">
            {/* Large Card */}
            <div className="md:col-span-2 bg-[#F5F5F7] rounded-3xl p-10 relative overflow-hidden group hover:shadow-xl transition-shadow duration-500">
              <div className="relative z-10 max-w-md">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                  <Layout className="w-6 h-6 text-black" />
                </div>
                <h3 className="text-2xl font-semibold mb-4 text-black">Intelligent Formatting</h3>
                <p className="text-gray-500 text-lg leading-relaxed">
                  Our AI doesn't just check spelling. It restructures your entire career history to highlight impact, leadership, and results.
                </p>
              </div>
              <motion.div 
                className="absolute right-0 bottom-0 w-1/2 h-3/4 bg-white rounded-tl-3xl shadow-2xl border border-gray-100 p-6 translate-x-10 translate-y-10 group-hover:translate-x-5 group-hover:translate-y-5 transition-transform duration-500"
              >
                <div className="space-y-4 opacity-50 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="h-4 w-3/4 bg-gray-200 rounded-full" />
                  <div className="h-4 w-full bg-gray-200 rounded-full" />
                  <div className="h-4 w-5/6 bg-gray-200 rounded-full" />
                </div>
              </motion.div>
            </div>

            {/* Tall Card */}
            <div className="bg-black text-white rounded-3xl p-10 relative overflow-hidden group">
              <div className="relative z-10">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-semibold mb-4">Instant Analysis</h3>
                <p className="text-gray-400 text-lg leading-relaxed">
                  Get a comprehensive score and actionable feedback in under 60 seconds.
                </p>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-blue-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>

            {/* Wide Card */}
            <div className="md:col-span-3 bg-[#F5F5F7] rounded-3xl p-10 flex flex-col md:flex-row items-center justify-between gap-10 group hover:shadow-xl transition-shadow duration-500">
              <div className="max-w-xl">
                <h3 className="text-2xl font-semibold mb-4 text-black">ATS Optimization</h3>
                <p className="text-gray-500 text-lg leading-relaxed">
                  Beat the bots. We ensure your resume is perfectly readable by Applicant Tracking Systems used by 99% of Fortune 500 companies.
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="px-6 py-3 bg-white rounded-full shadow-sm text-sm font-medium text-green-600 flex items-center gap-2">
                  <Check size={16} /> Readable
                </div>
                <div className="px-6 py-3 bg-white rounded-full shadow-sm text-sm font-medium text-green-600 flex items-center gap-2">
                  <Check size={16} /> Keywords Matched
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-20 px-6">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white">
              <Zap size={16} fill="currentColor" />
            </div>
            <span className="font-semibold tracking-tight text-lg">ResumeAI</span>
          </div>
          <p className="text-gray-400 text-sm">
            © 2025 ResumeAI Inc. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}

export default LandingPageNew
