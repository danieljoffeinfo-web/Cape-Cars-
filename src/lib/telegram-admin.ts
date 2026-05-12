import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

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

function getAdminClient() {
  const key = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY
  if (!SUPABASE_URL || !key) return null

  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function crmEmail(chatId: string) {
  return `telegram-${chatId}@cape-cars.local`
}

export function buildTelegramProxyUrl(fileId: string) {
  return `/api/telegram/file/${encodeURIComponent(fileId)}`
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
      .select('model, cat, rate, status, image_url')
      .eq('cat', category)
      .eq('status', 'Available')
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('getAvailableVehiclesForCategory failed', error)
      return null
    }

    return data
  } catch (error) {
    console.error('getAvailableVehiclesForCategory exception', error)
    return null
  }
}
