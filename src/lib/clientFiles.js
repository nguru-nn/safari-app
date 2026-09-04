import { supabase } from './supabase'

// ---- Clients (reusable across itineraries and client files) ----

export async function listClients(searchTerm = '') {
  let query = supabase.from('clients').select('id, full_name, email, phone, nationality')
  if (searchTerm) query = query.ilike('full_name', `%${searchTerm}%`)
  const { data, error } = await query.order('full_name').limit(20)
  if (error) throw error
  return data
}

export async function createClient({ fullName, email, phone, nationality, passportNo, notes }) {
  const { data, error } = await supabase
    .from('clients')
    .insert({
      full_name: fullName,
      email: email || null,
      phone: phone || null,
      nationality: nationality || null,
      passport_no: passportNo || null,
      notes: notes || null,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

// Clients that already appear on past itineraries, offered as quick-pick suggestions
// alongside the dedicated `clients` table. Matches loosely on name.
export async function listItineraryClientNames(searchTerm = '') {
  let query = supabase.from('itineraries').select('client_name, client_email').not('client_name', 'is', null)
  if (searchTerm) query = query.ilike('client_name', `%${searchTerm}%`)
  const { data, error } = await query.order('updated_at', { ascending: false }).limit(50)
  if (error) throw error
  // De-dupe by name — several itineraries can share a client
  const seen = new Set()
  return data.filter((r) => {
    if (seen.has(r.client_name)) return false
    seen.add(r.client_name)
    return true
  })
}

// ---- Client Files ----

export async function listClientFiles(searchTerm = '') {
  let query = supabase
    .from('client_files')
    .select(
      'id, client_name, start_date, end_date, status, driver_name, slug, published_at, published_html_url, publish_password_plain, updated_at'
    )
  if (searchTerm) query = query.ilike('client_name', `%${searchTerm}%`)
  const { data, error } = await query.order('updated_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getClientFile(id) {
  const { data, error } = await supabase
    .from('client_files')
    .select(`
      *,
      client_file_transfers ( id, type, transfer_time, flight_details, airport, room_number, sort_order ),
      client_file_payments ( id, payment_name, doc_type, amount, currency, payment_date, file_path, uploaded_at ),
      client_file_vouchers ( id, voucher_name, voucher_type, file_path, uploaded_at ),
      proforma_invoices ( id, invoice_number, template, currency, line_items, total_amount, issued_date, pdf_url, updated_at )
    `)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createClientFile({
  clientId,
  clientName,
  itineraryId,
  startDate,
  endDate,
  itinerarySummary,
  driverName,
  guideName,
}) {
  const { data, error } = await supabase
    .from('client_files')
    .insert({
      client_id: clientId || null,
      client_name: clientName,
      itinerary_id: itineraryId || null,
      start_date: startDate,
      end_date: endDate,
      itinerary_summary: itinerarySummary || '',
      driver_name: driverName,
      guide_name: guideName || null,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateClientFile(id, patch) {
  const { data, error } = await supabase
    .from('client_files')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteClientFile(id) {
  const { error } = await supabase.from('client_files').delete().eq('id', id)
  if (error) throw error
}

// Client-side validation gating publish — mirrors validateItinerary's pattern.
export function validateClientFile(file) {
  const issues = []
  if (!file.client_name?.trim()) issues.push('Client name is required')
  if (!file.start_date || !file.end_date) issues.push('Travel dates are required')
  if (!(file.itinerary_summary ?? '').replace(/<[^>]*>/g, '').trim()) issues.push('Itinerary summary is required')
  if (!file.driver_name?.trim()) issues.push('Driver name is required')

  const hasPickup = (file.client_file_transfers ?? []).some((t) => t.type === 'pickup')
  const hasDropoff = (file.client_file_transfers ?? []).some((t) => t.type === 'dropoff')
  if (!hasPickup) issues.push('At least one pickup detail is required')
  if (!hasDropoff) issues.push('At least one drop-off detail is required')

  const hasInvoice = (file.proforma_invoices ?? []).length > 0
  if (!hasInvoice) issues.push('A proforma invoice is required')

  const hasClientReceipt = (file.client_file_payments ?? []).some((p) => p.doc_type === 'client_receipt')
  if (!hasClientReceipt) issues.push('At least one client receipt upload is required')

  return issues
}

// ---- Transfers (pickup/drop-off legs) ----

export async function addTransfer(clientFileId, { type, transferTime, flightDetails, airport, roomNumber, sortOrder = 0 }) {
  const { data, error } = await supabase
    .from('client_file_transfers')
    .insert({
      client_file_id: clientFileId,
      type,
      transfer_time: transferTime || null,
      flight_details: flightDetails || null,
      airport: airport || null,
      room_number: roomNumber || null,
      sort_order: sortOrder,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateTransfer(id, patch) {
  const { data, error } = await supabase.from('client_file_transfers').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteTransfer(id) {
  const { error } = await supabase.from('client_file_transfers').delete().eq('id', id)
  if (error) throw error
}

// ---- Payments (client receipts + bank proof-of-payment uploads) ----
// Files themselves go to the private 'client-payment-docs' bucket via uploadPrivateFile
// in storage.js; this just records the row pointing at the stored path.

export async function addPayment(clientFileId, { paymentName, docType, amount, currency, paymentDate, filePath }) {
  const { data, error } = await supabase
    .from('client_file_payments')
    .insert({
      client_file_id: clientFileId,
      payment_name: paymentName,
      doc_type: docType,
      amount: amount || null,
      currency: currency || null,
      payment_date: paymentDate || null,
      file_path: filePath,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deletePayment(id) {
  const { error } = await supabase.from('client_file_payments').delete().eq('id', id)
  if (error) throw error
}

// ---- Vouchers (booking / cancellation) ----
// Same private bucket as payments, portal-viewable via signed URL, never published
// to the public client-file page.

export async function addVoucher(clientFileId, { voucherName, voucherType, filePath }) {
  const { data, error } = await supabase
    .from('client_file_vouchers')
    .insert({
      client_file_id: clientFileId,
      voucher_name: voucherName,
      voucher_type: voucherType,
      file_path: filePath,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteVoucher(id) {
  const { error } = await supabase.from('client_file_vouchers').delete().eq('id', id)
  if (error) throw error
}

// ---- Proforma invoices ----

export async function createInvoice(clientFileId, { template, currency, lineItems, totalAmount }) {
  const { data: invoiceNumber, error: numError } = await supabase.rpc('next_invoice_number', { p_template: template })
  if (numError) throw numError

  const { data, error } = await supabase
    .from('proforma_invoices')
    .insert({
      client_file_id: clientFileId,
      invoice_number: invoiceNumber,
      template,
      currency,
      line_items: lineItems,
      total_amount: totalAmount,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateInvoice(id, patch) {
  const { data, error } = await supabase.from('proforma_invoices').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteInvoice(id) {
  const { error } = await supabase.from('proforma_invoices').delete().eq('id', id)
  if (error) throw error
}

// Directly invoked, not webhook-triggered — matches send-itinerary-email's pattern
// (a user action, not a status-change side effect). Renders the PDF server-side via
// pdf-lib and SFTPs it straight to trips.africanroutesafaris.com/pdf/, the same
// subdomain the published client-file pages live on — so the link is stable and
// domain-independent of whichever Supabase project is generating it. Called again on
// every click, so edits since the last download are always reflected — the filename
// is stable (invoiceId.pdf) so it just overwrites on the server.
export async function generateInvoicePdf(invoiceId) {
  const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', {
    body: { invoiceId },
  })
  if (error) throw error
  return data.url
}

// ---- Publishing ----

// Generates a random 5-digit password, hashes it with SHA-256 (Web Crypto — no extra
// dependency), stores the hash for the published page's client-side check and the
// plaintext for portal-only display, per the operator's requirement.
async function generatePublishPassword() {
  const plain = String(Math.floor(10000 + Math.random() * 90000))
  const enc = new TextEncoder().encode(plain)
  const digest = await crypto.subtle.digest('SHA-256', enc)
  const hash = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return { plain, hash }
}

// Publishing itself (rendering + SFTP upload) happens server-side, exactly like
// itineraries: a Postgres trigger (on_client_file_status_change) fires the moment
// `status` flips to 'published' and calls the publish-client-file Edge Function via
// pg_net — there's no direct function invoke from the app. This just prepares the
// slug/password first, then flips status in the same update to trigger it.
export async function publishClientFile(id) {
  const { plain, hash } = await generatePublishPassword()
  const slug = `cf-${id.slice(0, 8)}`

  await updateClientFile(id, {
    slug,
    publish_password_hash: hash,
    publish_password_plain: plain,
    status: 'published',
  })

  // The Edge Function runs asynchronously after the trigger fires; poll briefly for
  // published_html_url so the UI can show the live link without a manual refresh.
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 1000))
    const file = await getClientFile(id)
    if (file.published_html_url) return file
  }
  return getClientFile(id) // may still be publishing — portal shows status as-is
}
