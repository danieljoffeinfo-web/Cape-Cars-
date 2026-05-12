'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

type Invoice = {
  id: string
  rental_id: string | null
  customer_id: string | null
  vehicle_id: string | null
  daily_rate: number
  total_days: number
  subtotal: number
  tax: number
  total_amount: number
  status: 'paid' | 'unpaid' | 'overdue'
  issued_date: string
  due_date: string | null
  created_at: string
  customers?: { full_name: string; email: string } | null
  vehicles?: { model: string } | null
}

type Customer = { id: string; full_name: string; email: string }
type Vehicle = { id: string; model: string; rate: number }
type Rental = { id: string; customer_id: string | null; vehicle_id: string | null; total_days: number; vehicles?: { model: string; rate: number } | null; customers?: { full_name: string } | null }

const STATUS_STYLES: Record<string, string> = {
  paid:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  unpaid:  'bg-amber-50 text-amber-700 border-amber-200',
  overdue: 'bg-red-50 text-red-600 border-red-200',
}

type InvoiceStatus = 'paid' | 'unpaid' | 'overdue'
type FormState = {
  rental_id: string; customer_id: string; vehicle_id: string
  daily_rate: number; total_days: number; tax: number
  status: InvoiceStatus; issued_date: string; due_date: string
}
const emptyForm = (): FormState => ({
  rental_id: '',
  customer_id: '',
  vehicle_id: '',
  daily_rate: 0,
  total_days: 1,
  tax: 0,
  status: 'unpaid',
  issued_date: new Date().toISOString().slice(0, 10),
  due_date: '',
})

export default function InvoicesPage() {
  const supabase = createClient()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [rentals, setRentals] = useState<Rental[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Invoice | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [invRes, custRes, vehRes, rentRes] = await Promise.all([
      supabase.from('invoices').select('*, customers(full_name, email), vehicles(model)').order('created_at', { ascending: false }),
      supabase.from('customers').select('id, full_name, email').order('full_name'),
      supabase.from('vehicles').select('id, model, rate').order('model'),
      supabase.from('rentals').select('id, customer_id, vehicle_id, total_days, vehicles(model, rate), customers(full_name)').order('created_at', { ascending: false }),
    ])
    setInvoices((invRes.data as Invoice[]) ?? [])
    setCustomers((custRes.data as Customer[]) ?? [])
    setVehicles((vehRes.data as Vehicle[]) ?? [])
    setRentals((rentRes.data as unknown as Rental[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Auto-fill from rental
  const onRentalChange = (rentalId: string) => {
    const rental = rentals.find(r => r.id === rentalId)
    if (!rental) { setForm(f => ({ ...f, rental_id: rentalId })); return }
    const rate = rental.vehicles?.rate ?? 0
    setForm(f => ({
      ...f,
      rental_id: rentalId,
      customer_id: rental.customer_id ?? '',
      vehicle_id: rental.vehicle_id ?? '',
      daily_rate: rate,
      total_days: rental.total_days ?? 1,
    }))
  }

  const subtotal = () => Number(form.daily_rate) * Number(form.total_days)
  const totalAmount = () => subtotal() + Number(form.tax)

  const openAdd = () => { setEditing(null); setForm(emptyForm()); setError(null); setConfirmDelete(false); setShowModal(true) }

  const openEdit = (inv: Invoice) => {
    setEditing(inv)
    setForm({
      rental_id: inv.rental_id ?? '',
      customer_id: inv.customer_id ?? '',
      vehicle_id: inv.vehicle_id ?? '',
      daily_rate: inv.daily_rate,
      total_days: inv.total_days,
      tax: inv.tax,
      status: inv.status,
      issued_date: inv.issued_date,
      due_date: inv.due_date ?? '',
    })
    setError(null); setConfirmDelete(false); setShowModal(true)
  }

  const save = async () => {
    if (!form.customer_id || !form.daily_rate || !form.total_days) {
      setError('Customer, daily rate and days are required'); return
    }
    setSaving(true); setError(null)
    const sub = subtotal()
    const total = totalAmount()
    const payload = {
      rental_id: form.rental_id || null,
      customer_id: form.customer_id,
      vehicle_id: form.vehicle_id || null,
      daily_rate: Number(form.daily_rate),
      total_days: Number(form.total_days),
      subtotal: sub,
      tax: Number(form.tax),
      total_amount: total,
      status: form.status,
      issued_date: form.issued_date,
      due_date: form.due_date || null,
    }
    if (editing) {
      const { error: e } = await supabase.from('invoices').update(payload).eq('id', editing.id)
      if (e) { setError(e.message); setSaving(false); return }
    } else {
      const { error: e } = await supabase.from('invoices').insert(payload)
      if (e) { setError(e.message); setSaving(false); return }
    }
    setShowModal(false); load(); setSaving(false)
  }

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id)
    await supabase.from('invoices').update({ status }).eq('id', id)
    setInvoices(i => i.map(x => x.id === id ? { ...x, status: status as Invoice['status'] } : x))
    setUpdatingId(null)
  }

  const deleteInvoice = async () => {
    if (!editing) return
    const { error: e } = await supabase.from('invoices').delete().eq('id', editing.id)
    if (e) { setError(e.message); return }
    setShowModal(false); load()
  }

  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total_amount, 0)
  const totalOutstanding = invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + i.total_amount, 0)
  const overdueCount = invoices.filter(i => i.status === 'overdue').length

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-light text-neutral-900">Invoice Generator</h1>
          <p className="mt-1 text-sm text-neutral-500">Auto-generated from rentals · line items · VAT · status tracking</p>
        </div>
        <button onClick={openAdd} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-neutral-900 text-white text-sm hover:bg-neutral-800 transition-colors">
          + New invoice
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total invoices',  value: invoices.length },
          { label: 'Revenue (paid)',  value: `R ${totalPaid.toLocaleString('en-ZA')}` },
          { label: 'Outstanding',     value: `R ${totalOutstanding.toLocaleString('en-ZA')}`, cls: totalOutstanding > 0 ? 'text-amber-600' : '' },
          { label: 'Overdue',         value: overdueCount, cls: overdueCount > 0 ? 'text-red-500' : '' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border border-black/[0.06]">
            <div className="text-[10px] tracking-[0.25em] uppercase text-neutral-400">{s.label}</div>
            <div className={`mt-1.5 text-xl font-light tabular-nums ${(s as any).cls || 'text-neutral-900'}`}>{loading ? '—' : s.value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
        {loading ? (
          <div className="py-20 flex items-center justify-center text-neutral-400 text-sm">
            <svg className="animate-spin mr-2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            Loading invoices…
          </div>
        ) : invoices.length === 0 ? (
          <div className="py-20 text-center text-neutral-400 text-sm">
            <div className="text-3xl mb-3">🧾</div>
            <div>No invoices yet.</div>
            <button onClick={openAdd} className="mt-2 text-neutral-900 underline underline-offset-2">Create your first invoice.</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/[0.06] text-[10px] tracking-[0.2em] uppercase text-neutral-400">
                  <th className="text-left px-5 py-3 font-normal">Customer</th>
                  <th className="text-left px-5 py-3 font-normal hidden sm:table-cell">Vehicle</th>
                  <th className="text-left px-5 py-3 font-normal hidden md:table-cell">Days</th>
                  <th className="text-left px-5 py-3 font-normal hidden md:table-cell">Issued</th>
                  <th className="text-left px-5 py-3 font-normal">Amount</th>
                  <th className="text-left px-5 py-3 font-normal">Status</th>
                  <th className="text-right px-5 py-3 font-normal">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04]">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-medium text-neutral-900">{inv.customers?.full_name ?? '—'}</div>
                      <div className="text-xs text-neutral-400 mt-0.5">{inv.customers?.email}</div>
                    </td>
                    <td className="px-5 py-4 text-neutral-600 hidden sm:table-cell">{inv.vehicles?.model ?? '—'}</td>
                    <td className="px-5 py-4 text-neutral-600 hidden md:table-cell">{inv.total_days}d @ R {inv.daily_rate.toLocaleString()}</td>
                    <td className="px-5 py-4 text-neutral-500 hidden md:table-cell">{new Date(inv.issued_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td className="px-5 py-4 font-medium text-neutral-900 tabular-nums">R {inv.total_amount.toLocaleString('en-ZA')}</td>
                    <td className="px-5 py-4">
                      <select value={inv.status} disabled={updatingId === inv.id} onChange={e => updateStatus(inv.id, e.target.value)}
                        className={`px-2.5 py-1 rounded-full text-[10px] tracking-[0.1em] uppercase font-medium border cursor-pointer focus:outline-none ${STATUS_STYLES[inv.status]} ${updatingId === inv.id ? 'opacity-50' : ''}`}>
                        {['paid', 'unpaid', 'overdue'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button onClick={() => openEdit(inv)} className="text-xs text-neutral-400 hover:text-neutral-900 transition-colors px-3 py-1 rounded-lg hover:bg-neutral-100">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-blue-50 border border-blue-100 px-5 py-4 text-sm text-blue-700">
        💡 <strong>Tip:</strong> Select a rental when creating an invoice to auto-fill the customer, vehicle, rate and days. Mark overdue invoices to track outstanding debt.
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-black/[0.06] px-7 py-5 flex items-center justify-between rounded-t-3xl">
              <h2 className="text-lg font-medium text-neutral-900">{editing ? 'Edit invoice' : 'New invoice'}</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors flex items-center justify-center text-neutral-500">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="px-7 py-6 space-y-4">
              <div>
                <label className="block text-[10px] tracking-[0.2em] uppercase text-neutral-400 mb-1.5">Link to Rental (auto-fills fields)</label>
                <select value={form.rental_id} onChange={e => onRentalChange(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-black/[0.1] text-sm focus:outline-none focus:border-neutral-400 bg-white">
                  <option value="">Manual entry…</option>
                  {rentals.map(r => <option key={r.id} value={r.id}>{r.customers?.full_name ?? 'Unknown'} — {r.vehicles?.model ?? 'Unknown vehicle'} ({r.total_days}d)</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase text-neutral-400 mb-1.5">Customer *</label>
                  <select value={form.customer_id} onChange={e => setForm(f => ({...f, customer_id: e.target.value}))} className="w-full px-4 py-2.5 rounded-xl border border-black/[0.1] text-sm focus:outline-none focus:border-neutral-400 bg-white">
                    <option value="">Select…</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase text-neutral-400 mb-1.5">Vehicle</label>
                  <select value={form.vehicle_id} onChange={e => { const v = vehicles.find(x => x.id === e.target.value); setForm(f => ({...f, vehicle_id: e.target.value, daily_rate: v?.rate ?? f.daily_rate})) }} className="w-full px-4 py-2.5 rounded-xl border border-black/[0.1] text-sm focus:outline-none focus:border-neutral-400 bg-white">
                    <option value="">Select…</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.model}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase text-neutral-400 mb-1.5">Daily Rate (R)</label>
                  <input type="number" value={form.daily_rate} onChange={e => setForm(f => ({...f, daily_rate: Number(e.target.value)}))} min={0} className="w-full px-4 py-2.5 rounded-xl border border-black/[0.1] text-sm focus:outline-none focus:border-neutral-400 bg-white" />
                </div>
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase text-neutral-400 mb-1.5">Total Days</label>
                  <input type="number" value={form.total_days} onChange={e => setForm(f => ({...f, total_days: Number(e.target.value)}))} min={1} className="w-full px-4 py-2.5 rounded-xl border border-black/[0.1] text-sm focus:outline-none focus:border-neutral-400 bg-white" />
                </div>
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase text-neutral-400 mb-1.5">VAT / Tax (R)</label>
                  <input type="number" value={form.tax} onChange={e => setForm(f => ({...f, tax: Number(e.target.value)}))} min={0} className="w-full px-4 py-2.5 rounded-xl border border-black/[0.1] text-sm focus:outline-none focus:border-neutral-400 bg-white" />
                </div>
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase text-neutral-400 mb-1.5">Issued Date</label>
                  <input type="date" value={form.issued_date} onChange={e => setForm(f => ({...f, issued_date: e.target.value}))} className="w-full px-4 py-2.5 rounded-xl border border-black/[0.1] text-sm focus:outline-none focus:border-neutral-400 bg-white" />
                </div>
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase text-neutral-400 mb-1.5">Due Date</label>
                  <input type="date" value={form.due_date} onChange={e => setForm(f => ({...f, due_date: e.target.value}))} className="w-full px-4 py-2.5 rounded-xl border border-black/[0.1] text-sm focus:outline-none focus:border-neutral-400 bg-white" />
                </div>
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase text-neutral-400 mb-1.5">Status</label>
                  <div className="flex gap-2">
                    {(['paid', 'unpaid', 'overdue'] as const).map(s => (
                      <button key={s} type="button" onClick={() => setForm(f => ({...f, status: s}))}
                        className={`flex-1 py-2 rounded-xl text-xs capitalize transition-all border ${form.status === s ? STATUS_STYLES[s] : 'bg-neutral-50 border-black/[0.08] text-neutral-500'}`}
                      >{s}</button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Price preview */}
              {(form.daily_rate > 0 || form.total_days > 0) && (
                <div className="bg-neutral-50 rounded-xl px-5 py-4 text-sm space-y-1">
                  <div className="flex justify-between text-neutral-500">
                    <span>{form.total_days}d × R {Number(form.daily_rate).toLocaleString()}</span>
                    <span>R {subtotal().toLocaleString('en-ZA')}</span>
                  </div>
                  {Number(form.tax) > 0 && (
                    <div className="flex justify-between text-neutral-500">
                      <span>VAT / Tax</span>
                      <span>+ R {Number(form.tax).toLocaleString('en-ZA')}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-medium text-neutral-900 pt-2 border-t border-black/[0.06]">
                    <span>Total</span>
                    <span>R {totalAmount().toLocaleString('en-ZA')}</span>
                  </div>
                </div>
              )}

              {error && <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">⚠️ {error}</div>}
            </div>
            <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-black/[0.06] px-7 py-5 flex items-center justify-between rounded-b-3xl">
              <div>
                {editing && !confirmDelete && (
                  <button onClick={() => setConfirmDelete(true)} className="text-sm text-red-400 hover:text-red-600 transition-colors">Delete invoice</button>
                )}
                {confirmDelete && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-neutral-500">Sure?</span>
                    <button onClick={deleteInvoice} className="text-sm text-red-500 font-medium hover:text-red-700">Yes, delete</button>
                    <button onClick={() => setConfirmDelete(false)} className="text-sm text-neutral-400 hover:text-neutral-700">Cancel</button>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-full border border-black/[0.1] text-sm text-neutral-600 hover:bg-neutral-50 transition-colors">Cancel</button>
                <button onClick={save} disabled={saving} className="px-6 py-2.5 rounded-full bg-neutral-900 text-white text-sm hover:bg-neutral-800 transition-colors disabled:opacity-60 min-w-[120px] text-center">
                  {saving ? 'Saving…' : editing ? 'Save changes' : 'Create invoice'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
