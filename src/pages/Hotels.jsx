import { useEffect, useState } from 'react'
import { IconPlus, IconTrash, IconUpload, IconPhoto } from '@tabler/icons-react'
import { listHotels, createHotel, addHotelImage, deleteHotel, deleteHotelImage } from '../lib/itineraries'
import { uploadImage } from '../lib/storage'

export default function Hotels() {
  const [hotels, setHotels] = useState(null)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [uploadingFor, setUploadingFor] = useState(null) // hotel id currently uploading

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

  async function handleUploadImage(hotelId, file) {
    setUploadingFor(hotelId)
    setError('')
    try {
      const url = await uploadImage('hotel-images', file)
      const hotel = hotels.find((h) => h.id === hotelId)
      await addHotelImage(hotelId, url, hotel?.hotel_images?.length ?? 0)
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setUploadingFor(null)
    }
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

            return (
              <div
                key={hotel.id}
                className="bg-white rounded-[var(--radius-card)] overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Cover image */}
                <div className="w-full h-40 bg-sage-200 relative">
                  {coverImage ? (
                    <img src={coverImage.image_url} alt="" className="w-full h-full object-cover" />
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

                  {/* Image thumbnails */}
                  <div className="flex gap-1.5 flex-wrap">
                    {images.map((img) => (
                      <div key={img.id} className="relative group w-14 h-10 rounded-md overflow-hidden bg-sage-200">
                        <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={() => handleDeleteImage(img.id)}
                          className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <IconTrash size={11} className="text-white" />
                        </button>
                      </div>
                    ))}
                    <label className="w-14 h-10 rounded-md border border-dashed border-sage-300 flex items-center justify-center text-ink-400 cursor-pointer hover:border-forest-600 hover:text-forest-600">
                      {uploadingFor === hotel.id ? (
                        <span className="text-[9px]">…</span>
                      ) : (
                        <IconUpload size={14} />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleUploadImage(hotel.id, file)
                        }}
                        disabled={uploadingFor === hotel.id}
                      />
                    </label>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
