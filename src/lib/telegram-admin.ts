import { createClient } from '@supabase/supabase-js'
import { getInternalTelegramVehicleModel, getTelegramVehicleDisplay } from '@/lib/telegram-catalog'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const FALLBACK_PUBLIC_BASE_URL = 'https://car-demo-chom.vercel.app'
const ADMIN_REGISTER_BODY = 'ADMIN_SUBSCRIBER_REGISTER'
const HOLD_WINDOW_HOURS = 24

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
  booking_code?: string | null
  hold_expires_at?: string | null
  released_at?: string | null
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

function bookingHoldIsActive(booking: { status: string, created_at: string, hold_expires_at?: string | null, released_at?: string | null }) {
  if (booking.released_at) return false
  return ['customer_details_pending', 'documents_pending', 'pending', 'confirmed_booking', 'confirmed', 'payment_collected'].includes(booking.status)
}

export function buildTelegramProxyUrl(fileId: string) {
  return `/api/telegram/file/${encodeURIComponent(fileId)}`
}

export function buildAbsoluteTelegramProxyUrl(fileId: string) {
  return `${publicBaseUrl()}${buildTelegramProxyUrl(fileId)}`
}

export function pendingHoldExpiresAt(createdAt: string) {
  return new Date(new Date(createdAt).getTime() + HOLD_WINDOW_HOURS * 60 * 60 * 1000).toISOString()
}

function deriveBookingCode(bookingId: string) {
  return bookingId.replace(/-/g, '').slice(0, 8).toUpperCase()
}

function deriveHoldExpiresAt(status?: string | null) {
  return null
}

function isMissingColumnError(error: unknown) {
  return error && typeof error === 'object' && 'message' in error
    ? String((error as { message?: string }).message || '').toLowerCase().includes('column')
    : false
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

    if (crmError) console.error('upsert CRM customer failed', crmError)
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
      booking_code: deriveBookingCode(input.bookingId),
      hold_expires_at: deriveHoldExpiresAt(input.status ?? 'draft'),
      released_at: null,
      status: input.status ?? 'draft',
      updated_at: new Date().toISOString(),
    }

    let result = await supabase
      .from('telegram_bookings')
      .upsert(payload, { onConflict: 'id' })
      .select('*')
      .single()

    if (result.error && isMissingColumnError(result.error)) {
      const { booking_code, hold_expires_at, released_at, ...legacyPayload } = payload
      result = await supabase
        .from('telegram_bookings')
        .upsert(legacyPayload, { onConflict: 'id' })
        .select('*')
        .single()
    }

    if (result.error) {
      console.error('upsertTelegramBooking failed', result.error)
      return null
    }

    return result.data
  } catch (error) {
    console.error('upsertTelegramBooking exception', error)
    return null
  }
}

export async function getTelegramBookingById(bookingId: string) {
  const supabase = getAdminClient()
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from('telegram_bookings')
      .select('*, telegram_customers(full_name, phone, telegram_name, telegram_username)')
      .eq('id', bookingId)
      .maybeSingle()

    if (error) {
      console.error('getTelegramBookingById failed', error)
      return null
    }

    return (data ?? null) as TelegramBookingWithCustomer | null
  } catch (error) {
    console.error('getTelegramBookingById exception', error)
    return null
  }
}

export async function getLatestTelegramBookingForChat(chatId: string) {
  const supabase = getAdminClient()
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from('telegram_bookings')
      .select('*, telegram_customers(full_name, phone, telegram_name, telegram_username)')
      .eq('chat_id', chatId)
      .in('status', ['draft', 'quote_ready', 'customer_details_pending', 'documents_pending', 'pending', 'confirmed_booking', 'confirmed', 'payment_collected'])
      .order('updated_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('getLatestTelegramBookingForChat failed', error)
      return null
    }

    const bookings = (data ?? []) as TelegramBookingWithCustomer[]
    return bookings[0] ?? null
  } catch (error) {
    console.error('getLatestTelegramBookingForChat exception', error)
    return null
  }
}

export async function updateTelegramBookingStatus(bookingId: string, status: string) {
  const supabase = getAdminClient()
  if (!supabase) return null

  try {
    const releaseStatuses = ['expired', 'cancelled']
    const payload = {
      status,
      hold_expires_at: deriveHoldExpiresAt(status),
      released_at: releaseStatuses.includes(status) ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }

    let result = await supabase
      .from('telegram_bookings')
      .update(payload)
      .eq('id', bookingId)
      .select('*, telegram_customers(full_name, phone, telegram_name, telegram_username)')
      .single()

    if (result.error && isMissingColumnError(result.error)) {
      const { hold_expires_at, released_at, ...legacyPayload } = payload
      result = await supabase
        .from('telegram_bookings')
        .update(legacyPayload)
        .eq('id', bookingId)
        .select('*, telegram_customers(full_name, phone, telegram_name, telegram_username)')
        .single()
    }

    if (result.error) {
      console.error('updateTelegramBookingStatus failed', result.error)
      return null
    }

    return result.data as TelegramBookingWithCustomer
  } catch (error) {
    console.error('updateTelegramBookingStatus exception', error)
    return null
  }
}

export async function syncTelegramBookingToRental(bookingId: string) {
  const supabase = getAdminClient()
  if (!supabase) return { ok: false as const, error: 'Supabase is not configured' }

  try {
    const booking = await getTelegramBookingById(bookingId)
    if (!booking) return { ok: false as const, error: 'Booking not found' }
    if (!booking.vehicle_name || !booking.start_date || !booking.end_date) {
      return { ok: false as const, error: 'Booking is missing vehicle or date details' }
    }

    const email = crmEmail(booking.chat_id)
    const displayVehicleModel = getTelegramVehicleDisplay(booking.vehicle_name).model
    const candidateModels = Array.from(new Set([
      booking.vehicle_name,
      displayVehicleModel,
      getInternalTelegramVehicleModel(booking.vehicle_name, booking.vehicle_category),
    ].filter(Boolean)))

    const [customerResult, vehicleResult] = await Promise.all([
      supabase.from('customers').select('id').eq('email', email).maybeSingle(),
      (booking.vehicle_category
        ? supabase.from('vehicles').select('id, model, cat').in('model', candidateModels).eq('cat', booking.vehicle_category)
        : supabase.from('vehicles').select('id, model, cat').in('model', candidateModels)
      ),
    ])

    const customer = customerResult.data
    const customerError = customerResult.error
    const vehicleError = vehicleResult.error
    const vehicles = (vehicleResult.data ?? []) as Array<{ id: string, model: string, cat: string }>
    const vehicle = vehicles.find((item) => item.model === booking.vehicle_name)
      ?? vehicles.find((item) => item.model === displayVehicleModel)
      ?? vehicles[0]

    if (customerError) return { ok: false as const, error: customerError.message }
    if (vehicleError) return { ok: false as const, error: vehicleError.message }
    if (!customer?.id) return { ok: false as const, error: 'Customer profile not found' }
    if (!vehicle?.id) return { ok: false as const, error: `Vehicle not found (${candidateModels.join(' / ')})` }

    const notes = `Telegram booking ${booking.id}`
    const payload = {
      vehicle_id: vehicle.id,
      customer_id: customer.id,
      start_date: booking.start_date,
      end_date: booking.end_date,
      status: 'confirmed',
      notes,
      final_amount: booking.total_amount ?? 0,
    }

    const { data: existing, error: existingError } = await supabase
      .from('rentals')
      .select('id')
      .eq('notes', notes)
      .maybeSingle()

    if (existingError) return { ok: false as const, error: existingError.message }

    if (existing?.id) {
      const { error: updateError } = await supabase.from('rentals').update(payload).eq('id', existing.id)
      if (updateError) return { ok: false as const, error: updateError.message }
    } else {
      const { error: insertError } = await supabase.from('rentals').insert(payload)
      if (insertError) return { ok: false as const, error: insertError.message }
    }

    const { error: vehicleStatusError } = await supabase.from('vehicles').update({ status: 'Booked' }).eq('id', vehicle.id)
    if (vehicleStatusError) return { ok: false as const, error: vehicleStatusError.message }

    return { ok: true as const, vehicleId: vehicle.id }
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function releaseExpiredPendingBookings() {
  const supabase = getAdminClient()
  if (!supabase) return 0

  try {
    const nowIso = new Date().toISOString()

    let result: any = await supabase
      .from('telegram_bookings')
      .select('id, created_at, hold_expires_at, status, released_at')
      .in('status', ['pending', 'pre_confirmation'])

    if (result.error && isMissingColumnError(result.error)) {
      result = await supabase
        .from('telegram_bookings')
        .select('id, created_at, status')
        .in('status', ['pending', 'pre_confirmation'])
    }

    if (result.error) {
      console.error('releaseExpiredPendingBookings failed', result.error)
      return 0
    }

    const expiredIds = ((result.data ?? []) as Array<{ id: string, created_at: string, hold_expires_at?: string | null, status: string, released_at?: string | null }>)
      .filter((booking) => !bookingHoldIsActive(booking) && !booking.released_at)
      .map((booking) => booking.id)

    if (expiredIds.length === 0) return 0

    let updateResult = await supabase
      .from('telegram_bookings')
      .update({ status: 'expired', released_at: nowIso, updated_at: nowIso })
      .in('id', expiredIds)

    if (updateResult.error && isMissingColumnError(updateResult.error)) {
      updateResult = await supabase
        .from('telegram_bookings')
        .update({ status: 'expired', updated_at: nowIso })
        .in('id', expiredIds)
    }

    if (updateResult.error) {
      console.error('releaseExpiredPendingBookings update failed', updateResult.error)
      return 0
    }

    return expiredIds.length
  } catch (error) {
    console.error('releaseExpiredPendingBookings exception', error)
    return 0
  }
}

export async function getAvailableVehiclesForCategory(category: string) {
  const supabase = getAdminClient()
  if (!supabase) return null

  try {
    await releaseExpiredPendingBookings()

    const [{ data: vehicles, error: vehiclesError }, { data: bookings, error: bookingsError }] = await Promise.all([
      supabase
        .from('vehicles')
        .select('id, model, cat, rate, status, image_url, color, fuel, seats')
        .eq('cat', category)
        .eq('status', 'Available')
        .order('sort_order', { ascending: true }),
      supabase
        .from('telegram_bookings')
        .select('vehicle_name, status, created_at, hold_expires_at, released_at')
        .eq('vehicle_category', category)
        .in('status', ['customer_details_pending', 'documents_pending', 'pending', 'confirmed_booking', 'confirmed', 'payment_collected']),
    ])

    let safeBookings: any = bookings
    if (bookingsError && isMissingColumnError(bookingsError)) {
      const legacy = await supabase
        .from('telegram_bookings')
        .select('vehicle_name, status, created_at')
        .eq('vehicle_category', category)
        .in('status', ['customer_details_pending', 'documents_pending', 'pending', 'confirmed_booking', 'confirmed', 'payment_collected'])

      if (legacy.error) {
        console.error('getAvailableVehiclesForCategory bookings failed', legacy.error)
        return null
      }

      safeBookings = legacy.data
    } else if (bookingsError) {
      console.error('getAvailableVehiclesForCategory bookings failed', bookingsError)
      return null
    }

    if (vehiclesError) {
      console.error('getAvailableVehiclesForCategory vehicles failed', vehiclesError)
      return null
    }
    const blockedModels = new Set(
      ((safeBookings ?? []) as { vehicle_name: string | null, status: string, created_at: string, hold_expires_at?: string | null, released_at?: string | null }[])
        .filter((booking) => booking.vehicle_name && bookingHoldIsActive(booking))
        .map((booking) => getTelegramVehicleDisplay(booking.vehicle_name as string).model),
    )

    return ((vehicles ?? []) as VehicleRow[]).filter((vehicle) => !blockedModels.has(vehicle.model))
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

export type VehicleBlockedRange = {
  startDate: string
  endDate: string
  source: 'telegram' | 'rental'
  status: string
}

export type VehicleAvailabilityRow = VehicleRow & {
  blockedRanges: VehicleBlockedRange[]
  isBlocked: boolean
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

function normalizeDate(value: string | null | undefined) {
  return value ? new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) : null
}

export async function getVehiclesForCustomerCategory(category: string) {
  const supabase = getAdminClient()
  if (!supabase) return []

  try {
    await releaseExpiredPendingBookings()

    const [{ data: vehicles, error: vehiclesError }, { data: bookings, error: bookingsError }, { data: rentals, error: rentalsError }] = await Promise.all([
      supabase
        .from('vehicles')
        .select('id, model, cat, rate, status, image_url, color, fuel, seats')
        .eq('cat', category)
        .order('sort_order', { ascending: true }),
      supabase
        .from('telegram_bookings')
        .select('vehicle_name, start_date, end_date, status, created_at, hold_expires_at, released_at')
        .eq('vehicle_category', category)
        .in('status', ['customer_details_pending', 'documents_pending', 'pending', 'confirmed_booking', 'confirmed', 'payment_collected']),
      supabase
        .from('rentals')
        .select('vehicle_id, start_date, end_date, status')
        .in('status', ['pending', 'confirmed'])
    ])

    if (vehiclesError || bookingsError || rentalsError) {
      console.error('getVehiclesForCustomerCategory failed', { vehiclesError, bookingsError, rentalsError })
      return []
    }

    const blockedByModel = new Map<string, VehicleBlockedRange[]>()
    const blockedByVehicleId = new Map<string, VehicleBlockedRange[]>()

    for (const booking of ((bookings ?? []) as any[])) {
      if (!booking.vehicle_name || !booking.start_date || !booking.end_date) continue
      if (!bookingHoldIsActive(booking)) continue
      const normalizedModel = getTelegramVehicleDisplay(booking.vehicle_name).model
      const existing = blockedByModel.get(normalizedModel) ?? []
      existing.push({
        startDate: normalizeDate(booking.start_date)!,
        endDate: normalizeDate(booking.end_date)!,
        source: 'telegram',
        status: booking.status,
      })
      blockedByModel.set(normalizedModel, existing)
    }

    for (const rental of ((rentals ?? []) as any[])) {
      if (!rental.vehicle_id || !rental.start_date || !rental.end_date) continue
      const existing = blockedByVehicleId.get(rental.vehicle_id) ?? []
      existing.push({
        startDate: normalizeDate(rental.start_date)!,
        endDate: normalizeDate(rental.end_date)!,
        source: 'rental',
        status: rental.status,
      })
      blockedByVehicleId.set(rental.vehicle_id, existing)
    }

    return ((vehicles ?? []) as VehicleRow[]).map((vehicle) => {
      const blockedRanges = [
        ...(blockedByVehicleId.get(vehicle.id) ?? []),
        ...(blockedByModel.get(vehicle.model) ?? []),
      ].sort((a, b) => a.startDate.localeCompare(b.startDate))

      return {
        ...vehicle,
        blockedRanges,
        isBlocked: blockedRanges.length > 0 || vehicle.status === 'Booked',
      } satisfies VehicleAvailabilityRow
    })
  } catch (error) {
    console.error('getVehiclesForCustomerCategory exception', error)
    return []
  }
}

export async function closeVehicleForDates(vehicleId: string, startDate: string, endDate: string) {
  const supabase = getAdminClient()
  if (!supabase) return { ok: false as const, error: 'Supabase is not configured' }

  try {
    const vehicle = await getVehicleById(vehicleId)
    if (!vehicle) return { ok: false as const, error: 'Vehicle not found' }

    const { error: vehicleError } = await supabase.from('vehicles').update({ status: 'Booked' }).eq('id', vehicleId)
    if (vehicleError) return { ok: false as const, error: vehicleError.message }

    const { error: rentalError } = await supabase.from('rentals').insert({
      vehicle_id: vehicleId,
      customer_id: null,
      start_date: startDate,
      end_date: endDate,
      status: 'confirmed',
      notes: `Admin closeout via Telegram (${startDate} → ${endDate})`,
      final_amount: 0,
    })

    if (rentalError) return { ok: false as const, error: rentalError.message }
    return { ok: true as const, vehicle }
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function openVehicleForBooking(vehicleId: string) {
  const supabase = getAdminClient()
  if (!supabase) return { ok: false as const, error: 'Supabase is not configured' }

  try {
    const vehicle = await getVehicleById(vehicleId)
    if (!vehicle) return { ok: false as const, error: 'Vehicle not found' }

    const { error: vehicleError } = await supabase.from('vehicles').update({ status: 'Available' }).eq('id', vehicleId)
    if (vehicleError) return { ok: false as const, error: vehicleError.message }

    await supabase
      .from('rentals')
      .update({ status: 'cancelled', notes: 'Admin closeout released via Telegram' })
      .eq('vehicle_id', vehicleId)
      .is('customer_id', null)
      .ilike('notes', 'Admin closeout via Telegram%')
      .in('status', ['pending', 'confirmed'])

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
    const updates = vehicles.map((vehicle) => {
      const nextRate = Math.max(0, Math.round(vehicle.rate * (1 + (percent / 100))))
      return supabase.from('vehicles').update({ rate: nextRate }).eq('id', vehicle.id)
    })
    await Promise.all(updates)

    return { ok: true as const, count: vehicles.length }
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function hasTelegramConversationMarker(chatId: string, body: string) {
  const supabase = getAdminClient()
  if (!supabase) return false

  try {
    const { data, error } = await supabase
      .from('telegram_conversations')
      .select('id')
      .eq('chat_id', chatId)
      .eq('body', body)
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('hasTelegramConversationMarker failed', error)
      return false
    }

    return Boolean(data?.id)
  } catch (error) {
    console.error('hasTelegramConversationMarker exception', error)
    return false
  }
}

export async function getTelegramBookingsForRange(range: 'week' | 'month' | 'three_months' | 'all') {
  const supabase = getAdminClient()
  if (!supabase) return []

  try {
    await releaseExpiredPendingBookings()

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
