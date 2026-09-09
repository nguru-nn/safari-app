// Pure function: (data) -> full standalone HTML string for the published public page.
// No external CSS/JS dependencies except Google Fonts — keeps the static file
// self-contained and fast, since it's served directly from Hostinger, not the app.

import { formatCurrency } from '../src/lib/currency.js'

const ACTIVITY_LABELS = {
  hot_air_balloon: 'Hot air balloon',
  cultural_visit: 'Cultural visit',
  bushwalk: 'Bushwalk',
  night_game_drive: 'Night game drive',
  cycling: 'Cycling',
  boat_tour: 'Boat tour',
}

const TIER_LABELS = {
  adult: 'Per adult',
  child_12plus: 'Child, 12+ yrs',
  child_3_12: 'Child, 3–12 yrs',
}

// Company payment details — same for every published trip, not itinerary-specific,
// so it lives here rather than in the database. Update this block if the bank changes.
const BANK_DETAILS = {
  heading: 'Bank details — USD',
  rows: [
    ['Bank name', 'NCBA Bank'],
    ['Swift code', 'CBAFKENX'],
    ['Bank code', '07000'],
    ['Account name', 'African Route Safaris Limited'],
    ['Account number', '1001494658'],
    ['Branch', 'Nkrumah Branch'],
  ],
  companyAddress: '41112-80100 Mombasa',
}

const LOGO_URL = 'https://bunny-wp-pullzone-dfasrxoqim.b-cdn.net/wp-content/uploads/2026/02/safari-kenia-1024x385.jpeg'

const TRUST_POINTS = [
  {
    title: 'Official KATO member',
    body: 'We are a proud, long-standing member of the Kenya Association of Tour Operators (KATO) — the largest and oldest trade association for tour operators. Your bookings are backed by the highest standards of trust and professionalism, and your deposits and payments for all safaris and tours are fully bonded.',
  },
  {
    title: 'Fully insured operations',
    body: 'Your safety and security are our highest priorities. All of our operations are comprehensively covered by SanlamAllianz, protecting you against operational liabilities, medical emergencies, and unexpected trip disruptions with an indemnity limit of $100,000.',
  },
]

const CONTACT_DETAILS = {
  address: 'Diani Bazaar, Diani Beach',
  phones: [
    { label: 'Mobile / WhatsApp (Poland)', value: '+48 722 138 602' },
    { label: 'Mobile / WhatsApp (Kenya)', value: '+254 728 226 718' },
  ],
  email: 'hello@safarikenia.com.pl',
  website: { label: 'www.safarikenia.com.pl', href: 'https://www.safarikenia.com.pl' },
}

export function renderItineraryPage({ itinerary, days, inclusions, exclusions, pricing }, siteBaseUrl) {
  const pageUrl = `${siteBaseUrl.replace(/\/$/, '')}/safari/${itinerary.slug}.html`
  const description = buildDescription(itinerary, days)
  const heroImage = itinerary.hero_image_url || ''

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(itinerary.itinerary_name)} — ${escapeHtml(itinerary.client_name)}</title>
<meta name="description" content="${escapeHtml(description)}">

<meta property="og:type" content="website">
<meta property="og:title" content="${escapeHtml(itinerary.itinerary_name)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:image" content="${escapeHtml(heroImage)}">
<meta property="og:url" content="${escapeHtml(pageUrl)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(itinerary.itinerary_name)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${escapeHtml(heroImage)}">
<link rel="canonical" href="${escapeHtml(pageUrl)}">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700;800&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet">

<style>
  :root {
    --sage-50: #f3f7ef;
    --sage-100: #e7eee1;
    --sage-200: #d3e0c8;
    --forest-600: #2f4a3c;
    --forest-700: #23372d;
    --tan-300: #e3c99a;
    --ink-900: #1c231d;
    --ink-600: #5b6b5e;
    --ink-400: #8a978c;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--sage-100);
    color: var(--ink-900);
    font-family: 'Inter', ui-sans-serif, sans-serif;
    line-height: 1.6;
  }
  h1, h2, h3, .font-display { font-family: 'Space Grotesk', ui-sans-serif, sans-serif; letter-spacing: -0.01em; }
  .wrap { max-width: 860px; margin: 0 auto; padding: 0 20px; }
  .label { font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink-400); }

  .hero { position: relative; height: 68vh; min-height: 460px; background: var(--sage-200); }
  .hero img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .hero-overlay {
    position: absolute; inset: 0;
    background: linear-gradient(to top, rgba(28,35,29,0.72) 0%, rgba(28,35,29,0.15) 55%, transparent 100%);
    display: flex; align-items: flex-end;
  }
  .hero-content { padding: 32px 20px; max-width: 860px; margin: 0 auto; width: 100%; color: white; }
  .hero-badges { display: flex; gap: 8px; margin-bottom: 12px; }
  .pill { display: inline-flex; align-items: center; padding: 5px 14px; border-radius: 999px; font-size: 12px; font-weight: 500; }
  .pill-light { background: rgba(255,255,255,0.18); color: white; backdrop-filter: blur(4px); }
  .hero h1 { font-size: 42px; font-weight: 800; margin: 0 0 6px; }
  .hero p { margin: 0; opacity: 0.85; font-size: 16px; }

  .share-bar {
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    background: white; border-radius: 999px; padding: 10px 10px 10px 20px;
    margin-top: -28px; position: relative; z-index: 2; box-shadow: 0 8px 24px rgba(28,35,29,0.08);
    flex-wrap: wrap;
  }
  .share-bar .label { margin: 0; }
  .share-buttons { display: flex; gap: 6px; }
  .share-buttons a, .share-buttons button {
    width: 36px; height: 36px; border-radius: 999px; border: none;
    background: var(--sage-100); color: var(--forest-600);
    display: flex; align-items: center; justify-content: center; cursor: pointer;
    text-decoration: none; font-size: 15px;
  }
  .share-buttons a:hover, .share-buttons button:hover { background: var(--sage-200); }

  section { margin-top: 28px; }
  .card { background: white; border-radius: 20px; padding: 24px; }
  .day-card { margin-bottom: 12px; }
  .day-card h2 { font-size: 18px; margin: 0 0 12px; }
  .day-content p { margin: 0 0 10px; color: var(--ink-900); font-size: 15px; }
  .day-content p:last-child { margin-bottom: 0; }

  .activity-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 14px; }
  .activity-tag { background: var(--sage-100); color: var(--ink-600); font-size: 12px; padding: 4px 12px; border-radius: 999px; }

  .hotel-block { margin-top: 18px; padding-top: 18px; border-top: 1px solid var(--sage-100); }
  .hotel-block .label { margin-bottom: 6px; }
  .hotel-carousel { display: flex; gap: 8px; margin-top: 12px; overflow-x: auto; padding-bottom: 4px; }
  .hotel-carousel img { width: 140px; height: 100px; object-fit: cover; border-radius: 12px; flex-shrink: 0; cursor: pointer; transition: opacity 0.15s; }
  .hotel-carousel img:hover { opacity: 0.85; }

  .lightbox { display: none; position: fixed; inset: 0; background: rgba(20,24,20,0.9); z-index: 100; align-items: center; justify-content: center; padding: 24px; }
  .lightbox.open { display: flex; }
  .lightbox img { max-width: 100%; max-height: 100%; border-radius: 12px; object-fit: contain; }
  .lightbox-close { position: absolute; top: 20px; right: 24px; width: 40px; height: 40px; border-radius: 999px; background: rgba(255,255,255,0.12); color: white; border: none; font-size: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
  .lightbox-close:hover { background: rgba(255,255,255,0.22); }

  .incl-excl-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media (max-width: 640px) { .incl-excl-grid { grid-template-columns: 1fr; } }
  .incl-excl-grid h3 { font-size: 15px; margin: 0 0 12px; display: flex; align-items: center; gap: 6px; }
  .incl-excl-grid ul { margin: 0; padding: 0; list-style: none; }
  .incl-excl-grid li { font-size: 14px; padding: 6px 0; color: var(--ink-900); display: flex; gap: 8px; }
  .incl-excl-grid li::before { content: ''; flex-shrink: 0; }

  .pricing-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; }
  .price-tile { text-align: center; }
  .price-tile .label { margin-bottom: 6px; }
  .price-tile .amount { font-family: 'Space Grotesk', sans-serif; font-weight: 800; font-size: 26px; color: var(--forest-600); }

  .bank-details h3 { font-size: 15px; margin: 0 0 14px; }
  .bank-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; }
  @media (max-width: 640px) { .bank-grid { grid-template-columns: 1fr; } }
  .bank-row { display: flex; justify-content: space-between; gap: 12px; padding: 7px 0; border-bottom: 1px solid var(--sage-100); font-size: 14px; }
  .bank-row span:first-child { color: var(--ink-600); }
  .bank-row span:last-child { font-weight: 500; text-align: right; }
  .bank-address { margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--sage-100); font-size: 13px; color: var(--ink-600); }

  .total-payable h3 { font-size: 15px; margin: 0 0 14px; }
  .total-row { display: flex; justify-content: space-between; font-size: 14px; color: var(--ink-600); padding: 5px 0; }
  .total-final { display: flex; justify-content: space-between; align-items: baseline; margin-top: 10px; padding-top: 12px; border-top: 1px solid var(--sage-100); }
  .total-final span:first-child { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 16px; }
  .total-final span:last-child { font-family: 'Space Grotesk', sans-serif; font-weight: 800; font-size: 26px; color: var(--forest-600); }

  .why-us-logo { text-align: center; margin-bottom: 22px; }
  .why-us-logo img { max-width: 220px; height: auto; }
  .why-us h3 { font-size: 17px; margin: 0 0 16px; text-align: center; }
  .trust-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  @media (max-width: 640px) { .trust-grid { grid-template-columns: 1fr; } }
  .trust-item h4 { font-family: 'Space Grotesk', sans-serif; font-size: 14px; margin: 0 0 6px; color: var(--forest-600); }
  .trust-item p { font-size: 13px; color: var(--ink-600); margin: 0; line-height: 1.6; }

  .contact-block { margin-top: 22px; padding-top: 20px; border-top: 1px solid var(--sage-100); display: flex; flex-wrap: wrap; gap: 8px 28px; justify-content: center; }
  .contact-item { font-size: 13px; color: var(--ink-600); }
  .contact-item a { color: var(--forest-600); text-decoration: none; font-weight: 500; }
  .contact-item a:hover { text-decoration: underline; }

  footer { text-align: center; padding: 40px 20px 60px; color: var(--ink-400); font-size: 13px; }
</style>
</head>
<body>

  <div class="hero">
    ${heroImage ? `<img src="${escapeHtml(heroImage)}" alt="${escapeHtml(itinerary.itinerary_name)}">` : ''}
    <div class="hero-overlay">
      <div class="hero-content">
        <div class="hero-badges">
          <span class="pill pill-light">${itinerary.safari_type === 'private' ? 'Private safari' : 'Shared safari'}</span>
          <span class="pill pill-light">${itinerary.transportation === 'van' ? 'Van' : 'Off-road jeep'}</span>
        </div>
        <h1>${escapeHtml(itinerary.itinerary_name)}</h1>
        <p>Prepared for ${escapeHtml(itinerary.client_name)}</p>
      </div>
    </div>
  </div>

  <div class="wrap">
    <div class="share-bar">
      <span class="label">Share this itinerary</span>
      <div class="share-buttons">
        <button onclick="copyLink(this)" title="Copy link" aria-label="Copy link">🔗</button>
        <a href="https://wa.me/?text=${encodeURIComponent(itinerary.itinerary_name + ' ' + pageUrl)}" target="_blank" rel="noopener" title="Share on WhatsApp" aria-label="Share on WhatsApp">↗</a>
        <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}" target="_blank" rel="noopener" title="Share on Facebook" aria-label="Share on Facebook">f</a>
        <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(itinerary.itinerary_name)}" target="_blank" rel="noopener" title="Share on X" aria-label="Share on X">𝕏</a>
      </div>
    </div>

    <section>
      ${days.map((day) => renderDay(day)).join('\n')}
    </section>

    <section class="card">
      <div class="incl-excl-grid">
        <div>
          <h3>✓ Included</h3>
          <ul>${inclusions.map((i) => `<li>${escapeHtml(i.text)}</li>`).join('')}</ul>
        </div>
        <div>
          <h3>✕ Excluded</h3>
          <ul>${exclusions.map((i) => `<li>${escapeHtml(i.text)}</li>`).join('')}</ul>
        </div>
      </div>
    </section>

    ${pricing.length ? `
    <section class="card">
      <div class="pricing-grid">
        ${pricing.map((p) => `
        <div class="price-tile">
          <div class="label">${TIER_LABELS[p.tier] ?? p.tier}</div>
          <div class="amount">${formatCurrency(Number(p.price), p.currency)}</div>
        </div>`).join('')}
      </div>
    </section>` : ''}

    ${(() => {
      const totalPayable = pricing.reduce((sum, p) => sum + Number(p.price) * (p.quantity ?? 0), 0)
      if (totalPayable <= 0) return ''
      const currency = pricing.find((p) => (p.quantity ?? 0) > 0)?.currency || pricing[0]?.currency || 'USD'
      const breakdown = pricing
        .filter((p) => (p.quantity ?? 0) > 0)
        .map((p) => `<div class="total-row"><span>${p.quantity} × ${TIER_LABELS[p.tier] ?? p.tier}</span><span>${formatCurrency(Number(p.price) * p.quantity, p.currency)}</span></div>`)
        .join('')
      return `
    <section class="card total-payable">
      <h3>Total amount payable</h3>
      <div class="total-breakdown">${breakdown}</div>
      <div class="total-final"><span>Total</span><span>${formatCurrency(totalPayable, currency)}</span></div>
    </section>`
    })()}

    <section class="card bank-details">
      <h3>${escapeHtml(BANK_DETAILS.heading)}</h3>
      <div class="bank-grid">
        ${BANK_DETAILS.rows.map(([label, value]) => `
        <div class="bank-row"><span>${escapeHtml(label)}</span><span>${escapeHtml(value)}</span></div>`).join('')}
      </div>
      <div class="bank-address">Company address: ${escapeHtml(BANK_DETAILS.companyAddress)}</div>
    </section>

    <section class="card why-us">
      <div class="why-us-logo">
        <img src="${escapeHtml(LOGO_URL)}" alt="Company logo">
      </div>
      <h3>Why work with us</h3>
      <div class="trust-grid">
        ${TRUST_POINTS.map((t) => `
        <div class="trust-item">
          <h4>${escapeHtml(t.title)}</h4>
          <p>${escapeHtml(t.body)}</p>
        </div>`).join('')}
      </div>
      <div class="contact-block">
        <span class="contact-item">${escapeHtml(CONTACT_DETAILS.address)}</span>
        ${CONTACT_DETAILS.phones.map((p) => `<span class="contact-item">${escapeHtml(p.label)}: ${escapeHtml(p.value)}</span>`).join('')}
        <span class="contact-item"><a href="mailto:${escapeHtml(CONTACT_DETAILS.email)}">${escapeHtml(CONTACT_DETAILS.email)}</a></span>
        <span class="contact-item"><a href="${escapeHtml(CONTACT_DETAILS.website.href)}" target="_blank" rel="noopener">${escapeHtml(CONTACT_DETAILS.website.label)}</a></span>
      </div>
    </section>

    <footer>${escapeHtml(itinerary.itinerary_name)} · Prepared for ${escapeHtml(itinerary.client_name)}</footer>
  </div>

  <div class="lightbox" id="lightbox" onclick="closeLightbox(event)">
    <button class="lightbox-close" onclick="closeLightbox(event)" aria-label="Close">✕</button>
    <img id="lightbox-img" src="" alt="" onclick="event.stopPropagation()">
  </div>

<script>
  function copyLink(btn) {
    navigator.clipboard.writeText(window.location.href).then(() => {
      const original = btn.textContent;
      btn.textContent = '✓';
      setTimeout(() => { btn.textContent = original; }, 1500);
    });
  }

  function openLightbox(src) {
    document.getElementById('lightbox-img').src = src;
    document.getElementById('lightbox').classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox(e) {
    if (e) e.stopPropagation();
    document.getElementById('lightbox').classList.remove('open');
    document.body.style.overflow = '';
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
  });
</script>
</body>
</html>`
}

function renderDay(day) {
  const blocks = (day.day_content_blocks ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((b) => b.content)
    .filter(Boolean)
    .join('')

  const activities = (day.day_activities ?? [])
    .map((a) => `<span class="activity-tag">${ACTIVITY_LABELS[a.activity] ?? a.activity}</span>`)
    .join('')

  const images = (day.day_hotel_images ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((img) => `<img src="${escapeHtml(img.image_url)}" alt="" onclick="openLightbox('${escapeHtml(img.image_url)}')">`)
    .join('')

  return `
  <div class="card day-card">
    <h2 class="font-display">Day ${day.day_number}</h2>
    <div class="day-content">${blocks}</div>
    ${activities ? `<div class="activity-tags">${activities}</div>` : ''}
    ${day.hotel_description ? `
    <div class="hotel-block">
      <div class="label">Tonight's stay</div>
      <div class="day-content">${day.hotel_description}</div>
      ${images ? `<div class="hotel-carousel">${images}</div>` : ''}
    </div>` : ''}
  </div>`
}

function buildDescription(itinerary, days) {
  const nights = days.length
  const type = itinerary.safari_type === 'private' ? 'private' : 'shared'
  return `A ${nights}-day ${type} safari itinerary prepared for ${itinerary.client_name}.`
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
