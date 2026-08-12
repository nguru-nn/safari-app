import { useState } from 'react'
import { upsertPricing } from '../lib/itineraries'
import { CURRENCIES, formatCurrency } from '../lib/currency'

const TIERS = [
  { value: 'adult', label: 'Per adult' },
  { value: 'child_12plus', label: 'Child, 12+ yrs' },
  { value: 'child_3_12', label: 'Child, 3–12 yrs' },
]

export default function PricingSection({ itineraryId, pricing, onChanged }) {
  const currency = pricing[0]?.currency || 'USD'
  const total = pricing.reduce((sum, p) => sum + Number(p.price) * (p.quantity ?? 0), 0)

  async function handleCurrencyChange(newCurrency) {
    // Applies immediately to every tier already saved — a trip prices in one
    // currency throughout, so changing it shouldn't leave tiers mismatched.
    await Promise.all(
      pricing.map((p) => upsertPricing(itineraryId, p.tier, p.price, p.quantity, newCurrency))
    )
    onChanged()
  }

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
              Total for this trip:{' '}
              <span className="font-display font-semibold text-ink-900">
                {formatCurrency(total, currency)}
              </span>
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
        {TIERS.map((tier) => (
          <PriceInput
            key={tier.value}
            tier={tier}
            existing={pricing.find((p) => p.tier === tier.value)}
            itineraryId={itineraryId}
            currency={currency}
            onChanged={onChanged}
          />
        ))}
      </div>
      <p className="text-xs text-ink-400 mt-2">
        Set the number of travelers in each tier to show a total payable on the published page.
      </p>
    </div>
  )
}

function PriceInput({ tier, existing, itineraryId, currency, onChanged }) {
  const [price, setPrice] = useState(existing?.price ?? '')
  const [quantity, setQuantity] = useState(existing?.quantity ?? '')

  async function handleBlur() {
    const priceNum = price === '' ? null : Number(price)
    const quantityNum = quantity === '' ? 0 : Number(quantity)
    if (priceNum === null || isNaN(priceNum) || isNaN(quantityNum)) return
    await upsertPricing(itineraryId, tier.value, priceNum, quantityNum, currency)
    onChanged()
  }

  return (
    <div>
      <label className="text-xs text-ink-600 block mb-1">{tier.label}</label>
      <div className="flex items-center gap-2">
        <div className="flex items-center rounded-full border border-sage-200 px-3 py-1.5 focus-within:border-forest-600 flex-1">
          <span className="text-ink-400 text-xs mr-1">{currency}</span>
          <input
            type="number"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            onBlur={handleBlur}
            className="w-full text-sm outline-none"
          />
        </div>
        <div className="flex items-center rounded-full border border-sage-200 px-3 py-1.5 focus-within:border-forest-600 w-20">
          <input
            type="number"
            min="0"
            placeholder="qty"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            onBlur={handleBlur}
            className="w-full text-sm outline-none"
            title="Number of travelers in this tier"
          />
        </div>
      </div>
    </div>
  )
}
