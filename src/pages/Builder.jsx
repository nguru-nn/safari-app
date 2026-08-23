import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router'
import { IconPlus, IconPhoto, IconSend } from '@tabler/icons-react'
import {
  getItinerary,
  updateItinerary,
  listDays,
  addDay,
  listInclusionExclusions,
  listPricing,
  submitForReview,
  trackEdit,
} from '../lib/itineraries'
import { uploadImage } from '../lib/storage'
import { useAuth } from '../contexts/AuthContext'
import DayAccordionItem from '../components/DayAccordionItem'
import InclusionsExclusions from '../components/InclusionsExclusions'
import PricingSection from '../components/PricingSection'
import StatusBadge from '../components/StatusBadge'

function tomorrowISO() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

export default function Builder() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [itinerary, setItinerary] = useState(null)
  const [days, setDays] = useState([])
  const [items, setItems] = useState([])
  const [pricing, setPricing] = useState([])
  const [openDayId, setOpenDayId] = useState(null)
  const [error, setError] = useState('')
  const [uploadingHero, setUploadingHero] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const [trip, dayList, itemList, priceList] = await Promise.all([
        getItinerary(id),
        listDays(id),
        listInclusionExclusions(id),
        listPricing(id),
      ])
      setItinerary(trip)
      setDays(dayList)
      setItems(itemList)
      setPricing(priceList)
      setOpenDayId((current) => current ?? dayList[0]?.id ?? null)
    } catch (err) {
      setError(err.message)
    }
  }, [id])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function handleFieldSave(field, value) {
    try {
      await updateItinerary(id, { [field]: value })
      if (profile?.id) trackEdit(id, profile.id).catch(() => {})
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleHeroUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingHero(true)
    try {
      const url = await uploadImage('hero-images', file)
      await updateItinerary(id, { hero_image_url: url })
      if (profile?.id) trackEdit(id, profile.id).catch(() => {})
      refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setUploadingHero(false)
    }
  }

  async function handleAddDay() {
    const nextNumber = (days[days.length - 1]?.day_number ?? 0) + 1
    if (nextNumber > 21) return
    const newDay = await addDay(id, nextNumber)
    await refresh()
    setOpenDayId(newDay.id)
  }

  async function handleSubmitForReview() {
    if (!confirm('Submit this itinerary for supervisor review?')) return
    try {
      await submitForReview(id)
      navigate(`/review/${id}`)
    } catch (err) {
      setError(err.message)
    }
  }

  if (!itinerary) {
    return <p className="text-ink-600 text-sm pt-6">{error || 'Loading…'}</p>
  }

  return (
    <div className="max-w-4xl mx-auto pt-4 flex flex-col gap-5 pb-16">
      {error && <p className="text-danger-600 text-sm">{error}</p>}

      {/* Header */}
      <div className="bg-white rounded-[var(--radius-card)] p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <input
            defaultValue={itinerary.itinerary_name}
            onBlur={(e) => handleFieldSave('itinerary_name', e.target.value)}
            placeholder="Itinerary name"
            className="font-display text-xl font-bold outline-none bg-transparent flex-1"
          />
          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge status={itinerary.status} />
            {itinerary.status === 'draft' && (
              <button
                onClick={handleSubmitForReview}
                className="flex items-center gap-1.5 rounded-full bg-forest-600 text-white text-xs font-medium px-3.5 py-1.5"
              >
                <IconSend size={13} /> Submit for review
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <LabeledInput
            label="Client"
            defaultValue={itinerary.client_name}
            onBlur={(v) => handleFieldSave('client_name', v)}
          />
          <LabeledInput
            label="Client email"
            defaultValue={itinerary.client_email}
            onBlur={(v) => handleFieldSave('client_email', v)}
            placeholder="client@example.com"
          />
          <LabeledSelect
            label="Safari type"
            value={itinerary.safari_type}
            options={[
              { value: 'shared', label: 'Shared' },
              { value: 'private', label: 'Private' },
            ]}
            onChange={(v) => handleFieldSave('safari_type', v)}
          />
          <LabeledSelect
            label="Transportation"
            value={itinerary.transportation}
            options={[
              { value: 'offroad_jeep', label: 'Off-road jeep' },
              { value: 'van', label: 'Van' },
            ]}
            onChange={(v) => handleFieldSave('transportation', v)}
          />
          <LabeledSelect
            label="Template"
            value={itinerary.template || 'safari_kenia'}
            options={[
              { value: 'safari_kenia', label: 'Safari Kenia' },
              { value: 'african_routes', label: 'African Routes' },
            ]}
            onChange={(v) => handleFieldSave('template', v)}
          />
          <LabeledInput
            label="Start date"
            type="date"
            defaultValue={itinerary.start_date || tomorrowISO()}
            onBlur={(v) => handleFieldSave('start_date', v)}
          />
          <LabeledInput
            label="End date"
            type="date"
            defaultValue={itinerary.end_date || ''}
            onBlur={(v) => handleFieldSave('end_date', v)}
          />
        </div>

        <div>
          <label className="text-xs text-ink-600 block mb-1.5">Hero image</label>
          {itinerary.hero_image_url ? (
            <div className="w-full h-36 rounded-xl overflow-hidden bg-sage-200">
              <img src={itinerary.hero_image_url} alt="" className="w-full h-full object-cover" />
            </div>
          ) : null}
          <label className="mt-2 inline-flex items-center gap-1.5 text-xs text-forest-600 font-medium cursor-pointer">
            <IconPhoto size={14} />
            {uploadingHero ? 'Uploading…' : itinerary.hero_image_url ? 'Replace image' : 'Upload hero image'}
            <input type="file" accept="image/*" className="hidden" onChange={handleHeroUpload} disabled={uploadingHero} />
          </label>
        </div>
      </div>

      {/* Days accordion */}
      <div className="flex flex-col gap-2">
        {days.map((day, index) => (
          <DayAccordionItem
            key={day.id}
            day={day}
            isOpen={openDayId === day.id}
            onToggle={() => setOpenDayId(openDayId === day.id ? null : day.id)}
            onChanged={refresh}
            isLastDay={index === days.length - 1}
          />
        ))}

        {days.length < 21 && (
          <button
            onClick={handleAddDay}
            className="flex items-center justify-center gap-1.5 py-3 rounded-[var(--radius-card)] border border-dashed border-sage-300 text-ink-600 text-sm"
          >
            <IconPlus size={15} /> Add another day (up to 21)
          </button>
        )}
      </div>

      {/* Inclusions / exclusions */}
      <InclusionsExclusions itineraryId={id} items={items} onChanged={refresh} />

      {/* Pricing */}
      <PricingSection itineraryId={id} pricing={pricing} onChanged={refresh} />
    </div>
  )
}

function LabeledInput({ label, defaultValue, onBlur, type = 'text', placeholder }) {
  return (
    <div>
      <label className="text-xs text-ink-600 block mb-1">{label}</label>
      <input
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        onBlur={(e) => onBlur(e.target.value)}
        className="w-full rounded-full border border-sage-200 px-3 py-1.5 text-sm outline-none focus:border-forest-600"
      />
    </div>
  )
}

function LabeledSelect({ label, value, options, onChange }) {
  return (
    <div>
      <label className="text-xs text-ink-600 block mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-full border border-sage-200 px-3 py-1.5 text-sm outline-none focus:border-forest-600 bg-white"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}
