'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type TelegramBooking = {
  id: string
  customer_id: string | null
  chat_id: string
  vehicle_name: string | null
  vehicle_category: string | null
  start_date: string | null
  total_days: number | null
  end_date: string | null
  daily_rate: number | null
  total_amount: number | null
  id_file_id: string | null
  license_file_id: string | null
  status: string
  created_at: string
  updated_at: string
  telegram_customers?: {
    full_name: string | null
    phone: string | null
    telegram_name: string | null
  } | null
}

const STATUS_OPTIONS = ['pre_confirmation', 'confirmed', 'cancelled'] as const

const STATUS_STYLES: Record<string, string> = {
  pre_confirmation: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
}

function bookingCode(id: string) {
  return `CC-${id.slice(0, 8).toUpperCase()}`
}

function displayDoc(value: string | null) {
  if (!value) return null
  return value.startsWith('/api/') ? value : `/api/telegram/file/${encodeURIComponent(value)}`
}

export default function BookingsPage() {
  const supabase = createClient()
  const [bookings, setBookings] = useState<TelegramBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('telegram_bookings')
      .select('*, telegram_customers(full_name, phone, telegram_name)')
      .in('status', ['pre_confirmation', 'confirmed', 'cancelled'])
      .order('updated_at', { ascending: false })

    setBookings((data as TelegramBooking[]) ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const syncConfirmedRental = async (booking: TelegramBooking) => {
    const email = `telegram-${booking.chat_id}@cape-cars.local`

    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('id')
      .eq('model', booking.vehicle_name)
      .maybeSingle()

    if (!vehicle?.id || !customer?.id || !booking.start_date || !booking.end_date) return

    const notes = `Telegram booking ${booking.id}`
    const { data: existing } = await supabase
      .from('rentals')
      .select('id')
      .eq('notes', notes)
      .maybeSingle()

    if (existing?.id) {
      await supabase.from('rentals').update({ status: 'confirmed' }).eq('id', existing.id)
    } else {
      await supabase.from('rentals').insert({
        vehicle_id: vehicle.id,
        customer_id: customer.id,
        start_date: booking.start_date,
        end_date: booking.end_date,
        status: 'confirmed',
        notes,
        final_amount: booking.total_amount ?? 0,
      })
    }

    await supabase.from('vehicles').update({ status: 'Booked' }).eq('id', vehicle.id)
  }

  const updateStatus = async (booking: TelegramBooking, status: string) => {
    setUpdatingId(booking.id)
    await supabase.from('telegram_bookings').update({ status, updated_at: new Date().toISOString() }).eq('id', booking.id)

    if (status === 'confirmed') {
      await syncConfirmedRental(booking)
    }

    setBookings((items) => items.map((item) => item.id === booking.id ? { ...item, status } : item))
    setUpdatingId(null)
  }

  const filtered = filterStatus === 'all' ? bookings : bookings.filter((booking) => booking.status === filterStatus)

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-light text-neutral-900">Bookings</h1>
          <p className="mt-1 text-sm text-neutral-500">Telegram customers who completed the flow and are ready for manual confirmation</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total bookings', value: bookings.length },
          { label: 'Pre confirmation', value: bookings.filter((booking) => booking.status === 'pre_confirmation').length },
          { label: 'Confirmed', value: bookings.filter((booking) => booking.status === 'confirmed').length },
          { label: 'Cancelled', value: bookings.filter((booking) => booking.status === 'cancelled').length },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-2xl p-4 border border-black/[0.06]">
            <div className="text-[10px] tracking-[0.25em] uppercase text-neutral-400">{card.label}</div>
            <div className="mt-1.5 text-xl font-light tabular-nums text-neutral-900">{loading ? '—' : card.value}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        {['all', ...STATUS_OPTIONS].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-3 py-1.5 rounded-full text-xs capitalize transition-colors border ${
              filterStatus === status
                ? 'bg-neutral-900 text-white border-neutral-900'
                : 'bg-white text-neutral-500 border-black/[0.08] hover:border-black/20'
            }`}
          >
            {status === 'all' ? `All (${bookings.length})` : `${status.replace('_', ' ')} (${bookings.filter((booking) => booking.status === status).length})`}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
        {loading ? (
          <div className="py-20 flex items-center justify-center text-neutral-400 text-sm">Loading bookings…</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-neutral-400 text-sm">No Telegram bookings in this stage yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/[0.06] text-[10px] tracking-[0.2em] uppercase text-neutral-400">
                  <th className="text-left px-5 py-3 font-normal">Code</th>
                  <th className="text-left px-5 py-3 font-normal">Customer</th>
                  <th className="text-left px-5 py-3 font-normal hidden md:table-cell">Vehicle</th>
                  <th className="text-left px-5 py-3 font-normal hidden md:table-cell">Dates</th>
                  <th className="text-left px-5 py-3 font-normal hidden lg:table-cell">Total</th>
                  <th className="text-left px-5 py-3 font-normal">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04]">
                {filtered.map((booking) => (
                  <>
                    <tr key={booking.id} className="hover:bg-neutral-50 transition-colors cursor-pointer" onClick={() => setExpandedId(expandedId === booking.id ? null : booking.id)}>
                      <td className="px-5 py-4 font-medium text-neutral-900">{bookingCode(booking.id)}</td>
                      <td className="px-5 py-4">
                        <div className="font-medium text-neutral-900">{booking.telegram_customers?.full_name || booking.telegram_customers?.telegram_name || 'Unnamed customer'}</div>
                        <div className="text-xs text-neutral-400 mt-0.5">{booking.telegram_customers?.phone || booking.chat_id}</div>
                      </td>
                      <td className="px-5 py-4 text-neutral-600 hidden md:table-cell">{booking.vehicle_name || '—'}</td>
                      <td className="px-5 py-4 hidden md:table-cell text-neutral-500">
                        {booking.start_date ? `${booking.start_date} → ${booking.end_date}` : '—'}
                      </td>
                      <td className="px-5 py-4 hidden lg:table-cell text-neutral-900">{booking.total_amount ? `R ${booking.total_amount.toLocaleString('en-ZA')}` : '—'}</td>
                      <td className="px-5 py-4">
                        <select
                          value={booking.status}
                          disabled={updatingId === booking.id}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) => updateStatus(booking, event.target.value)}
                          className={`px-2.5 py-1 rounded-full text-[10px] tracking-[0.1em] uppercase font-medium border cursor-pointer focus:outline-none ${STATUS_STYLES[booking.status] || 'bg-neutral-50 border-black/[0.08] text-neutral-500'}`}
                        >
                          {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}
                        </select>
                      </td>
                    </tr>
                    {expandedId === booking.id && (
                      <tr key={`${booking.id}-expanded`} className="bg-neutral-50">
                        <td colSpan={6} className="px-5 py-4">
                          <div className="grid gap-4 md:grid-cols-4 text-sm">
                            <div>
                              <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1">Booking code</div>
                              <div className="text-neutral-700">{bookingCode(booking.id)}</div>
                            </div>
                            <div>
                              <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1">Rental window</div>
                              <div className="text-neutral-700">{booking.start_date || '—'}</div>
                              <div className="text-xs text-neutral-500">{booking.total_days || 0} day(s)</div>
                            </div>
                            <div>
                              <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1">Documents</div>
                              <div className="flex flex-col gap-1">
                                {displayDoc(booking.id_file_id) ? <a className="text-neutral-700 underline underline-offset-2" href={displayDoc(booking.id_file_id)!} target="_blank">View ID</a> : <span className="text-neutral-300">No ID</span>}
                                {displayDoc(booking.license_file_id) ? <a className="text-neutral-700 underline underline-offset-2" href={displayDoc(booking.license_file_id)!} target="_blank">View license</a> : <span className="text-neutral-300">No license</span>}
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1">Summary</div>
                              <div className="text-neutral-700">{booking.vehicle_name || 'Vehicle pending'}</div>
                              <div className="text-xs text-neutral-500">{booking.total_amount ? `R ${booking.total_amount.toLocaleString('en-ZA')}` : 'No total yet'}</div>
                            </div>
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
    </div>
  )
}
