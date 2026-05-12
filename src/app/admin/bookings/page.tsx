'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

type Booking = {
  id: number
  name: string
  email: string
  phone: string | null
  preferred_date: string | null
  car_interest: string | null
  booking_type: string
  notes: string | null
  status: 'new' | 'confirmed' | 'declined' | 'completed'
  created_at: string
}

const STATUS_STYLES: Record<string, string> = {
  new:       'bg-blue-50 text-blue-600 border-blue-200',
  confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  declined:  'bg-red-50 text-red-600 border-red-200',
  completed: 'bg-neutral-100 text-neutral-500 border-neutral-200',
}

const STATUS_OPTIONS = ['new', 'confirmed', 'declined', 'completed'] as const

type NewBookingForm = {
  name: string
  email: string
  phone: string
  preferred_date: string
  car_interest: string
  booking_type: string
  notes: string
  status: string
}

const emptyForm = (): NewBookingForm => ({
  name: '', email: '', phone: '', preferred_date: '',
  car_interest: '', booking_type: 'Afternoon', notes: '', status: 'new',
})

export default function BookingsPage() {
  const supabase = createClient()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<NewBookingForm>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false })
    setBookings((data as Booking[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const updateStatus = async (id: number, status: string) => {
    setUpdatingId(id)
    await supabase.from('bookings').update({ status }).eq('id', id)
    setBookings(b => b.map(x => x.id === id ? { ...x, status: status as Booking['status'] } : x))
    setUpdatingId(null)
  }

  const save = async () => {
    if (!form.name.trim() || !form.email.trim()) { setError('Name and email are required'); return }
    setSaving(true)
    setError(null)
    const { error: err } = await supabase.from('bookings').insert({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone || null,
      preferred_date: form.preferred_date || null,
      car_interest: form.car_interest || null,
      booking_type: form.booking_type,
      notes: form.notes || null,
      status: form.status,
    })
    if (err) { setError(err.message); setSaving(false); return }
    setShowModal(false)
    setForm(emptyForm())
    load()
    setSaving(false)
  }

  const filtered = filterStatus === 'all' ? bookings : bookings.filter(b => b.status === filterStatus)
  const newCount = bookings.filter(b => b.status === 'new').length
  const confirmedCount = bookings.filter(b => b.status === 'confirmed').length
  const completedCount = bookings.filter(b => b.status === 'completed').length
  const totalValue = bookings.filter(b => b.status !== 'declined').length

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-light text-neutral-900">Bookings Tracker</h1>
          <p className="mt-1 text-sm text-neutral-500">All enquiries, status updates & booking records</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-neutral-900 text-white text-sm hover:bg-neutral-800 transition-colors"
        >
          + New booking
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total bookings', value: bookings.length },
          { label: 'New (unread)',   value: newCount,        cls: newCount > 0 ? 'text-blue-600' : '' },
          { label: 'Confirmed',      value: confirmedCount },
          { label: 'Completed',      value: completedCount },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border border-black/[0.06]">
            <div className="text-[10px] tracking-[0.25em] uppercase text-neutral-400">{s.label}</div>
            <div className={`mt-1.5 text-xl font-light tabular-nums ${s.cls || 'text-neutral-900'}`}>{loading ? '—' : s.value}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {['all', ...STATUS_OPTIONS].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-full text-xs capitalize transition-colors border ${
              filterStatus === s
                ? 'bg-neutral-900 text-white border-neutral-900'
                : 'bg-white text-neutral-500 border-black/[0.08] hover:border-black/20'
            }`}
          >
            {s === 'all' ? `All (${bookings.length})` : `${s} (${bookings.filter(b => b.status === s).length})`}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
        {loading ? (
          <div className="py-20 flex items-center justify-center text-neutral-400 text-sm">
            <svg className="animate-spin mr-2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            Loading bookings…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-neutral-400 text-sm">
            {bookings.length === 0 ? (
              <>No bookings yet. <button onClick={() => setShowModal(true)} className="text-neutral-900 underline underline-offset-2">Add the first one.</button></>
            ) : 'No bookings match this filter.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/[0.06] text-[10px] tracking-[0.2em] uppercase text-neutral-400">
                  <th className="text-left px-5 py-3 font-normal">Customer</th>
                  <th className="text-left px-5 py-3 font-normal hidden sm:table-cell">Vehicle interest</th>
                  <th className="text-left px-5 py-3 font-normal hidden md:table-cell">Date</th>
                  <th className="text-left px-5 py-3 font-normal hidden md:table-cell">Type</th>
                  <th className="text-left px-5 py-3 font-normal">Status</th>
                  <th className="text-right px-5 py-3 font-normal">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04]">
                {filtered.map(b => (
                  <>
                    <tr
                      key={b.id}
                      className="hover:bg-neutral-50 transition-colors cursor-pointer"
                      onClick={() => setExpandedId(expandedId === b.id ? null : b.id)}
                    >
                      <td className="px-5 py-4">
                        <div className="font-medium text-neutral-900">{b.name}</div>
                        <div className="text-xs text-neutral-400 mt-0.5">{b.email}</div>
                        {b.phone && <div className="text-xs text-neutral-400">{b.phone}</div>}
                      </td>
                      <td className="px-5 py-4 text-neutral-600 hidden sm:table-cell">{b.car_interest || <span className="text-neutral-300">—</span>}</td>
                      <td className="px-5 py-4 text-neutral-500 hidden md:table-cell">
                        {b.preferred_date
                          ? new Date(b.preferred_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
                          : <span className="text-neutral-300">—</span>}
                      </td>
                      <td className="px-5 py-4 text-neutral-500 hidden md:table-cell">{b.booking_type}</td>
                      <td className="px-5 py-4">
                        <select
                          value={b.status}
                          disabled={updatingId === b.id}
                          onClick={e => e.stopPropagation()}
                          onChange={e => updateStatus(b.id, e.target.value)}
                          className={`px-2.5 py-1 rounded-full text-[10px] tracking-[0.1em] uppercase font-medium border cursor-pointer focus:outline-none ${STATUS_STYLES[b.status]} ${updatingId === b.id ? 'opacity-50' : ''}`}
                        >
                          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="text-xs text-neutral-400">
                          {new Date(b.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                        </span>
                      </td>
                    </tr>
                    {expandedId === b.id && (
                      <tr key={`${b.id}-expanded`} className="bg-neutral-50">
                        <td colSpan={6} className="px-5 py-4">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                            <div>
                              <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1">Contact</div>
                              <div className="text-neutral-700">{b.email}</div>
                              {b.phone && <div className="text-neutral-700">{b.phone}</div>}
                            </div>
                            <div>
                              <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1">Booking details</div>
                              <div className="text-neutral-700">{b.booking_type} · {b.car_interest || 'No preference'}</div>
                              {b.preferred_date && <div className="text-neutral-500 text-xs mt-0.5">{new Date(b.preferred_date).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>}
                            </div>
                            {b.notes && (
                              <div>
                                <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1">Notes</div>
                                <div className="text-neutral-600 text-xs leading-relaxed">{b.notes}</div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-blue-50 border border-blue-100 px-5 py-4 text-sm text-blue-700">
        💡 <strong>Tip:</strong> Click any row to expand full booking details. Update status inline to track progress in real time.
      </div>

      {/* New Booking Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-black/[0.06] px-7 py-5 flex items-center justify-between rounded-t-3xl">
              <h2 className="text-lg font-medium text-neutral-900">New Booking</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors flex items-center justify-center text-neutral-500">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="px-7 py-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase text-neutral-400 mb-1.5">Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Full name" className="w-full px-4 py-2.5 rounded-xl border border-black/[0.1] text-sm focus:outline-none focus:border-neutral-400 bg-white" />
                </div>
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase text-neutral-400 mb-1.5">Email *</label>
                  <input value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} placeholder="email@example.com" type="email" className="w-full px-4 py-2.5 rounded-xl border border-black/[0.1] text-sm focus:outline-none focus:border-neutral-400 bg-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase text-neutral-400 mb-1.5">Phone</label>
                  <input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} placeholder="+27 ..." className="w-full px-4 py-2.5 rounded-xl border border-black/[0.1] text-sm focus:outline-none focus:border-neutral-400 bg-white" />
                </div>
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase text-neutral-400 mb-1.5">Preferred date</label>
                  <input type="date" value={form.preferred_date} onChange={e => setForm(f => ({...f, preferred_date: e.target.value}))} className="w-full px-4 py-2.5 rounded-xl border border-black/[0.1] text-sm focus:outline-none focus:border-neutral-400 bg-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase text-neutral-400 mb-1.5">Car interest</label>
                  <input value={form.car_interest} onChange={e => setForm(f => ({...f, car_interest: e.target.value}))} placeholder="e.g. Porsche 911 GT3" className="w-full px-4 py-2.5 rounded-xl border border-black/[0.1] text-sm focus:outline-none focus:border-neutral-400 bg-white" />
                </div>
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase text-neutral-400 mb-1.5">Booking type</label>
                  <select value={form.booking_type} onChange={e => setForm(f => ({...f, booking_type: e.target.value}))} className="w-full px-4 py-2.5 rounded-xl border border-black/[0.1] text-sm focus:outline-none focus:border-neutral-400 bg-white">
                    {['Afternoon','Members','Concierge','Event / Film'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] tracking-[0.2em] uppercase text-neutral-400 mb-1.5">Status</label>
                <div className="flex gap-2">
                  {STATUS_OPTIONS.map(s => (
                    <button key={s} type="button" onClick={() => setForm(f => ({...f, status: s}))}
                      className={`flex-1 py-2 rounded-xl text-xs capitalize transition-all border ${form.status === s ? STATUS_STYLES[s] : 'bg-neutral-50 border-black/[0.08] text-neutral-500'}`}
                    >{s}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] tracking-[0.2em] uppercase text-neutral-400 mb-1.5">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} placeholder="Any special requests or context..." rows={3} className="w-full px-4 py-3 rounded-xl border border-black/[0.1] text-sm focus:outline-none focus:border-neutral-400 bg-white resize-none" />
              </div>
              {error && <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">⚠️ {error}</div>}
            </div>
            <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-black/[0.06] px-7 py-5 flex justify-end gap-3 rounded-b-3xl">
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-full border border-black/[0.1] text-sm text-neutral-600 hover:bg-neutral-50 transition-colors">Cancel</button>
              <button onClick={save} disabled={saving} className="px-6 py-2.5 rounded-full bg-neutral-900 text-white text-sm hover:bg-neutral-800 transition-colors disabled:opacity-60 min-w-[120px] text-center">
                {saving ? 'Saving…' : 'Add booking'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
