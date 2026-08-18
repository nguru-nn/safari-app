import { useEffect, useState } from 'react'
import { IconDeviceFloppy, IconCheck } from '@tabler/icons-react'
import { upsertPricing } from '../lib/itineraries'
import { CURRENCIES, formatCurrency } from '../lib/currency'

const TIERS = [
  { value: 'adult', label: 'Per adult' },
  { value: 'child_12plus', label: 'Child, 12+ yrs' },
  { value: 'child_3_12', label: 'Child, 3–12 yrs' },
]

export default function PricingSection({ itineraryId, pricing, onChanged }) {
  // Local editable state — synced from props, committed on Save
  const [local, setLocal] = useState(() => buildLocal(pricing))
  const [currency, setCurrency] = useState(pricing[0]?.currency || 'USD')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [dirty, setDirty] = useState(false)

  // Re-sync when pricing prop changes (e.g. after refresh / duplicate)
  useEffect(() => {
    setLocal(buildLocal(pricing))
    setCurrency(pricing[0]?.currency || 'USD')
    setDirty(false)
    setSaved(false)
  }, [pricing])

  function buildLocal(pricingData) {
    const map = {}
    for (const t of TIERS) {
      const existing = pricingData.find((p) => p.tier === t.value)
      map[t.value] = {
        price: existing?.price ?? '',
        quantity: existing?.quantity ?? '',
      }
    }
    return map
  }

  function updateField(tier, field, value) {
    setLocal((prev) => ({
      ...prev,
      [tier]: { ...prev[tier], [field]: value },
    }))
    setDirty(true)
    setSaved(false)
  }

  function handleCurrencyChange(newCurrency) {
    setCurrency(newCurrency)
    setDirty(true)
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    try {
      for (const tier of TIERS) {
        const { price, quantity } = local[tier.value]
        const priceNum = price === '' ? 0 : Number(price)
        const quantityNum = quantity === '' ? 0 : Number(quantity)
        if (isNaN(priceNum) || isNaN(quantityNum)) continue
        // Only save if there's a price or it already existed
        if (priceNum > 0 || pricing.find((p) => p.tier === tier.value)) {
          await upsertPricing(itineraryId, tier.value, priceNum, quantityNum, currency)
        }
      }
      setDirty(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      await onChanged()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const total = TIERS.reduce((sum, t) => {
    const p = Number(local[t.value].price) || 0
    const q = Number(local[t.value].quantity) || 0
    return sum + p * q
  }, 0)

  return (
    <div className="bg-white rounded-[var(--radius-card)] p-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="font-display font-medium">Pricing</span>
        <div className="flex items-center gap-3">
          <select
            value={currency}
            onChange={(e) => handleCurrencyChange(e.target.value)}
            className="text-xs rounded-full border border-sage-200 px-3 py-1.5 outline-none focus:border-forest-600 bg-white"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
          {total > 0 && (
            <span className="text-sm text-ink-600">
              Total:{' '}
              <span className="font-display font-semibold text-ink-900">
                {formatCurrency(total, currency)}
              </span>
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
        {TIERS.map((tier) => (
          <div key={tier.value}>
            <label className="text-xs text-ink-600 block mb-1">{tier.label}</label>
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-full border border-sage-200 px-3 py-1.5 focus-within:border-forest-600 flex-1">
                <span className="text-ink-400 text-xs mr-1">{currency}</span>
                <input
                  type="number"
                  min="0"
                  value={local[tier.value].price}
                  onChange={(e) => updateField(tier.value, 'price', e.target.value)}
                  placeholder="0"
                  className="w-full text-sm outline-none"
                />
              </div>
              <div className="flex items-center rounded-full border border-sage-200 px-3 py-1.5 focus-within:border-forest-600 w-20">
                <input
                  type="number"
                  min="0"
                  placeholder="qty"
                  value={local[tier.value].quantity}
                  onChange={(e) => updateField(tier.value, 'quantity', e.target.value)}
                  className="w-full text-sm outline-none"
                  title="Number of travelers in this tier"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-sage-200">
        <p className="text-xs text-ink-400">
          Set the number of travelers in each tier to show a total on the published page.
        </p>
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-colors shrink-0 ${
            saved
              ? 'bg-forest-600/10 text-forest-600'
              : dirty
              ? 'bg-forest-600 text-white hover:bg-forest-700'
              : 'bg-sage-200 text-ink-400 cursor-not-allowed'
          }`}
        >
          {saved ? (
            <><IconCheck size={13} /> Saved</>
          ) : (
            <><IconDeviceFloppy size={13} /> {saving ? 'Saving…' : 'Save pricing'}</>
          )}
        </button>
      </div>
    </div>
  )
}
