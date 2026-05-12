'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type Vehicle = { id: string; model: string; status: string; rate: number }
type Rental = {
  id: string; vehicle_id: string | null; customer_id: string | null
  start_date: string; end_date: string; status: string; total_days: number
  actual_return_date: string | null; final_amount: number | null; created_at: string
  vehicles?: { model: string } | null
  customers?: { full_name: string; email: string } | null
}
type Invoice = { id: string; status: string; total_amount: number; due_date: string | null; created_at: string; customers?: { full_name: string } | null }
type Customer = { id: string; full_name: string; email: string; created_at: string }

export default function InsightsPage() {
  const supabase = createClient()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [rentals, setRentals] = useState<Rental[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [vehRes, rentRes, invRes, custRes] = await Promise.all([
        supabase.from('vehicles').select('id, model, status, rate'),
        supabase.from('rentals').select('*, vehicles(model), customers(full_name, email)').order('created_at', { ascending: false }),
        supabase.from('invoices').select('id, status, total_amount, due_date, created_at, customers(full_name)').order('created_at', { ascending: false }),
        supabase.from('customers').select('id, full_name, email, created_at').order('created_at', { ascending: false }),
      ])
      setVehicles((vehRes.data as Vehicle[]) ?? [])
      setRentals((rentRes.data as Rental[]) ?? [])
      setInvoices((invRes.data as unknown as Invoice[]) ?? [])
      setCustomers((custRes.data as Customer[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  // Idle vehicles (not in any active rental)
  const activeVehicleIds = new Set(rentals.filter(r => r.status === 'active').map(r => r.vehicle_id))
  const idleVehicles = vehicles.filter(v => v.status === 'Available' && !activeVehicleIds.has(v.id))

  // Most rented vehicles
  const vehicleRentalCount = new Map<string, { model: string; count: number; revenue: number }>()
  for (const r of rentals.filter(r => r.status === 'completed')) {
    const key = r.vehicle_id ?? ''
    const cur = vehicleRentalCount.get(key) ?? { model: r.vehicles?.model ?? '—', count: 0, revenue: 0 }
    cur.count++; cur.revenue += r.final_amount ?? 0
    vehicleRentalCount.set(key, cur)
  }
  const topVehicles = Array.from(vehicleRentalCount.values()).sort((a, b) => b.count - a.count).slice(0, 5)

  // Overdue returns (active rentals past end_date)
  const today = new Date().toISOString().slice(0, 10)
  const overdueReturns = rentals.filter(r => r.status === 'active' && r.end_date < today)

  // Most active customers
  const custRentalCount = new Map<string, { name: string; email: string; count: number }>()
  for (const r of rentals) {
    const key = r.customer_id ?? ''
    const cur = custRentalCount.get(key) ?? { name: r.customers?.full_name ?? '—', email: r.customers?.email ?? '', count: 0 }
    cur.count++
    custRentalCount.set(key, cur)
  }
  const topCustomers = Array.from(custRentalCount.values()).sort((a, b) => b.count - a.count).slice(0, 5)

  // Overdue invoices
  const overdueInvoices = invoices.filter(i => i.status === 'overdue')

  // Avg rental duration
  const completedRentals = rentals.filter(r => r.status === 'completed')
  const avgDuration = completedRentals.length > 0
    ? Math.round(completedRentals.reduce((s, r) => s + (r.total_days ?? 0), 0) / completedRentals.length)
    : 0

  // Busiest months
  const monthMap = new Map<string, number>()
  for (const r of rentals) {
    const m = new Date(r.created_at).toLocaleDateString('en-ZA', { month: 'short', year: '2-digit' })
    monthMap.set(m, (monthMap.get(m) ?? 0) + 1)
  }
  const busiestMonth = Array.from(monthMap.entries()).sort((a, b) => b[1] - a[1])[0]

  const hasData = rentals.length > 0 || vehicles.length > 0

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-light text-neutral-900">Key Insights</h1>
        <p className="mt-1 text-sm text-neutral-500">Idle vehicles, peak demand, high-value customers & overdue returns</p>
      </div>

      {/* Summary chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Idle vehicles',     value: loading ? '—' : idleVehicles.length,    cls: idleVehicles.length > 0 ? 'text-amber-600' : 'text-neutral-900' },
          { label: 'Overdue returns',   value: loading ? '—' : overdueReturns.length,  cls: overdueReturns.length > 0 ? 'text-red-500' : 'text-neutral-900' },
          { label: 'Overdue invoices',  value: loading ? '—' : overdueInvoices.length, cls: overdueInvoices.length > 0 ? 'text-red-500' : 'text-neutral-900' },
          { label: 'Avg rental',        value: loading ? '—' : `${avgDuration}d`,      cls: 'text-neutral-900' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border border-black/[0.06]">
            <div className="text-[10px] tracking-[0.25em] uppercase text-neutral-400">{s.label}</div>
            <div className={`mt-1.5 text-xl font-light tabular-nums ${s.cls}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {!hasData && !loading ? (
        <div className="bg-white rounded-2xl border border-black/[0.06] py-24 text-center">
          <div className="text-3xl mb-3">💡</div>
          <div className="text-neutral-500 text-sm">No insights yet</div>
          <div className="text-neutral-400 text-xs mt-1">Insights surface automatically as fleet & booking data grows</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Overdue returns */}
          <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
            <div className="px-5 py-4 border-b border-black/[0.06] flex items-center justify-between">
              <div className="text-[10px] tracking-[0.25em] uppercase text-neutral-400">Overdue Returns</div>
              {overdueReturns.length > 0 && <span className="text-xs bg-red-50 text-red-500 border border-red-200 px-2 py-0.5 rounded-full">{overdueReturns.length} overdue</span>}
            </div>
            {loading ? <div className="py-8 text-center text-neutral-400 text-sm">Loading…</div>
            : overdueReturns.length === 0 ? <div className="py-10 text-center text-neutral-400 text-sm">✅ No overdue returns</div>
            : (
              <div className="divide-y divide-black/[0.04]">
                {overdueReturns.map(r => {
                  const daysLate = Math.round((new Date(today).getTime() - new Date(r.end_date).getTime()) / (1000 * 60 * 60 * 24))
                  return (
                    <div key={r.id} className="px-5 py-3 flex items-start justify-between">
                      <div>
                        <div className="text-sm font-medium text-neutral-900">{r.customers?.full_name ?? '—'}</div>
                        <div className="text-xs text-neutral-400 mt-0.5">{r.vehicles?.model ?? '—'} · Due {new Date(r.end_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}</div>
                      </div>
                      <span className="text-xs bg-red-50 text-red-500 border border-red-200 px-2 py-0.5 rounded-full shrink-0 ml-2">{daysLate}d late</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Idle vehicles */}
          <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
            <div className="px-5 py-4 border-b border-black/[0.06] flex items-center justify-between">
              <div className="text-[10px] tracking-[0.25em] uppercase text-neutral-400">Idle Vehicles</div>
              {idleVehicles.length > 0 && <span className="text-xs bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full">{idleVehicles.length} idle</span>}
            </div>
            {loading ? <div className="py-8 text-center text-neutral-400 text-sm">Loading…</div>
            : idleVehicles.length === 0 ? <div className="py-10 text-center text-neutral-400 text-sm">🎉 All available vehicles are utilised</div>
            : (
              <div className="divide-y divide-black/[0.04]">
                {idleVehicles.map(v => (
                  <div key={v.id} className="px-5 py-3 flex items-center justify-between">
                    <div className="text-sm font-medium text-neutral-900">{v.model}</div>
                    <div className="text-xs text-neutral-500">R {v.rate.toLocaleString()}/day</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top vehicles */}
          <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
            <div className="px-5 py-4 border-b border-black/[0.06]">
              <div className="text-[10px] tracking-[0.25em] uppercase text-neutral-400">Most Rented Vehicles</div>
            </div>
            {loading ? <div className="py-8 text-center text-neutral-400 text-sm">Loading…</div>
            : topVehicles.length === 0 ? <div className="py-10 text-center text-neutral-400 text-sm">No completed rentals yet</div>
            : (
              <div className="divide-y divide-black/[0.04]">
                {topVehicles.map((v, i) => (
                  <div key={v.model} className="px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-neutral-400 w-4 tabular-nums">{i + 1}</span>
                      <span className="text-sm font-medium text-neutral-900">{v.model}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-neutral-700">{v.count} rental{v.count !== 1 ? 's' : ''}</div>
                      <div className="text-[10px] text-neutral-400">R {v.revenue.toLocaleString('en-ZA')}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top customers */}
          <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
            <div className="px-5 py-4 border-b border-black/[0.06]">
              <div className="text-[10px] tracking-[0.25em] uppercase text-neutral-400">Most Active Customers</div>
            </div>
            {loading ? <div className="py-8 text-center text-neutral-400 text-sm">Loading…</div>
            : topCustomers.length === 0 ? <div className="py-10 text-center text-neutral-400 text-sm">No customer rental data yet</div>
            : (
              <div className="divide-y divide-black/[0.04]">
                {topCustomers.map((c, i) => (
                  <div key={c.email} className="px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-neutral-400 w-4 tabular-nums">{i + 1}</span>
                      <div>
                        <div className="text-sm font-medium text-neutral-900">{c.name}</div>
                        <div className="text-xs text-neutral-400">{c.email}</div>
                      </div>
                    </div>
                    <div className="text-xs text-neutral-600 shrink-0 ml-2">{c.count} rental{c.count !== 1 ? 's' : ''}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Overdue invoices */}
          {overdueInvoices.length > 0 && (
            <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden lg:col-span-2">
              <div className="px-5 py-4 border-b border-black/[0.06] flex items-center justify-between">
                <div className="text-[10px] tracking-[0.25em] uppercase text-neutral-400">Overdue Invoices</div>
                <span className="text-xs bg-red-50 text-red-500 border border-red-200 px-2 py-0.5 rounded-full">{overdueInvoices.length} overdue</span>
              </div>
              <div className="divide-y divide-black/[0.04]">
                {overdueInvoices.map(inv => (
                  <div key={inv.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-neutral-900">{(inv.customers as any)?.full_name ?? '—'}</div>
                      {inv.due_date && <div className="text-xs text-neutral-400 mt-0.5">Due {new Date(inv.due_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}</div>}
                    </div>
                    <div className="text-sm font-medium text-red-500 tabular-nums">R {inv.total_amount.toLocaleString('en-ZA')}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Busiest period */}
          {busiestMonth && (
            <div className="bg-neutral-900 rounded-2xl px-6 py-5 text-white lg:col-span-2">
              <div className="text-[10px] tracking-[0.25em] uppercase text-white/40 mb-2">Peak Booking Period</div>
              <div className="text-2xl font-light">{busiestMonth[0]}</div>
              <div className="text-sm text-white/60 mt-1">{busiestMonth[1]} booking{busiestMonth[1] !== 1 ? 's' : ''} — your busiest month on record</div>
              {avgDuration > 0 && <div className="text-sm text-white/60 mt-0.5">Average rental duration: {avgDuration} days</div>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
