import { useEffect, useState } from 'react'
import { IconX, IconCheck } from '@tabler/icons-react'
import { listClients, createClient, listItineraryClientNames } from '../lib/clientFiles'

// Lets the operator either pick an existing client (from the `clients` table or from
// names seen on past itineraries) or create a fresh one. Calls onSelect with either
// { id, full_name } for a saved client, or { id: null, full_name } for a free-typed
// name matched to a past itinerary but not yet saved as a client record.
export default function ClientPickerModal({ onClose, onSelect }) {
  const [search, setSearch] = useState('')
  const [clients, setClients] = useState([])
  const [pastNames, setPastNames] = useState([])
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPhone, setNewPhone] = useState('')

  useEffect(() => {
    listClients(search).then(setClients).catch((e) => setError(e.message))
    listItineraryClientNames(search).then(setPastNames).catch((e) => setError(e.message))
  }, [search])

  async function handleCreate() {
    if (!newName.trim()) return
    setCreating(true)
    setError('')
    try {
      const client = await createClient({ fullName: newName.trim(), email: newEmail.trim(), phone: newPhone.trim() })
      onSelect(client)
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  // Names seen on past itineraries but not already in the clients list (by name)
  const clientNamesLower = new Set(clients.map((c) => c.full_name.toLowerCase()))
  const unsavedPastNames = pastNames.filter((p) => !clientNamesLower.has((p.client_name ?? '').toLowerCase()))

  return (
    <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-50 p-6">
      <div className="w-full max-w-md bg-white rounded-[var(--radius-card)] overflow-hidden flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-sage-200">
          <span className="font-display font-semibold">Choose client</span>
          <button onClick={onClose} className="text-ink-600 hover:text-ink-900">
            <IconX size={18} />
          </button>
        </div>

        <div className="px-5 pt-4">
          <input
            type="text"
            placeholder="Search clients"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-full border border-sage-200 px-4 py-2 text-sm outline-none focus:border-forest-600"
          />
        </div>

        <div className="px-5 py-3 overflow-y-auto flex-1">
          {clients.length > 0 && (
            <>
              <p className="text-[11px] uppercase tracking-wide text-ink-400 mb-1.5 mt-1">Saved clients</p>
              <div className="flex flex-col gap-1 mb-3">
                {clients.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => onSelect(c)}
                    className="text-left text-sm rounded-lg px-3 py-2 hover:bg-sage-100 flex items-center justify-between"
                  >
                    <span>{c.full_name}</span>
                    {c.email && <span className="text-ink-400 text-xs">{c.email}</span>}
                  </button>
                ))}
              </div>
            </>
          )}

          {unsavedPastNames.length > 0 && (
            <>
              <p className="text-[11px] uppercase tracking-wide text-ink-400 mb-1.5">From past itineraries</p>
              <div className="flex flex-col gap-1 mb-3">
                {unsavedPastNames.map((p) => (
                  <button
                    key={p.client_name}
                    onClick={() => onSelect({ id: null, full_name: p.client_name, email: p.client_email })}
                    className="text-left text-sm rounded-lg px-3 py-2 hover:bg-sage-100"
                  >
                    {p.client_name}
                  </button>
                ))}
              </div>
            </>
          )}

          {clients.length === 0 && unsavedPastNames.length === 0 && (
            <p className="text-ink-400 text-sm py-2">No matches. Add a new client below.</p>
          )}
        </div>

        <div className="px-5 py-4 border-t border-sage-200 flex flex-col gap-2">
          <p className="text-[11px] uppercase tracking-wide text-ink-400">New client</p>
          <input
            type="text"
            placeholder="Full name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full rounded-full border border-sage-200 px-4 py-2 text-sm outline-none focus:border-forest-600"
          />
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="Email (optional)"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="flex-1 rounded-full border border-sage-200 px-4 py-2 text-sm outline-none focus:border-forest-600"
            />
            <input
              type="text"
              placeholder="Phone (optional)"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              className="flex-1 rounded-full border border-sage-200 px-4 py-2 text-sm outline-none focus:border-forest-600"
            />
          </div>
          {error && <p className="text-danger-600 text-sm">{error}</p>}
          <button
            onClick={handleCreate}
            disabled={creating || !newName.trim()}
            className="flex items-center justify-center gap-1.5 rounded-full bg-forest-600 text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
          >
            <IconCheck size={16} /> {creating ? 'Adding…' : 'Add new client'}
          </button>
        </div>
      </div>
    </div>
  )
}
