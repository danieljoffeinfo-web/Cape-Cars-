import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const FALLBACK_PUBLIC_BASE_URL = 'https://atturo-nextjs.vercel.app'
const ADMIN_REGISTER_BODY = 'ADMIN_SUBSCRIBER_REGISTER'

export type TelegramCustomerUpsert = {
  chatId: string
  telegramName?: string | null
  telegramUsername?: string | null
  fullName?: string | null
  phone?: string | null
  idUrl?: string | null
  licenseUrl?: string | null
}

export type TelegramBookingUpsert = {
  bookingId: string
  chatId: string
  customerId?: string | null
  vehicleName?: string | null
  vehicleCategory?: string | null
  startDate?: string | null
  totalDays?: number | null
  endDate?: string | null
  dailyRate?: number | null
  totalAmount?: number | null
  idFileId?: string | null
  licenseFileId?: string | null
  status?: string | null
}

export type TelegramBookingWithCustomer = {
  id: string
  chat_id: string
  customer_id: string | null
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
    telegram_username: string | null
  }[] | {
    full_name: string | null
    phone: string | null
    telegram_name: string | null
    telegram_username: string | null
  } | null
}

export type VehicleRow = {
  id: string
  model: string
  cat: string
  rate: number
  status: string
  image_url: string | null
  color?: string | null
  fuel?: string | null
  seats?: number | null
}

function getAdminClient() {
  const key = SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY
  if (!SUPABASE_URL || !key) return null

  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function crmEmail(chatId: string) {
  return `telegram-${chatId}@cape-cars.local`
}

function publicBaseUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL
    || process.env.NEXT_PUBLIC_APP_URL
    || process.env.VERCEL_PROJECT_PRODUCTION_URL
    || process.env.VERCEL_URL

  if (!fromEnv) return FALLBACK_PUBLIC_BASE_URL
  return fromEnv.startsWith('http') ? fromEnv : `https://${fromEnv}`
}

export function buildTelegramProxyUrl(fileId: string) {
  return `/api/telegram/file/${encodeURIComponent(fileId)}`
}

export function buildAbsoluteTelegramProxyUrl(fileId: string) {
  return `${publicBaseUrl()}${buildTelegramProxyUrl(fileId)}`
}

export async function upsertTelegramCustomer(input: TelegramCustomerUpsert) {
  const supabase = getAdminClient()
  if (!supabase) return null

  try {
    const payload = {
      chat_id: input.chatId,
      telegram_name: input.telegramName ?? null,
      telegram_username: input.telegramUsername ?? null,
      full_name: input.fullName ?? null,
      phone: input.phone ?? null,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('telegram_customers')
      .upsert(payload, { onConflict: 'chat_id' })
      .select('*')
      .single()

    if (error) {
      console.error('upsertTelegramCustomer failed', error)
      return null
    }

    const { error: crmError } = await supabase
      .from('customers')
      .upsert({
        email: crmEmail(input.chatId),
        full_name: input.fullName || input.telegramName || `Telegram ${input.chatId}`,
        phone: input.phone ?? null,
        id_number: input.idUrl ?? null,
        drivers_license_number: input.licenseUrl ?? null,
      }, { onConflict: 'email' })

    if (crmError) {
      console.error('upsert CRM customer failed', crmError)
    }

    return data
  } catch (error) {
    console.error('upsertTelegramCustomer exception', error)
    return null
  }
}

export async function logTelegramConversation(params: {
  chatId: string
  customerId?: string | null
  direction: 'inbound' | 'outbound'
  messageType?: 'text' | 'photo' | 'document' | 'button'
  body?: string | null
  meta?: Record<string, unknown> | null
}) {
  const supabase = getAdminClient()
  if (!supabase) return

  try {
    const { error } = await supabase.from('telegram_conversations').insert({
      chat_id: params.chatId,
      customer_id: params.customerId ?? null,
      direction: params.direction,
      message_type: params.messageType ?? 'text',
      body: params.body ?? null,
      meta: params.meta ?? null,
    })

    if (error) console.error('logTelegramConversation failed', error)
  } catch (error) {
    console.error('logTelegramConversation exception', error)
  }
}

export async function upsertTelegramBooking(input: TelegramBookingUpsert) {
  const supabase = getAdminClient()
  if (!supabase) return null

  try {
    const payload = {
      id: input.bookingId,
      chat_id: input.chatId,
      customer_id: input.customerId ?? null,
      vehicle_name: input.vehicleName ?? null,
      vehicle_category: input.vehicleCategory ?? null,
      start_date: input.startDate ?? null,
      total_days: input.totalDays ?? null,
      end_date: input.endDate ?? null,
      daily_rate: input.dailyRate ?? null,
      total_amount: input.totalAmount ?? null,
      id_file_id: input.idFileId ?? null,
      license_file_id: input.licenseFileId ?? null,
      status: input.status ?? 'draft',
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('telegram_bookings')
      .upsert(payload, { onConflict: 'id' })
      .select('*')
      .single()

    if (error) {
      console.error('upsertTelegramBooking failed', error)
      return null
    }

    return data
  } catch (error) {
    console.error('upsertTelegramBooking exception', error)
    return null
  }
}

export async function getAvailableVehiclesForCategory(category: string) {
  const supabase = getAdminClient()
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from('vehicles')
      .select('id, model, cat, rate, status, image_url, color, fuel, seats')
      .eq('cat', category)
      .eq('status', 'Available')
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('getAvailableVehiclesForCategory failed', error)
      return null
    }

    return data as VehicleRow[]
  } catch (error) {
    console.error('getAvailableVehiclesForCategory exception', error)
    return null
  }
}

export async function getVehiclesForCategory(category: string) {
  const supabase = getAdminClient()
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('vehicles')
      .select('id, model, cat, rate, status, image_url, color, fuel, seats')
      .eq('cat', category)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('getVehiclesForCategory failed', error)
      return []
    }

    return (data ?? []) as VehicleRow[]
  } catch (error) {
    console.error('getVehiclesForCategory exception', error)
    return []
  }
}

export async function getVehicleById(vehicleId: string) {
  const supabase = getAdminClient()
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from('vehicles')
      .select('id, model, cat, rate, status, image_url, color, fuel, seats')
      .eq('id', vehicleId)
      .maybeSingle()

    if (error) {
      console.error('getVehicleById failed', error)
      return null
    }

    return (data ?? null) as VehicleRow | null
  } catch (error) {
    console.error('getVehicleById exception', error)
    return null
  }
}

export async function markVehicleBooked(vehicleId: string, startDate: string, endDate: string) {
  const supabase = getAdminClient()
  if (!supabase) return { ok: false as const, error: 'Supabase is not configured' }

  try {
    const vehicle = await getVehicleById(vehicleId)
    if (!vehicle) return { ok: false as const, error: 'Vehicle not found' }

    const { error: vehicleError } = await supabase
      .from('vehicles')
      .update({ status: 'Booked' })
      .eq('id', vehicleId)

    if (vehicleError) return { ok: false as const, error: vehicleError.message }

    const { error: rentalError } = await supabase
      .from('rentals')
      .insert({
        vehicle_id: vehicleId,
        customer_id: null,
        start_date: startDate,
        end_date: endDate,
        status: 'confirmed',
        notes: `Admin blockout via Telegram (${startDate} → ${endDate})`,
        final_amount: 0,
      })

    if (rentalError) return { ok: false as const, error: rentalError.message }

    return { ok: true as const, vehicle }
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function updateVehicleRate(vehicleId: string, dailyRate: number) {
  const supabase = getAdminClient()
  if (!supabase) return { ok: false as const, error: 'Supabase is not configured' }

  try {
    const { data, error } = await supabase
      .from('vehicles')
      .update({ rate: dailyRate })
      .eq('id', vehicleId)
      .select('id, model, cat, rate, status, image_url, color, fuel, seats')
      .single()

    if (error) return { ok: false as const, error: error.message }
    return { ok: true as const, vehicle: data as VehicleRow }
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function updateAllVehicleRatesByPercent(percent: number) {
  const supabase = getAdminClient()
  if (!supabase) return { ok: false as const, error: 'Supabase is not configured' }

  try {
    const { data, error } = await supabase
      .from('vehicles')
      .select('id, model, cat, rate, status, image_url, color, fuel, seats')
      .order('sort_order', { ascending: true })

    if (error) return { ok: false as const, error: error.message }

    const vehicles = (data ?? []) as VehicleRow[]
    await Promise.all(vehicles.map((vehicle) => {
      const nextRate = Math.max(0, Math.round(vehicle.rate * (1 + (percent / 100))))
      return supabase.from('vehicles').update({ rate: nextRate }).eq('id', vehicle.id)
    }))

    return { ok: true as const, count: vehicles.length }
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function getTelegramBookingsForRange(range: 'week' | 'month' | 'three_months' | 'all') {
  const supabase = getAdminClient()
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('telegram_bookings')
      .select('*, telegram_customers(full_name, phone, telegram_name, telegram_username)')
      .order('updated_at', { ascending: false })
      .limit(200)

    if (error) {
      console.error('getTelegramBookingsForRange failed', error)
      return []
    }

    const now = new Date()
    const cutoff = new Date(now)
    if (range === 'week') cutoff.setDate(now.getDate() - 7)
    if (range === 'month') cutoff.setMonth(now.getMonth() - 1)
    if (range === 'three_months') cutoff.setMonth(now.getMonth() - 3)

    return ((data ?? []) as TelegramBookingWithCustomer[]).filter((booking) => {
      if (range === 'all') return true
      const stamp = booking.updated_at || booking.created_at
      return new Date(stamp).getTime() >= cutoff.getTime()
    })
  } catch (error) {
    console.error('getTelegramBookingsForRange exception', error)
    return []
  }
}

export async function registerAdminSubscriber(chatId: string, name?: string | null, username?: string | null) {
  await logTelegramConversation({
    chatId,
    direction: 'inbound',
    messageType: 'text',
    body: ADMIN_REGISTER_BODY,
    meta: { bot: 'admin', name: name ?? null, username: username ?? null },
  })
}

export async function getAdminSubscriberChatIds() {
  const supabase = getAdminClient()
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('telegram_conversations')
      .select('chat_id, body, meta, created_at')
      .eq('body', ADMIN_REGISTER_BODY)
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) {
      console.error('getAdminSubscriberChatIds failed', error)
      return []
    }

    return Array.from(new Set((data ?? []).map((row: any) => String(row.chat_id)).filter(Boolean)))
  } catch (error) {
    console.error('getAdminSubscriberChatIds exception', error)
    return []
  }
}
