import {
  closeVehicleForDates,
  getAdminSubscriberChatIds,
  getTelegramBookingById,
  getTelegramBookingsForRange,
  getVehicleById,
  hasTelegramConversationMarker,
  logTelegramConversation,
  getVehiclesForCategory,
  openVehicleForBooking,
  pendingHoldExpiresAt,
  registerAdminSubscriber,
  updateAllVehicleRatesByPercent,
  updateTelegramBookingStatus,
  updateVehicleRate,
  type TelegramBookingWithCustomer,
} from '@/lib/telegram-admin'
import { CATEGORY_ORDER, type VehicleCategory } from '@/lib/telegram-catalog'

const TELEGRAM_ADMIN_BOT_TOKEN = process.env.TELEGRAM_ADMIN_BOT_TOKEN
const TELEGRAM_CUSTOMER_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

type AdminStep =
  | 'home'
  | 'awaiting_vehicle_category'
  | 'awaiting_vehicle_selection'
  | 'awaiting_vehicle_dates'
  | 'awaiting_pricing_category'
  | 'awaiting_pricing_vehicle'
  | 'awaiting_single_price'
  | 'awaiting_global_percentage'
  | 'awaiting_bookings_range'

export type TelegramMessage = {
  chat: { id: number | string }
  text?: string
  from?: { first_name?: string; last_name?: string; username?: string }
}

type CallbackQuery = {
  id: string
  data?: string
  from?: { first_name?: string; last_name?: string; username?: string }
  message?: { chat: { id: number | string } }
}

export type TelegramUpdate = {
  message?: TelegramMessage
  callback_query?: CallbackQuery
}

type InlineButton = { text: string; callback_data?: string; url?: string }

type VehicleAction = 'open' | 'close'

type AdminSession = {
  chatId: string
  step: AdminStep
  selectedCategory?: VehicleCategory | null
  selectedVehicleId?: string | null
  vehicleAction?: VehicleAction | null
}

const sessions = new Map<string, AdminSession>()

function getSession(chatId: string): AdminSession {
  return sessions.get(chatId) ?? { chatId, step: 'home', selectedCategory: null, selectedVehicleId: null, vehicleAction: null }
}

function saveSession(chatId: string, patch: Partial<AdminSession>) {
  const next = { ...getSession(chatId), ...patch, chatId }
  sessions.set(chatId, next)
  return next
}

function fullName(person?: { first_name?: string; last_name?: string }) {
  return [person?.first_name, person?.last_name].filter(Boolean).join(' ').trim() || null
}

async function adminTelegramApi(method: string, payload: Record<string, unknown>) {
  if (!TELEGRAM_ADMIN_BOT_TOKEN) throw new Error('Missing TELEGRAM_ADMIN_BOT_TOKEN')

  const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_ADMIN_BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Admin Telegram API ${method} failed: ${response.status} ${text}`)
  }

  return response.json()
}

async function customerTelegramApi(method: string, payload: Record<string, unknown>) {
  if (!TELEGRAM_CUSTOMER_BOT_TOKEN) throw new Error('Missing TELEGRAM_BOT_TOKEN')

  const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_CUSTOMER_BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Customer Telegram API ${method} failed: ${response.status} ${text}`)
  }

  return response.json()
}

async function sendMessage(chatId: string, text: string, buttons?: InlineButton[][]) {
  return adminTelegramApi('sendMessage', {
    chat_id: chatId,
    text,
    reply_markup: buttons ? { inline_keyboard: buttons } : undefined,
  })
}

async function sendPhoto(chatId: string, photo: string, caption?: string) {
  return adminTelegramApi('sendPhoto', {
    chat_id: chatId,
    photo,
    caption,
  })
}

async function sendPhotoFromCustomerFileId(chatId: string, fileId: string, caption?: string) {
  if (!TELEGRAM_CUSTOMER_BOT_TOKEN || !TELEGRAM_ADMIN_BOT_TOKEN) throw new Error('Missing Telegram bot token')

  const metaResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_CUSTOMER_BOT_TOKEN}/getFile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_id: fileId }),
  })

  const metaPayload = await metaResponse.json()
  const filePath = metaPayload?.result?.file_path
  if (!metaResponse.ok || !filePath) throw new Error('Could not resolve Telegram file path')

  const fileResponse = await fetch(`https://api.telegram.org/file/bot${TELEGRAM_CUSTOMER_BOT_TOKEN}/${filePath}`)
  if (!fileResponse.ok) throw new Error('Could not download Telegram file')

  const contentType = fileResponse.headers.get('content-type') || 'image/jpeg'
  const fileBuffer = await fileResponse.arrayBuffer()
  const extension = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg'

  const form = new FormData()
  form.append('chat_id', chatId)
  if (caption) form.append('caption', caption)
  form.append('photo', new Blob([fileBuffer], { type: contentType }), `telegram-upload.${extension}`)

  const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_ADMIN_BOT_TOKEN}/sendPhoto`, {
    method: 'POST',
    body: form,
  })

  if (!response.ok) {
    throw new Error(`Admin Telegram API sendPhoto upload failed: ${response.status} ${await response.text()}`)
  }
}

async function sendPhotoBestEffort(chatId: string, fileId: string | null, caption?: string) {
  if (!fileId) return
  try {
    await sendPhotoFromCustomerFileId(chatId, fileId, caption)
  } catch (error) {
    console.error('sendPhotoBestEffort failed', { chatId, caption, error })
  }
}

async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  return adminTelegramApi('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text,
  })
}

function money(value: number) {
  return `R ${value.toLocaleString('en-ZA')}`
}

function menuButtons(): InlineButton[][] {
  return [
    [{ text: 'Vehicle manager', callback_data: 'admin:vehicle_manager' }],
    [{ text: 'Pricing change', callback_data: 'admin:pricing_change' }],
    [{ text: 'View all bookings', callback_data: 'admin:view_bookings' }],
  ]
}

function categoryButtons(prefix: string): InlineButton[][] {
  return CATEGORY_ORDER.map((category) => [{ text: category, callback_data: `${prefix}:${category}` }])
}

function parseDate(text: string) {
  const value = text.trim().toLowerCase().replace(/,/g, ' ')
  if (!value) return null

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T00:00:00Z`)
    return Number.isNaN(date.getTime()) ? null : value
  }

  const toIsoDate = (date: Date) => new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())).toISOString().slice(0, 10)
  const nextWeekday = (targetDay: number, allowSameDay = false) => {
    const now = new Date()
    const date = new Date(now)
    let diff = (targetDay - now.getDay() + 7) % 7
    if (!allowSameDay && diff === 0) diff = 7
    date.setDate(now.getDate() + diff)
    return toIsoDate(date)
  }

  if (value === 'today') return toIsoDate(new Date())
  if (value === 'tomorrow') {
    const date = new Date()
    date.setDate(date.getDate() + 1)
    return toIsoDate(date)
  }

  const weekdays: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
  }

  if (value in weekdays) return nextWeekday(weekdays[value])
  if (value.startsWith('next ')) {
    const day = value.replace('next ', '').trim()
    if (day in weekdays) return nextWeekday(weekdays[day])
  }
  if (value.startsWith('this ')) {
    const day = value.replace('this ', '').trim()
    if (day in weekdays) return nextWeekday(weekdays[day], true)
  }

  const slashMatch = value.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/)
  if (slashMatch) {
    const [, d, m, y] = slashMatch
    const year = y ? Number(y.length === 2 ? `20${y}` : y) : new Date().getFullYear()
    const date = new Date(year, Number(m) - 1, Number(d))
    return Number.isNaN(date.getTime()) ? null : toIsoDate(date)
  }

  const cleaned = value
    .replace(/\b(\d{1,2})(st|nd|rd|th)\b/g, '$1')
    .replace(/\bof\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (/^\d{1,2}$/.test(cleaned)) {
    const today = new Date()
    let year = today.getFullYear()
    let month = today.getMonth()
    let candidate = new Date(year, month, Number(cleaned))
    if (candidate.getDate() !== Number(cleaned) || candidate < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
      candidate = new Date(year, month + 1, Number(cleaned))
    }
    return Number.isNaN(candidate.getTime()) ? null : toIsoDate(candidate)
  }

  const monthNames = ['january','february','march','april','may','june','july','august','september','october','november','december']
  const directDayMonth = cleaned.match(/^(\d{1,2})\s+([a-z]+)(?:\s+(\d{4}))?$/)
  if (directDayMonth && monthNames.includes(directDayMonth[2])) {
    const day = Number(directDayMonth[1])
    const month = monthNames.indexOf(directDayMonth[2])
    const year = directDayMonth[3] ? Number(directDayMonth[3]) : new Date().getFullYear()
    const date = new Date(year, month, day)
    return Number.isNaN(date.getTime()) ? null : toIsoDate(date)
  }

  const natural = new Date(cleaned)
  if (!Number.isNaN(natural.getTime())) return toIsoDate(natural)
  return null
}

function parseDateRange(text: string) {
  const normalized = text.trim().replace(/\s+/g, ' ')
  const separators = [' to ', ' until ', ' - ', ' → ']

  for (const separator of separators) {
    if (!normalized.toLowerCase().includes(separator.trim())) continue
    const parts = normalized.split(new RegExp(separator, 'i')).map((part) => part.trim()).filter(Boolean)
    if (parts.length !== 2) continue
    const startDate = parseDate(parts[0])
    const endDate = parseDate(parts[1])
    if (startDate && endDate) return { startDate, endDate }
  }

  const singleDate = parseDate(normalized)
  if (singleDate) return { startDate: singleDate, endDate: singleDate }
  return null
}

function parseCurrency(text: string) {
  const digits = text.replace(/[^\d]/g, '')
  if (!digits) return null
  const value = Number.parseInt(digits, 10)
  return Number.isFinite(value) && value >= 0 ? value : null
}

function parsePercent(text: string) {
  const match = text.trim().match(/-?\d+(?:\.\d+)?/)
  if (!match) return null
  const value = Number.parseFloat(match[0])
  return Number.isFinite(value) ? value : null
}

function bookingCode(id: string) {
  return `CC-${id.slice(0, 8).toUpperCase()}`
}

function customerShape(booking: TelegramBookingWithCustomer) {
  const raw = booking.telegram_customers
  if (Array.isArray(raw)) return raw[0] ?? null
  return raw ?? null
}

async function sendMainMenu(chatId: string, text = 'Cape Cars admin bot is ready. Choose what you want to manage.') {
  saveSession(chatId, { step: 'home', selectedCategory: null, selectedVehicleId: null, vehicleAction: null })
  await sendMessage(chatId, text, menuButtons())
}

async function sendCustomerBookingConfirmed(chatId: string) {
  await customerTelegramApi('sendMessage', {
    chat_id: chatId,
    text: 'Your booking has been confirmed. We will confirm payment with you shortly.',
  })
}

function customerChatUrl(chatId: string, username?: string | null) {
  if (username) return `https://t.me/${username}`
  return `tg://user?id=${chatId}`
}

function bookingActionButtons(booking: TelegramBookingWithCustomer) {
  const customer = customerShape(booking)
  return [
    [{ text: 'Collect Payment', url: customerChatUrl(booking.chat_id, customer?.telegram_username || null) }],
    [{ text: 'Confirm Booking', callback_data: `admin:booking_confirm:${booking.id}` }],
    [{ text: 'Payment Collected', callback_data: `admin:booking_paid:${booking.id}` }],
  ]
}

async function sendBookingSummary(chatId: string, booking: TelegramBookingWithCustomer, heading = 'New booking') {
  const customer = customerShape(booking)
  const customerName = customer?.full_name || customer?.telegram_name || booking.chat_id
  const holdUntil = pendingHoldExpiresAt(booking.created_at)
  const summary = [
    heading,
    '',
    `Code: ${bookingCode(booking.id)}`,
    `Customer: ${customerName}`,
    `Phone: ${customer?.phone || 'No phone yet'}`,
    `Customer Telegram ID: ${booking.chat_id}`,
    `Vehicle: ${booking.vehicle_name || 'Vehicle pending'}`,
    `Category: ${booking.vehicle_category || 'Category pending'}`,
    `Dates: ${booking.start_date || 'No start date'} → ${booking.end_date || 'No end date'}`,
    `Days: ${booking.total_days || 0}`,
    `Total: ${booking.total_amount ? money(booking.total_amount) : 'No total yet'}`,
    `Status: ${booking.status}`,
    `Pending hold until: ${new Date(holdUntil).toLocaleString('en-ZA')}`,
  ].join('\n')

  await sendMessage(chatId, summary, bookingActionButtons(booking))

  await sendPhotoBestEffort(chatId, booking.id_file_id ?? null, `Passport / ID — ${customerName}`)
  await sendPhotoBestEffort(chatId, booking.license_file_id ?? null, `Driver’s license — ${customerName}`)
}

async function handleBookingAction(chatId: string, callbackId: string, bookingId: string, action: 'confirm' | 'paid') {
  const booking = await getTelegramBookingById(bookingId)
  if (!booking) {
    await answerCallbackQuery(callbackId, 'Booking not found')
    await sendMessage(chatId, 'That booking could not be found anymore.')
    return
  }

  if (action === 'confirm') {
    if (['confirmed_booking', 'confirmed', 'payment_collected'].includes(booking.status)) {
      await answerCallbackQuery(callbackId, 'Booking already confirmed')
      await sendBookingSummary(chatId, booking, 'Booking already confirmed')
      return
    }

    const updated = await updateTelegramBookingStatus(bookingId, 'confirmed_booking')
    if (!updated) {
      await answerCallbackQuery(callbackId, 'Could not confirm booking')
      return
    }

    try {
      await sendCustomerBookingConfirmed(updated.chat_id)
    } catch (error) {
      console.error('sendCustomerBookingConfirmed failed', error)
    }

    await answerCallbackQuery(callbackId, 'Booking confirmed')
    await sendBookingSummary(chatId, updated, 'Booking confirmed')
    return
  }

  const updated = await updateTelegramBookingStatus(bookingId, 'confirmed')
  await answerCallbackQuery(callbackId, 'Payment collected')
  if (!updated) {
    await sendMessage(chatId, 'Payment was marked collected but the booking record did not update cleanly.')
    return
  }

  await sendBookingSummary(chatId, updated, 'Payment collected')
}

async function handleCallback(callback: CallbackQuery) {
  const data = callback.data ?? ''
  const chatId = String(callback.message?.chat.id ?? '')
  if (!chatId) return

  if (data === 'admin:main_menu') {
    await answerCallbackQuery(callback.id, 'Main menu')
    await sendMainMenu(chatId)
    return
  }

  if (data === 'admin:vehicle_manager') {
    saveSession(chatId, { step: 'awaiting_vehicle_category', selectedCategory: null, selectedVehicleId: null, vehicleAction: null })
    await answerCallbackQuery(callback.id, 'Vehicle manager')
    await sendMessage(chatId, 'Choose a vehicle category.', categoryButtons('admin:vehicle_category'))
    return
  }

  if (data === 'admin:pricing_change') {
    await answerCallbackQuery(callback.id, 'Pricing change')
    await sendMessage(chatId, 'Choose a pricing action.', [
      [{ text: 'Change all prices by %', callback_data: 'admin:pricing_all' }],
      [{ text: 'Change one vehicle pricing', callback_data: 'admin:pricing_single' }],
      [{ text: 'Main menu', callback_data: 'admin:main_menu' }],
    ])
    return
  }

  if (data === 'admin:view_bookings') {
    saveSession(chatId, { step: 'awaiting_bookings_range', selectedCategory: null, selectedVehicleId: null, vehicleAction: null })
    await answerCallbackQuery(callback.id, 'View bookings')
    await sendMessage(chatId, 'Which booking range do you want to see?', [
      [{ text: 'This week', callback_data: 'admin:bookings:week' }],
      [{ text: 'This month', callback_data: 'admin:bookings:month' }],
      [{ text: 'Past three months', callback_data: 'admin:bookings:three_months' }],
      [{ text: 'All time', callback_data: 'admin:bookings:all' }],
    ])
    return
  }

  if (data === 'admin:pricing_all') {
    saveSession(chatId, { step: 'awaiting_global_percentage', selectedCategory: null, selectedVehicleId: null, vehicleAction: null })
    await answerCallbackQuery(callback.id, 'Change all prices')
    await sendMessage(chatId, 'Send the percentage change now. Example: +10 or -5')
    return
  }

  if (data === 'admin:pricing_single') {
    saveSession(chatId, { step: 'awaiting_pricing_category', selectedCategory: null, selectedVehicleId: null, vehicleAction: null })
    await answerCallbackQuery(callback.id, 'Change one vehicle')
    await sendMessage(chatId, 'Choose the vehicle category for the price change.', categoryButtons('admin:pricing_category'))
    return
  }

  if (data.startsWith('admin:vehicle_category:')) {
    const category = data.replace('admin:vehicle_category:', '') as VehicleCategory
    const vehicles = await getVehiclesForCategory(category)
    saveSession(chatId, { step: 'awaiting_vehicle_selection', selectedCategory: category, selectedVehicleId: null, vehicleAction: null })
    await answerCallbackQuery(callback.id, category)
    if (vehicles.length === 0) {
      await sendMessage(chatId, `No vehicles found in ${category}.`, [[{ text: 'Main menu', callback_data: 'admin:main_menu' }]])
      return
    }
    await sendMessage(chatId, `Select the vehicle you want to manage in ${category}.`, vehicles.map((vehicle) => [{ text: `${vehicle.model} (${vehicle.status})`, callback_data: `admin:vehicle:${vehicle.id}` }]))
    return
  }

  if (data.startsWith('admin:vehicle:')) {
    const vehicleId = data.replace('admin:vehicle:', '')
    const vehicle = await getVehicleById(vehicleId)
    saveSession(chatId, { selectedVehicleId: vehicleId, vehicleAction: null, step: 'awaiting_vehicle_selection' })
    await answerCallbackQuery(callback.id, vehicle?.model || 'Vehicle selected')
    await sendMessage(chatId, `${vehicle?.model || 'This vehicle'} selected. What do you want to do?`, [
      [{ text: 'Close vehicle', callback_data: 'admin:vehicle_action:close' }],
      [{ text: 'Open vehicle', callback_data: 'admin:vehicle_action:open' }],
      [{ text: 'Main menu', callback_data: 'admin:main_menu' }],
    ])
    return
  }

  if (data.startsWith('admin:vehicle_action:')) {
    const action = data.replace('admin:vehicle_action:', '') as VehicleAction
    const session = getSession(chatId)
    const vehicle = session.selectedVehicleId ? await getVehicleById(session.selectedVehicleId) : null
    if (!session.selectedVehicleId || !vehicle) {
      await answerCallbackQuery(callback.id, 'Choose a vehicle first')
      await sendMainMenu(chatId, 'Choose Vehicle manager again and select a vehicle first.')
      return
    }

    if (action === 'open') {
      const result = await openVehicleForBooking(session.selectedVehicleId)
      await answerCallbackQuery(callback.id, 'Vehicle opened')
      if (!result.ok) {
        await sendMessage(chatId, `Could not open the vehicle: ${result.error}`)
        return
      }
      await sendMainMenu(chatId, `${result.vehicle.model} is now open and bookable again.`)
      return
    }

    saveSession(chatId, { step: 'awaiting_vehicle_dates', vehicleAction: 'close' })
    await answerCallbackQuery(callback.id, 'Close vehicle')
    await sendMessage(chatId, `Send the dates to close ${vehicle.model}. Example: 16/05/2026 to 20/05/2026`)
    return
  }

  if (data.startsWith('admin:pricing_category:')) {
    const category = data.replace('admin:pricing_category:', '') as VehicleCategory
    const vehicles = await getVehiclesForCategory(category)
    saveSession(chatId, { step: 'awaiting_pricing_vehicle', selectedCategory: category, selectedVehicleId: null })
    await answerCallbackQuery(callback.id, category)
    if (vehicles.length === 0) {
      await sendMessage(chatId, `No vehicles found in ${category}.`, [[{ text: 'Main menu', callback_data: 'admin:main_menu' }]])
      return
    }
    await sendMessage(chatId, `Choose the vehicle you want to reprice in ${category}.`, vehicles.map((vehicle) => [{ text: `Change price ${vehicle.model}`, callback_data: `admin:price_vehicle:${vehicle.id}` }]))
    return
  }

  if (data.startsWith('admin:price_vehicle:')) {
    const vehicleId = data.replace('admin:price_vehicle:', '')
    const vehicle = await getVehicleById(vehicleId)
    saveSession(chatId, { step: 'awaiting_single_price', selectedVehicleId: vehicleId })
    await answerCallbackQuery(callback.id, vehicle?.model || 'Vehicle selected')
    await sendMessage(chatId, `Send the new daily rate for ${vehicle?.model || 'this vehicle'}. Format accepted: R3000 or 3000`)
    return
  }

  if (data.startsWith('admin:bookings:')) {
    const range = data.replace('admin:bookings:', '') as 'week' | 'month' | 'three_months' | 'all'
    const bookings = await getTelegramBookingsForRange(range)
    await answerCallbackQuery(callback.id, 'Loading bookings')
    if (bookings.length === 0) {
      await sendMessage(chatId, 'No bookings found for that range.', [[{ text: 'Main menu', callback_data: 'admin:main_menu' }]])
      return
    }

    const lines = bookings.slice(0, 20).map((booking) => {
      const customer = customerShape(booking)
      return [
        `${bookingCode(booking.id)} · ${booking.vehicle_name || 'Vehicle pending'}`,
        `${customer?.full_name || customer?.telegram_name || booking.chat_id}`,
        `${booking.start_date || 'No date'} → ${booking.end_date || 'No end date'}`,
        `${booking.status} · ${booking.total_amount ? money(booking.total_amount) : 'No total yet'}`,
      ].join('\n')
    })

    await sendMessage(chatId, [`Bookings found: ${bookings.length}`, '', ...lines].join('\n\n'), [[{ text: 'Main menu', callback_data: 'admin:main_menu' }]])
    saveSession(chatId, { step: 'home', selectedCategory: null, selectedVehicleId: null, vehicleAction: null })
    return
  }

  if (data.startsWith('admin:booking_confirm:')) {
    await handleBookingAction(chatId, callback.id, data.replace('admin:booking_confirm:', ''), 'confirm')
    return
  }

  if (data.startsWith('admin:booking_paid:')) {
    await handleBookingAction(chatId, callback.id, data.replace('admin:booking_paid:', ''), 'paid')
  }
}

async function handleMessage(message: TelegramMessage) {
  const chatId = String(message.chat.id)
  const text = message.text?.trim() ?? ''
  const session = getSession(chatId)

  await registerAdminSubscriber(chatId, fullName(message.from), message.from?.username ?? null)

  if (!text || text === '/start' || text.toLowerCase() === 'start') {
    await sendMainMenu(chatId)
    return
  }

  if (session.step === 'awaiting_vehicle_dates' && session.selectedVehicleId && session.vehicleAction === 'close') {
    const range = parseDateRange(text)
    if (!range) {
      await sendMessage(chatId, 'I need a valid closeout date range. Example: 16/05/2026 to 20/05/2026')
      return
    }

    const result = await closeVehicleForDates(session.selectedVehicleId, range.startDate, range.endDate)
    if (!result.ok) {
      await sendMessage(chatId, `Could not close the vehicle: ${result.error}`)
      return
    }

    await sendMainMenu(chatId, `${result.vehicle.model} is now closed from ${range.startDate} to ${range.endDate}. It will stay hidden from the customer vehicle list.`)
    return
  }

  if (session.step === 'awaiting_single_price' && session.selectedVehicleId) {
    const rate = parseCurrency(text)
    if (rate === null) {
      await sendMessage(chatId, 'Send a valid daily rate. Format accepted: R3000 or 3000')
      return
    }

    const result = await updateVehicleRate(session.selectedVehicleId, rate)
    if (!result.ok) {
      await sendMessage(chatId, `Could not update pricing: ${result.error}`)
      return
    }

    await sendMainMenu(chatId, `${result.vehicle.model} is now set to ${money(rate)} per day.`)
    return
  }

  if (session.step === 'awaiting_global_percentage') {
    const percent = parsePercent(text)
    if (percent === null) {
      await sendMessage(chatId, 'Send a valid percentage like +10 or -5')
      return
    }

    const result = await updateAllVehicleRatesByPercent(percent)
    if (!result.ok) {
      await sendMessage(chatId, `Could not update all prices: ${result.error}`)
      return
    }

    await sendMainMenu(chatId, `Updated ${result.count} vehicles by ${percent}% successfully.`)
    return
  }

  await sendMainMenu(chatId)
}

export async function processTelegramAdminUpdate(update: TelegramUpdate) {
  if (update.callback_query) {
    await handleCallback(update.callback_query)
    return
  }

  if (update.message) {
    await handleMessage(update.message)
  }
}

export async function notifyAdminNewBooking(input: {
  bookingId: string
  chatId: string
  customerName?: string | null
  phone?: string | null
  username?: string | null
  vehicleName?: string | null
  vehicleCategory?: string | null
  startDate?: string | null
  endDate?: string | null
  totalDays?: number | null
  totalAmount?: number | null
  idFileId?: string | null
  licenseFileId?: string | null
}) {
  const adminChatIds = await getAdminSubscriberChatIds()
  if (adminChatIds.length === 0) return

  const marker = `ADMIN_BOOKING_ALERT_SENT:${input.bookingId}`
  const alreadySent = await hasTelegramConversationMarker(input.chatId, marker)
  if (alreadySent) return

  const booking = await getTelegramBookingById(input.bookingId)
  if (booking) {
    await Promise.all(adminChatIds.map((adminChatId) => sendBookingSummary(adminChatId, booking, 'New booking')))
    await logTelegramConversation({
      chatId: input.chatId,
      direction: 'outbound',
      messageType: 'text',
      body: marker,
      meta: { bookingId: input.bookingId, adminChatIds },
    })
    return
  }

  const summary = [
    'New booking',
    '',
    `Code: ${bookingCode(input.bookingId)}`,
    `Customer: ${input.customerName || 'Unknown customer'}`,
    `Phone: ${input.phone || 'No phone yet'}`,
    `Customer Telegram ID: ${input.chatId}`,
    `Vehicle: ${input.vehicleName || 'Vehicle pending'}`,
    `Category: ${input.vehicleCategory || 'Category pending'}`,
    `Dates: ${input.startDate || 'No start date'} → ${input.endDate || 'No end date'}`,
    `Days: ${input.totalDays || 0}`,
    `Total: ${input.totalAmount ? money(input.totalAmount) : 'No total yet'}`,
    'Status: pending',
  ].join('\n')

  await Promise.all(adminChatIds.map(async (adminChatId) => {
    await sendMessage(adminChatId, summary, [
      [{ text: 'Collect Payment', url: customerChatUrl(input.chatId, input.username || null) }],
      [{ text: 'Confirm Booking', callback_data: `admin:booking_confirm:${input.bookingId}` }],
      [{ text: 'Payment Collected', callback_data: `admin:booking_paid:${input.bookingId}` }],
    ])
    await sendPhotoBestEffort(adminChatId, input.idFileId ?? null, `Passport / ID — ${input.customerName || 'Customer'}`)
    await sendPhotoBestEffort(adminChatId, input.licenseFileId ?? null, `Driver’s license — ${input.customerName || 'Customer'}`)
  }))

  await logTelegramConversation({
    chatId: input.chatId,
    direction: 'outbound',
    messageType: 'text',
    body: marker,
    meta: { bookingId: input.bookingId, adminChatIds },
  })
}
