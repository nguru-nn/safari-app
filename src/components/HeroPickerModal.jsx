import { useEffect, useState } from 'react'
import { IconX, IconCheck, IconUpload, IconLoader2 } from '@tabler/icons-react'
import { listBucketImages, uploadImage } from '../lib/storage'

// Picks a hero image for a trip. Lists everything already in the 'hero-images'
// bucket so a previously-uploaded image can be reused, and keeps the upload path
// available in the same place rather than as a separate control.
export default function HeroPickerModal({ currentUrl, onClose, onSelect }) {
  const [images, setImages] = useState(null)
  const [selected, setSelected] = useState(currentUrl || null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    listBucketImages('hero-images')
      .then(setImages)
      .catch((err) => {
        setError(err.message)
        setImages([])
      })
  }, [])

  async function handleUploadNew(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const url = await uploadImage('hero-images', file)
      // Show it at the front straight away rather than re-listing the bucket —
      // storage listings can lag a moment behind a just-completed upload.
      setImages((prev) => [{ name: url, createdAt: new Date().toISOString(), url }, ...(prev ?? [])])
      setSelected(url)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-50 p-6" onClick={onClose}>
      <div
        className="w-full max-w-3xl max-h-[85vh] bg-white rounded-[var(--radius-card)] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-sage-200 shrink-0">
          <span className="font-display font-semibold">Choose hero image</span>
          <button type="button" onClick={onClose} className="text-ink-600 hover:text-ink-900">
            <IconX size={18} />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto flex-1">
          {error && <p className="text-danger-600 text-sm mb-3">{error}</p>}

          <label className="inline-flex items-center gap-1.5 text-xs text-forest-600 font-medium cursor-pointer mb-4">
            {uploading ? <IconLoader2 size={14} className="animate-spin" /> : <IconUpload size={14} />}
            {uploading ? 'Uploading…' : 'Upload a new image'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUploadNew}
              disabled={uploading}
            />
          </label>

          {images === null ? (
            <p className="text-ink-600 text-sm">Loading…</p>
          ) : images.length === 0 ? (
            <p className="text-ink-600 text-sm">No images uploaded yet. Upload one above.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {images.map((img) => {
                const isSelected = selected === img.url
                return (
                  <button
                    key={img.url}
                    type="button"
                    onClick={() => setSelected(img.url)}
                    className={`relative aspect-[4/3] rounded-xl overflow-hidden bg-sage-200 ${
                      isSelected ? 'ring-2 ring-forest-600 ring-offset-2' : ''
                    }`}
                  >
                    <img
                      src={img.url}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                    {isSelected && (
                      <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-forest-600 text-white flex items-center justify-center">
                        <IconCheck size={12} />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-sage-200 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-ink-600 px-4 py-2 rounded-full hover:bg-sage-100"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!selected || selected === currentUrl}
            onClick={() => onSelect(selected)}
            className="text-sm rounded-full bg-forest-600 text-white px-4 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Use this image
          </button>
        </div>
      </div>
    </div>
  )
}
