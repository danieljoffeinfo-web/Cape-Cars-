import {
  getAdminSubscriberChatIds,
  getTelegramBookingsForRange,
  getVehicleById,
  getVehiclesForCategory,
  markVehicleBooked,
  registerAdminSubscriber,
  updateAllVehicleRatesByPercent,
  updateVehicleRate,
  type TelegramBookingWithCustomer,
} from '@/lib/telegram-admin'
import { CATEGORY_ORDER, type VehicleCategory } from '@/lib/telegram-catalog'

const TELEGRAM_ADMIN_BOT_TOKEN = process.env.TELEGRAM_ADMIN_BOT_TOKEN

type AdminStep =
  | 'home'
  | 'awaiting_vehicle_category'
  | 'awaiting_vehicle_selection'
  | 'awaiting_vehicle_dates'
  | 'awaiting_pricing_mode'
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

type AdminSession = {
  chatId: string
  step: AdminStep
  mode?: 'vehicle_manager' | 'pricing_single' | null
  selectedCategory?: VehicleCategory | null
  selectedVehicleId?: string | null
}

const sessions = new Map<string, AdminSession>()

function getSession(chatId: string): AdminSession {
  return sessions.get(chatId) ?? { chatId, step: 'home', mode: null, selectedCategory: null, selectedVehicleId: null }
}

function saveSession(chatId: string, patch: Partial<AdminSession>) {
  const next = { ...getSession(chatId), ...patch, chatId }
  sessions.set(chatId, next)
  return next
}

function fullName(person?: { first_name?: string; last_name?: string }) {
  return [person?.first_name, person?.last_name].filter(Boolean).join(' ').trim() || null
}

async function telegramApi(method: string, payload: Record<string, unknown>) {
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

async function sendMessage(chatId: string, text: string, buttons?: InlineButton[][]) {
  return telegramApi('sendMessage', {
    chat_id: chatId,
    text,
    reply_markup: buttons ? { inline_keyboard: buttons } : undefined,
  })
}

async function sendPhoto(chatId: string, photo: string, caption?: string) {
  return telegramApi('sendPhoto', {
    chat_id: chatId,
    photo,
    caption,
  })
}

async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  return telegramApi('answerCallbackQuery', {
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

  const monthNames = ['january','february','march','april','may','june','july','august','september','october','november','december']
  const directDayMonth = cleaned.match(/^(\d{1,2})\s+([a-z]+)(?:\s+(\d{4}))?$/)
  if (directDayMonth && monthNames.includes(directDayMonth[2])) {
    const day = Number(directDayMonth[1])
    const month = monthNames.indexOf(directDayMonth[2])
    const year = directDayMonth[3] ? Number(directDayMonth[3]) : new Date().getFullYear()
    const date = new Date(year, month, day)
    return Number.isNaN(date.getTime()) ? null : toIsoDate(date)
  }

  const directMonthDay = cleaned.match(/^([a-z]+)\s+(\d{1,2})(?:\s+(\d{4}))?$/)
  if (directMonthDay && monthNames.includes(directMonthDay[1])) {
    const month = monthNames.indexOf(directMonthDay[1])
    const day = Number(directMonthDay[2])
    const year = directMonthDay[3] ? Number(directMonthDay[3]) : new Date().getFullYear()
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
  saveSession(chatId, { step: 'home', mode: null, selectedCategory: null, selectedVehicleId: null })
  await sendMessage(chatId, text, menuButtons())
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
    saveSession(chatId, { step: 'awaiting_vehicle_category', mode: 'vehicle_manager', selectedCategory: null, selectedVehicleId: null })
    await answerCallbackQuery(callback.id, 'Vehicle manager')
    await sendMessage(chatId, 'Choose a vehicle category.', categoryButtons('admin:vehicle_category'))
    return
  }

  if (data === 'admin:pricing_change') {
    saveSession(chatId, { step: 'awaiting_pricing_mode', mode: null, selectedCategory: null, selectedVehicleId: null })
    await answerCallbackQuery(callback.id, 'Pricing change')
    await sendMessage(chatId, 'Choose a pricing action.', [
      [{ text: 'Change all prices by %', callback_data: 'admin:pricing_all' }],
      [{ text: 'Change one vehicle pricing', callback_data: 'admin:pricing_single' }],
      [{ text: 'Main menu', callback_data: 'admin:main_menu' }],
    ])
    return
  }

  if (data === 'admin:view_bookings') {
    saveSession(chatId, { step: 'awaiting_bookings_range', mode: null, selectedCategory: null, selectedVehicleId: null })
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
    saveSession(chatId, { step: 'awaiting_global_percentage', mode: null, selectedCategory: null, selectedVehicleId: null })
    await answerCallbackQuery(callback.id, 'Change all prices')
    await sendMessage(chatId, 'Send the percentage change now. Example: +10 or -5')
    return
  }

  if (data === 'admin:pricing_single') {
    saveSession(chatId, { step: 'awaiting_pricing_category', mode: 'pricing_single', selectedCategory: null, selectedVehicleId: null })
    await answerCallbackQuery(callback.id, 'Change one vehicle')
    await sendMessage(chatId, 'Choose the vehicle category for the price change.', categoryButtons('admin:pricing_category'))
    return
  }

  if (data.startsWith('admin:vehicle_category:')) {
    const category = data.replace('admin:vehicle_category:', '') as VehicleCategory
    const vehicles = await getVehiclesForCategory(category)
    saveSession(chatId, { step: 'awaiting_vehicle_selection', mode: 'vehicle_manager', selectedCategory: category, selectedVehicleId: null })
    await answerCallbackQuery(callback.id, category)
    if (vehicles.length === 0) {
      await sendMessage(chatId, `No vehicles found in ${category}.`, [[{ text: 'Main menu', callback_data: 'admin:main_menu' }]])
      return
    }
    await sendMessage(chatId, `Select the vehicle you want to manage in ${category}.`, vehicles.map((vehicle) => [{ text: `${vehicle.model} (${vehicle.status})`, callback_data: `admin:vehicle:${vehicle.id}` }]))
    return
  }

  if (data.startsWith('admin:pricing_category:')) {
    const category = data.replace('admin:pricing_category:', '') as VehicleCategory
    const vehicles = await getVehiclesForCategory(category)
    saveSession(chatId, { step: 'awaiting_pricing_vehicle', mode: 'pricing_single', selectedCategory: category, selectedVehicleId: null })
    await answerCallbackQuery(callback.id, category)
    if (vehicles.length === 0) {
      await sendMessage(chatId, `No vehicles found in ${category}.`, [[{ text: 'Main menu', callback_data: 'admin:main_menu' }]])
      return
    }
    await sendMessage(chatId, `Choose the vehicle you want to reprice in ${category}.`, vehicles.map((vehicle) => [{ text: `Change price ${vehicle.model}`, callback_data: `admin:price_vehicle:${vehicle.id}` }]))
    return
  }

  if (data.startsWith('admin:vehicle:')) {
    const vehicleId = data.replace('admin:vehicle:', '')
    const vehicle = await getVehicleById(vehicleId)
    saveSession(chatId, { step: 'awaiting_vehicle_dates', selectedVehicleId: vehicleId })
    await answerCallbackQuery(callback.id, vehicle?.model || 'Vehicle selected')
    await sendMessage(chatId, `Send the booked dates for ${vehicle?.model || 'this vehicle'}. Example: 16/05/2026 to 20/05/2026`) 
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
    saveSession(chatId, { step: 'home', mode: null, selectedCategory: null, selectedVehicleId: null })
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

  if (session.step === 'awaiting_vehicle_dates' && session.selectedVehicleId) {
    const range = parseDateRange(text)
    if (!range) {
      await sendMessage(chatId, 'I need a valid booked date range. Example: 16/05/2026 to 20/05/2026')
      return
    }

    const result = await markVehicleBooked(session.selectedVehicleId, range.startDate, range.endDate)
    if (!result.ok) {
      await sendMessage(chatId, `Could not update the vehicle: ${result.error}`)
      return
    }

    await sendMainMenu(chatId, `${result.vehicle.model} is now marked booked from ${range.startDate} to ${range.endDate}. This has been pushed to the fleet and booking flow.`)
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

function customerChatUrl(chatId: string, username?: string | null) {
  if (username) return `https://t.me/${username}`
  return `tg://user?id=${chatId}`
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
  idImageUrl?: string | null
  licenseImageUrl?: string | null
}) {
  const adminChatIds = await getAdminSubscriberChatIds()
  if (adminChatIds.length === 0) return

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
  ].join('\n')

  await Promise.all(adminChatIds.map(async (adminChatId) => {
    await sendMessage(adminChatId, summary, [[{ text: 'Collect Payment', url: customerChatUrl(input.chatId, input.username) }]])
    if (input.idImageUrl) await sendPhoto(adminChatId, input.idImageUrl, 'Customer ID / passport')
    if (input.licenseImageUrl) await sendPhoto(adminChatId, input.licenseImageUrl, 'Driver\'s license')
  }))
}
