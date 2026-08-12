import { useState } from 'react'
import { IconX, IconCopy } from '@tabler/icons-react'
import { duplicateItinerary } from '../lib/itineraries'

export default function DuplicateModal({ source, onClose, onDuplicated }) {
  const [itineraryName, setItineraryName] = useState(`${source.itinerary_name} (copy)`)
  const [clientName, setClientName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const copy = await duplicateItinerary(source.id, { itineraryName, clientName })
      onDuplicated(copy)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-50 p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white rounded-[var(--radius-card)] overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-sage-200">
          <span className="font-display font-semibold">Duplicate itinerary</span>
          <button type="button" onClick={onClose} className="text-ink-600 hover:text-ink-900">
            <IconX size={18} />
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-3">
          <p className="text-sm text-ink-600">
            Copies every day, hotel, activity, and inclusion from{' '}
            <span className="font-medium text-ink-900">{source.itinerary_name}</span> into a new
            draft you can rename and edit for another client.
          </p>

          <div>
            <label className="text-xs text-ink-600 block mb-1">New itinerary name</label>
            <input
              type="text"
              required
              value={itineraryName}
              onChange={(e) => setItineraryName(e.target.value)}
              className="w-full rounded-full border border-sage-200 px-4 py-2 text-sm outline-none focus:border-forest-600"
            />
          </div>

          <div>
            <label className="text-xs text-ink-600 block mb-1">New client name</label>
            <input
              type="text"
              required
              placeholder="e.g. The Johnson Family"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full rounded-full border border-sage-200 px-4 py-2 text-sm outline-none focus:border-forest-600"
            />
          </div>

          {error && <p className="text-danger-600 text-sm">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-sage-200">
          <button type="button" onClick={onClose} className="rounded-full text-sm px-4 py-2 text-ink-600">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 rounded-full bg-forest-600 text-white text-sm px-4 py-2 disabled:opacity-50"
          >
            <IconCopy size={14} /> {saving ? 'Duplicating…' : 'Duplicate'}
          </button>
        </div>
      </form>
    </div>
  )
}
