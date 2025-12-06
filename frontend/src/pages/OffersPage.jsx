import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Gift, Handshake, Sparkles, CheckCircle2, ArrowUpRight, ShieldCheck } from 'lucide-react'
import Navbar from '../components/ui/Navbar'
import Footer from '../components/ui/Footer'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { applicationsAPI } from '../services/api'

const formatCurrency = (value, currency = 'INR') => {
  if (!value) return '—'
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value)
  } catch (error) {
    return `${value} ${currency}`
  }
}

const offerStatusClasses = {
  offer_extended: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  offer_accepted: 'bg-emerald-600 text-white border-emerald-600',
  offer_declined: 'bg-rose-50 text-rose-600 border-rose-100',
}

const offerStatusLabels = {
  offer_extended: 'Awaiting response',
  offer_accepted: 'Accepted',
  offer_declined: 'Declined',
}

const OffersPage = () => {
  const [offers, setOffers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedOffer, setSelectedOffer] = useState(null)
  const [decisionModal, setDecisionModal] = useState({ open: false, offer: null, action: 'accept' })
  const [decisionNote, setDecisionNote] = useState('')
  const [decisionLoading, setDecisionLoading] = useState(false)

  const fetchOffers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await applicationsAPI.getOffers()
      setOffers(response.offers || [])
    } catch (err) {
      console.error('Unable to load offers', err)
      setError('Unable to load offers right now. Please try again shortly.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOffers()
  }, [fetchOffers])

  const grouped = useMemo(() => ({
    active: offers.filter((offer) => offer.status === 'offer_extended'),
    accepted: offers.filter((offer) => offer.status === 'offer_accepted'),
    declined: offers.filter((offer) => offer.status === 'offer_declined'),
  }), [offers])

  const heroStats = useMemo(() => {
    const topOffer = [...offers].sort((a, b) => (b.offer?.salary || 0) - (a.offer?.salary || 0))[0]
    return [
      { id: 'active', label: 'Active offers', value: grouped.active.length, hint: 'Need a response', icon: <Gift className="w-5 h-5 text-emerald-500" /> },
      { id: 'accepted', label: 'Accepted', value: grouped.accepted.length, hint: 'Signed and sealed', icon: <Handshake className="w-5 h-5 text-slate-500" /> },
      { id: 'top', label: 'Top salary', value: topOffer ? formatCurrency(topOffer.offer?.salary, topOffer.offer?.currency) : '—', hint: 'Best package on table', icon: <Sparkles className="w-5 h-5 text-amber-500" /> },
    ]
  }, [grouped, offers])

  const openDecisionModal = (offer, action) => {
    setDecisionModal({ open: true, offer, action })
    setDecisionNote('')
  }

  const handleDecision = async () => {
    if (!decisionModal.offer) return
    setDecisionLoading(true)
    try {
      await applicationsAPI.respondToOffer(decisionModal.offer.id, decisionModal.action, decisionNote)
      setDecisionModal({ open: false, offer: null, action: 'accept' })
      setDecisionNote('')
      fetchOffers()
    } catch (err) {
      console.error('Failed to respond to offer', err)
      setError('Unable to update the offer. Please try again.')
    } finally {
      setDecisionLoading(false)
    }
  }

  return (
    <div className="page-shell">
      <Navbar />
      <main className="pt-24 pb-20 space-y-12">
        <section className="section-shell">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="card-base rounded-[32px] p-8"
          >
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="space-y-3 max-w-3xl">
                <p className="text-sm text-[var(--rg-text-secondary)]">Offer room</p>
                <h1 className="text-3xl font-semibold text-[var(--rg-text-primary)]">Compare every package with context</h1>
                <p className="text-[var(--rg-text-secondary)]">
                  Salary, benefits, start dates, and deadlines in one calm dashboard. Decide quickly or leave notes for negotiation.
                </p>
                {error && <p className="text-sm text-rose-600">{error}</p>}
              </div>
              <Button onClick={fetchOffers} variant="outline">
                <ArrowUpRight className="mr-2 h-4 w-4" /> Refresh
              </Button>
            </div>
          </motion.div>

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            {heroStats.map((stat) => (
              <div key={stat.id} className="card-base rounded-3xl p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--rg-text-secondary)]">{stat.label}</p>
                    <p className="text-3xl font-semibold text-[var(--rg-text-primary)]">{stat.value}</p>
                    <p className="text-sm text-[var(--rg-text-secondary)]">{stat.hint}</p>
                  </div>
                  <div className="rounded-2xl bg-[var(--rg-surface-alt)] p-3 text-[var(--rg-text-secondary)]">
                    {stat.icon}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="section-shell">
          <div className="card-base rounded-[32px]">
            {loading ? (
              <div className="py-16 text-center text-[var(--rg-text-secondary)]">Collecting offers…</div>
            ) : offers.length === 0 ? (
              <div className="py-16 text-center">
                <Gift className="mx-auto h-10 w-10 text-[var(--rg-text-secondary)]/40" />
                <p className="mt-4 text-lg font-semibold text-[var(--rg-text-primary)]">No offers yet</p>
                <p className="text-sm text-[var(--rg-text-secondary)]">When a recruiter sends an offer, it will land here instantly.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {grouped.active.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 px-6 pt-6">
                      <ShieldCheck className="h-5 w-5 text-emerald-600" />
                      <h2 className="text-xl font-semibold text-[var(--rg-text-primary)]">Active offers</h2>
                    </div>
                    <div className="divide-y divide-[var(--rg-border)]">
                      {grouped.active.map((application) => (
                        <article key={application.id} className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm font-medium text-[var(--rg-text-secondary)]">{application.job?.company || 'Company'}</p>
                              <h3 className="text-2xl font-semibold text-[var(--rg-text-primary)]">{application.job?.title}</h3>
                            </div>
                            <div className="flex flex-wrap gap-4 text-sm text-[var(--rg-text-secondary)]">
                              {application.job?.location && <span>{application.job.location}</span>}
                              <span>Joining {application.offer?.joiningDate ? new Date(application.offer.joiningDate).toLocaleDateString() : 'TBD'}</span>
                              {application.offer?.validUntil && <span>Respond by {new Date(application.offer.validUntil).toLocaleDateString()}</span>}
                            </div>
                            <span className={`chip ${offerStatusClasses[application.status] || ''}`}>
                              {offerStatusLabels[application.status] || application.status}
                            </span>
                          </div>
                          <div className="flex flex-col items-start gap-3 text-left sm:items-end sm:text-right">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--rg-text-secondary)]">Base salary</p>
                              <p className="text-3xl font-semibold text-emerald-600">{formatCurrency(application.offer?.salary, application.offer?.currency)}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" onClick={() => setSelectedOffer(application)}>
                                View package
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => openDecisionModal(application, 'accept')}>
                                Accept
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => openDecisionModal(application, 'decline')}>
                                Decline
                              </Button>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                )}

                {grouped.accepted.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 px-6">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      <h2 className="text-xl font-semibold text-[var(--rg-text-primary)]">Accepted</h2>
                    </div>
                    <div className="grid grid-cols-1 gap-4 px-6 pb-2 lg:grid-cols-2">
                      {grouped.accepted.map((application) => (
                        <div key={application.id} className="rounded-2xl border border-[var(--rg-border)] bg-[var(--rg-surface-alt)] p-5">
                          <p className="text-sm font-medium text-[var(--rg-text-secondary)]">{application.job?.company}</p>
                          <h3 className="text-xl font-semibold text-[var(--rg-text-primary)]">{application.job?.title}</h3>
                          <p className="mt-2 text-sm text-[var(--rg-text-secondary)]">Start {application.offer?.joiningDate ? new Date(application.offer.joiningDate).toLocaleDateString() : 'Pending'}</p>
                          <p className="text-sm text-[var(--rg-text-secondary)]">Package {formatCurrency(application.offer?.salary, application.offer?.currency)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {grouped.declined.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 px-6">
                      <Sparkles className="h-5 w-5 text-amber-500" />
                      <h2 className="text-xl font-semibold text-[var(--rg-text-primary)]">Previously declined</h2>
                    </div>
                    <div className="grid grid-cols-1 gap-4 px-6 pb-6 lg:grid-cols-2">
                      {grouped.declined.map((application) => (
                        <div key={application.id} className="rounded-2xl border border-[var(--rg-border)] bg-[var(--rg-surface-alt)] p-5">
                          <p className="text-sm font-medium text-[var(--rg-text-secondary)]">{application.job?.company}</p>
                          <h3 className="text-xl font-semibold text-[var(--rg-text-primary)]">{application.job?.title}</h3>
                          <p className="mt-2 text-sm text-[var(--rg-text-secondary)]">Reason: {application.offer?.declineReason || 'Not shared'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />

      <Modal
        isOpen={Boolean(selectedOffer)}
        onClose={() => setSelectedOffer(null)}
        title="Offer details"
        size="md"
      >
        {selectedOffer && (
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{selectedOffer.job?.company}</p>
              <h3 className="text-2xl font-semibold text-slate-900">{selectedOffer.job?.title}</h3>
              <p className="text-sm text-slate-500">{selectedOffer.job?.location}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Compensation</p>
              <p className="text-3xl font-semibold text-emerald-600">{formatCurrency(selectedOffer.offer?.salary, selectedOffer.offer?.currency)}</p>
              {Array.isArray(selectedOffer.offer?.benefits) && selectedOffer.offer?.benefits.length > 0 && (
                <ul className="mt-4 list-disc pl-5 text-sm text-slate-600 space-y-1">
                  {selectedOffer.offer.benefits.map((benefit) => (
                    <li key={benefit}>{benefit}</li>
                  ))}
                </ul>
              )}
            </div>
            {selectedOffer.offer?.responseNotes && (
              <p className="text-sm text-slate-500">Notes: {selectedOffer.offer.responseNotes}</p>
            )}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={decisionModal.open}
        onClose={() => setDecisionModal({ open: false, offer: null, action: 'accept' })}
        title={decisionModal.action === 'accept' ? 'Accept offer' : 'Decline offer'}
        size="sm"
      >
        <p className="text-sm text-slate-500">Share an optional note with the recruiter.</p>
        <textarea
          className="mt-4 w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          rows={4}
          placeholder="Note for recruiter"
          value={decisionNote}
          onChange={(event) => setDecisionNote(event.target.value)}
        />
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDecisionModal({ open: false, offer: null, action: 'accept' })}>
            Cancel
          </Button>
          <Button variant={decisionModal.action === 'accept' ? 'primary' : 'danger'} onClick={handleDecision} isLoading={decisionLoading}>
            {decisionModal.action === 'accept' ? 'Accept' : 'Decline'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}

export default OffersPage
