import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { IconCopy } from '@tabler/icons-react'
import { getItinerary, listDays, updateContentBlock, updateDay, updateItinerary } from '../lib/itineraries'
import { useAuth } from '../contexts/AuthContext'
import RichTextBox from '../components/RichTextBox'
import DuplicateModal from '../components/DuplicateModal'

const LANGUAGE_LABELS = { pl: 'Polish', de: 'German', fr: 'French' }

export default function Translate() {
  const { id } = useParams() // id of the translated (draft) itinerary
  const navigate = useNavigate()
  const { profile } = useAuth()

  const [translated, setTranslated] = useState(null)
  const [original, setOriginal] = useState(null)
  const [translatedDays, setTranslatedDays] = useState([])
  const [originalDays, setOriginalDays] = useState([])
  const [error, setError] = useState('')
  const [showDuplicate, setShowDuplicate] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const trip = await getItinerary(id)
      if (!trip.parent_id) throw new Error('This itinerary has no original to translate from')
      const [origTrip, tDays, oDays] = await Promise.all([
        getItinerary(trip.parent_id),
        listDays(id),
        listDays(trip.parent_id),
      ])
      setTranslated(trip)
      setOriginal(origTrip)
      setTranslatedDays(tDays)
      setOriginalDays(oDays)
    } catch (err) {
      setError(err.message)
    }
  }, [id])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function handleBlockSave(blockId, html) {
    try {
      await updateContentBlock(blockId, html)
      if (profile?.id) updateItinerary(id, { translated_by: profile.id, last_edited_by: profile.id, last_edited_at: new Date().toISOString() }).catch(() => {})
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleHotelSave(dayId, html) {
    try {
      await updateDay(dayId, { hotel_description: html })
      if (profile?.id) updateItinerary(id, { translated_by: profile.id, last_edited_by: profile.id, last_edited_at: new Date().toISOString() }).catch(() => {})
    } catch (err) {
      setError(err.message)
    }
  }

  if (!translated || !original) {
    return <p className="text-ink-600 text-sm pt-6">{error || 'Loading…'}</p>
  }

  return (
    <div className="max-w-4xl mx-auto pt-4 flex flex-col gap-4 pb-16">
      {error && <p className="text-danger-600 text-sm">{error}</p>}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display text-lg font-bold">
          Translating to {LANGUAGE_LABELS[translated.language] ?? translated.language}
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDuplicate(true)}
            className="flex items-center gap-1.5 rounded-full border border-sage-200 px-4 py-2 text-sm text-ink-900"
          >
            <IconCopy size={15} /> Duplicate this {LANGUAGE_LABELS[translated.language] ?? translated.language} version
          </button>
          <button
            onClick={() => navigate(`/review/${original.id}`)}
            className="rounded-full border border-forest-600 text-forest-600 text-sm px-4 py-2"
          >
            Save &amp; return to review
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[var(--radius-card)] overflow-hidden">
        {translatedDays.map((tDay) => {
          const oDay = originalDays.find((d) => d.day_number === tDay.day_number)
          return (
            <div key={tDay.id} className="border-b border-sage-200 last:border-b-0">
              <div className="px-5 pt-4 pb-1 text-xs text-ink-400 uppercase tracking-wide font-mono">
                Day {tDay.day_number}
              </div>
              {(tDay.day_content_blocks ?? [])
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((tBlock, i) => {
                  const oBlock = (oDay?.day_content_blocks ?? []).sort((a, b) => a.sort_order - b.sort_order)[i]
                  return (
                    <div key={tBlock.id} className="grid grid-cols-2 divide-x divide-sage-200">
                      <div className="p-4">
                        <p className="text-[11px] text-ink-400 uppercase tracking-wide mb-2">
                          Original — {original.language === 'en' ? 'English' : original.language}
                        </p>
                        <div
                          className="prose prose-sm max-w-none text-ink-600"
                          dangerouslySetInnerHTML={{ __html: oBlock?.content || '<p class="text-ink-400">—</p>' }}
                        />
                      </div>
                      <div className="p-4">
                        <p className="text-[11px] text-ink-400 uppercase tracking-wide mb-2">
                          {LANGUAGE_LABELS[translated.language] ?? translated.language}
                        </p>
                        <RichTextBox
                          value={tBlock.content}
                          onSave={(html) => handleBlockSave(tBlock.id, html)}
                          placeholder="Translate this…"
                        />
                      </div>
                    </div>
                  )
                })}

              <div className="grid grid-cols-2 divide-x divide-sage-200 border-t border-sage-100">
                <div className="p-4">
                  <p className="text-[11px] text-ink-400 uppercase tracking-wide mb-2">Hotel (original)</p>
                  <div
                    className="prose prose-sm max-w-none text-ink-600"
                    dangerouslySetInnerHTML={{ __html: oDay?.hotel_description || '<p class="text-ink-400">—</p>' }}
                  />
                </div>
                <div className="p-4">
                  <p className="text-[11px] text-ink-400 uppercase tracking-wide mb-2">Hotel (translated)</p>
                  <RichTextBox
                    value={tDay.hotel_description}
                    onSave={(html) => handleHotelSave(tDay.id, html)}
                    placeholder="Translate the hotel description…"
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-ink-400 px-1">
        Original stays read-only on the left · translated copy is a separate draft that goes through its
        own review before publishing
      </p>

      {showDuplicate && (
        <DuplicateModal
          source={translated}
          onClose={() => setShowDuplicate(false)}
          onDuplicated={(copy) => {
            setShowDuplicate(false)
            navigate(`/builder/${copy.id}`)
          }}
        />
      )}
    </div>
  )
}
