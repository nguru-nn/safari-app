import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { IconPlus, IconFileText, IconCopy, IconExternalLink, IconCheck } from '@tabler/icons-react'
import { listClientFiles, createClientFile } from '../lib/clientFiles'
import ClientPickerModal from '../components/ClientPickerModal'

const STATUS_STYLES = {
  draft: 'bg-sage-100 text-ink-600',
  confirmed: 'bg-amber-100 text-amber-800',
  published: 'bg-forest-600 text-white',
  completed: 'bg-forest-100 text-forest-700',
  archived: 'bg-sage-100 text-ink-400',
}

function formatDateRange(start, end) {
  if (!start || !end) return '—'
  const opts = { month: 'short', day: 'numeric' }
  return `${new Date(start).toLocaleDateString(undefined, opts)} – ${new Date(end).toLocaleDateString(undefined, opts)}`
}

function PublishedSection({ files }) {
  const [copiedId, setCopiedId] = useState(null)

  const published = files.filter((f) => f.status === 'published' && f.published_html_url)
  if (published.length === 0) return null

  function copy(text, id) {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1500)
  }

  return (
    <div className="mb-8">
      <h2 className="font-display text-sm font-semibold text-ink-600 uppercase tracking-wide mb-3">
        Published ({published.length})
      </h2>
      <div className="bg-white rounded-[var(--radius-card)] overflow-hidden">
        {published.map((file) => (
          <div
            key={file.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-sage-100 last:border-b-0"
          >
            <div className="min-w-0">
              <p className="font-medium text-ink-900">{file.client_name}</p>
              <a
                href={file.published_html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-forest-700 text-xs hover:underline break-all inline-flex items-center gap-1"
              >
                {file.published_html_url}
                <IconExternalLink size={12} className="shrink-0" />
              </a>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 bg-sage-100 rounded-full px-3 py-1.5">
                <span className="text-[10px] uppercase tracking-wide text-ink-400">Code</span>
                <span className="font-mono text-sm font-semibold text-ink-900">{file.publish_password_plain}</span>
              </div>
              <button
                onClick={() => copy(file.published_html_url, `url-${file.id}`)}
                title="Copy link"
                className="w-8 h-8 rounded-full flex items-center justify-center text-ink-600 hover:bg-sage-100"
              >
                {copiedId === `url-${file.id}` ? <IconCheck size={15} className="text-forest-600" /> : <IconCopy size={15} />}
              </button>
              <button
                onClick={() => copy(`${file.published_html_url} — code ${file.publish_password_plain}`, `both-${file.id}`)}
                className="text-xs rounded-full bg-forest-600 text-white px-3 py-1.5 whitespace-nowrap"
              >
                {copiedId === `both-${file.id}` ? 'Copied!' : 'Copy link + code'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ClientFiles() {
  const [files, setFiles] = useState(null)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [showPicker, setShowPicker] = useState(false)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    refresh()
  }, [search])

  async function refresh() {
    try {
      setFiles(await listClientFiles(search))
    } catch (err) {
      setError(err.message)
    }
  }

  // After picking/creating a client, immediately create a draft client file and
  // let ClientFileBuilder handle the rest — mirrors how Builder.jsx starts an itinerary.
  async function handleClientSelected(client) {
    setCreating(true)
    setError('')
    try {
      const file = await createClientFile({
        clientId: client.id || null,
        clientName: client.full_name,
        startDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10), // tomorrow, matches Builder.jsx default
        endDate: new Date(Date.now() + 86400000 * 8).toISOString().slice(0, 10),
        itinerarySummary: '',
        driverName: '',
      })
      window.location.href = `/client-files/${file.id}`
    } catch (err) {
      setError(err.message)
      setCreating(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto pt-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">Client Files</h1>
        <button
          onClick={() => setShowPicker(true)}
          disabled={creating}
          className="flex items-center gap-1.5 rounded-full bg-forest-600 text-white text-sm font-medium px-5 py-2.5 disabled:opacity-50"
        >
          <IconPlus size={16} /> New client file
        </button>
      </div>

      {error && <p className="text-danger-600 text-sm mb-4">{error}</p>}

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by client name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm rounded-full border border-sage-200 px-4 py-2.5 text-sm outline-none focus:border-forest-600"
        />
      </div>

      {files && <PublishedSection files={files} />}

      {files === null ? (
        <p className="text-ink-600 text-sm">Loading…</p>
      ) : files.length === 0 ? (
        <div className="bg-white rounded-[var(--radius-card)] p-10 text-center text-ink-600">
          No client files yet. Start one above.
        </div>
      ) : (
        <div className="bg-white rounded-[var(--radius-card)] overflow-hidden">
          {files.map((file) => (
            <Link
              key={file.id}
              to={`/client-files/${file.id}`}
              className="flex items-center justify-between px-5 py-4 border-b border-sage-100 last:border-b-0 hover:bg-sage-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-sage-100 flex items-center justify-center text-ink-500">
                  <IconFileText size={16} />
                </div>
                <div>
                  <p className="font-medium text-ink-900">{file.client_name}</p>
                  <p className="text-ink-400 text-xs">{formatDateRange(file.start_date, file.end_date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {file.driver_name && <span className="text-ink-400 text-xs hidden sm:inline">Driver: {file.driver_name}</span>}
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[file.status] ?? STATUS_STYLES.draft}`}>
                  {file.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showPicker && (
        <ClientPickerModal
          onClose={() => setShowPicker(false)}
          onSelect={(client) => {
            setShowPicker(false)
            handleClientSelected(client)
          }}
        />
      )}
    </div>
  )
}
