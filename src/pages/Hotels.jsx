import { useEffect, useState, useRef } from 'react'
import { IconPlus, IconTrash, IconUpload, IconPhoto, IconLoader2 } from '@tabler/icons-react'
import { listHotels, createHotel, addHotelImage, deleteHotel, deleteHotelImage } from '../lib/itineraries'
import { uploadImage } from '../lib/storage'

export default function Hotels() {
  const [hotels, setHotels] = useState(null)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({}) // { [hotelId]: { done: number, total: number } }

  useEffect(() => {
    refresh()
  }, [search])

  async function refresh() {
    try {
      setHotels(await listHotels(search))
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return
    setCreating(true)
    setError('')
    try {
      await createHotel(newName.trim(), '')
      setNewName('')
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(hotel) {
    if (!confirm(`Delete "${hotel.name}" from the library? Trips that already used it keep their saved content.`))
      return
    try {
      await deleteHotel(hotel.id)
      await refresh()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleUploadImages(hotelId, files) {
    if (!files.length) return
    setError('')
    const total = files.length
    setUploadProgress((p) => ({ ...p, [hotelId]: { done: 0, total } }))

    const hotel = hotels.find((h) => h.id === hotelId)
    let startOrder = hotel?.hotel_images?.length ?? 0

    for (let i = 0; i < files.length; i++) {
      try {
        const url = await uploadImage('hotel-images', files[i])
        await addHotelImage(hotelId, url, startOrder + i)
        setUploadProgress((p) => ({ ...p, [hotelId]: { done: i + 1, total } }))
      } catch (err) {
        setError(`Failed to upload ${files[i].name}: ${err.message}`)
      }
    }

    setUploadProgress((p) => {
      const next = { ...p }
      delete next[hotelId]
      return next
    })
    await refresh()
  }

  async function handleDeleteImage(imgId) {
    if (!confirm('Remove this image from the library?')) return
    try {
      await deleteHotelImage(imgId)
      await refresh()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="max-w-5xl mx-auto pt-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">Hotels</h1>
      </div>

      {error && <p className="text-danger-600 text-sm mb-4">{error}</p>}

      <div className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Search hotels…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-full border border-sage-200 px-4 py-2.5 text-sm outline-none focus:border-forest-600"
        />
        <input
          type="text"
          placeholder="New hotel name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          className="w-56 rounded-full border border-sage-200 px-4 py-2.5 text-sm outline-none focus:border-forest-600"
        />
        <button
          onClick={handleCreate}
          disabled={creating || !newName.trim()}
          className="flex items-center gap-1.5 rounded-full bg-forest-600 text-white text-sm font-medium px-5 py-2.5 disabled:opacity-50"
        >
          <IconPlus size={16} /> Add hotel
        </button>
      </div>

      {hotels === null ? (
        <p className="text-ink-600 text-sm">Loading…</p>
      ) : hotels.length === 0 ? (
        <div className="bg-white rounded-[var(--radius-card)] p-10 text-center text-ink-600">
          No hotels found. Add your first hotel above.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {hotels.map((hotel) => {
            const images = (hotel.hotel_images ?? []).sort((a, b) => a.sort_order - b.sort_order)
            const coverImage = images[0]
            const progress = uploadProgress[hotel.id]

            return (
              <div
                key={hotel.id}
                className="bg-white rounded-[var(--radius-card)] overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Cover image — lazy loaded */}
                <div className="w-full h-40 bg-sage-200 relative">
                  {coverImage ? (
                    <img
                      src={coverImage.image_url}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-ink-400">
                      <IconPhoto size={32} />
                    </div>
                  )}
                  <span className="absolute top-2 right-2 bg-black/50 text-white text-xs rounded-full px-2 py-0.5">
                    {images.length} image{images.length === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="font-display font-semibold text-ink-900">{hotel.name}</h3>
                    <button
                      onClick={() => handleDelete(hotel)}
                      className="text-ink-400 hover:text-danger-600 shrink-0 p-1"
                      title="Delete hotel"
                    >
                      <IconTrash size={15} />
                    </button>
                  </div>

                  {hotel.description && (
                    <p className="text-ink-600 text-sm mb-3 line-clamp-2">
                      {hotel.description.replace(/<[^>]*>/g, ' ').trim()}
                    </p>
                  )}

                  {/* Image thumbnails — lazy loaded */}
                  <div className="flex gap-1.5 flex-wrap">
                    {images.map((img) => (
                      <div key={img.id} className="relative group w-14 h-10 rounded-md overflow-hidden bg-sage-200">
                        <img
                          src={img.image_url}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => handleDeleteImage(img.id)}
                          className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <IconTrash size={11} className="text-white" />
                        </button>
                      </div>
                    ))}
                    <label className="w-14 h-10 rounded-md border border-dashed border-sage-300 flex items-center justify-center text-ink-400 cursor-pointer hover:border-forest-600 hover:text-forest-600">
                      {progress ? (
                        <span className="text-[9px] font-mono text-forest-600">{progress.done}/{progress.total}</span>
                      ) : (
                        <IconUpload size={14} />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || [])
                          if (files.length) handleUploadImages(hotel.id, files)
                          e.target.value = ''
                        }}
                        disabled={!!progress}
                      />
                    </label>
                  </div>

                  {/* Upload progress bar */}
                  {progress && (
                    <div className="mt-2">
                      <div className="h-1.5 bg-sage-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-forest-600 rounded-full transition-all duration-300"
                          style={{ width: `${(progress.done / progress.total) * 100}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-ink-400 mt-1">
                        Uploading {progress.done} of {progress.total}…
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
