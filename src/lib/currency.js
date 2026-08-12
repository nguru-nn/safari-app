// Plain JS, zero browser/React dependencies — this file is imported both by the
// Vite app (src/components/PricingSection.jsx etc.) and directly by the Node
// static-page generator (scripts/render-template.mjs), so it has to run in both.

export const CURRENCIES = [
  { code: 'USD', label: 'US Dollar ($)' },
  { code: 'EUR', label: 'Euro (€)' },
  { code: 'GBP', label: 'British Pound (£)' },
  { code: 'PLN', label: 'Polish Złoty (zł)' },
  { code: 'KES', label: 'Kenyan Shilling (KSh)' },
]

export function formatCurrency(amount, currencyCode = 'USD') {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    // Unknown/invalid currency code — fall back to a plain label rather than throwing,
    // since a bad currency shouldn't take down the whole page render.
    return `${currencyCode} ${Number(amount).toLocaleString()}`
  }
}
