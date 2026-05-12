'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

type Customer = {
  id: string
  full_name: string
  email: string
  phone: string | null
  id_number: string | null
  drivers_license_number: string | null
  drivers_license_expiry: string | null
  address: string | null
  created_at: string
}

const emptyForm = (): Omit<Customer, 'id' | 'created_at'> => ({
  full_name: '',
  email: '',
  phone: '',
  id_number: '',
  drivers_license_number: '',
  drivers_license_expiry: '',
  address: '',
})

const isDocumentLink = (value: string | null) => Boolean(value && (value.startsWith('/api/') || value.startsWith('http')))

export default function CRMPage() {
  const supabase = createClient()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Customer | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('customers').select('*').order('created_at', { ascending: false })
    setCustomers((data as Customer[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd = () => {
    setEditing(null)
    setForm(emptyForm())
    setError(null)
    setConfirmDelete(false)
    setShowModal(true)
  }

  const openEdit = (c: Customer) => {
    setEditing(c)
    setForm({
      full_name: c.full_name,
      email: c.email,
      phone: c.phone ?? '',
      id_number: c.id_number ?? '',
      drivers_license_number: c.drivers_license_number ?? '',
      drivers_license_expiry: c.drivers_license_expiry ?? '',
      address: c.address ?? '',
    })
    setError(null)
    setConfirmDelete(false)
    setShowModal(true)
    setSelected(null)
  }

  const save = async () => {
    if (!form.full_name.trim() || !form.email.trim()) { setError('Name and email are required'); return }
    setSaving(true); setError(null)
    const payload = {
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      phone: form.phone || null,
      id_number: form.id_number || null,
      drivers_license_number: form.drivers_license_number || null,
      drivers_license_expiry: form.drivers_license_expiry || null,
      address: form.address || null,
    }
    if (editing) {
      const { error: e } = await supabase.from('customers').update(payload).eq('id', editing.id)
      if (e) { setError(e.message); setSaving(false); return }
    } else {
      const { error: e } = await supabase.from('customers').insert(payload)
      if (e) { setError(e.message); setSaving(false); return }
    }
    setShowModal(false); load(); setSaving(false)
  }

  const deleteCustomer = async () => {
    if (!editing) return
    const { error: e } = await supabase.from('customers').delete().eq('id', editing.id)
    if (e) { setError(e.message); return }
    setShowModal(false); load()
  }

  const filtered = customers.filter(c =>
    !search ||
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone ?? '').includes(search)
  )

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-light text-neutral-900">Customer CRM</h1>
          <p className="mt-1 text-sm text-neutral-500">Profiles, license details & rental history</p>
        </div>
        <button onClick={openAdd} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-neutral-900 text-white text-sm hover:bg-neutral-800 transition-colors">
          + Add customer
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Total customers', value: customers.length },
          { label: 'With license',    value: customers.filter(c => c.drivers_license_number).length },
          { label: 'Added this month',value: customers.filter(c => new Date(c.created_at) > new Date(new Date().setDate(1))).length },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border border-black/[0.06]">
            <div className="text-[10px] tracking-[0.25em] uppercase text-neutral-400">{s.label}</div>
            <div className="mt-1.5 text-xl font-light tabular-nums text-neutral-900">{loading ? '—' : s.value}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email or phone…" className="w-full pl-9 pr-4 py-2.5 rounded-full border border-black/[0.1] text-sm focus:outline-none focus:border-neutral-400 bg-white" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
        {loading ? (
          <div className="py-20 flex items-center justify-center text-neutral-400 text-sm">
            <svg className="animate-spin mr-2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            Loading customers…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-neutral-400 text-sm">
            {customers.length === 0
              ? <><span>No customers yet. </span><button onClick={openAdd} className="text-neutral-900 underline underline-offset-2">Add your first.</button></>
              : 'No customers match your search.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/[0.06] text-[10px] tracking-[0.2em] uppercase text-neutral-400">
                  <th className="text-left px-5 py-3 font-normal">Name</th>
                  <th className="text-left px-5 py-3 font-normal hidden sm:table-cell">Contact</th>
                  <th className="text-left px-5 py-3 font-normal hidden md:table-cell">Driver's License</th>
                  <th className="text-left px-5 py-3 font-normal hidden lg:table-cell">License Expiry</th>
                  <th className="text-right px-5 py-3 font-normal">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04]">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-neutral-50 transition-colors cursor-pointer" onClick={() => setSelected(c)}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-sm font-medium text-neutral-600 shrink-0">
                          {c.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-neutral-900">{c.full_name}</div>
                          <div className="text-xs text-neutral-400 mt-0.5 sm:hidden">{c.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <div className="text-neutral-700">{c.email}</div>
                      {c.phone && <div className="text-xs text-neutral-400 mt-0.5">{c.phone}</div>}
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <span className={`text-sm ${c.drivers_license_number ? 'text-neutral-700' : 'text-neutral-300'}`}>
                        {isDocumentLink(c.drivers_license_number)
                          ? <a href={c.drivers_license_number!} target="_blank" className="underline underline-offset-2">View license</a>
                          : (c.drivers_license_number || '—')}
                      </span>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell">
                      {c.drivers_license_expiry ? (
                        <span className={`text-sm ${new Date(c.drivers_license_expiry) < new Date() ? 'text-red-500' : 'text-neutral-700'}`}>
                          {new Date(c.drivers_license_expiry).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {new Date(c.drivers_license_expiry) < new Date() && ' ⚠️'}
                        </span>
                      ) : <span className="text-neutral-300">—</span>}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button onClick={e => { e.stopPropagation(); openEdit(c) }} className="text-xs text-neutral-400 hover:text-neutral-900 transition-colors px-3 py-1 rounded-lg hover:bg-neutral-100">
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customer detail modal */}
      {selected && !showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg">
            <div className="border-b border-black/[0.06] px-7 py-5 flex items-center justify-between rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-base font-medium text-neutral-600">
                  {selected.full_name.charAt(0).toUpperCase()}
                </div>
                <h2 className="text-base font-medium text-neutral-900">{selected.full_name}</h2>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(selected)} className="px-3 py-1.5 rounded-lg text-xs bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors">Edit</button>
                <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors flex items-center justify-center text-neutral-500">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>
            </div>
            <div className="px-7 py-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1">Email</div>
                  <div className="text-neutral-700">{selected.email}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1">Phone</div>
                  <div className="text-neutral-700">{selected.phone || '—'}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1">ID Number</div>
                  <div className="text-neutral-700">{isDocumentLink(selected.id_number) ? <a href={selected.id_number!} target="_blank" className="underline underline-offset-2">View ID / passport</a> : (selected.id_number || '—')}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1">License #</div>
                  <div className="text-neutral-700">{isDocumentLink(selected.drivers_license_number) ? <a href={selected.drivers_license_number!} target="_blank" className="underline underline-offset-2">View driver license</a> : (selected.drivers_license_number || '—')}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1">License Expiry</div>
                  <div className={selected.drivers_license_expiry && new Date(selected.drivers_license_expiry) < new Date() ? 'text-red-500' : 'text-neutral-700'}>
                    {selected.drivers_license_expiry ? new Date(selected.drivers_license_expiry).toLocaleDateString('en-ZA') : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1">Customer Since</div>
                  <div className="text-neutral-700">{new Date(selected.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                </div>
              </div>
              {selected.address && (
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1">Address</div>
                  <div className="text-neutral-700">{selected.address}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-black/[0.06] px-7 py-5 flex items-center justify-between rounded-t-3xl">
              <h2 className="text-lg font-medium text-neutral-900">{editing ? 'Edit customer' : 'Add customer'}</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors flex items-center justify-center text-neutral-500">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="px-7 py-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[10px] tracking-[0.2em] uppercase text-neutral-400 mb-1.5">Full Name *</label>
                  <input value={form.full_name} onChange={e => setForm(f => ({...f, full_name: e.target.value}))} placeholder="e.g. John Smith" className="w-full px-4 py-2.5 rounded-xl border border-black/[0.1] text-sm focus:outline-none focus:border-neutral-400 bg-white" />
                </div>
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase text-neutral-400 mb-1.5">Email *</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} placeholder="email@example.com" className="w-full px-4 py-2.5 rounded-xl border border-black/[0.1] text-sm focus:outline-none focus:border-neutral-400 bg-white" />
                </div>
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase text-neutral-400 mb-1.5">Phone</label>
                  <input value={form.phone ?? ''} onChange={e => setForm(f => ({...f, phone: e.target.value}))} placeholder="+27 ..." className="w-full px-4 py-2.5 rounded-xl border border-black/[0.1] text-sm focus:outline-none focus:border-neutral-400 bg-white" />
                </div>
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase text-neutral-400 mb-1.5">SA ID Number</label>
                  <input value={form.id_number ?? ''} onChange={e => setForm(f => ({...f, id_number: e.target.value}))} placeholder="ID / passport or document link" className="w-full px-4 py-2.5 rounded-xl border border-black/[0.1] text-sm focus:outline-none focus:border-neutral-400 bg-white" />
                </div>
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase text-neutral-400 mb-1.5">Driver's License #</label>
                  <input value={form.drivers_license_number ?? ''} onChange={e => setForm(f => ({...f, drivers_license_number: e.target.value}))} placeholder="License number or document link" className="w-full px-4 py-2.5 rounded-xl border border-black/[0.1] text-sm focus:outline-none focus:border-neutral-400 bg-white" />
                </div>
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase text-neutral-400 mb-1.5">License Expiry</label>
                  <input type="date" value={form.drivers_license_expiry ?? ''} onChange={e => setForm(f => ({...f, drivers_license_expiry: e.target.value}))} className="w-full px-4 py-2.5 rounded-xl border border-black/[0.1] text-sm focus:outline-none focus:border-neutral-400 bg-white" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] tracking-[0.2em] uppercase text-neutral-400 mb-1.5">Address</label>
                  <textarea value={form.address ?? ''} onChange={e => setForm(f => ({...f, address: e.target.value}))} rows={2} placeholder="Street address, city, postal code" className="w-full px-4 py-3 rounded-xl border border-black/[0.1] text-sm focus:outline-none focus:border-neutral-400 bg-white resize-none" />
                </div>
              </div>
              {error && <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">⚠️ {error}</div>}
            </div>
            <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-black/[0.06] px-7 py-5 flex items-center justify-between rounded-b-3xl">
              <div>
                {editing && !confirmDelete && (
                  <button onClick={() => setConfirmDelete(true)} className="text-sm text-red-400 hover:text-red-600 transition-colors">Delete customer</button>
                )}
                {confirmDelete && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-neutral-500">Sure?</span>
                    <button onClick={deleteCustomer} className="text-sm text-red-500 font-medium hover:text-red-700">Yes, delete</button>
                    <button onClick={() => setConfirmDelete(false)} className="text-sm text-neutral-400 hover:text-neutral-700">Cancel</button>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-full border border-black/[0.1] text-sm text-neutral-600 hover:bg-neutral-50 transition-colors">Cancel</button>
                <button onClick={save} disabled={saving} className="px-6 py-2.5 rounded-full bg-neutral-900 text-white text-sm hover:bg-neutral-800 transition-colors disabled:opacity-60 min-w-[120px] text-center">
                  {saving ? 'Saving…' : editing ? 'Save changes' : 'Add customer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
