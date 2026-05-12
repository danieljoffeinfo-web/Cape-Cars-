'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

type Rental = {
  id: string
  vehicle_id: string | null
  customer_id: string | null
  start_date: string
  end_date: string
  pickup_location: string | null
  dropoff_location: string | null
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled'
  total_days: number
  notes: string | null
  actual_return_date: string | null
  extra_charges: number
  extra_charges_reason: string | null
  final_amount: number | null
  created_at: string
  vehicles?: { model: string; rate: number } | null
  customers?: { full_name: string; email: string } | null
}

type Vehicle = { id: string; model: string; rate: number; status: string }
type Customer = { id: string; full_name: string; email: string }

const STATUS_STYLES: Record<string, string> = {
  pending:   'bg-neutral-100 text-neutral-500 border-neutral-200',
  confirmed: 'bg-blue-50 text-blue-600 border-blue-200',
  active:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  completed: 'bg-neutral-100 text-neutral-500 border-neutral-200',
  cancelled: 'bg-red-50 text-red-500 border-red-200',
}
const STATUS_OPTIONS = ['pending', 'confirmed', 'active', 'completed', 'cancelled'] as const

type RentalStatus = 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled'
type RentalFormState = {
  vehicle_id: string; customer_id: string; start_date: string; end_date: string
  pickup_location: string; dropoff_location: string; status: RentalStatus
  notes: string; extra_charges: number; extra_charges_reason: string; actual_return_date: string
}
const emptyForm = (): RentalFormState => ({
  vehicle_id: '',
  customer_id: '',
  start_date: '',
  end_date: '',
  pickup_location: '',
  dropoff_location: '',
  status: 'pending',
  notes: '',
  extra_charges: 0,
  extra_charges_reason: '',
  actual_return_date: '',
})

export default function RentalsPage() {
  const supabase = createClient()
  const [rentals, setRentals] = useState<Rental[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Rental | null>(null)
  const [form, setForm] = useState<RentalFormState>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [rentalsRes, vehiclesRes, customersRes] = await Promise.all([
      supabase.from('rentals').select('*, vehicles(model, rate), customers(full_name, email)').order('created_at', { ascending: false }),
      supabase.from('vehicles').select('id, model, rate, status').order('model'),
      supabase.from('customers').select('id, full_name, email').order('full_name'),
    ])
    setRentals((rentalsRes.data as Rental[]) ?? [])
    setVehicles((vehiclesRes.data as Vehicle[]) ?? [])
    setCustomers((customersRes.data as Customer[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const totalDays = (start: string, end: string) => {
    if (!start || !end) return 0
    return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)))
  }

  const calcAmount = () => {
    const vehicle = vehicles.find(v => v.id === form.vehicle_id)
    if (!vehicle) return 0
    const days = totalDays(form.start_date, form.end_date)
    return (vehicle.rate * days) + Number(form.extra_charges || 0)
  }

  const openAdd = () => {
    setEditing(null); setForm(emptyForm()); setError(null); setConfirmDelete(false); setShowModal(true)
  }

  const openEdit = (r: Rental) => {
    setEditing(r)
    setForm({
      vehicle_id: r.vehicle_id ?? '',
      customer_id: r.customer_id ?? '',
      start_date: r.start_date,
      end_date: r.end_date,
      pickup_location: r.pickup_location ?? '',
      dropoff_location: r.dropoff_location ?? '',
      status: r.status,
      notes: r.notes ?? '',
      extra_charges: r.extra_charges ?? 0,
      extra_charges_reason: r.extra_charges_reason ?? '',
      actual_return_date: r.actual_return_date ?? '',
    })
    setError(null); setConfirmDelete(false); setShowModal(true)
  }

  const save = async () => {
    if (!form.vehicle_id || !form.customer_id || !form.start_date || !form.end_date) {
      setError('Vehicle, customer, start date and end date are required'); return
    }
    setSaving(true); setError(null)
    const vehicle = vehicles.find(v => v.id === form.vehicle_id)
    const days = totalDays(form.start_date, form.end_date)
    const final_amount = (vehicle?.rate ?? 0) * days + Number(form.extra_charges || 0)

    const payload = {
      vehicle_id: form.vehicle_id,
      customer_id: form.customer_id,
      start_date: form.start_date,
      end_date: form.end_date,
      pickup_location: form.pickup_location || null,
      dropoff_location: form.dropoff_location || null,
      status: form.status,
      notes: form.notes || null,
      extra_charges: Number(form.extra_charges) || 0,
      extra_charges_reason: form.extra_charges_reason || null,
      actual_return_date: form.actual_return_date || null,
      final_amount,
    }

    if (editing) {
      const { error: e } = await supabase.from('rentals').update(payload).eq('id', editing.id)
      if (e) { setError(e.message); setSaving(false); return }
    } else {
      const { error: e } = await supabase.from('rentals').insert(payload)
      if (e) { setError(e.message); setSaving(false); return }
    }
    setShowModal(false); load(); setSaving(false)
  }

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id)
    await supabase.from('rentals').update({ status }).eq('id', id)
    setRentals(r => r.map(x => x.id === id ? { ...x, status: status as Rental['status'] } : x))
    setUpdatingId(null)
  }

  const deleteRental = async () => {
    if (!editing) return
    const { error: e } = await supabase.from('rentals').delete().eq('id', editing.id)
    if (e) { setError(e.message); return }
    setShowModal(false); load()
  }

  const filtered = filterStatus === 'all' ? rentals : rentals.filter(r => r.status === filterStatus)
  const activeCount = rentals.filter(r => r.status === 'active').length
  const totalRevenue = rentals.filter(r => r.status === 'completed').reduce((s, r) => s + (r.final_amount ?? 0), 0)

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-light text-neutral-900">Rentals</h1>
          <p className="mt-1 text-sm text-neutral-500">Active rentals, returns, extra charges & history</p>
        </div>
        <button onClick={openAdd} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-neutral-900 text-white text-sm hover:bg-neutral-800 transition-colors">
          + New rental
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total rentals',   value: rentals.length },
          { label: 'Active now',      value: activeCount,    cls: activeCount > 0 ? 'text-emerald-600' : '' },
          { label: 'Completed',       value: rentals.filter(r => r.status === 'completed').length },
          { label: 'Revenue (closed)',value: `R ${totalRevenue.toLocaleString('en-ZA')}` },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border border-black/[0.06]">
            <div className="text-[10px] tracking-[0.25em] uppercase text-neutral-400">{s.label}</div>
            <div className={`mt-1.5 text-xl font-light tabular-nums ${(s as any).cls || 'text-neutral-900'}`}>{loading ? '—' : s.value}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {['all', ...STATUS_OPTIONS].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-full text-xs capitalize transition-colors border ${filterStatus === s ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-500 border-black/[0.08] hover:border-black/20'}`}
          >
            {s === 'all' ? `All (${rentals.length})` : `${s} (${rentals.filter(r => r.status === s).length})`}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
        {loading ? (
          <div className="py-20 flex items-center justify-center text-neutral-400 text-sm">
            <svg className="animate-spin mr-2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            Loading rentals…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-neutral-400 text-sm">
            {rentals.length === 0
              ? <><span>No rentals yet. </span><button onClick={openAdd} className="text-neutral-900 underline underline-offset-2">Create first rental.</button></>
              : 'No rentals match this filter.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/[0.06] text-[10px] tracking-[0.2em] uppercase text-neutral-400">
                  <th className="text-left px-5 py-3 font-normal">Customer</th>
                  <th className="text-left px-5 py-3 font-normal hidden sm:table-cell">Vehicle</th>
                  <th className="text-left px-5 py-3 font-normal hidden md:table-cell">Dates</th>
                  <th className="text-left px-5 py-3 font-normal hidden md:table-cell">Days</th>
                  <th className="text-left px-5 py-3 font-normal hidden lg:table-cell">Amount</th>
                  <th className="text-left px-5 py-3 font-normal">Status</th>
                  <th className="text-right px-5 py-3 font-normal">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04]">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-medium text-neutral-900">{r.customers?.full_name ?? '—'}</div>
                      <div className="text-xs text-neutral-400 mt-0.5">{r.customers?.email}</div>
                    </td>
                    <td className="px-5 py-4 text-neutral-600 hidden sm:table-cell">{r.vehicles?.model ?? '—'}</td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <div className="text-neutral-700">{new Date(r.start_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}</div>
                      <div className="text-xs text-neutral-400">→ {new Date(r.end_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                    </td>
                    <td className="px-5 py-4 tabular-nums text-neutral-700 hidden md:table-cell">{r.total_days}d</td>
                    <td className="px-5 py-4 tabular-nums text-neutral-900 hidden lg:table-cell">
                      R {(r.final_amount ?? 0).toLocaleString('en-ZA')}
                      {r.extra_charges > 0 && <div className="text-xs text-amber-600">+R {r.extra_charges.toLocaleString('en-ZA')} extras</div>}
                    </td>
                    <td className="px-5 py-4">
                      <select value={r.status} disabled={updatingId === r.id} onChange={e => updateStatus(r.id, e.target.value)}
                        className={`px-2.5 py-1 rounded-full text-[10px] tracking-[0.1em] uppercase font-medium border cursor-pointer focus:outline-none ${STATUS_STYLES[r.status]} ${updatingId === r.id ? 'opacity-50' : ''}`}>
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button onClick={() => openEdit(r)} className="text-xs text-neutral-400 hover:text-neutral-900 transition-colors px-3 py-1 rounded-lg hover:bg-neutral-100">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-black/[0.06] px-7 py-5 flex items-center justify-between rounded-t-3xl">
              <h2 className="text-lg font-medium text-neutral-900">{editing ? 'Edit rental' : 'New rental'}</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors flex items-center justify-center text-neutral-500">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="px-7 py-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase text-neutral-400 mb-1.5">Customer *</label>
                  <select value={form.customer_id} onChange={e => setForm(f => ({...f, customer_id: e.target.value}))} className="w-full px-4 py-2.5 rounded-xl border border-black/[0.1] text-sm focus:outline-none focus:border-neutral-400 bg-white">
                    <option value="">Select customer…</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase text-neutral-400 mb-1.5">Vehicle *</label>
                  <select value={form.vehicle_id} onChange={e => setForm(f => ({...f, vehicle_id: e.target.value}))} className="w-full px-4 py-2.5 rounded-xl border border-black/[0.1] text-sm focus:outline-none focus:border-neutral-400 bg-white">
                    <option value="">Select vehicle…</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.model} — R {v.rate.toLocaleString()}/day</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase text-neutral-400 mb-1.5">Start Date *</label>
                  <input type="date" value={form.start_date} onChange={e => setForm(f => ({...f, start_date: e.target.value}))} className="w-full px-4 py-2.5 rounded-xl border border-black/[0.1] text-sm focus:outline-none focus:border-neutral-400 bg-white" />
                </div>
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase text-neutral-400 mb-1.5">End Date *</label>
                  <input type="date" value={form.end_date} onChange={e => setForm(f => ({...f, end_date: e.target.value}))} className="w-full px-4 py-2.5 rounded-xl border border-black/[0.1] text-sm focus:outline-none focus:border-neutral-400 bg-white" />
                </div>
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase text-neutral-400 mb-1.5">Pickup Location</label>
                  <input value={form.pickup_location} onChange={e => setForm(f => ({...f, pickup_location: e.target.value}))} placeholder="e.g. Sandton City" className="w-full px-4 py-2.5 rounded-xl border border-black/[0.1] text-sm focus:outline-none focus:border-neutral-400 bg-white" />
                </div>
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase text-neutral-400 mb-1.5">Dropoff Location</label>
                  <input value={form.dropoff_location} onChange={e => setForm(f => ({...f, dropoff_location: e.target.value}))} placeholder="e.g. OR Tambo" className="w-full px-4 py-2.5 rounded-xl border border-black/[0.1] text-sm focus:outline-none focus:border-neutral-400 bg-white" />
                </div>
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase text-neutral-400 mb-1.5">Actual Return Date</label>
                  <input type="date" value={form.actual_return_date} onChange={e => setForm(f => ({...f, actual_return_date: e.target.value}))} className="w-full px-4 py-2.5 rounded-xl border border-black/[0.1] text-sm focus:outline-none focus:border-neutral-400 bg-white" />
                </div>
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase text-neutral-400 mb-1.5">Extra Charges (R)</label>
                  <input type="number" value={form.extra_charges} onChange={e => setForm(f => ({...f, extra_charges: Number(e.target.value)}))} min={0} className="w-full px-4 py-2.5 rounded-xl border border-black/[0.1] text-sm focus:outline-none focus:border-neutral-400 bg-white" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] tracking-[0.2em] uppercase text-neutral-400 mb-1.5">Extra Charges Reason</label>
                  <input value={form.extra_charges_reason} onChange={e => setForm(f => ({...f, extra_charges_reason: e.target.value}))} placeholder="e.g. Late return, fuel, damage" className="w-full px-4 py-2.5 rounded-xl border border-black/[0.1] text-sm focus:outline-none focus:border-neutral-400 bg-white" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] tracking-[0.2em] uppercase text-neutral-400 mb-1.5">Status</label>
                  <div className="flex gap-2 flex-wrap">
                    {STATUS_OPTIONS.map(s => (
                      <button key={s} type="button" onClick={() => setForm(f => ({...f, status: s}))}
                        className={`flex-1 py-2 rounded-xl text-xs capitalize transition-all border ${form.status === s ? STATUS_STYLES[s] : 'bg-neutral-50 border-black/[0.08] text-neutral-500'}`}
                      >{s}</button>
                    ))}
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] tracking-[0.2em] uppercase text-neutral-400 mb-1.5">Notes</label>
                  <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} rows={2} placeholder="Any special notes…" className="w-full px-4 py-3 rounded-xl border border-black/[0.1] text-sm focus:outline-none focus:border-neutral-400 bg-white resize-none" />
                </div>
              </div>

              {/* Price preview */}
              {form.vehicle_id && form.start_date && form.end_date && (
                <div className="bg-neutral-50 rounded-xl px-5 py-4 text-sm">
                  <div className="flex justify-between text-neutral-500">
                    <span>{totalDays(form.start_date, form.end_date)} days × R {(vehicles.find(v => v.id === form.vehicle_id)?.rate ?? 0).toLocaleString()}</span>
                    <span>R {((vehicles.find(v => v.id === form.vehicle_id)?.rate ?? 0) * totalDays(form.start_date, form.end_date)).toLocaleString('en-ZA')}</span>
                  </div>
                  {Number(form.extra_charges) > 0 && (
                    <div className="flex justify-between text-amber-600 mt-1">
                      <span>Extra charges</span>
                      <span>+ R {Number(form.extra_charges).toLocaleString('en-ZA')}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-medium text-neutral-900 mt-2 pt-2 border-t border-black/[0.06]">
                    <span>Total</span>
                    <span>R {calcAmount().toLocaleString('en-ZA')}</span>
                  </div>
                </div>
              )}

              {error && <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">⚠️ {error}</div>}
            </div>
            <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-black/[0.06] px-7 py-5 flex items-center justify-between rounded-b-3xl">
              <div>
                {editing && !confirmDelete && (
                  <button onClick={() => setConfirmDelete(true)} className="text-sm text-red-400 hover:text-red-600 transition-colors">Delete rental</button>
                )}
                {confirmDelete && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-neutral-500">Sure?</span>
                    <button onClick={deleteRental} className="text-sm text-red-500 font-medium hover:text-red-700">Yes, delete</button>
                    <button onClick={() => setConfirmDelete(false)} className="text-sm text-neutral-400 hover:text-neutral-700">Cancel</button>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-full border border-black/[0.1] text-sm text-neutral-600 hover:bg-neutral-50 transition-colors">Cancel</button>
                <button onClick={save} disabled={saving} className="px-6 py-2.5 rounded-full bg-neutral-900 text-white text-sm hover:bg-neutral-800 transition-colors disabled:opacity-60 min-w-[120px] text-center">
                  {saving ? 'Saving…' : editing ? 'Save changes' : 'Create rental'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
