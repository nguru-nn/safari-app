import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { IconLock, IconWorld, IconAlertTriangle, IconCopy, IconRefresh, IconTrash, IconMail, IconCheck, IconCamera } from '@tabler/icons-react'
import {
  getItinerary,
  updateItinerary,
  listDays,
  listInclusionExclusions,
  listPricing,
  listTranslations,
  validateItinerary,
  publishItinerary,
  republishItinerary,
  deleteTranslation,
  saveReviewNotes,
  createTranslation,
} from '../lib/itineraries'
import { uploadImage } from '../lib/storage'
import { supabase, supabaseUrl } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import StatusBadge from '../components/StatusBadge'
import DayReviewRow from '../components/DayReviewRow'
import TranslateDropdown from '../components/TranslateDropdown'
import DuplicateModal from '../components/DuplicateModal'
import InclusionsExclusions from '../components/InclusionsExclusions'
import PricingSection from '../components/PricingSection'

export default function Review() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile, isSupervisor } = useAuth()

  const [itinerary, setItinerary] = useState(null)
  const [days, setDays] = useState([])
  const [items, setItems] = useState([])
  const [pricing, setPricing] = useState([])
  const [translations, setTranslations] = useState([])
  const [expandedDayId, setExpandedDayId] = useState(null)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [republishing, setRepublishing] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [duplicateSource, setDuplicateSource] = useState(null)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailTo, setEmailTo] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [uploadingHero, setUploadingHero] = useState(false)

  async function saveField(field, value) {
    try {
      await updateItinerary(id, { [field]: value })
      await refresh()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleHeroUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingHero(true)
    try {
      const url = await uploadImage('hero-images', file)
      await updateItinerary(id, { hero_image_url: url })
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setUploadingHero(false)
    }
  }

  const refresh = useCallback(async () => {
    try {
      const [trip, dayList, itemList, priceList, translationList] = await Promise.all([
        getItinerary(id),
        listDays(id),
        listInclusionExclusions(id),
        listPricing(id),
        listTranslations(id),
      ])
      setItinerary(trip)
      setDays(dayList)
      setItems(itemList)
      setPricing(priceList)
      setTranslations(translationList)
      setNotes(trip.review_notes ?? '')
    } catch (err) {
      setError(err.message)
    }
  }, [id])

  useEffect(() => {
    refresh()
  }, [refresh])

  if (!itinerary) {
    return <p className="text-ink-600 text-sm pt-6">{error || 'Loading…'}</p>
  }

  const issues = validateItinerary(itinerary, days, pricing)
  const tripIssues = issues.filter((i) => i.scope === 'trip')
  const dayIssuesById = (dayId) => issues.filter((i) => i.scope === 'day' && i.dayId === dayId)

  async function handlePublish() {
    if (issues.length > 0 || !isSupervisor) return
    if (!confirm(`Publish "${itinerary.itinerary_name}"? This makes it visible to the public.`)) return
    setPublishing(true)
    setError('')
    try {
      await publishItinerary(id, profile.id)
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setPublishing(false)
    }
  }

  async function handleRepublish() {
    if (!isSupervisor) return
    if (!confirm(`Republish "${itinerary.itinerary_name}"? This will regenerate the public page with the latest content. The URL stays the same.`)) return
    setRepublishing(true)
    setError('')
    try {
      await republishItinerary(id, profile.id)
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setRepublishing(false)
    }
  }

  async function handleDeleteTranslation(translationId, language) {
    if (!confirm(`Delete the ${language} translation? This cannot be undone.`)) return
    setError('')
    try {
      await deleteTranslation(translationId)
      await refresh()
    } catch (err) {
      setError(err.message)
    }
  }

  function openEmailModal() {
    setEmailTo(itinerary.client_email || '')
    setSent(false)
    setShowEmailModal(true)
  }

  async function handleSendEmail() {
    if (!emailTo.trim()) return
    setSending(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${supabaseUrl}/functions/v1/send-itinerary-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            itinerary_id: id,
            recipient_email: emailTo.trim(),
          }),
        }
      )
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Failed to send email')
      setSent(true)
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  async function handleNotesBlur() {
    try {
      await saveReviewNotes(id, notes)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleTranslate(languageCode) {
    setTranslating(true)
    setError('')
    try {
      const translated = await createTranslation(id, languageCode)
      navigate(`/translate/${translated.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setTranslating(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto pt-4 flex flex-col gap-4 pb-16">
      {error && <p className="text-danger-600 text-sm">{error}</p>}

      {/* Header / actions */}
      <div className="bg-white rounded-[var(--radius-card)] p-5">
        {/* Hero image preview + upload */}
        <div className="relative rounded-xl overflow-hidden h-32 bg-sage-200 mb-4">
          {itinerary.hero_image_url ? (
            <img src={itinerary.hero_image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-ink-400 text-sm">No hero image</div>
          )}
          <label className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-white/90 backdrop-blur rounded-full px-3 py-1.5 text-xs font-medium text-forest-600 cursor-pointer hover:bg-white shadow">
            <IconCamera size={14} /> {uploadingHero ? 'Uploading…' : 'Change hero'}
            <input type="file" accept="image/*" className="hidden" onChange={handleHeroUpload} disabled={uploadingHero} />
          </label>
        </div>

        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="w-full">
            {/* Title row — full width */}
            <div className="flex items-center gap-2 mb-3">
              <input
                defaultValue={itinerary.itinerary_name}
                onBlur={async (e) => {
                  const val = e.target.value.trim()
                  if (val && val !== itinerary.itinerary_name) await saveField('itinerary_name', val)
                }}
                className="font-display text-lg font-bold outline-none bg-transparent border-b border-transparent hover:border-sage-200 focus:border-forest-600 min-w-0 flex-1"
              />
              <StatusBadge status={itinerary.status} />
            </div>

            {/* Action buttons row */}
            <div className="flex items-center gap-2 flex-wrap mb-3 pb-3 border-b border-sage-200">
              <button
                onClick={() => setDuplicateSource(itinerary)}
                className="flex items-center gap-1.5 rounded-full border border-sage-200 px-4 py-2 text-sm text-ink-900"
              >
                <IconCopy size={15} /> Duplicate
              </button>
              <TranslateDropdown onSelect={handleTranslate} disabled={translating} />
              {isSupervisor ? (
                <>
                  {itinerary.status === 'published' && (
                    <>
                      <button
                        onClick={openEmailModal}
                        className="flex items-center gap-1.5 rounded-full border border-forest-600 text-forest-600 text-sm px-4 py-2"
                      >
                        <IconMail size={15} /> Send to client
                      </button>
                      <button
                        onClick={handleRepublish}
                        disabled={republishing}
                        className="flex items-center gap-1.5 rounded-full border border-forest-600 text-forest-600 text-sm px-4 py-2 disabled:opacity-40"
                      >
                        <IconRefresh size={15} />
                        {republishing ? 'Republishing…' : 'Republish'}
                      </button>
                    </>
                  )}
                  <button
                    onClick={handlePublish}
                    disabled={issues.length > 0 || publishing || itinerary.status === 'published'}
                    className="flex items-center gap-1.5 rounded-full bg-forest-600 text-white text-sm px-4 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {issues.length > 0 ? <IconLock size={15} /> : <IconWorld size={15} />}
                    {itinerary.status === 'published' ? 'Published' : publishing ? 'Publishing…' : 'Publish'}
                  </button>
                </>
              ) : null}
            </div>

            {/* Editable fields row */}
            <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2">
              <label className="flex items-center gap-1.5 text-sm text-ink-600">
                Client:
                <input
                  defaultValue={itinerary.client_name || ''}
                  placeholder="Client name"
                  onBlur={(e) => {
                    const val = e.target.value.trim()
                    if (val !== (itinerary.client_name || '')) saveField('client_name', val)
                  }}
                  className="outline-none bg-transparent border-b border-transparent hover:border-sage-200 focus:border-forest-600 w-36 text-ink-900"
                />
              </label>
              <label className="flex items-center gap-1.5 text-sm text-ink-600">
                Type:
                <select
                  value={itinerary.safari_type || 'private'}
                  onChange={(e) => saveField('safari_type', e.target.value)}
                  className="outline-none bg-transparent border-b border-transparent hover:border-sage-200 focus:border-forest-600 text-ink-900 cursor-pointer"
                >
                  <option value="private">Private</option>
                  <option value="shared">Shared</option>
                </select>
              </label>
              <label className="flex items-center gap-1.5 text-sm text-ink-600">
                Transport:
                <select
                  value={itinerary.transportation || 'offroad_jeep'}
                  onChange={(e) => saveField('transportation', e.target.value)}
                  className="outline-none bg-transparent border-b border-transparent hover:border-sage-200 focus:border-forest-600 text-ink-900 cursor-pointer"
                >
                  <option value="offroad_jeep">Off-road jeep</option>
                  <option value="van">Van</option>
                </select>
              </label>
              <label className="flex items-center gap-1.5 text-sm text-ink-600">
                Template:
                <select
                  value={itinerary.template || 'safari_kenia'}
                  onChange={(e) => saveField('template', e.target.value)}
                  className="outline-none bg-transparent border-b border-transparent hover:border-sage-200 focus:border-forest-600 text-ink-900 cursor-pointer"
                >
                  <option value="safari_kenia">Safari Kenia</option>
                  <option value="african_routes">African Routes</option>
                </select>
              </label>
              <label className="flex items-center gap-1.5 text-sm text-ink-600">
                Dates:
                <input
                  type="date"
                  defaultValue={itinerary.start_date || ''}
                  onBlur={(e) => {
                    const val = e.target.value
                    if (val !== (itinerary.start_date || '')) saveField('start_date', val)
                  }}
                  className="outline-none bg-transparent border-b border-transparent hover:border-sage-200 focus:border-forest-600 text-ink-900"
                />
                <span className="text-ink-400">–</span>
                <input
                  type="date"
                  defaultValue={itinerary.end_date || ''}
                  onBlur={(e) => {
                    const val = e.target.value
                    if (val !== (itinerary.end_date || '')) saveField('end_date', val)
                  }}
                  className="outline-none bg-transparent border-b border-transparent hover:border-sage-200 focus:border-forest-600 text-ink-900"
                />
              </label>
            </div>

            {/* Slug / URL editor */}
            {itinerary.slug && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-ink-400">
                <span>URL:</span>
                <input
                  defaultValue={itinerary.slug}
                  onBlur={async (e) => {
                    const val = e.target.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-')
                    if (val && val !== itinerary.slug) await saveField('slug', val)
                  }}
                  className="outline-none bg-transparent border-b border-transparent hover:border-sage-200 focus:border-forest-600 text-ink-600 flex-1 font-mono"
                />
                <span>.html</span>
              </div>
            )}

            {(itinerary.last_edited_by_name || itinerary.reviewed_by_name) && (
              <p className="text-ink-400 text-xs mt-2">
                {itinerary.last_edited_by_name && `Edited by ${itinerary.last_edited_by_name}`}
                {itinerary.last_edited_by_name && itinerary.reviewed_by_name && ' · '}
                {itinerary.reviewed_by_name && `Approved by ${itinerary.reviewed_by_name}`}
              </p>
            )}
          </div>
        </div>

        {issues.length > 0 && itinerary.status !== 'published' && (
          <div className="mt-3 pt-3 border-t border-sage-200 flex items-center gap-1.5 text-sm text-danger-600">
            <IconAlertTriangle size={14} />
            {issues.length} issue{issues.length === 1 ? '' : 's'} must be resolved before this trip can be
            published
          </div>
        )}
      </div>

      {/* Translations of this trip — hidden from the main Dashboard, so this is the only place to reach them */}
      {translations.length > 0 && (
        <div className="bg-white rounded-[var(--radius-card)] p-4">
          <span className="text-xs text-ink-400 uppercase tracking-wide font-mono">Translations</span>
          <div className="flex flex-col gap-2 mt-2">
            {translations.map((t) => (
              <div key={t.id} className="flex items-center gap-3 bg-sage-50 rounded-xl px-4 py-2.5">
                <span className="text-sm font-medium w-16 uppercase">{t.language}</span>
                <span className="flex-1 text-sm text-ink-600">
                  {t.itinerary_name}
                  {t.translated_by_name && (
                    <span className="text-ink-400 text-xs ml-2">· Translated by {t.translated_by_name}</span>
                  )}
                </span>
                <StatusBadge status={t.status} />
                <button
                  onClick={() => navigate(`/translate/${t.id}`)}
                  className="text-xs text-forest-600 font-medium px-2"
                >
                  Open
                </button>
                <button
                  onClick={() => setDuplicateSource(t)}
                  title={`Duplicate the ${t.language} version`}
                  className="text-ink-400 hover:text-forest-600 p-1"
                >
                  <IconCopy size={14} />
                </button>
                <button
                  onClick={() => handleDeleteTranslation(t.id, t.language)}
                  title={`Delete the ${t.language} translation`}
                  className="text-ink-400 hover:text-danger-600 p-1"
                >
                  <IconTrash size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Days — all shown, uncompacted */}
      <div className="flex flex-col gap-2">
        <span className="text-xs text-ink-400 uppercase tracking-wide font-mono px-1">Days</span>
        {days.map((day, index) => (
          <DayReviewRow
            key={day.id}
            day={day}
            issuesForDay={dayIssuesById(day.id)}
            isExpanded={expandedDayId === day.id}
            onToggleExpand={() => setExpandedDayId(expandedDayId === day.id ? null : day.id)}
            onChanged={refresh}
            isLastDay={index === days.length - 1}
          />
        ))}
      </div>

      {/* Inclusions / exclusions — fully editable */}
      <InclusionsExclusions itineraryId={id} items={items} onChanged={refresh} />

      {/* Pricing — fully editable */}
      <PricingSection itineraryId={id} pricing={pricing} onChanged={refresh} />

      {/* Review notes — auto-summarised issues + free text */}
      <div className="bg-white rounded-[var(--radius-card)] p-5">
        <span className="font-display font-medium">Review notes</span>

        {(tripIssues.length > 0 || issues.some((i) => i.scope === 'day')) && (
          <div className="flex flex-col gap-1.5 my-3">
            {tripIssues.map((issue, i) => (
              <div key={`trip-${i}`} className="flex items-center gap-2 text-sm text-warn-600">
                <IconAlertTriangle size={14} /> {issue.message}
              </div>
            ))}
            {issues
              .filter((i) => i.scope === 'day')
              .map((issue, i) => (
                <div key={`day-${i}`} className="flex items-center gap-2 text-sm text-warn-600">
                  <IconAlertTriangle size={14} /> Day {issue.dayNumber} — {issue.message}
                </div>
              ))}
          </div>
        )}

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleNotesBlur}
          placeholder="Add a note for the operator (not shown to client)"
          className="w-full min-h-[70px] rounded-xl bg-sage-50 px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-forest-600 mt-2"
        />
      </div>

      {duplicateSource && (
        <DuplicateModal
          source={duplicateSource}
          onClose={() => setDuplicateSource(null)}
          onDuplicated={(copy) => {
            setDuplicateSource(null)
            navigate(`/builder/${copy.id}`)
          }}
        />
      )}

      {/* Email send modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowEmailModal(false)}>
          <div className="bg-white rounded-[var(--radius-card)] p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-bold text-lg mb-1">Send itinerary to client</h3>
            <p className="text-ink-600 text-sm mb-4">
              A summary email with a link to the full itinerary will be sent. A copy goes to reservations@ for records.
            </p>
            <label className="text-xs text-ink-600 block mb-1.5">Recipient email</label>
            <input
              type="email"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              placeholder="client@example.com"
              className="w-full rounded-lg border border-sage-200 px-3 py-2.5 text-sm outline-none focus:border-forest-600 mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowEmailModal(false)}
                className="rounded-full px-4 py-2 text-sm text-ink-600"
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmail}
                disabled={sending || !emailTo.trim() || sent}
                className={`flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                  sent
                    ? 'bg-forest-600/10 text-forest-600'
                    : 'bg-forest-600 text-white hover:bg-forest-700'
                } disabled:opacity-50`}
              >
                {sent ? (
                  <><IconCheck size={15} /> Sent!</>
                ) : (
                  <><IconMail size={15} /> {sending ? 'Sending…' : 'Send email'}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
