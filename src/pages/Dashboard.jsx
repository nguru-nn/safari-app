import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconPlus, IconCopy } from '@tabler/icons-react'
import { listItineraries, createItinerary } from '../lib/itineraries'
import StatusBadge from '../components/StatusBadge'
import DuplicateModal from '../components/DuplicateModal'

export default function Dashboard() {
  const navigate = useNavigate()
  const [itineraries, setItineraries] = useState(null)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [duplicateSource, setDuplicateSource] = useState(null)

  useEffect(() => {
    refresh()
  }, [])

  async function refresh() {
    try {
      setItineraries(await listItineraries())
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
