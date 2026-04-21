'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import VehicleModal from '@/components/vehicle-modal'
import type { Vehicle } from '@/lib/fleet'

const statusColor: Record<string, string> = {
  Available: 'bg-emerald-100 text-emerald-700',
  Booked:    'bg-amber-100 text-amber-700',
  Service:   'bg-red-100 text-red-600',
}

const STATUSES = ['Available', 'Booked', 'Service'] as const

export default function FleetAdmin() {
  const supabase = createClient()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'add' | Vehicle | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('vehicles')
      .select('*')
      .order('sort_order', { ascending: true })
    setVehicles((data as Vehicle[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const updateStatus = async (id: string, status: string) => {
    setUpdatingStatus(id)
    await supabase.from('vehicles').update({ status }).eq('id', id)
    setVehicles(v => v.map(x => x.id === id ? { ...x, status: status as Vehicle['status'] } : x))
    setUpdatingStatus(null)
  }

  const available = vehicles.filter(c => c.status === 'Available').length
  const booked    = vehicles.filter(c => c.status === 'Booked').length
  const service   = vehicles.filter(c => c.status === 'Service').length

  return (
    <>
      <div className="space-y-6 max-w-7xl">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-light text-neutral-900">Fleet Catalogue</h1>
            <p className="mt-1 text-sm text-neutral-500">Vehicle listings, specs, pricing, and availability</p>
          </div>
          <button
            onClick={() => setModal('add')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-neutral-900 text-white text-sm hover:bg-neutral-800 transition-colors"
          >
            + Add vehicle
          </button>
        </div>

        {/* Summary chips */}
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Available', count: available, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
            { label: 'Booked',    count: booked,    cls: 'bg-amber-50 text-amber-700 border-amber-200'   },
            { label: 'Service',   count: service,   cls: 'bg-red-50 text-red-600 border-red-200'         },
            { label: 'Total',     count: vehicles.length, cls: 'bg-neutral-100 text-neutral-700 border-neutral-200' },
          ].map(s => (
            <div key={s.label} className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm ${s.cls}`}>
              <span className="tabular-nums font-medium">{s.count}</span>
              <span className="text-xs uppercase tracking-wide">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
          {loading ? (
            <div className="py-20 flex items-center justify-center text-neutral-400 text-sm">
              <svg className="animate-spin mr-2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              Loading fleet…
            </div>
          ) : vehicles.length === 0 ? (
            <div className="py-20 text-center text-neutral-400 text-sm">
              No vehicles yet.{' '}
              <button onClick={() => setModal('add')} className="text-neutral-900 underline underline-offset-2">Add your first vehicle.</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/[0.06] text-[10px] tracking-[0.2em] uppercase text-neutral-400">
                    <th className="text-left px-5 py-3 font-normal">Image</th>
                    <th className="text-left px-5 py-3 font-normal">Model</th>
                    <th className="text-left px-5 py-3 font-normal hidden sm:table-cell">Category</th>
                    <th className="text-left px-5 py-3 font-normal hidden md:table-cell">Specs</th>
                    <th className="text-left px-5 py-3 font-normal">Rate / day</th>
                    <th className="text-left px-5 py-3 font-normal">Status</th>
                    <th className="text-right px-5 py-3 font-normal">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.04]">
                  {vehicles.map(car => (
                    <tr key={car.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-5 py-3">
                        {car.image_url ? (
                          <img src={car.image_url} alt={car.model} className="w-12 h-10 rounded-lg object-cover" />
                        ) : (
                          <div className="w-12 h-10 rounded-lg bg-neutral-100 flex items-center justify-center text-lg">🚗</div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-medium text-neutral-900">{car.model}</div>
                        <div className="text-xs text-neutral-400 mt-0.5">{car.color}</div>
                      </td>
                      <td className="px-5 py-4 text-neutral-500 hidden sm:table-cell">{car.cat}</td>
                      <td className="px-5 py-4 hidden md:table-cell">
                        <div className="flex items-center gap-3 text-xs text-neutral-500">
                          <span>{car.power}</span>
                          <span>·</span>
                          <span>{car.seats} seats</span>
                          <span>·</span>
                          <span>{car.fuel}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 tabular-nums text-neutral-900">R {car.rate.toLocaleString()}</td>
                      <td className="px-5 py-4">
                        <select
                          value={car.status}
                          disabled={updatingStatus === car.id}
                          onChange={e => updateStatus(car.id, e.target.value)}
                          className={`px-2.5 py-1 rounded-full text-[10px] tracking-[0.15em] uppercase font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-neutral-300 ${statusColor[car.status]} ${updatingStatus === car.id ? 'opacity-50' : ''}`}
                        >
                          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => setModal(car)}
                          className="text-xs text-neutral-400 hover:text-neutral-900 transition-colors px-3 py-1 rounded-lg hover:bg-neutral-100"
                        >
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

        <div className="rounded-2xl bg-blue-50 border border-blue-100 px-5 py-4 text-sm text-blue-700">
          💡 <strong>Tip:</strong> Vehicles in Service status are automatically hidden from the public fleet page. Update status here to control live availability instantly.
        </div>
      </div>

      {modal !== null && (
        <VehicleModal
          vehicle={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }}
        />
      )}
    </>
  )
}
