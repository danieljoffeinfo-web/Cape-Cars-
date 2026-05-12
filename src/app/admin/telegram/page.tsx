'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type TelegramCustomer = {
  id: string
  chat_id: string
  telegram_name: string | null
  telegram_username: string | null
  full_name: string | null
  phone: string | null
  created_at: string
  updated_at: string
}

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
  status: string
  created_at: string
  updated_at: string
}

type TelegramConversation = {
  id: string
  customer_id: string | null
  chat_id: string
  direction: 'inbound' | 'outbound'
  message_type: 'text' | 'photo' | 'document' | 'button'
  body: string | null
  meta: Record<string, unknown> | null
  created_at: string
}

export default function TelegramBotPage() {
  const supabase = createClient()
  const [customers, setCustomers] = useState<TelegramCustomer[]>([])
  const [bookings, setBookings] = useState<TelegramBooking[]>([])
  const [conversations, setConversations] = useState<TelegramConversation[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    const [customersRes, bookingsRes, conversationsRes] = await Promise.all([
      supabase.from('telegram_customers').select('*').order('updated_at', { ascending: false }),
      supabase.from('telegram_bookings').select('*').in('status', ['draft', 'quote_ready', 'customer_details_pending', 'documents_pending', 'pending']).order('updated_at', { ascending: false }),
      supabase.from('telegram_conversations').select('*').order('created_at', { ascending: false }).limit(200),
    ])

    if (customersRes.error || bookingsRes.error || conversationsRes.error) {
      setError(customersRes.error?.message || bookingsRes.error?.message || conversationsRes.error?.message || 'Failed to load Telegram data')
      setCustomers([])
      setBookings([])
      setConversations([])
      setLoading(false)
      return
    }

    const loadedCustomers = (customersRes.data as TelegramCustomer[]) ?? []
    setCustomers(loadedCustomers)
    setBookings((bookingsRes.data as TelegramBooking[]) ?? [])
    setConversations((conversationsRes.data as TelegramConversation[]) ?? [])
    setSelectedCustomerId(prev => prev ?? loadedCustomers[0]?.id ?? null)
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const cards = useMemo(() => {
    return customers.map(customer => {
      const customerBookings = bookings.filter(booking => booking.customer_id === customer.id || booking.chat_id === customer.chat_id)
      const customerConversations = conversations.filter(item => item.customer_id === customer.id || item.chat_id === customer.chat_id)
      const latestBooking = customerBookings[0] ?? null
      return {
        customer,
        bookings: customerBookings,
        conversations: customerConversations,
        latestBooking,
      }
    })
  }, [customers, bookings, conversations])

  const selected = cards.find(card => card.customer.id === selectedCustomerId) ?? cards[0] ?? null

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-light text-neutral-900">Telegram Bookings</h1>
          <p className="mt-1 text-sm text-neutral-500">Customer profiles, live booking drafts, and full Telegram conversation history</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-neutral-900 text-white text-sm hover:bg-neutral-800 transition-colors">
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Telegram customers', value: customers.length },
          { label: 'In-progress bookings', value: bookings.length },
          { label: 'Pending holds', value: bookings.filter((booking) => booking.status === 'pending').length },
          { label: 'Messages logged', value: conversations.length },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-2xl p-4 border border-black/[0.06]">
            <div className="text-[10px] tracking-[0.25em] uppercase text-neutral-400">{card.label}</div>
            <div className="mt-1.5 text-xl font-light tabular-nums text-neutral-900">{loading ? '—' : card.value}</div>
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700">
          {error}. If the Telegram tables are missing, run the new Supabase migration first.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[360px,1fr]">
        <div className="rounded-2xl border border-black/[0.06] bg-white overflow-hidden">
          <div className="border-b border-black/[0.06] px-5 py-4 text-[10px] uppercase tracking-[0.25em] text-neutral-400">Customer profiles</div>
          {loading ? (
            <div className="p-6 text-sm text-neutral-400">Loading Telegram customers…</div>
          ) : cards.length === 0 ? (
            <div className="p-6 text-sm text-neutral-400">No Telegram customers yet.</div>
          ) : (
            <div className="divide-y divide-black/[0.05]">
              {cards.map(({ customer, latestBooking, conversations: customerConversations }) => (
                <button
                  key={customer.id}
                  onClick={() => setSelectedCustomerId(customer.id)}
                  className={`w-full text-left px-5 py-4 transition-colors ${selectedCustomerId === customer.id ? 'bg-neutral-50' : 'hover:bg-neutral-50'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-neutral-900">{customer.full_name || customer.telegram_name || 'Unnamed customer'}</div>
                      <div className="text-xs text-neutral-400 mt-0.5">{customer.phone || customer.telegram_username || customer.chat_id}</div>
                    </div>
                    <div className="text-[10px] uppercase tracking-wide text-neutral-400">{latestBooking?.status || 'new'}</div>
                  </div>
                  <div className="mt-2 text-xs text-neutral-500">
                    {latestBooking?.vehicle_name || 'No vehicle yet'} · {customerConversations.length} messages
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-black/[0.06] bg-white overflow-hidden">
          <div className="border-b border-black/[0.06] px-5 py-4 text-[10px] uppercase tracking-[0.25em] text-neutral-400">Conversation + booking detail</div>
          {!selected ? (
            <div className="p-6 text-sm text-neutral-400">Choose a Telegram customer to inspect the full profile.</div>
          ) : (
            <div className="p-5 space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-neutral-50 p-4">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">Customer</div>
                  <div className="mt-2 font-medium text-neutral-900">{selected.customer.full_name || selected.customer.telegram_name || 'Unnamed customer'}</div>
                  <div className="text-sm text-neutral-500 mt-1">{selected.customer.phone || 'No phone yet'}</div>
                  <div className="text-xs text-neutral-400 mt-1">{selected.customer.telegram_username || selected.customer.chat_id}</div>
                </div>
                <div className="rounded-2xl bg-neutral-50 p-4">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">Latest booking</div>
                  {selected.latestBooking ? (
                    <>
                      <div className="mt-2 font-medium text-neutral-900">{selected.latestBooking.vehicle_name || 'Vehicle pending'}</div>
                      <div className="text-sm text-neutral-500 mt-1">{selected.latestBooking.start_date || 'No date'} · {selected.latestBooking.total_days || 0} days</div>
                      <div className="text-sm text-neutral-500 mt-1">{selected.latestBooking.total_amount ? `R ${selected.latestBooking.total_amount.toLocaleString('en-ZA')}` : 'No total yet'}</div>
                    </>
                  ) : <div className="mt-2 text-sm text-neutral-400">No booking draft yet.</div>}
                </div>
                <div className="rounded-2xl bg-neutral-50 p-4">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">Status</div>
                  <div className="mt-2 font-medium text-neutral-900">{selected.latestBooking?.status || 'new'}</div>
                  <div className="text-sm text-neutral-500 mt-1">{selected.bookings.length} booking record(s)</div>
                  <div className="text-sm text-neutral-500 mt-1">{selected.conversations.length} message(s)</div>
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-[0.25em] text-neutral-400 mb-3">Conversation history</div>
                <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                  {selected.conversations.length === 0 ? (
                    <div className="text-sm text-neutral-400">No conversation messages logged yet.</div>
                  ) : selected.conversations.map(item => (
                    <div key={item.id} className={`rounded-2xl px-4 py-3 text-sm ${item.direction === 'inbound' ? 'bg-neutral-100 text-neutral-800' : 'bg-blue-50 text-blue-900'}`}>
                      <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.2em] opacity-60 mb-1">
                        <span>{item.direction}</span>
                        <span>{item.message_type}</span>
                        <span>{new Date(item.created_at).toLocaleString('en-ZA')}</span>
                      </div>
                      <div>{item.body || 'Media message'}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
