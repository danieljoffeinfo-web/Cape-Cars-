'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type Rental = {
  id: string
  vehicle_id: string | null
  start_date: string
  end_date: string
  status: string
  total_days: number
  final_amount: number | null
  created_at: string
  vehicles?: { model: string; rate: number } | null
}

type Invoice = {
  id: string
  total_amount: number
  status: string
  created_at: string
}

export default function SalesPage() {
  const supabase = createClient()
  const [rentals, setRentals] = useState<Rental[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [rentRes, invRes] = await Promise.all([
        supabase.from('rentals').select('*, vehicles(model, rate)').order('created_at', { ascending: false }),
        supabase.from('invoices').select('id, total_amount, status, created_at').order('created_at', { ascending: false }),
      ])
      setRentals((rentRes.data as Rental[]) ?? [])
      setInvoices((invRes.data as Invoice[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const completedRentals = rentals.filter(r => r.status === 'completed')
  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total_amount, 0)
  const avgDays = completedRentals.length > 0
    ? Math.round(completedRentals.reduce((s, r) => s + (r.total_days ?? 0), 0) / completedRentals.length)
    : 0

  // Monthly revenue (last 6 months)
  const monthlyRevenue = (() => {
    const now = new Date()
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const label = d.toLocaleDateString('en-ZA', { month: 'short', year: '2-digit' })
      const monthInvoices = invoices.filter(inv => {
        const created = new Date(inv.created_at)
        return inv.status === 'paid' && created.getMonth() === d.getMonth() && created.getFullYear() === d.getFullYear()
      })
      return { label, revenue: monthInvoices.reduce((s, i) => s + i.total_amount, 0) }
    })
  })()

  const maxRevenue = Math.max(...monthlyRevenue.map(m => m.revenue), 1)

  // Revenue by vehicle
  const vehicleRevenue = (() => {
    const map = new Map<string, { model: string; revenue: number; rentals: number; avgDays: number }>()
    for (const r of completedRentals) {
      const key = r.vehicle_id ?? 'unknown'
      const model = r.vehicles?.model ?? 'Unknown vehicle'
      const existing = map.get(key) ?? { model, revenue: 0, rentals: 0, avgDays: 0 }
      existing.revenue += r.final_amount ?? 0
      existing.rentals += 1
      existing.avgDays = Math.round((existing.avgDays * (existing.rentals - 1) + (r.total_days ?? 0)) / existing.rentals)
      map.set(key, existing)
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue)
  })()

  const bestVehicle = vehicleRevenue[0]
  const idleVehicle = vehicleRevenue[vehicleRevenue.length - 1]

  const fmt = (n: number) => `R ${n.toLocaleString('en-ZA')}`

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-light text-neutral-900">Sales Performance</h1>
        <p className="mt-1 text-sm text-neutral-500">Revenue per vehicle, fleet utilisation & booking trends</p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Revenue',   value: loading ? '—' : fmt(totalRevenue) },
          { label: 'Avg Rental Days', value: loading ? '—' : `${avgDays}d` },
          { label: 'Best Performer',  value: loading ? '—' : (bestVehicle?.model.split(' ').slice(0, 2).join(' ') ?? '—') },
          { label: 'Least Utilised',  value: loading ? '—' : (idleVehicle?.model.split(' ').slice(0, 2).join(' ') ?? '—') },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border border-black/[0.06]">
            <div className="text-[10px] tracking-[0.25em] uppercase text-neutral-400">{s.label}</div>
            <div className="mt-1.5 text-xl font-light tabular-nums text-neutral-900">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Monthly revenue chart */}
      <div className="bg-white rounded-2xl border border-black/[0.06] p-6">
        <div className="text-[10px] tracking-[0.25em] uppercase text-neutral-400 mb-5">Monthly Revenue (paid invoices)</div>
        {loading ? (
          <div className="h-32 flex items-center justify-center text-neutral-400 text-sm">
            <svg className="animate-spin mr-2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            Loading…
          </div>
        ) : totalRevenue === 0 ? (
          <div className="h-32 flex flex-col items-center justify-center text-neutral-400 text-sm">
            <div className="text-2xl mb-2">📈</div>
            Revenue charts will populate once invoices are marked paid
          </div>
        ) : (
          <div className="flex items-end gap-3 h-36">
            {monthlyRevenue.map(m => (
              <div key={m.label} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="text-[10px] text-neutral-500 tabular-nums">{m.revenue > 0 ? `R ${(m.revenue / 1000).toFixed(0)}k` : ''}</div>
                <div
                  className="w-full rounded-t-lg bg-neutral-900 transition-all"
                  style={{ height: `${Math.max(4, (m.revenue / maxRevenue) * 100)}px` }}
                />
                <div className="text-[10px] text-neutral-400">{m.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Revenue by vehicle */}
      <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
        <div className="px-5 py-4 border-b border-black/[0.06]">
          <div className="text-[10px] tracking-[0.25em] uppercase text-neutral-400">Revenue by Vehicle</div>
        </div>
        {loading ? (
          <div className="py-12 flex items-center justify-center text-neutral-400 text-sm">
            <svg className="animate-spin mr-2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            Loading…
          </div>
        ) : vehicleRevenue.length === 0 ? (
          <div className="py-16 text-center text-neutral-400 text-sm">No completed rentals yet — revenue will appear here once rentals are completed.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/[0.06] text-[10px] tracking-[0.2em] uppercase text-neutral-400">
                <th className="text-left px-5 py-3 font-normal">Vehicle</th>
                <th className="text-left px-5 py-3 font-normal hidden sm:table-cell">Rentals</th>
                <th className="text-left px-5 py-3 font-normal hidden md:table-cell">Avg Days</th>
                <th className="text-right px-5 py-3 font-normal">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04]">
              {vehicleRevenue.map((v, i) => (
                <tr key={v.model} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-neutral-400 tabular-nums w-4">{i + 1}</span>
                      <span className="font-medium text-neutral-900">{v.model}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-neutral-600 hidden sm:table-cell">{v.rentals}</td>
                  <td className="px-5 py-4 text-neutral-600 hidden md:table-cell">{v.avgDays}d avg</td>
                  <td className="px-5 py-4 text-right font-medium text-neutral-900 tabular-nums">{fmt(v.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-2xl bg-blue-50 border border-blue-100 px-5 py-4 text-sm text-blue-700">
        💡 <strong>Tip:</strong> Vehicles under 30% utilisation cost you money. Consider seasonal promotions or rate drops to fill their calendars.
      </div>
    </div>
  )
}
