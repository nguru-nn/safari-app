import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconPlus, IconCopy, IconExternalLink, IconLink, IconTrash } from '@tabler/icons-react'
import { listItineraries, createItinerary, listPublishedTrips } from '../lib/itineraries'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import StatusBadge from '../components/StatusBadge'
import DuplicateModal from '../components/DuplicateModal'

const ADMIN_EMAIL = 'njooro@gmail.com'

export default function Dashboard() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [itineraries, setItineraries] = useState(null)
  const [publishedTrips, setPublishedTrips] = useState([])
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [duplicateSource, setDuplicateSource] = useState(null)
  const [copiedId, setCopiedId] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setIsAdmin(data?.user?.email === ADMIN_EMAIL)
    })
  }, [])

  function handleCopyLink(trip) {
    const url = `https://trips.africanroutesafaris.com/${trip.slug}.html`
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(trip.id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  useEffect(() => {
    refresh()
  }, [])

  async function refresh() {
    try {
      const [trips, published] = await Promise.all([
        listItineraries(),
        listPublishedTrips(),
      ])
      setItineraries(trips)
      setPublishedTrips(published)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleCreate() {
    setCreating(true)
    try {
      const trip = await createItinerary({
        itineraryName: 'Untitled safari',
        clientName: '',
        safariType: 'private',
        transportation: 'offroad_jeep',
      })
      navigate(`/builder/${trip.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(trip) {
    const label = trip.itinerary_name || 'Untitled safari'
    if (!confirm(`Permanently delete "${label}"?\n\nThis removes the trip and all its days, translations, inclusions, and pricing. This cannot be undone.`)) return
    setError('')
    try {
      const { error: delError } = await supabase.from('itineraries').delete().eq('id', trip.id)
      if (delError) throw delError
      await refresh()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="max-w-5xl mx-auto pt-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">Trips</h1>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="flex items-center gap-2 rounded-full bg-forest-600 text-white text-sm font-medium px-5 py-2.5 hover:bg-forest-700 disabled:opacity-60"
        >
          <IconPlus size={16} /> New itinerary
        </button>
      </div>

      {error && <p className="text-danger-600 text-sm mb-4">{error}</p>}

      {itineraries === null ? (
        <p className="text-ink-600 text-sm">Loading…</p>
      ) : itineraries.length === 0 ? (
        <div className="bg-white rounded-[var(--radius-card)] p-10 text-center text-ink-600">
          No itineraries yet. Create your first one to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {itineraries.map((trip) => (
            <div
              key={trip.id}
              role="button"
              tabIndex={0}
              onClick={() =>
                navigate(trip.status === 'draft' ? `/builder/${trip.id}` : `/review/${trip.id}`)
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') navigate(trip.status === 'draft' ? `/builder/${trip.id}` : `/review/${trip.id}`)
              }}
              className="text-left bg-white rounded-[var(--radius-card)] p-5 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3 gap-2">
                <h2 className="font-display font-semibold text-ink-900 leading-snug pr-2 flex-1">
                  {trip.itinerary_name || 'Untitled safari'}
                  {trip.language !== 'en' && (
                    <span className="text-ink-400 font-normal text-xs ml-1.5">({trip.language})</span>
                  )}
                </h2>
                <div className="flex items-center gap-1.5 shrink-0">
                  {isAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(trip)
                      }}
                      title="Delete trip"
                      className="text-ink-400 hover:text-danger-600 p-1"
                    >
                      <IconTrash size={15} />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setDuplicateSource(trip)
                    }}
                    title="Duplicate for another client"
                    className="text-ink-400 hover:text-forest-600 p-1"
                  >
                    <IconCopy size={15} />
                  </button>
                  <StatusBadge status={trip.status} />
                </div>
              </div>
              <p className="text-ink-600 text-sm">{trip.client_name || 'No client name yet'}</p>
            </div>
          ))}
        </div>
      )}

      {/* Latest Safari Trips — published itineraries with links */}
      {publishedTrips.length > 0 && (
        <div className="mt-10">
          <h2 className="font-display text-lg font-bold mb-4">Latest Safari Trips</h2>
          <div className="bg-white rounded-[var(--radius-card)] divide-y divide-sage-200">
            {publishedTrips.map((trip) => (
              <div key={trip.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="flex-1 min-w-0">
                  <p className="font-display font-medium text-ink-900 truncate">
                    {trip.itinerary_name}
                  </p>
                  <p className="text-ink-600 text-xs mt-0.5">
                    {trip.client_name || 'No client'} · Published{' '}
                    {new Date(trip.published_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                {trip.slug && (
                  <>
                    <button
                      onClick={() => handleCopyLink(trip)}
                      className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${
                        copiedId === trip.id
                          ? 'bg-forest-600/10 text-forest-600'
                          : 'bg-sage-100 text-ink-600 hover:bg-sage-200'
                      }`}
                    >
                      <IconLink size={13} /> {copiedId === trip.id ? 'Copied!' : 'Copy link'}
                    </button>
                    <a
                      href={`https://trips.africanroutesafaris.com/${trip.slug}.html`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-forest-600 font-medium px-3 py-1.5 rounded-full bg-forest-600/10 hover:bg-forest-600/20 whitespace-nowrap"
                    >
                      <IconExternalLink size={13} /> View page
                    </a>
                  </>
                )}
                <button
                  onClick={() => navigate(`/review/${trip.id}`)}
                  className="text-xs text-ink-600 hover:text-forest-600 font-medium px-2"
                >
                  Review
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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
