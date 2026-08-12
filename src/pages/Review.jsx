import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { IconLock, IconWorld, IconAlertTriangle, IconCopy } from '@tabler/icons-react'
import {
  getItinerary,
  listDays,
  listInclusionExclusions,
  listPricing,
  listTranslations,
  validateItinerary,
  publishItinerary,
  saveReviewNotes,
  createTranslation,
} from '../lib/itineraries'
import { useAuth } from '../contexts/AuthContext'
import { formatCurrency } from '../lib/currency'
import StatusBadge from '../components/StatusBadge'
import DayReviewRow from '../components/DayReviewRow'
import TranslateDropdown from '../components/TranslateDropdown'
import DuplicateModal from '../components/DuplicateModal'

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
  const [translating, setTranslating] = useState(false)
  const [duplicateSource, setDuplicateSource] = useState(null)

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

  const included = items.filter((i) => i.type === 'included')
  const excluded = items.filter((i) => i.type === 'excluded')
  const customCount = items.filter((i) => !i.is_default).length

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
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="font-display text-lg font-bold">{itinerary.itinerary_name}</h1>
              <StatusBadge status={itinerary.status} />
            </div>
            <p className="text-ink-600 text-sm">
              Client: {itinerary.client_name || '—'} ·{' '}
              {itinerary.safari_type === 'private' ? 'Private' : 'Shared'} ·{' '}
              {itinerary.transportation === 'van' ? 'Van' : 'Off-road jeep'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setDuplicateSource(itinerary)}
              className="flex items-center gap-1.5 rounded-full border border-sage-200 px-4 py-2 text-sm text-ink-900"
            >
              <IconCopy size={15} /> Duplicate
            </button>
            <TranslateDropdown onSelect={handleTranslate} disabled={translating} />
            {isSupervisor ? (
              <button
                onClick={handlePublish}
                disabled={issues.length > 0 || publishing || itinerary.status === 'published'}
                className="flex items-center gap-1.5 rounded-full bg-forest-600 text-white text-sm px-4 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {issues.length > 0 ? <IconLock size={15} /> : <IconWorld size={15} />}
                {itinerary.status === 'published' ? 'Published' : publishing ? 'Publishing…' : 'Publish'}
              </button>
            ) : null}
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
                <span className="flex-1 text-sm text-ink-600">{t.itinerary_name}</span>
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
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Days — all shown, uncompacted */}
      <div className="flex flex-col gap-2">
        <span className="text-xs text-ink-400 uppercase tracking-wide font-mono px-1">Days</span>
        {days.map((day) => (
          <DayReviewRow
            key={day.id}
            day={day}
            issuesForDay={dayIssuesById(day.id)}
            isExpanded={expandedDayId === day.id}
            onToggleExpand={() => setExpandedDayId(expandedDayId === day.id ? null : day.id)}
            onChanged={refresh}
          />
        ))}
      </div>

      {/* Inclusions / pricing summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-[var(--radius-card)] p-4">
          <span className="text-xs text-ink-400 uppercase tracking-wide font-mono">Inclusions / exclusions</span>
          <p className="text-sm mt-1.5">
            {included.length} included · {excluded.length} excluded · {customCount} custom item
            {customCount === 1 ? '' : 's'}
          </p>
        </div>
        <div className="bg-white rounded-[var(--radius-card)] p-4">
          <span className="text-xs text-ink-400 uppercase tracking-wide font-mono">Pricing</span>
          <p className="text-sm mt-1.5">
            {pricing.length === 0
              ? 'No pricing set yet'
              : pricing
                  .filter((p) => p.quantity > 0)
                  .map((p) => `${p.quantity}× ${tierLabel(p.tier)} @ ${formatCurrency(p.price, p.currency)}`)
                  .join(' · ') ||
                pricing.map((p) => `${tierLabel(p.tier)} ${formatCurrency(p.price, p.currency)}`).join(' · ')}
          </p>
          {pricing.some((p) => p.quantity > 0) && (
            <p className="text-sm font-medium mt-1">
              Total:{' '}
              {formatCurrency(
                pricing.reduce((sum, p) => sum + Number(p.price) * (p.quantity ?? 0), 0),
                pricing[0]?.currency
              )}
            </p>
          )}
        </div>
      </div>

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
    </div>
  )
}

function tierLabel(tier) {
  if (tier === 'adult') return 'Adult'
  if (tier === 'child_12plus') return 'Child 12+'
  if (tier === 'child_3_12') return 'Child 3–12'
  return tier
}
