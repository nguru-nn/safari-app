import { useState } from 'react'
import { IconChevronDown, IconPlus, IconTrash, IconDeviceFloppy, IconCheck } from '@tabler/icons-react'
import RichTextBox from './RichTextBox'
import HotelPickerModal from './HotelPickerModal'
import {
  addContentBlock,
  updateContentBlock,
  deleteContentBlock,
  setDayActivity,
  updateDay,
  deleteDay,
} from '../lib/itineraries'

const ACTIVITIES = [
  { value: 'airport_transfer', label: 'Airport transfer' },
  { value: 'game_drive', label: 'Game drive' },
  { value: 'hot_air_balloon', label: 'Hot air balloon' },
  { value: 'cultural_visit', label: 'Cultural visit (Maasai village)' },
  { value: 'bushwalk', label: 'Bushwalk' },
  { value: 'night_game_drive', label: 'Night game drive' },
  { value: 'sundowner', label: 'Sundowner' },
  { value: 'cycling', label: 'Cycling' },
  { value: 'boat_tour', label: 'Boat tour' },
  { value: 'rest_day', label: 'Rest day' },
]

export default function DayAccordionItem({ day, isOpen, onToggle, onChanged, isLastDay }) {
  const [showHotelPicker, setShowHotelPicker] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const activeActivities = new Set((day.day_activities ?? []).map((a) => a.activity))

  async function handleAddBlock() {
    const nextOrder = (day.day_content_blocks?.length ?? 0)
    await addContentBlock(day.id, nextOrder)
    onChanged()
  }

  async function handleBlockSave(blockId, content) {
    await updateContentBlock(blockId, content)
    onChanged()
  }

  async function handleDeleteBlock(blockId) {
    await deleteContentBlock(blockId)
    onChanged()
  }

  async function handleActivityToggle(activity) {
    await setDayActivity(day.id, activity, !activeActivities.has(activity))
    onChanged()
  }

  async function handleHotelDescriptionSave(html) {
    await updateDay(day.id, { hotel_description: html })
    onChanged()
  }

  async function handleDeleteDay() {
    if (!confirm(`Delete Day ${day.day_number}? This can't be undone.`)) return
    await deleteDay(day.id)
    onChanged()
  }

  async function handleSaveDay() {
    setSaving(true)
    try {
      await onChanged()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-[var(--radius-card)] overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left"
      >
        <span className="font-display font-medium">Day {day.day_number}</span>
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleDeleteDay()
            }}
            className="text-ink-400 hover:text-danger-600"
            title="Delete day"
          >
            <IconTrash size={16} />
          </button>
          <IconChevronDown
            size={18}
            className={`transition-transform text-ink-600 ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {isOpen && (
        <div className="px-5 pb-5 border-t border-sage-200 pt-4 flex flex-col gap-5">
          <div>
            <p className="text-xs text-ink-400 mb-2 uppercase tracking-wide font-mono">
              Itinerary content
            </p>
            <div className="flex flex-col gap-2">
              {(day.day_content_blocks ?? [])
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((block) => (
                  <div key={block.id} className="flex gap-2 items-start">
                    <div className="flex-1">
                      <RichTextBox
                        value={block.content}
                        onSave={(html) => handleBlockSave(block.id, html)}
                      />
                    </div>
                    <button
                      onClick={() => handleDeleteBlock(block.id)}
                      className="mt-3 text-ink-400 hover:text-danger-600"
                      title="Remove block"
                    >
                      <IconTrash size={14} />
                    </button>
                  </div>
                ))}
            </div>
            <button
              onClick={handleAddBlock}
              className="mt-2 flex items-center gap-1.5 text-xs text-forest-600 font-medium"
            >
              <IconPlus size={14} /> Add text block
            </button>
          </div>

          <div>
            <p className="text-xs text-ink-400 mb-2 uppercase tracking-wide font-mono">Activities</p>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {ACTIVITIES.map((a) => (
                <label key={a.value} className="flex items-center gap-2 text-sm text-ink-900">
                  <input
                    type="checkbox"
                    checked={activeActivities.has(a.value)}
                    onChange={() => handleActivityToggle(a.value)}
                    className="accent-forest-600"
                  />
                  {a.label}
                </label>
              ))}
            </div>
          </div>

          {!isLastDay && (
            <div>
              <p className="text-xs text-ink-400 mb-2 uppercase tracking-wide font-mono">
                Hotel for the night
              </p>
              <RichTextBox
                value={day.hotel_description}
                onSave={handleHotelDescriptionSave}
                placeholder="Describe the hotel…"
              />

              <div className="flex gap-2 mt-3 flex-wrap">
                {(day.day_hotel_images ?? [])
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((img) => (
                    <div key={img.id} className="w-16 h-12 rounded-md overflow-hidden bg-sage-200">
                      <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                <button
                  onClick={() => setShowHotelPicker(true)}
                  className="w-16 h-12 rounded-md border border-dashed border-sage-300 flex items-center justify-center text-ink-400"
                >
                  <IconPlus size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Save day button */}
          <div className="pt-2 border-t border-sage-200 flex justify-end">
            <button
              onClick={handleSaveDay}
              disabled={saving}
              className={`flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                saved
                  ? 'bg-forest-600/10 text-forest-600'
                  : 'bg-forest-600 text-white hover:bg-forest-700'
              } disabled:opacity-60`}
            >
              {saved ? (
                <><IconCheck size={15} /> Saved</>
              ) : (
                <><IconDeviceFloppy size={15} /> {saving ? 'Saving…' : 'Save day'}</>
              )}
            </button>
          </div>
        </div>
      )}

      {showHotelPicker && (
        <HotelPickerModal
          dayId={day.id}
          onClose={() => setShowHotelPicker(false)}
          onApplied={() => {
            setShowHotelPicker(false)
            onChanged()
          }}
        />
      )}
    </div>
  )
}
