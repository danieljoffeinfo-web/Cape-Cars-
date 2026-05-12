import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export type TelegramCustomerUpsert = {
  chatId: string
  telegramName?: string | null
  telegramUsername?: string | null
  fullName?: string | null
  phone?: string | null
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
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
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

    if (error) return null
    return data
  } catch {
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
    await supabase.from('telegram_conversations').insert({
      chat_id: params.chatId,
      customer_id: params.customerId ?? null,
      direction: params.direction,
      message_type: params.messageType ?? 'text',
      body: params.body ?? null,
      meta: params.meta ?? null,
    })
  } catch {}
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

    if (error) return null
    return data
  } catch {
    return null
  }
}
