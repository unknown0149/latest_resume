import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Briefcase, MapPin, Sparkles, TrendingUp, BookOpen, Award, CheckCircle2 } from 'lucide-react';
import Navbar from '../components/ui/Navbar';
import Footer from '../components/ui/Footer';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import EnhancedProfileCard from '../components/dashboard/EnhancedProfileCard';
import SkillsPanel from '../components/dashboard/SkillsPanel';
import MCQVerificationModal from '../components/dashboard/MCQVerificationModal';
import { useResumeContext } from '../hooks/useResumeContext';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';

const USD_TO_INR_RATE = Number(import.meta.env?.VITE_USD_TO_INR_RATE) || 83;

const extractWatsonSummaryText = (watsonSummary) => {
  if (!watsonSummary) return '';

  if (typeof watsonSummary.executiveSummary === 'string') {
    return watsonSummary.executiveSummary;
  }

  const summaryBlock = watsonSummary.summary;
  if (!summaryBlock) {
    return '';
  }

  if (typeof summaryBlock === 'string') {
    return summaryBlock;
  }

  if (typeof summaryBlock.overallAssessment === 'string') {
    return summaryBlock.overallAssessment;
  }

  const concatenated = [
    summaryBlock.strengths?.join(', '),
    summaryBlock.areasToImprove?.join(', '),
    summaryBlock.careerAdvice
  ]
    .filter(Boolean)
    .join(' • ');

  return concatenated;
};

const formatInrValue = (usdValue) => {
  if (usdValue === undefined || usdValue === null || Number.isNaN(Number(usdValue))) {
    return '₹0';
  }

  const inrValue = Number(usdValue) * USD_TO_INR_RATE;

  if (inrValue >= 1e7) {
    return `₹${(inrValue / 1e7).toFixed(1)}Cr`;
  }

  if (inrValue >= 1e5) {
    return `₹${(inrValue / 1e5).toFixed(1)}L`;
  }

  return `₹${Math.round(inrValue).toLocaleString('en-IN')}`;
};

const normalizeImpactToInr = (entry) => {
  if (!entry) return '₹0';

  const absolute = entry.salaryBoost?.absoluteUSD;
  if (typeof absolute === 'number') {
    return formatInrValue(absolute);
  }
  if (absolute && typeof absolute === 'object') {
    const min = absolute.min ?? absolute.max;
    const max = absolute.max ?? absolute.min ?? min;
    if (min && max && min !== max) {
      return `${formatInrValue(min)} – ${formatInrValue(max)}`;
    }
    if (max) {
      return formatInrValue(max);
    }
  }

  if (typeof entry.impact === 'string') {
    return entry.impact.replace(/\$/g, '₹');
  }

  return '₹0';
};

const extractUsdRange = (absoluteUSD) => {
  if (!absoluteUSD) return { min: 0, max: 0 };
  if (typeof absoluteUSD === 'number') return { min: absoluteUSD, max: absoluteUSD };
  const min = absoluteUSD.min ?? absoluteUSD.max ?? 0;
  const max = absoluteUSD.max ?? absoluteUSD.min ?? 0;
  return { min, max: Math.max(min, max) };
};

const ordinal = (n) => {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return `${n}st`;
  if (j === 2 && k !== 12) return `${n}nd`;
  if (j === 3 && k !== 13) return `${n}rd`;
  return `${n}th`;
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const ProfilePage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { parsedResume, resumeId, skillGaps, predictedRoles, matchedJobs, salaryBoost, resources, watsonSummary } = useResumeContext();
  const [profileSnapshot, setProfileSnapshot] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [mcqModalOpen, setMcqModalOpen] = useState(false);
  const [resumeHistory, setResumeHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (!parsedResume) {
      navigate('/upload');
    }
  }, [isAuthenticated, parsedResume, navigate]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get('/user/resumes');
        setResumeHistory(res.data?.resumes || []);
      } catch (error) {
        console.error('Failed to load resume history', error);
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchHistory();
  }, [refreshToken]);

  const handleSkillVerify = (skill) => {
    const skillName = typeof skill === 'string' ? skill : skill?.skill || skill?.name;
    if (!skillName) {
      return;
    }
    setSelectedSkill(skillName);
    setMcqModalOpen(true);
  };

  const handleVerificationComplete = () => {
    setMcqModalOpen(false);
    setRefreshToken(Date.now());
  };

  const bestRole = useMemo(() => {
    if (Array.isArray(predictedRoles) && predictedRoles.length > 0) {
      return predictedRoles[0];
    }
    return predictedRoles?.primaryRole || null;
  }, [predictedRoles]);

  const verifiedSkillsData = useMemo(() => {
    const snapshotVerifications = profileSnapshot?.skillVerifications || profileSnapshot?.customSkills;

    if (snapshotVerifications?.length) {
      return snapshotVerifications
        .filter((entry) => entry?.verified)
        .map((entry) => ({
          skill: entry.skill || entry.name,
          proficiency: entry.score ?? entry.level ?? 0,
          verified: true,
          badge: entry.badge,
          score: entry.score ?? entry.level ?? 0
        }));
    }

    const fallbackSkills = (skillGaps?.skillsHave || []).filter((entry) => entry?.verified);
    return fallbackSkills.map((entry) => ({
      skill: entry.skill || entry.name,
      proficiency: entry.score ?? entry.level ?? 0,
      verified: true,
      badge: entry.badge,
      score: entry.score ?? entry.level ?? 0
    }));
  }, [profileSnapshot, skillGaps]);

  const skillsHaveData = verifiedSkillsData;

  const verifiedCount = verifiedSkillsData.length;

  const totalSkills = skillGaps?.skillsHave?.length || 0;
  const skillMatch = skillGaps?.skillGapSummary?.coreSkillMatch || 0;
  const topSalaryBoost = (() => {
    if (Array.isArray(salaryBoost) && salaryBoost.length) {
      const top = [...salaryBoost].sort((a, b) => {
        const aRange = extractUsdRange(a?.salaryBoost?.absoluteUSD);
        const bRange = extractUsdRange(b?.salaryBoost?.absoluteUSD);
        return (bRange.max || 0) - (aRange.max || 0);
      })[0];
      const range = extractUsdRange(top?.salaryBoost?.absoluteUSD);
      if (range.max || range.min) {
        return normalizeImpactToInr({ salaryBoost: { absoluteUSD: range } });
      }
      return normalizeImpactToInr(top);
    }
    return '₹0';
  })();
  const resourcePreview = (resources || []).slice(0, 2);
  const resumeSummary =
    parsedResume?.summary ||
    parsedResume?.professional_summary ||
    parsedResume?.bio ||
    extractWatsonSummaryText(watsonSummary);

  if (!parsedResume) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--rg-bg)] text-[var(--rg-text-primary)]">
      <Navbar />
      <div className="pt-24 pb-12">
        <div className="max-w-6xl mx-auto px-4 space-y-10">
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]"
          >
            <Card tone="strong" className="relative overflow-hidden">
              <div className="absolute inset-0 opacity-70 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.4),_transparent)]" />
              <div className="relative z-10 flex flex-col gap-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-[var(--rg-text-secondary)]">Profile Command Center</p>
                  <h1 className="mt-3 text-4xl font-semibold text-[var(--rg-text-primary)] leading-tight">
                    {parsedResume?.name || 'Your profile'}, perfectly packaged.
                  </h1>
                  <p className="mt-3 text-sm text-[var(--rg-text-secondary)] max-w-2xl">
                    Recruiters see verified skills, Watson-backed summaries, and salary signals in one glance. Keep everything crisp to unlock premium offers.
                  </p>
                  {resumeSummary && (
                    <div className="mt-4 rounded-2xl bg-[var(--rg-bg-muted)] border border-[var(--rg-border)] p-4 text-sm text-[var(--rg-text-primary)]">
                      {resumeSummary}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[var(--rg-text-secondary)] text-sm">
                  <span className="inline-flex items-center gap-2 rounded-full border border-[var(--rg-border)] px-3 py-1.5">
                    <Briefcase className="w-4 h-4 text-[var(--rg-accent)]" />
                    {parsedResume?.current_title || 'Role syncing'}
                  </span>
                  {parsedResume?.location && (
                    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--rg-border)] px-3 py-1.5">
                      <MapPin className="w-4 h-4 text-[var(--rg-accent)]" />
                      {parsedResume.location}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-2 rounded-full border border-[var(--rg-border)] px-3 py-1.5">
                    <Sparkles className="w-4 h-4 text-[var(--rg-accent)]" />
                    {parsedResume?.years_experience ? `${parsedResume.years_experience}+ yrs experience` : 'Experience syncing'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" onClick={() => navigate('/dashboard')} className="justify-center">
                    Back to dashboard
                  </Button>
                  <Button onClick={() => setRefreshToken(Date.now())} className="justify-center">
                    Refresh profile
                  </Button>
                </div>
              </div>
            </Card>

            <Card tone="light" className="h-full">
              <p className="text-xs uppercase tracking-[0.35em] text-[var(--rg-text-secondary)]">Live signals</p>
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--rg-text-secondary)]">Verified skills</p>
                    <p className="text-3xl font-semibold text-[var(--rg-text-primary)]">{verifiedCount}</p>
                  </div>
                  <ShieldCheck className="w-10 h-10 text-[var(--rg-accent)]" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--rg-text-secondary)]">Role match</p>
                    <p className="text-3xl font-semibold text-[var(--rg-text-primary)]">{bestRole?.matchPercentage || bestRole?.score || 72}%</p>
                  </div>
                  <Briefcase className="w-10 h-10 text-[var(--rg-accent)]" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--rg-text-secondary)]">Salary lift</p>
                    <p className="text-3xl font-semibold text-[var(--rg-text-primary)]">{topSalaryBoost}</p>
                  </div>
                  <TrendingUp className="w-10 h-10 text-[var(--rg-accent)]" />
                </div>
              </div>
            </Card>
          </motion.section>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {[{
              id: 'verified',
              label: 'Verified skills',
              value: verifiedCount,
              hint: `${totalSkills} total`,
              icon: <ShieldCheck className="w-4 h-4" />,
              accent: 'text-[var(--rg-accent)]'
            }, {
              id: 'matches',
              label: 'Live matches',
              value: matchedJobs?.length || 0,
              hint: 'jobs.csv aligned',
              icon: <Briefcase className="w-4 h-4" />,
              accent: 'text-[var(--rg-accent)]'
            }, {
              id: 'skillMatch',
              label: 'Skill match',
              value: `${skillMatch}%`,
              hint: 'core role coverage',
              icon: <Sparkles className="w-4 h-4" />,
              accent: 'text-[var(--rg-accent)]'
            }, {
              id: 'resources',
              label: 'Learning paths',
              value: resources?.length || 0,
              hint: 'curated boosts',
              icon: <BookOpen className="w-4 h-4" />,
              accent: 'text-[var(--rg-accent)]'
            }].map((stat) => (
              <Card key={stat.id} tone="light" className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-[var(--rg-text-secondary)]">{stat.label}</p>
                  <p className="mt-3 text-3xl font-semibold text-[var(--rg-text-primary)]">{stat.value}</p>
                  <p className="text-sm text-[var(--rg-text-secondary)]">{stat.hint}</p>
                </div>
                <div className={`w-10 h-10 rounded-2xl bg-[var(--rg-bg-muted)] flex items-center justify-center ${stat.accent}`}>
                  {stat.icon}
                </div>
              </Card>
            ))}
          </motion.div>

          <Card tone="light" className="border border-[var(--rg-border)] bg-[var(--rg-surface)]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[var(--rg-text-secondary)]">Resume history</p>
                <h3 className="text-xl font-semibold text-[var(--rg-text-primary)]">Everything you've uploaded</h3>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/upload')}>
                Upload new
              </Button>
            </div>

            {historyLoading && (
              <div className="space-y-3 text-sm text-[var(--rg-text-secondary)]">
                <div className="h-4 bg-[var(--rg-bg-muted)] rounded" />
                <div className="h-4 bg-[var(--rg-bg-muted)] rounded w-11/12" />
                <div className="h-4 bg-[var(--rg-bg-muted)] rounded w-9/12" />
              </div>
            )}

            {!historyLoading && resumeHistory.length === 0 && (
              <div className="flex items-center justify-between rounded-xl border border-dashed border-[var(--rg-border)] bg-[var(--rg-bg-muted)] p-4 text-sm text-[var(--rg-text-secondary)]">
                <div>
                  <p className="font-semibold text-[var(--rg-text-primary)]">No resume yet</p>
                  <p>Your upload history will appear here.</p>
                </div>
                <Button size="sm" onClick={() => navigate('/upload')}>Upload resume</Button>
              </div>
            )}

            {!historyLoading && resumeHistory.length > 0 && (
              <div className="space-y-3">
                {resumeHistory.map((entry, idx) => {
                  const chronological = resumeHistory.length - idx;
                  return (
                    <div
                      key={entry.id || entry.resumeId || idx}
                      className="rounded-xl border border-[var(--rg-border)] bg-[var(--rg-surface)] p-4 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-semibold text-[var(--rg-accent)] bg-[var(--rg-bg-muted)] px-3 py-1 rounded-full">
                            {ordinal(chronological)} upload
                          </span>
                          {entry.isActive && (
                            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                              Active
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-[var(--rg-text-secondary)]">{formatDate(entry.uploadedAt || entry.createdAt)}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--rg-text-primary)]">
                        <span className="font-semibold">{entry.filename || entry.name || entry.id}</span>
                        {entry.predictedRole && (
                          <span className="inline-flex items-center gap-2 text-xs text-[var(--rg-text-secondary)] bg-[var(--rg-bg-muted)] px-2.5 py-1 rounded-full border border-[var(--rg-border)]">
                            <Briefcase className="w-3.5 h-3.5 text-[var(--rg-accent)]" />
                            {entry.predictedRole?.name || entry.predictedRole}
                            {entry.matchScore && <span className="font-semibold text-[var(--rg-text-primary)]">{Math.round(entry.matchScore)}%</span>}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-2 text-xs text-[var(--rg-text-secondary)] bg-[var(--rg-bg-muted)] px-2.5 py-1 rounded-full border border-[var(--rg-border)]">
                          <Sparkles className="w-3.5 h-3.5 text-[var(--rg-accent)]" />
                          {entry.skillsCount || 0} skills
                        </span>
                        {entry.experienceYears !== undefined && (
                          <span className="inline-flex items-center gap-2 text-xs text-[var(--rg-text-secondary)] bg-[var(--rg-bg-muted)] px-2.5 py-1 rounded-full border border-[var(--rg-border)]">
                            {entry.experienceYears}+ yrs exp
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Verified skills spotlight */}
          {verifiedSkillsData.length > 0 && (
            <Card tone="light" className="border border-[var(--rg-border-strong)] bg-[var(--rg-surface)]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-[var(--rg-text-secondary)]">Verified skills</p>
                  <h3 className="text-xl font-semibold text-[var(--rg-text-primary)]">Badged & trusted</h3>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-[var(--rg-bg-muted)] px-3 py-1 text-xs font-semibold text-[var(--rg-text-primary)]">
                  <ShieldCheck className="w-4 h-4 text-[var(--rg-accent)]" />
                  {verifiedCount} active badges
                </span>
              </div>
              <div className="flex flex-wrap gap-3">
                {verifiedSkillsData.slice(0, 12).map((skill, idx) => (
                  <span
                    key={`${skill.skill}-${idx}`}
                    className="inline-flex items-center gap-2 rounded-2xl border border-[var(--rg-border)] bg-[var(--rg-surface)] px-3 py-2 text-sm text-[var(--rg-text-primary)] shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="font-semibold">{skill.skill}</span>
                    <span className="text-[var(--rg-text-secondary)]">{Math.round(skill.proficiency || skill.score || 0)}%</span>
                    {skill.badge?.label && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                        <Award className="w-3 h-3" />
                        {skill.badge.label}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-[1.35fr_0.85fr] items-start">
            <EnhancedProfileCard
              resumeId={resumeId || parsedResume?.resumeId}
              analysis={{
                bestRole: bestRole || { name: 'Analyzing...', score: 75 },
                tagline: parsedResume?.current_title || 'Professional',
                professionalSummary: resumeSummary || parsedResume?.bio || ''
              }}
              parsedResume={{
                name: parsedResume?.name,
                skills: parsedResume?.skills || [],
                years_experience: parsedResume?.years_experience || 0,
                experience: parsedResume?.experience || [],
                education: parsedResume?.education || [],
                contact: {
                  email: parsedResume?.email,
                  phone: parsedResume?.phone,
                  location: parsedResume?.location,
                  linkedin: parsedResume?.social_links?.linkedin,
                  github: parsedResume?.social_links?.github
                }
              }}
              onProfileLoaded={setProfileSnapshot}
              refreshToken={refreshToken}
            />

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1 }}
              className="space-y-6"
            >
              <SkillsPanel
                skillsHave={skillsHaveData}
                skillsMissing={skillGaps?.skillsMissing || []}
                onVerifyClick={handleSkillVerify}
              />

              {resourcePreview.length > 0 && (
                <Card tone="light">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-slate-400">In-flight resources</p>
                      <h3 className="text-lg font-semibold text-slate-900">Keep your momentum</h3>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => navigate('/dashboard')}>
                      View all
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {resourcePreview.map((resource, idx) => (
                      <div key={resource.id || `${resource.title}-${idx}`} className="rounded-2xl border border-[var(--rg-border)] p-4 bg-[var(--rg-surface)]">
                        <p className="text-sm font-semibold text-[var(--rg-text-primary)]">{resource.title}</p>
                        <p className="text-xs text-[var(--rg-text-secondary)]">{resource.provider}</p>
                        <p className="mt-2 text-sm text-[var(--rg-text-secondary)] flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-[var(--rg-accent)]" />
                          {resource.skills?.slice(0, 2).join(', ') || 'Curated learning path'}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      <MCQVerificationModal
        isOpen={mcqModalOpen}
        onClose={() => setMcqModalOpen(false)}
        skill={selectedSkill}
        resumeId={resumeId || parsedResume?.resumeId}
        onVerificationComplete={handleVerificationComplete}
      />

      <Footer />
    </div>
  );
};

export default ProfilePage;
