import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import { IconPlus, IconTrash, IconUpload, IconDownload, IconLoader2, IconCopy } from '@tabler/icons-react'
import {
  getClientFile,
  updateClientFile,
  validateClientFile,
  addTransfer,
  updateTransfer,
  deleteTransfer,
  addPayment,
  deletePayment,
  createInvoice,
  updateInvoice,
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

  async function handleUploadPayment(docType, fileList) {
    const uploadFile = fileList?.[0]
    if (!uploadFile) return
    const paymentName = prompt(docType === 'client_receipt' ? 'Name this receipt (e.g. "Deposit")' : 'Name this payment (e.g. "Deposit", "Balance")')
    if (!paymentName) return
    setError('')
    try {
      const path = await uploadPrivateFile('client-payment-docs', uploadFile, id)
      await addPayment(id, { paymentName, docType, filePath: path })
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

  // ---- Invoice ----

  const invoice = file?.proforma_invoices?.[0]

  async function handleCreateInvoice(template) {
    setError('')
    try {
      await createInvoice(id, { template, currency: 'USD', lineItems: [{ description: '', quantity: 1, unitPrice: 0 }], totalAmount: 0 })
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

  async function handleSaveInvoice() {
    setError('')
    try {
      await updateInvoice(invoice.id, { line_items: invoice.line_items, total_amount: invoice.total_amount })
    } catch (err) {
      setError(err.message)
    }
  }

  // PDF generation happens server-side (e.g. a generate-invoice-pdf Edge Function
  // rendering with the same branding as templates.ts); this triggers it and stores
  // the returned pdf_url. Left as a stub call — wire up the Edge Function endpoint here.
  async function handleGeneratePdf() {
    setError('Invoice PDF generation endpoint not yet connected — see generate-invoice-pdf Edge Function.')
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

            <div className="flex gap-2">
              <button onClick={handleSaveInvoice} className="rounded-full bg-forest-600 text-white text-sm px-4 py-2">
                Save invoice
              </button>
              <button onClick={handleGeneratePdf} className="rounded-full bg-sage-100 text-sm px-4 py-2 flex items-center gap-1.5">
                <IconDownload size={14} /> Download PDF
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Client receipts */}
      <UploadSection
        title="Client receipts*"
        docType="client_receipt"
        items={(file.client_file_payments ?? []).filter((p) => p.doc_type === 'client_receipt')}
        onUpload={(files) => handleUploadPayment('client_receipt', files)}
        onView={handleViewPayment}
        onDelete={handleDeletePayment}
      />

      {/* Bank receipts / PoP */}
      <UploadSection
        title="Bank receipts (Proof of Payment)"
        docType="bank_pop"
        items={(file.client_file_payments ?? []).filter((p) => p.doc_type === 'bank_pop')}
        onUpload={(files) => handleUploadPayment('bank_pop', files)}
        onView={handleViewPayment}
        onDelete={handleDeletePayment}
      />

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

function UploadSection({ title, items, onUpload, onView, onDelete }) {
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
              onUpload(e.target.files)
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
              <button onClick={() => onDelete(p.id)} className="text-ink-400 hover:text-danger-600">
                <IconTrash size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
