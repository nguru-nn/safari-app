import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import { IconPlus, IconTrash, IconUpload, IconDownload, IconLoader2, IconCopy, IconFileText } from '@tabler/icons-react'
import { useAuth } from '../contexts/AuthContext'
import {
  getClientFile,
  updateClientFile,
  validateClientFile,
  addTransfer,
  updateTransfer,
  deleteTransfer,
  addPayment,
  deletePayment,
  addVoucher,
  deleteVoucher,
  generateVoucher,
  saveVoucherDraft,
  updateVoucherDraft,
  createInvoice,
  updateInvoice,
  generateInvoicePdf,
  publishClientFile,
} from '../lib/clientFiles'
import { uploadPrivateFile, getPrivateFileUrl } from '../lib/storage'

const TEMPLATES = [
  { value: 'safari_kenia', label: 'Safari Kenia' },
  { value: 'african_routes', label: 'African Routes' },
]

export default function ClientFileBuilder() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()

  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)

  // local-edit-then-save fields, mirrors PricingSection's pattern — no autosave on blur
  const [clientName, setClientName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [summary, setSummary] = useState('')
  const [driverName, setDriverName] = useState('')
  const [guideName, setGuideName] = useState('')

  useEffect(() => {
    refresh()
  }, [id])

  async function refresh() {
    try {
      const data = await getClientFile(id)
      setFile(data)
      setClientName(data.client_name ?? '')
      setStartDate(data.start_date ?? '')
      setEndDate(data.end_date ?? '')
      setSummary(data.itinerary_summary ?? '')
      setDriverName(data.driver_name ?? '')
      setGuideName(data.guide_name ?? '')
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleSaveDetails() {
    setSaving(true)
    setError('')
    try {
      await updateClientFile(id, {
        client_name: clientName,
        start_date: startDate,
        end_date: endDate,
        itinerary_summary: summary,
        driver_name: driverName,
        guide_name: guideName || null,
        last_edited_at: new Date().toISOString(),
      })
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // ---- Transfers ----

  async function handleAddTransfer(type) {
    setError('')
    try {
      await addTransfer(id, { type, sortOrder: (file.client_file_transfers?.length ?? 0) })
      await refresh()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleTransferField(transferId, field, value) {
    setFile((f) => ({
      ...f,
      client_file_transfers: f.client_file_transfers.map((t) => (t.id === transferId ? { ...t, [field]: value } : t)),
    }))
  }

  async function handleSaveTransfer(transfer) {
    setError('')
    try {
      await updateTransfer(transfer.id, {
        transfer_time: transfer.transfer_time || null,
        flight_details: transfer.flight_details || null,
        airport: transfer.airport || null,
        room_number: transfer.room_number || null,
      })
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDeleteTransfer(transferId) {
    if (!confirm('Remove this transfer detail?')) return
    setError('')
    try {
      await deleteTransfer(transferId)
      await refresh()
    } catch (err) {
      setError(err.message)
    }
  }

  // ---- Payments (receipts / bank PoP) ----
  // Selecting a file doesn't upload immediately — it opens a small inline form to
  // capture the payment name and date first, then the actual upload+save happens on
  // confirm. Keyed by doc_type so client-receipt and bank-PoP forms don't collide.
  const [pendingPayment, setPendingPayment] = useState(null) // { docType, file, name, date }

  function handleSelectPaymentFile(docType, fileList) {
    const file = fileList?.[0]
    if (!file) return
    setPendingPayment({ docType, file, name: '', date: '' })
  }

  async function handleConfirmPayment() {
    if (!pendingPayment?.name.trim()) {
      setError('Payment name is required')
      return
    }
    setError('')
    try {
      const path = await uploadPrivateFile('client-payment-docs', pendingPayment.file, id)
      await addPayment(id, {
        paymentName: pendingPayment.name.trim(),
        docType: pendingPayment.docType,
        paymentDate: pendingPayment.date || null,
        filePath: path,
      })
      setPendingPayment(null)
      await refresh()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDeletePayment(paymentId) {
    if (!confirm('Remove this upload?')) return
    setError('')
    try {
      await deletePayment(paymentId)
      await refresh()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleViewPayment(filePath) {
    setError('')
    try {
      const url = await getPrivateFileUrl('client-payment-docs', filePath)
      window.open(url, '_blank')
    } catch (err) {
      setError(err.message)
    }
  }

  // ---- Vouchers (booking / cancellation) ----

  const [pendingVoucher, setPendingVoucher] = useState(null) // { voucherType, file, name }

  function handleSelectVoucherFile(voucherType, fileList) {
    const file = fileList?.[0]
    if (!file) return
    setPendingVoucher({ voucherType, file, name: '' })
  }

  async function handleConfirmVoucher() {
    if (!pendingVoucher?.name.trim()) {
      setError('Voucher name is required')
      return
    }
    setError('')
    try {
      const path = await uploadPrivateFile('client-payment-docs', pendingVoucher.file, `${id}/vouchers`)
      await addVoucher(id, {
        voucherName: pendingVoucher.name.trim(),
        voucherType: pendingVoucher.voucherType,
        filePath: path,
      })
      setPendingVoucher(null)
      await refresh()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDeleteVoucher(voucherId) {
    if (!confirm('Remove this voucher?')) return
    setError('')
    try {
      await deleteVoucher(voucherId)
      await refresh()
    } catch (err) {
      setError(err.message)
    }
  }

  // ---- Voucher generation (booking/cancellation) — separate from uploads above ----

  const emptyVoucherForm = {
    hotelName: '',
    hotelPhone: '',
    hotelEmail: '',
    contactPerson: '',
    date: new Date().toISOString().slice(0, 10),
    nationality: '',
    adults: '',
    children: '',
    checkIn: '',
    checkOut: '',
    eta: '',
    meals: '',
    specialMealRequest: '',
    roomsSingle: '',
    roomsDouble: '',
    roomsTriple: '',
    roomsTwin: '',
    activity: '',
    transfer: '',
    charges: '',
    specialInstructions: '',
  }

  const [generatingVoucherType, setGeneratingVoucherType] = useState(null) // 'booking' | 'cancellation' | null
  const [voucherForm, setVoucherForm] = useState(emptyVoucherForm)
  const [savingVoucher, setSavingVoucher] = useState(false)
  const [editingVoucherId, setEditingVoucherId] = useState(null) // null = creating new, set = editing/regenerating existing

  function openVoucherGenerator(voucherType) {
    setVoucherForm(emptyVoucherForm)
    setEditingVoucherId(null)
    setGeneratingVoucherType(voucherType)
  }

  // Loads an existing voucher's saved fields back into the form so it can be edited
  // and regenerated in place, instead of always creating a new entry.
  function openVoucherEditor(voucher) {
    setVoucherForm({ ...emptyVoucherForm, ...(voucher.form_data ?? {}) })
    setEditingVoucherId(voucher.id)
    setGeneratingVoucherType(voucher.voucher_type)
  }

  function handleVoucherFormField(field, value) {
    setVoucherForm((f) => ({ ...f, [field]: value }))
  }

  async function handleGenerateVoucher() {
    setSavingVoucher(true)
    setError('')
    try {
      // Client name and "issued by" are deliberately not part of the submitted form —
      // client name comes from this client file, and issued-by is derived server-side
      // from the caller's own auth token, so neither can be edited or spoofed here.
      // Passing editingVoucherId regenerates that voucher in place (same number, same
      // file overwritten) instead of creating a duplicate entry.
      await generateVoucher(id, generatingVoucherType, voucherForm, editingVoucherId)
      setGeneratingVoucherType(null)
      setEditingVoucherId(null)
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingVoucher(false)
    }
  }

  const [savingVoucherDraft, setSavingVoucherDraft] = useState(false)

  // Saves entered fields without generating a PDF — useful when not all details are
  // ready yet. The PDF can be generated later from the same information. Updates the
  // existing draft in place if editing one, otherwise creates a new draft.
  async function handleSaveVoucherDraft() {
    setSavingVoucherDraft(true)
    setError('')
    try {
      if (editingVoucherId) {
        await updateVoucherDraft(editingVoucherId, voucherForm, profile?.full_name)
      } else {
        await saveVoucherDraft(id, generatingVoucherType, voucherForm, profile?.full_name)
      }
      setGeneratingVoucherType(null)
      setEditingVoucherId(null)
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingVoucherDraft(false)
    }
  }

  const invoice = file?.proforma_invoices?.[0]

  async function handleCreateInvoice(template) {
    setError('')
    try {
      await createInvoice(id, {
        template,
        currency: 'USD',
        lineItems: [{ description: '', quantity: 1, unitPrice: 0 }],
        totalAmount: 0,
        billToName: file.client_name,
      })
      await refresh()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleUpdateLineItems(newItems) {
    const total = newItems.reduce((sum, li) => sum + (Number(li.quantity) || 0) * (Number(li.unitPrice) || 0), 0)
    setFile((f) => ({
      ...f,
      proforma_invoices: f.proforma_invoices.map((inv) => (inv.id === invoice.id ? { ...inv, line_items: newItems, total_amount: total } : inv)),
    }))
  }

  function handleBillToField(field, value) {
    setFile((f) => ({
      ...f,
      proforma_invoices: f.proforma_invoices.map((inv) => (inv.id === invoice.id ? { ...inv, [field]: value } : inv)),
    }))
  }

  async function handleSaveInvoice() {
    setError('')
    try {
      await updateInvoice(invoice.id, {
        line_items: invoice.line_items,
        total_amount: invoice.total_amount,
        bill_to_name: invoice.bill_to_name,
        bill_to_phone: invoice.bill_to_phone,
        bill_to_email: invoice.bill_to_email,
      })
    } catch (err) {
      setError(err.message)
    }
  }

  const [generatingPdf, setGeneratingPdf] = useState(false)

  async function handleGeneratePdf() {
    setGeneratingPdf(true)
    setError('')
    try {
      // The PDF is rendered server-side from the DB row, so save any pending line-item
      // edits first — otherwise the download could reflect stale numbers.
      await handleSaveInvoice()
      const url = await generateInvoicePdf(invoice.id)
      // Refresh from the DB (rather than patching state manually) so invoice.updated_at
      // comes through fresh — it's used below and elsewhere as a cache-busting key,
      // since the PDF filename is stable (invoiceId.pdf) and the browser/CDN would
      // otherwise keep serving the previous file's cached bytes after a regenerate.
      await refresh()
      window.open(`${url}?v=${Date.now()}`, '_blank') // best-effort; the link below is the reliable fallback
    } catch (err) {
      setError(err.message)
    } finally {
      setGeneratingPdf(false)
    }
  }

  // ---- PDF download (fetches the already-generated file, forces a real save) ----

  const [downloadingPdf, setDownloadingPdf] = useState(false)

  // A plain <a download> is ignored by browsers for cross-origin URLs (this file
  // lives on trips.africanroutesafaris.com, not the portal's own origin), so pulling
  // it as a blob first is the only reliable way to trigger an actual file save here.
  async function handleDownloadPdf() {
    if (!invoice?.pdf_url) return
    setDownloadingPdf(true)
    setError('')
    try {
      // Cache-busted with updated_at (changes on every regenerate) plus a hard
      // no-store — the filename is stable (invoiceId.pdf), so without this the
      // browser/CDN would keep serving the previous file's cached bytes.
      const res = await fetch(`${invoice.pdf_url}?v=${encodeURIComponent(invoice.updated_at)}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('Could not fetch the PDF file')
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `${invoice.invoice_number || 'invoice'}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(blobUrl)
    } catch (err) {
      setError(err.message)
    } finally {
      setDownloadingPdf(false)
    }
  }

  // ---- Publish ----

  async function handlePublish() {
    const issues = validateClientFile(file)
    if (issues.length) {
      setError(`Cannot publish yet: ${issues.join('; ')}`)
      return
    }
    setPublishing(true)
    setError('')
    try {
      await publishClientFile(id)
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setPublishing(false)
    }
  }

  if (!file) return <p className="p-8 text-ink-600 text-sm">{error || 'Loading…'}</p>

  return (
    <div className="max-w-3xl mx-auto pt-4 pb-16 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">{file.client_name || 'Client File'}</h1>
        <button
          onClick={() => navigate('/client-files')}
          className="text-ink-600 text-sm hover:text-ink-900"
        >
          Back to Client Files
        </button>
      </div>

      {error && <p className="text-danger-600 text-sm bg-danger-50 rounded-lg px-4 py-2.5">{error}</p>}

      {file.published_at && (
        <div className="bg-forest-50 border border-forest-200 rounded-[var(--radius-card)] px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-forest-800 font-medium">Published</p>
            <p className="text-xs text-forest-700">{file.published_html_url}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-ink-400">Access password (share with client)</p>
            <p className="font-mono text-lg font-semibold text-forest-800">{file.publish_password_plain}</p>
          </div>
        </div>
      )}

      {/* Client details */}
      <section className="bg-white rounded-[var(--radius-card)] p-5 flex flex-col gap-3">
        <h2 className="font-display font-semibold text-ink-900">Client details</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 col-span-2">
            <span className="text-xs text-ink-400">Client name*</span>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="rounded-full border border-sage-200 px-4 py-2 text-sm outline-none focus:border-forest-600"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-ink-400">Start date*</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-full border border-sage-200 px-4 py-2 text-sm outline-none focus:border-forest-600"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-ink-400">End date*</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-full border border-sage-200 px-4 py-2 text-sm outline-none focus:border-forest-600"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-ink-400">Driver name*</span>
            <input
              type="text"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              className="rounded-full border border-sage-200 px-4 py-2 text-sm outline-none focus:border-forest-600"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-ink-400">Guide name (optional)</span>
            <input
              type="text"
              value={guideName}
              onChange={(e) => setGuideName(e.target.value)}
              className="rounded-full border border-sage-200 px-4 py-2 text-sm outline-none focus:border-forest-600"
            />
          </label>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-ink-400">Itinerary summary*</span>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={6}
            placeholder="Paste or write the itinerary summary — can be pulled from a linked itinerary or written freely."
            className="rounded-2xl border border-sage-200 px-4 py-3 text-sm outline-none focus:border-forest-600 resize-y"
          />
        </label>
        <button
          onClick={handleSaveDetails}
          disabled={saving}
          className="self-start rounded-full bg-forest-600 text-white text-sm font-medium px-5 py-2 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save details'}
        </button>
      </section>

      {/* Transfers */}
      <section className="bg-white rounded-[var(--radius-card)] p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-semibold text-ink-900">Pick-up / Drop-off*</h2>
          <div className="flex gap-2">
            <button onClick={() => handleAddTransfer('pickup')} className="text-xs rounded-full bg-sage-100 px-3 py-1.5 flex items-center gap-1">
              <IconPlus size={13} /> Pickup
            </button>
            <button onClick={() => handleAddTransfer('dropoff')} className="text-xs rounded-full bg-sage-100 px-3 py-1.5 flex items-center gap-1">
              <IconPlus size={13} /> Drop-off
            </button>
          </div>
        </div>

        {(file.client_file_transfers ?? []).length === 0 && (
          <p className="text-ink-400 text-sm">No transfers added yet. Add at least one pickup and one drop-off.</p>
        )}

        {(file.client_file_transfers ?? [])
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((t) => (
            <div key={t.id} className="border border-sage-200 rounded-xl p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-ink-500">{t.type}</span>
                <button onClick={() => handleDeleteTransfer(t.id)} className="text-ink-400 hover:text-danger-600">
                  <IconTrash size={14} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="datetime-local"
                  value={t.transfer_time ? t.transfer_time.slice(0, 16) : ''}
                  onChange={(e) => handleTransferField(t.id, 'transfer_time', e.target.value)}
                  onBlur={() => handleSaveTransfer(file.client_file_transfers.find((x) => x.id === t.id))}
                  className="rounded-lg border border-sage-200 px-3 py-1.5 text-sm outline-none focus:border-forest-600"
                />
                <input
                  type="text"
                  placeholder="Airport"
                  value={t.airport ?? ''}
                  onChange={(e) => handleTransferField(t.id, 'airport', e.target.value)}
                  onBlur={() => handleSaveTransfer(file.client_file_transfers.find((x) => x.id === t.id))}
                  className="rounded-lg border border-sage-200 px-3 py-1.5 text-sm outline-none focus:border-forest-600"
                />
                <input
                  type="text"
                  placeholder="Flight details"
                  value={t.flight_details ?? ''}
                  onChange={(e) => handleTransferField(t.id, 'flight_details', e.target.value)}
                  onBlur={() => handleSaveTransfer(file.client_file_transfers.find((x) => x.id === t.id))}
                  className="rounded-lg border border-sage-200 px-3 py-1.5 text-sm outline-none focus:border-forest-600"
                />
                <input
                  type="text"
                  placeholder="Room number"
                  value={t.room_number ?? ''}
                  onChange={(e) => handleTransferField(t.id, 'room_number', e.target.value)}
                  onBlur={() => handleSaveTransfer(file.client_file_transfers.find((x) => x.id === t.id))}
                  className="rounded-lg border border-sage-200 px-3 py-1.5 text-sm outline-none focus:border-forest-600"
                />
              </div>
            </div>
          ))}
      </section>

      {/* Proforma invoice */}
      <section className="bg-white rounded-[var(--radius-card)] p-5 flex flex-col gap-3">
        <h2 className="font-display font-semibold text-ink-900">Proforma invoice*</h2>
        {!invoice ? (
          <div className="flex gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.value}
                onClick={() => handleCreateInvoice(t.value)}
                className="text-sm rounded-full bg-sage-100 px-4 py-2"
              >
                Generate ({t.label})
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-mono text-ink-600">{invoice.invoice_number}</span>
              <span className="text-ink-400">{TEMPLATES.find((t) => t.value === invoice.template)?.label}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-ink-400">Name</span>
                <input
                  type="text"
                  value={invoice.bill_to_name ?? ''}
                  onChange={(e) => handleBillToField('bill_to_name', e.target.value)}
                  className="rounded-lg border border-sage-200 px-3 py-1.5 text-sm outline-none focus:border-forest-600"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-ink-400">Phone</span>
                <input
                  type="text"
                  value={invoice.bill_to_phone ?? ''}
                  onChange={(e) => handleBillToField('bill_to_phone', e.target.value)}
                  className="rounded-lg border border-sage-200 px-3 py-1.5 text-sm outline-none focus:border-forest-600"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-ink-400">Email Address</span>
                <input
                  type="email"
                  value={invoice.bill_to_email ?? ''}
                  onChange={(e) => handleBillToField('bill_to_email', e.target.value)}
                  className="rounded-lg border border-sage-200 px-3 py-1.5 text-sm outline-none focus:border-forest-600"
                />
              </label>
            </div>

            <div className="flex flex-col gap-2">
              {(invoice.line_items ?? []).map((li, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_70px_90px_28px] gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Description"
                    value={li.description}
                    onChange={(e) => {
                      const items = [...invoice.line_items]
                      items[idx] = { ...items[idx], description: e.target.value }
                      handleUpdateLineItems(items)
                    }}
                    className="rounded-lg border border-sage-200 px-3 py-1.5 text-sm outline-none focus:border-forest-600"
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    value={li.quantity}
                    onChange={(e) => {
                      const items = [...invoice.line_items]
                      items[idx] = { ...items[idx], quantity: e.target.value }
                      handleUpdateLineItems(items)
                    }}
                    className="rounded-lg border border-sage-200 px-2 py-1.5 text-sm outline-none focus:border-forest-600"
                  />
                  <input
                    type="number"
                    placeholder="Unit price"
                    value={li.unitPrice}
                    onChange={(e) => {
                      const items = [...invoice.line_items]
                      items[idx] = { ...items[idx], unitPrice: e.target.value }
                      handleUpdateLineItems(items)
                    }}
                    className="rounded-lg border border-sage-200 px-2 py-1.5 text-sm outline-none focus:border-forest-600"
                  />
                  <button
                    onClick={() => handleUpdateLineItems(invoice.line_items.filter((_, i) => i !== idx))}
                    className="text-ink-400 hover:text-danger-600"
                  >
                    <IconTrash size={14} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => handleUpdateLineItems([...(invoice.line_items ?? []), { description: '', quantity: 1, unitPrice: 0 }])}
                className="self-start text-xs rounded-full bg-sage-100 px-3 py-1.5 flex items-center gap-1"
              >
                <IconPlus size={13} /> Line item
              </button>
            </div>

            <div className="flex items-center justify-between border-t border-sage-100 pt-3">
              <span className="text-sm text-ink-600">Total</span>
              <span className="font-semibold">{invoice.currency} {Number(invoice.total_amount ?? 0).toFixed(2)}</span>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button onClick={handleSaveInvoice} className="rounded-full bg-forest-600 text-white text-sm px-4 py-2">
                Save invoice
              </button>
              <button
                onClick={handleGeneratePdf}
                disabled={generatingPdf}
                className="rounded-full bg-sage-100 text-sm px-4 py-2 flex items-center gap-1.5 disabled:opacity-50"
              >
                {generatingPdf ? <IconLoader2 size={14} className="animate-spin" /> : <IconDownload size={14} />}
                {generatingPdf ? 'Generating…' : invoice.pdf_url ? 'Regenerate PDF' : 'Generate PDF'}
              </button>
              {invoice.pdf_url && (
                <>
                  <button
                    onClick={handleDownloadPdf}
                    disabled={downloadingPdf}
                    className="rounded-full bg-forest-600 text-white text-sm px-4 py-2 flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {downloadingPdf ? <IconLoader2 size={14} className="animate-spin" /> : <IconDownload size={14} />}
                    {downloadingPdf ? 'Downloading…' : 'Download'}
                  </button>
                  <a
                    href={`${invoice.pdf_url}?v=${encodeURIComponent(invoice.updated_at)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full text-sm px-4 py-2 text-forest-700 underline underline-offset-2"
                  >
                    View PDF ↗
                  </a>
                </>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Pending payment name/date form — shown right after a file is picked */}
      {pendingPayment && (
        <section className="bg-white rounded-[var(--radius-card)] p-5 flex flex-col gap-3 border-2 border-forest-600">
          <p className="text-sm text-ink-600">
            Uploading <span className="font-medium text-ink-900">{pendingPayment.file.name}</span> — name this payment
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder='e.g. "Deposit", "Balance"'
              value={pendingPayment.name}
              onChange={(e) => setPendingPayment((p) => ({ ...p, name: e.target.value }))}
              autoFocus
              className="flex-1 rounded-full border border-sage-200 px-4 py-2 text-sm outline-none focus:border-forest-600"
            />
            <input
              type="date"
              value={pendingPayment.date}
              onChange={(e) => setPendingPayment((p) => ({ ...p, date: e.target.value }))}
              className="rounded-full border border-sage-200 px-4 py-2 text-sm outline-none focus:border-forest-600"
            />
          </div>
          <div className="flex gap-2 self-end">
            <button onClick={() => setPendingPayment(null)} className="text-sm px-4 py-2 text-ink-600">
              Cancel
            </button>
            <button onClick={handleConfirmPayment} className="rounded-full bg-forest-600 text-white text-sm px-4 py-2">
              Save payment
            </button>
          </div>
        </section>
      )}

      {/* Client receipts */}
      <UploadSection
        title="Client receipts*"
        items={(file.client_file_payments ?? []).filter((p) => p.doc_type === 'client_receipt')}
        renderMeta={(p) => p.payment_date}
        onSelectFile={(files) => handleSelectPaymentFile('client_receipt', files)}
        onView={handleViewPayment}
        onDelete={handleDeletePayment}
      />

      {/* Bank receipts / PoP */}
      <UploadSection
        title="Bank receipts (Proof of Payment)"
        items={(file.client_file_payments ?? []).filter((p) => p.doc_type === 'bank_pop')}
        renderMeta={(p) => p.payment_date}
        onSelectFile={(files) => handleSelectPaymentFile('bank_pop', files)}
        onView={handleViewPayment}
        onDelete={handleDeletePayment}
      />

      {/* Pending voucher name form */}
      {pendingVoucher && (
        <section className="bg-white rounded-[var(--radius-card)] p-5 flex flex-col gap-3 border-2 border-forest-600">
          <p className="text-sm text-ink-600">
            Uploading <span className="font-medium text-ink-900">{pendingVoucher.file.name}</span> — name this voucher
          </p>
          <input
            type="text"
            placeholder={pendingVoucher.voucherType === 'booking' ? 'e.g. "Hotel booking voucher"' : 'e.g. "Flight cancellation voucher"'}
            value={pendingVoucher.name}
            onChange={(e) => setPendingVoucher((v) => ({ ...v, name: e.target.value }))}
            autoFocus
            className="rounded-full border border-sage-200 px-4 py-2 text-sm outline-none focus:border-forest-600"
          />
          <div className="flex gap-2 self-end">
            <button onClick={() => setPendingVoucher(null)} className="text-sm px-4 py-2 text-ink-600">
              Cancel
            </button>
            <button onClick={handleConfirmVoucher} className="rounded-full bg-forest-600 text-white text-sm px-4 py-2">
              Save voucher
            </button>
          </div>
        </section>
      )}

      {/* Booking / cancellation vouchers */}
      <section className="bg-white rounded-[var(--radius-card)] p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-display font-semibold text-ink-900">Booking / cancellation vouchers</h2>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => openVoucherGenerator('booking')} className="text-xs rounded-full bg-forest-600 text-white px-3 py-1.5 flex items-center gap-1">
              <IconFileText size={13} /> Generate booking
            </button>
            <button onClick={() => openVoucherGenerator('cancellation')} className="text-xs rounded-full bg-forest-600 text-white px-3 py-1.5 flex items-center gap-1">
              <IconFileText size={13} /> Generate cancellation
            </button>
            <label className="text-xs rounded-full bg-sage-100 px-3 py-1.5 flex items-center gap-1 cursor-pointer">
              <IconUpload size={13} /> Upload booking
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  handleSelectVoucherFile('booking', e.target.files)
                  e.target.value = ''
                }}
              />
            </label>
            <label className="text-xs rounded-full bg-sage-100 px-3 py-1.5 flex items-center gap-1 cursor-pointer">
              <IconUpload size={13} /> Upload cancellation
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  handleSelectVoucherFile('cancellation', e.target.files)
                  e.target.value = ''
                }}
              />
            </label>
          </div>
        </div>

        {/* Inline voucher generator form */}
        {generatingVoucherType && (
          <div className="border-2 border-forest-600 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-ink-900">
                {editingVoucherId ? 'Edit' : 'Generate'} {generatingVoucherType === 'booking' ? 'booking' : 'cancellation'} voucher
              </p>
              <span className="text-xs text-ink-400">Client: {file.client_name}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <VField label="Hotel Name" value={voucherForm.hotelName} onChange={(v) => handleVoucherFormField('hotelName', v)} span={2} />
              <VField label="Phone" value={voucherForm.hotelPhone} onChange={(v) => handleVoucherFormField('hotelPhone', v)} />
              <VField label="Email" value={voucherForm.hotelEmail} onChange={(v) => handleVoucherFormField('hotelEmail', v)} />
              <VField label="Contact Person" value={voucherForm.contactPerson} onChange={(v) => handleVoucherFormField('contactPerson', v)} span={2} />
              <VField label="Date" type="date" value={voucherForm.date} onChange={(v) => handleVoucherFormField('date', v)} span={2} />

              <VField label="Nationality" value={voucherForm.nationality} onChange={(v) => handleVoucherFormField('nationality', v)} />
              <VField label="Adults" type="number" value={voucherForm.adults} onChange={(v) => handleVoucherFormField('adults', v)} />
              <VField label="Children" type="number" value={voucherForm.children} onChange={(v) => handleVoucherFormField('children', v)} />
              <VField label="ETA" value={voucherForm.eta} onChange={(v) => handleVoucherFormField('eta', v)} />

              <VField label="Check-in (IN)" type="date" value={voucherForm.checkIn} onChange={(v) => handleVoucherFormField('checkIn', v)} span={2} />
              <VField label="Check-out (OUT)" type="date" value={voucherForm.checkOut} onChange={(v) => handleVoucherFormField('checkOut', v)} span={2} />

              <VField label="Meals" value={voucherForm.meals} onChange={(v) => handleVoucherFormField('meals', v)} span={2} />
              <VField label="Special Meal Request" value={voucherForm.specialMealRequest} onChange={(v) => handleVoucherFormField('specialMealRequest', v)} span={2} />

              <VField label="Single rooms" type="number" value={voucherForm.roomsSingle} onChange={(v) => handleVoucherFormField('roomsSingle', v)} />
              <VField label="Double rooms" type="number" value={voucherForm.roomsDouble} onChange={(v) => handleVoucherFormField('roomsDouble', v)} />
              <VField label="Triple rooms" type="number" value={voucherForm.roomsTriple} onChange={(v) => handleVoucherFormField('roomsTriple', v)} />
              <VField label="Twin rooms" type="number" value={voucherForm.roomsTwin} onChange={(v) => handleVoucherFormField('roomsTwin', v)} />

              <VField label="Activity" value={voucherForm.activity} onChange={(v) => handleVoucherFormField('activity', v)} span={2} />
              <VField label="Transfer" value={voucherForm.transfer} onChange={(v) => handleVoucherFormField('transfer', v)} span={2} />
              <VField label="Charges" value={voucherForm.charges} onChange={(v) => handleVoucherFormField('charges', v)} span={2} />
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-ink-400">Special Instructions</span>
              <textarea
                value={voucherForm.specialInstructions}
                onChange={(e) => handleVoucherFormField('specialInstructions', e.target.value)}
                rows={3}
                className="rounded-xl border border-sage-200 px-3 py-2 text-sm outline-none focus:border-forest-600 resize-y"
              />
            </label>

            <p className="text-xs text-ink-400">Issued by: {profile?.full_name ?? 'you'} (recorded automatically)</p>

            <div className="flex gap-2 self-end">
              <button
                onClick={() => {
                  setGeneratingVoucherType(null)
                  setEditingVoucherId(null)
                }}
                className="text-sm px-4 py-2 text-ink-600"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveVoucherDraft}
                disabled={savingVoucherDraft}
                className="rounded-full bg-sage-100 text-sm px-4 py-2 disabled:opacity-50"
              >
                {savingVoucherDraft ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={handleGenerateVoucher}
                disabled={savingVoucher}
                className="rounded-full bg-forest-600 text-white text-sm px-4 py-2 disabled:opacity-50"
              >
                {savingVoucher ? 'Generating…' : editingVoucherId ? 'Regenerate PDF' : 'Generate PDF'}
              </button>
            </div>
          </div>
        )}

        {(file.client_file_vouchers ?? []).length === 0 ? (
          <p className="text-ink-400 text-sm">No vouchers yet.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {file.client_file_vouchers.map((v) => {
              const isDraft = !v.pdf_url && !v.file_path
              return (
                <div key={v.id} className="flex items-center justify-between text-sm border border-sage-100 rounded-lg px-3 py-2">
                  <button
                    onClick={() => {
                      if (v.pdf_url) window.open(`${v.pdf_url}?v=${encodeURIComponent(v.updated_at)}`, '_blank')
                      else if (v.file_path) handleViewPayment(v.file_path)
                    }}
                    disabled={isDraft}
                    className={`text-left flex items-center gap-2 ${isDraft ? 'text-ink-500 cursor-default' : 'text-forest-700 hover:underline'}`}
                  >
                    {v.voucher_name}
                    <span className="text-[10px] uppercase tracking-wide text-ink-400 bg-sage-100 rounded-full px-2 py-0.5">
                      {v.voucher_type}
                    </span>
                    {v.pdf_url && (
                      <span className="text-[10px] uppercase tracking-wide text-forest-700 bg-forest-100 rounded-full px-2 py-0.5">
                        generated
                      </span>
                    )}
                    {isDraft && (
                      <span className="text-[10px] uppercase tracking-wide text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">
                        draft
                      </span>
                    )}
                  </button>
                  <div className="flex items-center gap-3">
                    {v.issued_by_name && <span className="text-xs text-ink-400">by {v.issued_by_name}</span>}
                    {v.form_data && (
                      <button onClick={() => openVoucherEditor(v)} className="text-xs text-forest-700 hover:underline">
                        {v.pdf_url ? 'Edit / Regenerate' : 'Edit'}
                      </button>
                    )}
                    <button onClick={() => handleDeleteVoucher(v.id)} className="text-ink-400 hover:text-danger-600">
                      <IconTrash size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Publish */}
      <section className="bg-white rounded-[var(--radius-card)] p-5 flex items-center justify-between">
        <div>
          <h2 className="font-display font-semibold text-ink-900">Publish</h2>
          <p className="text-ink-400 text-xs mt-0.5">
            Generates a password-protected summary page in the trips.africanroutesafaris.com/client-files/ folder. Receipts and bank PoP stay in the portal only.
          </p>
        </div>
        <button
          onClick={handlePublish}
          disabled={publishing}
          className="rounded-full bg-forest-600 text-white text-sm font-medium px-5 py-2.5 disabled:opacity-50 shrink-0"
        >
          {publishing ? <IconLoader2 size={16} className="animate-spin" /> : file.published_at ? 'Republish' : 'Publish'}
        </button>
      </section>
    </div>
  )
}

function VField({ label, value, onChange, type = 'text', span = 1 }) {
  return (
    <label className={`flex flex-col gap-1 ${span === 2 ? 'col-span-2' : ''}`}>
      <span className="text-xs text-ink-400">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-sage-200 px-3 py-1.5 text-sm outline-none focus:border-forest-600"
      />
    </label>
  )
}

function UploadSection({ title, items, onSelectFile, onView, onDelete, renderMeta }) {
  return (
    <section className="bg-white rounded-[var(--radius-card)] p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-ink-900">{title}</h2>
        <label className="text-xs rounded-full bg-sage-100 px-3 py-1.5 flex items-center gap-1 cursor-pointer">
          <IconUpload size={13} /> Upload
          <input
            type="file"
            className="hidden"
            onChange={(e) => {
              onSelectFile(e.target.files)
              e.target.value = ''
            }}
          />
        </label>
      </div>
      {items.length === 0 ? (
        <p className="text-ink-400 text-sm">No uploads yet.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {items.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-sm border border-sage-100 rounded-lg px-3 py-2">
              <button onClick={() => onView(p.file_path)} className="text-forest-700 hover:underline text-left">
                {p.payment_name}
              </button>
              <div className="flex items-center gap-3">
                {renderMeta?.(p) && <span className="text-xs text-ink-400">{renderMeta(p)}</span>}
                <button onClick={() => onDelete(p.id)} className="text-ink-400 hover:text-danger-600">
                  <IconTrash size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
