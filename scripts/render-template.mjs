import { formatCurrency } from './currency.ts'
import { t, getActivityLabel } from './i18n.ts'
import { renderMapSection } from './map-section.ts'
import { getTemplate } from './templates.ts'

function formatDateRange(startDate: string | null, endDate: string | null, lang: string): string {
  if (!startDate) return ''
  const locale = lang === 'pl' ? 'pl-PL' : lang === 'de' ? 'de-DE' : lang === 'fr' ? 'fr-FR' : 'en-GB'
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }
  const start = new Date(startDate + 'T00:00:00').toLocaleDateString(locale, opts)
  if (!endDate) return start
  const end = new Date(endDate + 'T00:00:00').toLocaleDateString(locale, opts)
  return `${start} \u2013 ${end}`
}

// Dispatches by template — African Routes gets the new editorial Tailwind design,
// every other template (Safari Kenia) keeps the original design untouched.
export function renderItineraryPage(data: any, siteBaseUrl: string) {
  const tpl = getTemplate(data.itinerary.template || 'safari_kenia')
  if ((data.itinerary.template || 'safari_kenia') === 'african_routes') {
    return renderAfricanRoutesPage(data, siteBaseUrl, tpl)
  }
  return renderClassicPage(data, siteBaseUrl, tpl)
}

const VEHICLE_ORDER = ['jeep', 'van']

function activePriceGroups(pricing: any[]) {
  return VEHICLE_ORDER.filter((v) => pricing.some((p: any) => (p.vehicle_type ?? 'jeep') === v && Number(p.price) > 0))
}

function computeGrandTotal(pricing: any[]): { total: number; currency: string } {
  const withQty = pricing.filter((p: any) => (p.quantity ?? 0) > 0 && Number(p.price) > 0)
  const total = withQty.reduce((s: number, p: any) => s + Number(p.price) * p.quantity, 0)
  const currency = withQty[0]?.currency || pricing[0]?.currency || 'USD'
  return { total, currency }
}

function esc(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function buildDescription(it: any, days: any[], lang: string) {
  return `${days.length}-${t(lang, 'day').toLowerCase()} ${(it.safari_type === 'private' ? t(lang, 'private_safari') : t(lang, 'shared_safari')).toLowerCase()} \u2014 ${it.client_name}`
}

function renderAfricanRoutesPage({ itinerary, days, inclusions, exclusions, pricing, imageMap }: any, siteBaseUrl: string, tpl: any) {
  const lang = itinerary.language || 'en'
  const pageUrl = `${siteBaseUrl.replace(/\/$/, '')}/${itinerary.slug}.html`
  const description = buildDescription(itinerary, days, lang)
  const resolvedImageMap: Record<string, string> = imageMap || {}
  const heroImage = resolvedImageMap[itinerary.hero_image_url] || itinerary.hero_image_url || ''
  const mapHtml = renderMapSection(days, lang)
  const C = tpl.contact
  const B = tpl.bank
  const dateRange = formatDateRange(itinerary.start_date, itinerary.end_date, lang)
  const { total: grandTotal, currency: grandCurrency } = computeGrandTotal(pricing)

  const dayCards = days.map((day: any, i: number) => renderArDayCard(day, i, days.length, lang, resolvedImageMap)).join('\n')

  const trustHtml = tpl.trustBadges
    .map(
      (b: any) => `<div class="p-8 md:p-12 flex flex-col items-center text-center">
        <div class="h-12 mb-6 flex items-center justify-center"><img src="${esc(b.logoUrl)}" alt="${esc(t(lang, b.titleKey))}" class="max-h-12 max-w-[160px] object-contain"></div>
        <h4 class="font-medium text-gray-900 mb-3 text-lg">${esc(t(lang, b.titleKey))}</h4>
        <p class="text-sm text-gray-500 leading-relaxed">${esc(t(lang, b.bodyKey))}</p>
      </div>`
    )
    .join('')

  return `<!doctype html>
<html lang="${lang}" class="scroll-smooth">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(itinerary.itinerary_name)} \u2014 ${esc(itinerary.client_name)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:type" content="website"><meta property="og:title" content="${esc(itinerary.itinerary_name)}"><meta property="og:description" content="${esc(description)}"><meta property="og:image" content="${esc(heroImage)}"><meta property="og:url" content="${esc(pageUrl)}"><meta name="twitter:card" content="summary_large_image">
<meta name="robots" content="noindex, nofollow">
<link rel="canonical" href="${esc(pageUrl)}">
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
body{font-family:'Inter',sans-serif;background-color:#fafafa;color:#1a1a1a}
::-webkit-scrollbar{width:8px}::-webkit-scrollbar-track{background:#f1f1f1}::-webkit-scrollbar-thumb{background:#888}::-webkit-scrollbar-thumb:hover{background:#555}
.grid-container{max-width:80rem;margin:0 auto;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb}
.text-fluid-hero{font-size:clamp(3rem,6vw,5rem);line-height:1.1}
</style>
</head>
<body class="antialiased">

  <section class="relative h-screen min-h-[600px] w-full flex flex-col justify-between" style="background-image:url('${esc(heroImage)}');background-size:cover;background-position:center;">
    <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10"></div>
    <nav class="relative z-10 w-full px-8 py-6 flex justify-between items-center max-w-7xl mx-auto">
      <div class="text-white font-bold text-xl tracking-widest uppercase">${esc(tpl.name)}</div>
    </nav>
    <div class="relative z-10 w-full max-w-7xl mx-auto px-8 pb-24 md:pb-32 flex flex-col justify-end h-full">
      <div class="flex flex-wrap gap-2 mb-6">
        <span class="bg-white/20 backdrop-blur-md text-white text-xs font-medium px-4 py-1.5 rounded-full uppercase tracking-wider border border-white/30">${itinerary.safari_type === 'private' ? t(lang, 'private_safari') : t(lang, 'shared_safari')}</span>
        <span class="bg-white/20 backdrop-blur-md text-white text-xs font-medium px-4 py-1.5 rounded-full uppercase tracking-wider border border-white/30">${itinerary.transportation === 'van' ? t(lang, 'van') : t(lang, 'jeep')}</span>
      </div>
      <h1 class="text-white text-fluid-hero font-light max-w-5xl mb-6">${esc(itinerary.itinerary_name)}</h1>
      <p class="text-white/90 text-xl font-medium max-w-xl mb-2">${t(lang, 'proposal_prepared_for')} ${esc(itinerary.client_name)}</p>
      ${dateRange ? `<p class="text-white/70 text-base max-w-xl mb-12 flex items-center gap-2"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>${esc(dateRange)}</p>` : ''}
      ${
        grandTotal > 0
          ? `<div class="absolute bottom-12 right-8 md:bottom-24 md:right-12 bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-xl w-72 hidden md:block">
        <div class="flex items-center gap-2 mb-3"><span class="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span><span class="text-white text-xs font-bold uppercase tracking-wider">${t(lang, 'total_payable')}</span></div>
        <h3 class="text-white font-medium mb-1">${t(lang, 'total_payable')}</h3>
        <div class="flex justify-between items-end border-t border-white/20 pt-4"><span class="text-white font-bold text-3xl">${formatCurrency(grandTotal, grandCurrency)}</span></div>
      </div>`
          : ''
      }
      <div class="flex items-center gap-4 text-white/70 text-sm mt-auto">
        <span>${t(lang, 'share_itinerary')}</span>
        <svg class="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
      </div>
    </div>
  </section>

  <section class="bg-white">
    <div class="grid-container flex flex-col md:flex-row border-b border-gray-200">
      <div class="w-full md:w-1/4 p-6 md:p-8 border-b md:border-b-0 md:border-r border-gray-200 flex items-start">
        <span class="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">${t(lang, 'tour_overview')}</span>
      </div>
      <div class="w-full md:w-3/4 flex flex-col">
        <div class="p-8 md:p-16 lg:p-24">
          <h2 class="text-3xl md:text-5xl font-light leading-tight text-gray-900">${esc(t(lang, 'tour_overview_intro').replace('{days}', String(days.length)))} <span class="font-medium text-emerald-800">${esc(itinerary.client_name)}</span>.</h2>
        </div>
      </div>
    </div>
  </section>

  <section class="bg-white">
    <div class="grid-container border-b border-gray-200">
      <div class="flex flex-col md:flex-row border-b border-gray-200">
        <div class="w-full md:w-1/4 p-6 md:p-8 border-b md:border-b-0 md:border-r border-gray-200"><span class="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">${t(lang, 'daily_itinerary')}</span></div>
        <div class="w-full md:w-3/4 p-6 md:p-8 flex items-center justify-end md:justify-start bg-gray-50/50"><h2 class="text-3xl md:text-4xl font-light text-gray-900">${esc(t(lang, 'your_schedule').replace('{days}', String(days.length)))}</h2></div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2">
        ${dayCards}
      </div>
    </div>
  </section>

  ${mapHtml ? `<section class="bg-white"><div class="grid-container border-b border-gray-200 p-6 md:p-8">${mapHtml}</div></section>` : ''}

  <section class="bg-white">
    <div class="grid-container border-b border-gray-200 flex flex-col md:flex-row">
      <div class="w-full md:w-1/2 p-8 md:p-12 border-b md:border-b-0 md:border-r border-gray-200">
        <h3 class="text-lg font-medium mb-6 flex items-center gap-3 text-emerald-800"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>${t(lang, 'included')}</h3>
        <ul class="space-y-3">${inclusions.map((i: any) => `<li class="text-sm text-gray-600 flex items-start gap-2"><span class="text-emerald-500 mt-0.5">•</span> ${esc(i.text)}</li>`).join('')}</ul>
      </div>
      <div class="w-full md:w-1/2 p-8 md:p-12">
        <h3 class="text-lg font-medium mb-6 flex items-center gap-3 text-red-800"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>${t(lang, 'excluded')}</h3>
        <ul class="space-y-3">${exclusions.map((i: any) => `<li class="text-sm text-gray-600 flex items-start gap-2"><span class="text-red-400 mt-0.5">•</span> ${esc(i.text)}</li>`).join('')}</ul>
      </div>
    </div>
  </section>

  ${renderArPricingSection(pricing, lang, B)}

  <section class="bg-white">
    <div class="grid-container border-b border-gray-200">
      <div class="p-6 md:p-8 border-b border-gray-200 text-center"><span class="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">${t(lang, 'why_us')}</span></div>
      <div class="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-200">${trustHtml}</div>
    </div>
  </section>

  <footer class="relative bg-emerald-950 text-white pt-24 pb-12 overflow-hidden">
    <div class="relative z-10 max-w-7xl mx-auto px-8 flex flex-col items-center text-center mb-16">
      <h2 class="text-3xl md:text-5xl font-light mb-8 leading-tight">${esc(t(lang, 'footer_cta'))}</h2>
      <div class="flex flex-col sm:flex-row gap-4">
        <a href="mailto:${esc(C.email)}" class="bg-white text-emerald-950 px-8 py-3 rounded-full font-medium hover:bg-gray-100 transition">${esc(t(lang, 'confirm_booking'))}</a>
        <button onclick="window.print()" class="bg-transparent border border-white/30 px-8 py-3 rounded-full text-white hover:bg-white/10 transition">${esc(t(lang, 'print_itinerary'))}</button>
      </div>
    </div>
    <div class="relative z-10 max-w-7xl mx-auto px-8 border-t border-white/10 pt-12 flex flex-col md:flex-row justify-between text-sm text-emerald-200/60">
      <div class="mb-8 md:mb-0 w-full md:w-1/3">
        <div class="text-white font-bold text-xl tracking-widest uppercase mb-4">${esc(tpl.name)}</div>
        <p class="text-emerald-200/60 text-xs mt-4 max-w-xs">${esc(itinerary.itinerary_name.toUpperCase())}<br>${t(lang, 'prepared_for')} ${esc(itinerary.client_name)}</p>
      </div>
      <div class="w-full md:w-2/3 flex flex-wrap justify-between md:justify-end gap-8 md:gap-24">
        <div class="flex flex-col gap-3">
          <span class="text-white font-medium mb-1">${t(lang, 'contact_us')}</span>
          <a href="mailto:${esc(C.email)}" class="hover:text-white transition">${esc(C.email)}</a>
          ${C.phones.map((p: any) => `<span class="hover:text-white transition">${esc(p.value)}</span>`).join('')}
        </div>
        <div class="flex flex-col gap-3">
          <span class="text-white font-medium mb-1">${t(lang, 'location')}</span>
          <span class="hover:text-white transition">${esc(C.address)}</span>
          <a href="${esc(C.website.href)}" target="_blank" rel="noopener" class="hover:text-white transition underline mt-2">${esc(C.website.label)}</a>
        </div>
      </div>
    </div>
  </footer>

  <div class="lightbox fixed inset-0 bg-black/90 z-[100] hidden items-center justify-center p-6" id="lightbox" onclick="closeLightbox(event)">
    <button class="absolute top-5 right-6 w-10 h-10 rounded-full bg-white/10 text-white text-xl flex items-center justify-center" onclick="closeLightbox(event)">✕</button>
    <img id="lightbox-img" src="" alt="" class="max-w-full max-h-full rounded-lg object-contain" onclick="event.stopPropagation()">
  </div>
<script>
function openLightbox(s){document.getElementById('lightbox-img').src=s;var lb=document.getElementById('lightbox');lb.classList.remove('hidden');lb.classList.add('flex');document.body.style.overflow='hidden'}
function closeLightbox(e){if(e)e.stopPropagation();var lb=document.getElementById('lightbox');lb.classList.add('hidden');lb.classList.remove('flex');document.body.style.overflow=''}
document.addEventListener('keydown',function(e){if(e.key==='Escape')closeLightbox()})
function initArSliders(){document.querySelectorAll('.ar-day-slider').forEach(function(el){var imgs=[];try{imgs=JSON.parse(el.getAttribute('data-images')||'[]')}catch(e){imgs=[]}if(!imgs.length)return;var idx=0;var imgEl=el.querySelector('img');function show(i){idx=(i+imgs.length)%imgs.length;imgEl.src=imgs[idx]}imgEl.addEventListener('click',function(){openLightbox(imgs[idx])});var prev=el.querySelector('.ar-nav-prev');var next=el.querySelector('.ar-nav-next');if(prev)prev.addEventListener('click',function(e){e.stopPropagation();show(idx-1)});if(next)next.addEventListener('click',function(e){e.stopPropagation();show(idx+1)})})}
document.addEventListener('DOMContentLoaded',initArSliders)
</script>
</body>
</html>`
}

function renderArDayCard(day: any, index: number, totalDays: number, lang: string, imageMap: Record<string, string>) {
  const blocks = (day.day_content_blocks ?? []).slice().sort((a: any, b: any) => a.sort_order - b.sort_order).map((b: any) => b.content).filter(Boolean).join('')
  const acts = (day.day_activities ?? []).map((a: any) => `<span class="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-sm border border-gray-200 uppercase font-medium tracking-wide h-max">${esc(getActivityLabel(lang, a.activity))}</span>`).join('')
  const imageUrls = (day.day_hotel_images ?? [])
    .slice()
    .sort((a: any, b: any) => a.sort_order - b.sort_order)
    .map((i: any) => imageMap[i.image_url] || i.image_url)

  const title = day.location_name || `${t(lang, 'day')} ${day.day_number}`
  const isLast = index === totalDays - 1
  const rightBorder = index % 2 === 0 ? ' md:border-r' : ''
  const bottomBorder = isLast ? '' : ' border-b'
  const cardClasses = `p-8${bottomBorder}${rightBorder} border-gray-200 flex flex-col group`

  const imageHtml = imageUrls.length
    ? `<div class="ar-day-slider relative mb-4" data-images="${esc(JSON.stringify(imageUrls))}">
        <img src="${esc(imageUrls[0])}" alt="" class="w-full h-40 object-cover rounded shadow-sm grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all cursor-zoom-in">
        ${imageUrls.length > 1 ? `<button type="button" class="ar-nav-prev absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs z-10" aria-label="Previous photo">&#10094;</button><button type="button" class="ar-nav-next absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs z-10" aria-label="Next photo">&#10095;</button>` : ''}
      </div>`
    : ''

  const stayText = day.hotel_description ? String(day.hotel_description).replace(/<[^>]*>/g, ' ').trim().slice(0, 70) : ''
  const stayFooter = stayText
    ? `<div class="flex items-center gap-3 mt-auto pt-4 border-t border-gray-100"><span class="w-2 h-2 bg-emerald-600 rounded-full"></span><span class="text-xs font-semibold text-gray-800 uppercase tracking-wide">${t(lang, 'tonights_stay')}: ${esc(stayText)}</span></div>`
    : ''

  return `<div class="${cardClasses}">
    <div class="flex items-end gap-4 mb-6">
      <div class="text-5xl font-light text-emerald-800/20 group-hover:text-emerald-800 transition-colors">${String(day.day_number).padStart(2, '0')}</div>
      <h3 class="text-xl font-medium pb-1">${esc(title)}</h3>
    </div>
    <div class="text-sm text-gray-600 mb-6 leading-relaxed">${blocks}</div>
    ${acts ? `<div class="flex flex-wrap gap-2 mb-6 flex-grow">${acts}</div>` : ''}
    ${imageHtml}
    ${stayFooter}
  </div>`
}

function renderArPricingSection(pricing: any[], lang: string, B: any) {
  const { total, currency } = computeGrandTotal(pricing)
  if (total <= 0) return ''
  return `<section class="bg-white">
    <div class="grid-container border-b border-gray-200">
      <div class="p-6 md:p-8 border-b border-gray-200"><span class="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">${t(lang, 'pricing_payment')}</span></div>
      <div class="flex flex-col md:flex-row pb-12 pt-12 px-4 md:px-0">
        <div class="w-full md:w-1/3 text-center md:border-r border-gray-200 pb-8 md:pb-0 relative z-10 flex flex-col items-center justify-center">
          <div class="absolute inset-x-4 top-4 bottom-[-1rem] bg-gradient-to-b from-emerald-100/50 to-emerald-200/50 -z-10 rounded-sm"></div>
          <span class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">${t(lang, 'total_payable')}</span>
          <div class="text-6xl md:text-7xl font-bold text-emerald-800 mb-2">${formatCurrency(total, currency)}</div>
          <p class="text-sm font-medium text-gray-600">${t(lang, 'total_payable')}</p>
        </div>
        <div class="w-full md:w-2/3 px-8 md:px-16 flex flex-col justify-center">
          <h3 class="text-sm font-bold uppercase tracking-wider text-gray-800 mb-6">${t(lang, 'bank_details_heading')}</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 mb-8">
            ${B.rows
              .map(
                ([l, v]: string[]) =>
                  `<div class="flex justify-between border-b border-gray-200 pb-2"><span class="text-sm text-gray-500">${t(lang, 'bank_' + l.toLowerCase().replace(/\s+/g, '_')) || esc(l)}</span><span class="text-sm font-medium text-gray-900 text-right">${esc(v)}</span></div>`
              )
              .join('')}
          </div>
          <div class="text-xs text-gray-400">${t(lang, 'company_address')}: ${esc(B.companyAddress)}</div>
        </div>
      </div>
    </div>
  </section>`
}

function renderClassicPage({ itinerary, days, inclusions, exclusions, pricing, imageMap }: any, siteBaseUrl: string, tpl: any) {
  const lang = itinerary.language || 'en'
  const pageUrl = `${siteBaseUrl.replace(/\/$/, '')}/${itinerary.slug}.html`
  const description = buildDescription(itinerary, days, lang)
  const resolvedImageMap: Record<string, string> = imageMap || {}
  const heroImage = resolvedImageMap[itinerary.hero_image_url] || itinerary.hero_image_url || ''
  const mapHtml = renderMapSection(days, lang)
  const C = tpl.contact
  const B = tpl.bank
  const dateRange = formatDateRange(itinerary.start_date, itinerary.end_date, lang)

  return `<!doctype html><html lang="${lang}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${esc(itinerary.itinerary_name)} \u2014 ${esc(itinerary.client_name)}</title><meta name="description" content="${esc(description)}"><meta property="og:type" content="website"><meta property="og:title" content="${esc(itinerary.itinerary_name)}"><meta property="og:description" content="${esc(description)}"><meta property="og:image" content="${esc(heroImage)}"><meta property="og:url" content="${esc(pageUrl)}"><meta name="twitter:card" content="summary_large_image"><link rel="canonical" href="${esc(pageUrl)}"><link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700;800&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet"><style>:root{--sage-50:#f3f7ef;--sage-100:#e7eee1;--sage-200:#d3e0c8;--forest-600:#2f4a3c;--forest-700:#23372d;--ink-900:#1c231d;--ink-600:#5b6b5e;--ink-400:#8a978c}*{box-sizing:border-box}body{margin:0;background:var(--sage-100);color:var(--ink-900);font-family:'Inter',ui-sans-serif,sans-serif;line-height:1.6}h1,h2,h3,.font-display{font-family:'Space Grotesk',ui-sans-serif,sans-serif;letter-spacing:-0.01em}.wrap{max-width:860px;margin:0 auto;padding:0 20px}.label{font-family:'IBM Plex Mono',ui-monospace,monospace;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:var(--ink-400)}.topbar{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;max-width:860px;margin:0 auto}.topbar img{height:40px;width:auto}.topbar a.home-btn{display:inline-flex;align-items:center;gap:6px;font-family:'Space Grotesk',sans-serif;font-size:13px;font-weight:600;color:var(--forest-600);text-decoration:none;padding:7px 16px;border-radius:999px;background:white;box-shadow:0 2px 8px rgba(28,35,29,0.08)}.topbar a.home-btn:hover{background:var(--sage-50)}.hero{position:relative;height:68vh;min-height:460px;background:var(--sage-200)}.hero img{width:100%;height:100%;object-fit:cover;display:block}.hero-overlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(28,35,29,0.72) 0%,rgba(28,35,29,0.15) 55%,transparent 100%);display:flex;align-items:flex-end}.hero-content{padding:32px 20px;max-width:860px;margin:0 auto;width:100%;color:white}.hero-badges{display:flex;gap:8px;margin-bottom:12px}.pill{display:inline-flex;align-items:center;padding:5px 14px;border-radius:999px;font-size:12px;font-weight:500}.pill-light{background:rgba(255,255,255,0.18);color:white;backdrop-filter:blur(4px)}.hero h1{font-size:42px;font-weight:800;margin:0 0 6px}.hero p{margin:0;opacity:0.85;font-size:16px}.hero .date-line{margin-top:6px;opacity:0.7;font-size:14px;display:flex;align-items:center;gap:6px}.share-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;background:white;border-radius:999px;padding:10px 10px 10px 20px;margin-top:-28px;position:relative;z-index:2;box-shadow:0 8px 24px rgba(28,35,29,0.08);flex-wrap:wrap}.share-bar .label{margin:0}.share-buttons{display:flex;gap:6px}.share-buttons a,.share-buttons button{width:36px;height:36px;border-radius:999px;border:none;background:var(--sage-100);color:var(--forest-600);display:flex;align-items:center;justify-content:center;cursor:pointer;text-decoration:none;font-size:15px}.share-buttons a:hover,.share-buttons button:hover{background:var(--sage-200)}.copy-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--forest-600);color:white;padding:10px 24px;border-radius:999px;font-size:13px;font-weight:500;opacity:0;pointer-events:none;transition:opacity 0.3s;z-index:200}.copy-toast.show{opacity:1}section{margin-top:28px}.card{background:white;border-radius:20px;padding:24px}.day-card{margin-bottom:12px}.day-card h2{font-size:18px;margin:0 0 12px}.day-content p{margin:0 0 10px;color:var(--ink-900);font-size:15px}.day-content p:last-child{margin-bottom:0}.activity-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:14px}.activity-tag{background:var(--sage-100);color:var(--ink-600);font-size:12px;padding:4px 12px;border-radius:999px}.hotel-block{margin-top:18px;padding-top:18px;border-top:1px solid var(--sage-100)}.hotel-block .label{margin-bottom:6px}.hotel-slider{position:relative;margin-top:12px;border-radius:16px;overflow:hidden;background:var(--sage-100)}.hotel-slider img{width:100%;height:360px;object-fit:cover;display:block;cursor:zoom-in}.hotel-slider .nav-btn{position:absolute;top:50%;transform:translateY(-50%);width:40px;height:40px;border-radius:999px;background:rgba(0,0,0,0.45);color:white;border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:16px;line-height:1}.hotel-slider .nav-btn:hover{background:rgba(0,0,0,0.65)}.hotel-slider .nav-prev{left:12px}.hotel-slider .nav-next{right:12px}.hotel-slider .dots{position:absolute;bottom:12px;left:0;right:0;display:flex;justify-content:center;gap:6px}.hotel-slider .dot{width:7px;height:7px;border-radius:999px;background:rgba(255,255,255,0.5);cursor:pointer;border:none;padding:0}.hotel-slider .dot.active{background:white}.lightbox{display:none;position:fixed;inset:0;background:rgba(20,24,20,0.9);z-index:100;align-items:center;justify-content:center;padding:24px}.lightbox.open{display:flex}.lightbox img{max-width:100%;max-height:100%;border-radius:12px;object-fit:contain}.lightbox-close{position:absolute;top:20px;right:24px;width:40px;height:40px;border-radius:999px;background:rgba(255,255,255,0.12);color:white;border:none;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center}.lightbox-close:hover{background:rgba(255,255,255,0.22)}.incl-excl-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}@media(max-width:640px){.incl-excl-grid{grid-template-columns:1fr}}.incl-excl-grid h3{font-size:15px;margin:0 0 12px;display:flex;align-items:center;gap:6px}.incl-excl-grid ul{margin:0;padding:0;list-style:none}.incl-excl-grid li{font-size:14px;padding:6px 0;color:var(--ink-900);display:flex;gap:8px}.pricing-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px}.price-group+.price-group{margin-top:20px;padding-top:20px;border-top:1px solid var(--sage-100)}.price-group-label{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:14px;color:var(--forest-600);margin-bottom:12px}.price-tile{text-align:center}.price-tile .label{margin-bottom:6px}.price-tile .amount{font-family:'Space Grotesk',sans-serif;font-weight:800;font-size:26px;color:var(--forest-600)}.bank-details h3{font-size:15px;margin:0 0 14px}.bank-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 24px}@media(max-width:640px){.bank-grid{grid-template-columns:1fr}}.bank-row{display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px solid var(--sage-100);font-size:14px}.bank-row span:first-child{color:var(--ink-600)}.bank-row span:last-child{font-weight:500;text-align:right}.bank-address{margin-top:14px;padding-top:14px;border-top:1px solid var(--sage-100);font-size:13px;color:var(--ink-600)}.total-payable h3{font-size:15px;margin:0 0 6px}.total-payable+.total-payable{margin-top:16px}.total-payable-group{margin-bottom:18px}.total-payable-group:last-child{margin-bottom:0}.total-group-label{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:13px;color:var(--ink-600);margin-bottom:8px}.total-row{display:flex;justify-content:space-between;font-size:14px;color:var(--ink-600);padding:5px 0}.total-final{display:flex;justify-content:space-between;align-items:baseline;margin-top:10px;padding-top:12px;border-top:1px solid var(--sage-100)}.total-final span:first-child{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:16px}.total-final span:last-child{font-family:'Space Grotesk',sans-serif;font-weight:800;font-size:26px;color:var(--forest-600)}.why-us-logo{text-align:center;margin-bottom:22px}.why-us-logo img{max-width:220px;height:auto}.why-us h3{font-size:17px;margin:0 0 24px;text-align:center}.trust-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:24px}@media(max-width:768px){.trust-grid{grid-template-columns:1fr}}.trust-item{text-align:center}.trust-item .trust-logo{height:60px;margin-bottom:14px;display:flex;align-items:center;justify-content:center}.trust-item .trust-logo img{max-height:60px;max-width:160px;object-fit:contain}.trust-item h4{font-family:'Space Grotesk',sans-serif;font-size:14px;margin:0 0 8px;color:var(--forest-600)}.trust-item p{font-size:12px;color:var(--ink-600);margin:0;line-height:1.6}.contact-block{margin-top:22px;padding-top:20px;border-top:1px solid var(--sage-100);display:flex;flex-wrap:wrap;gap:8px 28px;justify-content:center}.contact-item{font-size:13px;color:var(--ink-600)}.contact-item a{color:var(--forest-600);text-decoration:none;font-weight:500}.contact-item a:hover{text-decoration:underline}footer{text-align:center;padding:40px 20px 60px;color:var(--ink-400);font-size:13px}.gallery-grid{display:grid;grid-template-columns:repeat(4,1fr);grid-auto-rows:110px;gap:8px;margin-top:14px}.gallery-grid .g-item{overflow:hidden;border-radius:12px;background:var(--sage-200)}.gallery-grid .g-item img{width:100%;height:100%;object-fit:cover;display:block;cursor:zoom-in}.gallery-grid .g-item:nth-child(6n+1){grid-column:span 2;grid-row:span 2}.gallery-grid .g-item:nth-child(6n+4){grid-column:span 2}@media(max-width:640px){.gallery-grid{grid-template-columns:repeat(2,1fr)}.gallery-grid .g-item:nth-child(6n+4){grid-column:span 1}}</style></head><body>
  <div class="topbar"><a href="${esc(tpl.homeUrl)}" target="_blank" rel="noopener"><img src="${esc(tpl.logoUrl)}" alt="${esc(tpl.name)}"></a><a href="${esc(tpl.homeUrl)}" target="_blank" rel="noopener" class="home-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>Home</a></div>
  <div class="hero">${heroImage ? `<img src="${esc(heroImage)}" alt="${esc(itinerary.itinerary_name)}">` : ''}<div class="hero-overlay"><div class="hero-content"><div class="hero-badges"><span class="pill pill-light">${itinerary.safari_type === 'private' ? t(lang, 'private_safari') : t(lang, 'shared_safari')}</span><span class="pill pill-light">${itinerary.transportation === 'van' ? t(lang, 'van') : t(lang, 'jeep')}</span></div><h1>${esc(itinerary.itinerary_name)}</h1><p>${t(lang, 'proposal_prepared_for')} ${esc(itinerary.client_name)}</p>${dateRange ? `<p class="date-line"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${esc(dateRange)}</p>` : ''}</div></div></div>
  <div class="wrap">
    <div class="share-bar"><span class="label">${t(lang, 'share_itinerary')}</span><div class="share-buttons"><button onclick="copyPageLink()" title="${t(lang, 'copy_link')}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></button><a href="https://wa.me/?text=${encodeURIComponent(itinerary.itinerary_name + ' ' + pageUrl)}" target="_blank" rel="noopener"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.116.549 4.103 1.513 5.833L0 24l6.33-1.468A11.938 11.938 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75c-1.97 0-3.837-.53-5.45-1.459l-.39-.232-4.05.94.975-3.922-.257-.406A9.724 9.724 0 012.25 12 9.75 9.75 0 0112 2.25 9.75 9.75 0 0121.75 12 9.75 9.75 0 0112 21.75z"/></svg></a><a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}" target="_blank" rel="noopener">f</a><a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(itinerary.itinerary_name)}" target="_blank" rel="noopener">\ud835\udd4f</a></div></div>
    <section>${days.map((day: any) => renderClassicDay(day, lang, resolvedImageMap)).join('\n')}</section>
    ${renderClassicGallery(days, lang, resolvedImageMap)}
    ${mapHtml}
    <section class="card"><div class="incl-excl-grid"><div><h3>✓ ${t(lang, 'included')}</h3><ul>${inclusions.map((i: any) => `<li>${esc(i.text)}</li>`).join('')}</ul></div><div><h3>✕ ${t(lang, 'excluded')}</h3><ul>${exclusions.map((i: any) => `<li>${esc(i.text)}</li>`).join('')}</ul></div></div></section>
    ${renderClassicPricingSection(pricing, lang)}
    ${renderClassicTotalsSection(pricing, lang)}
    <section class="card bank-details"><h3>${t(lang, 'bank_details_heading')}</h3><div class="bank-grid">${B.rows.map(([l, v]: string[]) => `<div class="bank-row"><span>${t(lang, 'bank_' + l.toLowerCase().replace(/\s+/g, '_')) || esc(l)}</span><span>${esc(v)}</span></div>`).join('')}</div><div class="bank-address">${t(lang, 'company_address')}: ${esc(B.companyAddress)}</div></section>
    <section class="card why-us"><div class="why-us-logo"><img src="${esc(tpl.logoUrl)}" alt="${esc(tpl.name)}"></div><h3>${t(lang, 'why_us')}</h3><div class="trust-grid">${tpl.trustBadges.map((b: any) => `<div class="trust-item"><div class="trust-logo"><img src="${esc(b.logoUrl)}" alt="${t(lang, b.titleKey)}"></div><h4>${t(lang, b.titleKey)}</h4><p>${t(lang, b.bodyKey)}</p></div>`).join('')}</div><div class="contact-block"><span class="contact-item">${esc(C.address)}</span>${C.phones.map((p: any) => `<span class="contact-item">${esc(p.label)}: ${esc(p.value)}</span>`).join('')}<span class="contact-item"><a href="mailto:${esc(C.email)}">${esc(C.email)}</a></span><span class="contact-item"><a href="${esc(C.website.href)}" target="_blank" rel="noopener">${esc(C.website.label)}</a></span></div></section>
    <footer>${esc(itinerary.itinerary_name)} · ${t(lang, 'prepared_for')} ${esc(itinerary.client_name)}</footer>
  </div>
  <div class="copy-toast" id="copy-toast">${t(lang, 'link_copied')}</div>
  <div class="lightbox" id="lightbox" onclick="closeLightbox(event)"><button class="lightbox-close" onclick="closeLightbox(event)">✕</button><img id="lightbox-img" src="" alt="" onclick="event.stopPropagation()"></div>
<script>function copyPageLink(){navigator.clipboard.writeText(window.location.href).then(()=>{var t=document.getElementById('copy-toast');t.classList.add('show');setTimeout(()=>{t.classList.remove('show')},2000)})}function openLightbox(s){document.getElementById('lightbox-img').src=s;document.getElementById('lightbox').classList.add('open');document.body.style.overflow='hidden'}function closeLightbox(e){if(e)e.stopPropagation();document.getElementById('lightbox').classList.remove('open');document.body.style.overflow=''}document.addEventListener('keydown',(e)=>{if(e.key==='Escape')closeLightbox()})
function initHotelSliders(){document.querySelectorAll('.hotel-slider').forEach(function(el){var imgs=[];try{imgs=JSON.parse(el.getAttribute('data-images')||'[]')}catch(e){imgs=[]}if(!imgs.length)return;var idx=0;var imgEl=el.querySelector('img');var dots=el.querySelectorAll('.dot');function show(i){idx=(i+imgs.length)%imgs.length;imgEl.src=imgs[idx];dots.forEach(function(d,j){d.classList.toggle('active',j===idx)})}imgEl.addEventListener('click',function(){openLightbox(imgs[idx])});var prev=el.querySelector('.nav-prev');var next=el.querySelector('.nav-next');if(prev)prev.addEventListener('click',function(e){e.stopPropagation();show(idx-1)});if(next)next.addEventListener('click',function(e){e.stopPropagation();show(idx+1)});dots.forEach(function(d,j){d.addEventListener('click',function(e){e.stopPropagation();show(j)})});show(0)})}
function shuffleGallery(){var grid=document.getElementById('trip-gallery-grid');if(!grid)return;var imgs=Array.prototype.slice.call(grid.querySelectorAll('img'));var srcs=imgs.map(function(im){return im.getAttribute('src')});for(var i=srcs.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var tmp=srcs[i];srcs[i]=srcs[j];srcs[j]=tmp}imgs.forEach(function(im,i){im.setAttribute('src',srcs[i]);im.onclick=function(){openLightbox(this.getAttribute('src'))}})}
document.addEventListener('DOMContentLoaded',function(){initHotelSliders();shuffleGallery()})</script></body></html>`
}

// Collects hotel images across every day of the trip (deduplicated, up to 12) into a
// bento-style grid. Order is shuffled client-side on every page load/refresh via the
// script below — the server always emits the same order, JS randomizes it on view.
function renderClassicGallery(days: any[], lang: string, imageMap: Record<string, string>): string {
  const seen = new Set<string>()
  const urls: string[] = []
  for (const day of days) {
    const imgs = (day.day_hotel_images ?? []).slice().sort((a: any, b: any) => a.sort_order - b.sort_order)
    for (const i of imgs) {
      const url = imageMap[i.image_url] || i.image_url
      if (url && !seen.has(url)) {
        seen.add(url)
        urls.push(url)
      }
      if (urls.length >= 12) break
    }
    if (urls.length >= 12) break
  }
  if (!urls.length) return ''
  const items = urls.map((u) => `<div class="g-item"><img src="${esc(u)}" alt="" onclick="openLightbox('${esc(u)}')"></div>`).join('')
  return `<section class="card"><h3>${t(lang, 'trip_gallery')}</h3><div class="gallery-grid" id="trip-gallery-grid">${items}</div></section>`
}

function renderClassicPricingSection(pricing: any[], lang: string): string {
  const groups = activePriceGroups(pricing)
  if (!groups.length) return ''
  const multi = groups.length > 1
  const sections = groups
    .map((v) => {
      const items = pricing.filter((p: any) => (p.vehicle_type ?? 'jeep') === v && Number(p.price) > 0)
      const tiles = items.map((p: any) => `<div class="price-tile"><div class="label">${t(lang, 'tier_' + p.tier)}</div><div class="amount">${formatCurrency(Number(p.price), p.currency)}</div></div>`).join('')
      return `<div class="price-group">${multi ? `<div class="price-group-label">${t(lang, 'price_group_' + v)}</div>` : ''}<div class="pricing-grid">${tiles}</div></div>`
    })
    .join('')
  return `<section class="card">${sections}</section>`
}

function renderClassicTotalsSection(pricing: any[], lang: string): string {
  const groups = activePriceGroups(pricing)
  const multi = groups.length > 1
  const blocks = groups
    .map((v) => {
      const items = pricing.filter((p: any) => (p.vehicle_type ?? 'jeep') === v)
      const tot = items.reduce((s: number, p: any) => s + Number(p.price) * (p.quantity ?? 0), 0)
      if (tot <= 0) return ''
      const cur = items.find((p: any) => (p.quantity ?? 0) > 0)?.currency || items[0]?.currency || 'USD'
      const rows = items
        .filter((p: any) => (p.quantity ?? 0) > 0 && Number(p.price) > 0)
        .map((p: any) => `<div class="total-row"><span>${p.quantity} \u00d7 ${t(lang, 'tier_' + p.tier)}</span><span>${formatCurrency(Number(p.price) * p.quantity, p.currency)}</span></div>`)
        .join('')
      return `<div class="total-payable-group">${multi ? `<div class="total-group-label">${t(lang, 'price_group_' + v)}</div>` : ''}<div>${rows}</div><div class="total-final"><span>${t(lang, 'total')}</span><span>${formatCurrency(tot, cur)}</span></div></div>`
    })
    .filter(Boolean)
  if (!blocks.length) return ''
  return `<section class="card total-payable"><h3>${t(lang, 'total_payable')}</h3>${blocks.join('')}</section>`
}

function renderClassicHotelSlider(imageUrls: string[]): string {
  if (!imageUrls.length) return ''
  const dataAttr = esc(JSON.stringify(imageUrls))
  const controls =
    imageUrls.length > 1
      ? `<button class="nav-btn nav-prev" type="button" aria-label="Previous photo">&#10094;</button><button class="nav-btn nav-next" type="button" aria-label="Next photo">&#10095;</button><div class="dots">${imageUrls
          .map((_, j) => `<button class="dot${j === 0 ? ' active' : ''}" type="button" aria-label="Photo ${j + 1}"></button>`)
          .join('')}</div>`
      : ''
  return `<div class="hotel-slider" data-images="${dataAttr}"><img src="${esc(imageUrls[0])}" alt="">${controls}</div>`
}

function renderClassicDay(day: any, lang: string, imageMap: Record<string, string>) {
  const blocks = (day.day_content_blocks ?? []).slice().sort((a: any, b: any) => a.sort_order - b.sort_order).map((b: any) => b.content).filter(Boolean).join('')
  const acts = (day.day_activities ?? []).map((a: any) => `<span class="activity-tag">${getActivityLabel(lang, a.activity)}</span>`).join('')
  const imageUrls = (day.day_hotel_images ?? [])
    .slice()
    .sort((a: any, b: any) => a.sort_order - b.sort_order)
    .map((i: any) => imageMap[i.image_url] || i.image_url)
  const sliderHtml = renderClassicHotelSlider(imageUrls)
  return `<div class="card day-card"><h2 class="font-display">${t(lang, 'day')} ${day.day_number}</h2><div class="day-content">${blocks}</div>${acts ? `<div class="activity-tags">${acts}</div>` : ''}${day.hotel_description ? `<div class="hotel-block"><div class="label">${t(lang, 'tonights_stay')}</div><div class="day-content">${day.hotel_description}</div>${sliderHtml}</div>` : ''}</div>`
}
