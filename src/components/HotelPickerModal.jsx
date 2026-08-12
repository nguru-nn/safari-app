import { useEffect, useState } from 'react'
import { IconX, IconCheck, IconUpload, IconTrash } from '@tabler/icons-react'
import {
  listHotels,
  createHotel,
  addHotelImage,
  applyHotelToDay,
  deleteHotel,
  deleteHotelImage,
} from '../lib/itineraries'
import { uploadImage } from '../lib/storage'

export default function HotelPickerModal({ dayId, onClose, onApplied }) {
  const [search, setSearch] = useState('')
  const [hotels, setHotels] = useState([])
  const [selectedHotel, setSelectedHotel] = useState(null)
  const [selectedImageIds, setSelectedImageIds] = useState([]) // { id?, image_url }
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [newHotelName, setNewHotelName] = useState('')

  useEffect(() => {
    listHotels(search).then(setHotels).catch((e) => setError(e.message))
  }, [search])

  function toggleImage(img) {
    setSelectedImageIds((prev) => {
      const exists = prev.find((p) => p.image_url === img.image_url)
      if (exists) return prev.filter((p) => p.image_url !== img.image_url)
      if (prev.length >= 5) return prev
      return [...prev, img]
    })
  }

  async function handleUploadNew(e) {
    const file = e.target.files?.[0]
    if (!file || !selectedHotel) return
    setUploading(true)
    setError('')
    try {
      const url = await uploadImage('hotel-images', file)
      const saved = await addHotelImage(selectedHotel.id, url, selectedHotel.hotel_images?.length ?? 0)
      setSelectedHotel((h) => ({ ...h, hotel_images: [...(h.hotel_images ?? []), saved] }))
      toggleImage(saved)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleDeleteImage(img) {
    if (!confirm('Remove this image from the library? Trips that already used it keep their copy.')) return
    setError('')
    try {
      await deleteHotelImage(img.id)
      setSelectedHotel((h) => ({ ...h, hotel_images: h.hotel_images.filter((i) => i.id !== img.id) }))
      setSelectedImageIds((prev) => prev.filter((p) => p.image_url !== img.image_url))
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDeleteHotel() {
    if (!selectedHotel) return
    if (
      !confirm(
        `Delete "${selectedHotel.name}" from the library entirely? Trips that already used it keep their saved description and photos.`
      )
    )
      return
    setError('')
    try {
      await deleteHotel(selectedHotel.id)
      setHotels((prev) => prev.filter((h) => h.id !== selectedHotel.id))
      setSelectedHotel(null)
      setSelectedImageIds([])
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleCreateHotel() {
    if (!newHotelName.trim()) return
    try {
      const hotel = await createHotel(newHotelName.trim(), '')
      setSelectedHotel({ ...hotel, hotel_images: [] })
      setNewHotelName('')
      setHotels((prev) => [hotel, ...prev])
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleApply() {
    if (!selectedHotel) return
    setSaving(true)
    setError('')
    try {
      await applyHotelToDay(dayId, selectedHotel, selectedImageIds)
      onApplied()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-50 p-6">
      <div className="w-full max-w-lg bg-white rounded-[var(--radius-card)] overflow-hidden flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-sage-200">
          <span className="font-display font-semibold">Choose hotel images</span>
          <button onClick={onClose} className="text-ink-600 hover:text-ink-900">
            <IconX size={18} />
          </button>
        </div>

        <div className="px-5 pt-4">
          <input
            type="text"
            placeholder="Search hotel library"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-full border border-sage-200 px-4 py-2 text-sm outline-none focus:border-forest-600"
          />
        </div>

        <div className="flex gap-2 px-5 py-3 overflow-x-auto items-center">
          {hotels.map((h) => (
            <button
              key={h.id}
              onClick={() => {
                setSelectedHotel(h)
                setSelectedImageIds([])
              }}
              className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap ${
                selectedHotel?.id === h.id ? 'bg-forest-600 text-white' : 'bg-sage-100 text-ink-600'
              }`}
            >
              {h.name}
            </button>
          ))}
          {selectedHotel && (
            <button
              onClick={handleDeleteHotel}
              title="Delete this hotel from the library"
              className="text-ink-400 hover:text-danger-600 shrink-0 p-1"
            >
              <IconTrash size={14} />
            </button>
          )}
        </div>

        {!selectedHotel && (
          <div className="px-5 pb-4 flex gap-2">
            <input
              type="text"
              placeholder="New hotel name"
              value={newHotelName}
              onChange={(e) => setNewHotelName(e.target.value)}
              className="flex-1 rounded-full border border-sage-200 px-4 py-2 text-sm outline-none focus:border-forest-600"
            />
            <button
              onClick={handleCreateHotel}
              className="rounded-full bg-sage-200 text-ink-900 text-sm px-4 py-2 whitespace-nowrap"
            >
              Add hotel
            </button>
          </div>
        )}

        {selectedHotel && (
          <div className="px-5 pb-4 overflow-y-auto flex-1">
            <div className="grid grid-cols-3 gap-2">
              {(selectedHotel.hotel_images ?? []).map((img) => {
                const isSelected = selectedImageIds.some((s) => s.image_url === img.image_url)
                return (
                  <div key={img.id} className="relative group">
                    <button
                      onClick={() => toggleImage(img)}
                      className={`relative aspect-[4/3] w-full rounded-lg bg-sage-200 overflow-hidden border-2 ${
                        isSelected ? 'border-forest-600' : 'border-transparent'
                      }`}
                    >
                      <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                      {isSelected && (
                        <span className="absolute top-1 right-1 bg-forest-600 text-white rounded-full p-0.5">
                          <IconCheck size={12} />
                        </span>
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteImage(img)
                      }}
                      title="Remove from library"
                      className="absolute top-1 left-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <IconTrash size={11} />
                    </button>
                  </div>
                )
              })}
              <label className="aspect-[4/3] rounded-lg border border-dashed border-sage-300 flex flex-col items-center justify-center gap-1 text-ink-400 text-xs cursor-pointer">
                <IconUpload size={16} />
                {uploading ? 'Uploading…' : 'Upload new'}
                <input type="file" accept="image/*" className="hidden" onChange={handleUploadNew} disabled={uploading} />
              </label>
            </div>
          </div>
        )}

        {error && <p className="px-5 text-danger-600 text-sm">{error}</p>}

        <div className="flex items-center justify-between px-5 py-4 border-t border-sage-200">
          <span className="text-ink-600 text-xs">{selectedImageIds.length} of 5 selected</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-full text-sm px-4 py-2 text-ink-600">
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={!selectedHotel || saving}
              className="rounded-full bg-forest-600 text-white text-sm px-4 py-2 disabled:opacity-50"
            >
              {saving ? 'Applying…' : 'Attach to day'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
