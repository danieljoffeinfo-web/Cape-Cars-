import { randomUUID } from 'crypto'
import { CATEGORY_ORDER, CATEGORY_PRICING, TELEGRAM_CATALOG, type TelegramCatalogVehicle, type VehicleCategory } from '@/lib/telegram-catalog'
import { buildTelegramProxyUrl, getAvailableVehiclesForCategory, logTelegramConversation, upsertTelegramBooking, upsertTelegramCustomer } from '@/lib/telegram-admin'

export type SessionStep =
  | 'choosing_category'
  | 'choosing_vehicle'
  | 'awaiting_start_date'
  | 'awaiting_days'
  | 'awaiting_confirmation'
  | 'awaiting_full_name'
  | 'awaiting_phone'
  | 'awaiting_id_image'
  | 'awaiting_license_image'
  | 'completed'

export type BotSession = {
  chat_id: string
  booking_id?: string | null
  customer_id?: string | null
  step: SessionStep
  telegram_name?: string | null
  telegram_username?: string | null
  customer_full_name?: string | null
  customer_phone?: string | null
  selected_category?: VehicleCategory | null
  selected_vehicle_id?: string | null
  selected_vehicle_model?: string | null
  daily_rate?: number | null
  requested_start_date?: string | null
  requested_days?: number | null
  requested_end_date?: string | null
  total_amount?: number | null
  id_file_id?: string | null
  license_file_id?: string | null
  updated_at?: string
}

type TelegramMessage = {
  chat: { id: number | string }
  text?: string
  from?: { first_name?: string; last_name?: string; username?: string }
  photo?: { file_id: string }[]
  document?: { file_id: string; mime_type?: string }
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

type TelegramInlineButton = { text: string; callback_data: string }

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const memorySessions = new Map<string, BotSession>()

function defaultSession(chatId: string): BotSession {
  return {
    chat_id: chatId,
    booking_id: null,
    customer_id: null,
    step: 'choosing_category',
    telegram_name: null,
    telegram_username: null,
    customer_full_name: null,
    customer_phone: null,
    selected_category: null,
    selected_vehicle_id: null,
    selected_vehicle_model: null,
    daily_rate: null,
    requested_start_date: null,
    requested_days: null,
    requested_end_date: null,
    total_amount: null,
    id_file_id: null,
    license_file_id: null,
    updated_at: new Date().toISOString(),
  }
}

function formatTelegramName(person?: { first_name?: string; last_name?: string }) {
  const name = [person?.first_name, person?.last_name].filter(Boolean).join(' ').trim()
  return name || null
}

async function getSession(chatId: string): Promise<BotSession> {
  return memorySessions.get(chatId) ?? defaultSession(chatId)
}

async function saveSession(chatId: string, patch: Partial<BotSession>) {
  const next = {
    ...(await getSession(chatId)),
    ...patch,
    chat_id: chatId,
    updated_at: new Date().toISOString(),
  }
  memorySessions.set(chatId, next)
  return next
}

async function resetSession(chatId: string, person?: { first_name?: string; last_name?: string; username?: string }) {
  return saveSession(chatId, {
    ...defaultSession(chatId),
    telegram_name: formatTelegramName(person),
    telegram_username: person?.username ?? null,
  })
}

async function ensureCustomer(session: BotSession) {
  const customer = await upsertTelegramCustomer({
    chatId: session.chat_id,
    telegramName: session.telegram_name,
    telegramUsername: session.telegram_username,
    fullName: session.customer_full_name,
    phone: session.customer_phone,
    idUrl: session.id_file_id ? buildTelegramProxyUrl(session.id_file_id) : null,
    licenseUrl: session.license_file_id ? buildTelegramProxyUrl(session.license_file_id) : null,
  })

  if (!customer?.id) return null
  const next = await saveSession(session.chat_id, { customer_id: customer.id })
  return next
}

async function persistBooking(session: BotSession, status?: string) {
  if (!session.booking_id) return
  await upsertTelegramBooking({
    bookingId: session.booking_id,
    chatId: session.chat_id,
    customerId: session.customer_id ?? null,
    vehicleName: session.selected_vehicle_model ?? null,
    vehicleCategory: session.selected_category ?? null,
    startDate: session.requested_start_date ?? null,
    totalDays: session.requested_days ?? null,
    endDate: session.requested_end_date ?? null,
    dailyRate: session.daily_rate ?? null,
    totalAmount: session.total_amount ?? null,
    idFileId: session.id_file_id ?? null,
    licenseFileId: session.license_file_id ?? null,
    status: status ?? 'draft',
  })
}

async function telegramApi(method: string, payload: Record<string, unknown>) {
  if (!TELEGRAM_TOKEN) throw new Error('Missing TELEGRAM_BOT_TOKEN')

  const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Telegram API ${method} failed: ${response.status} ${text}`)
  }

  return response.json()
}

async function sendMessage(chatId: string, text: string, buttons?: TelegramInlineButton[][]) {
  const session = await getSession(chatId)
  await telegramApi('sendMessage', {
    chat_id: chatId,
    text,
    reply_markup: buttons ? { inline_keyboard: buttons } : undefined,
  })
  await logTelegramConversation({
    chatId,
    customerId: session.customer_id ?? null,
    direction: 'outbound',
    messageType: 'text',
    body: text,
    meta: buttons ? { buttons } : null,
  })
}

async function sendPhoto(chatId: string, photo: string, caption: string, buttons?: TelegramInlineButton[][]) {
  const session = await getSession(chatId)
  await telegramApi('sendPhoto', {
    chat_id: chatId,
    photo,
    caption,
    reply_markup: buttons ? { inline_keyboard: buttons } : undefined,
  })
  await logTelegramConversation({
    chatId,
    customerId: session.customer_id ?? null,
    direction: 'outbound',
    messageType: 'photo',
    body: caption,
    meta: { photo, buttons: buttons ?? null },
  })
}

async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  return telegramApi('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text,
  })
}

function formatCurrency(amount: number) {
  return `R ${amount.toLocaleString('en-ZA')}`
}

function getCategoryButtons() {
  return CATEGORY_ORDER.map((category) => [{ text: category, callback_data: `category:${category}` }])
}

function vehiclesForCategory(category: VehicleCategory) {
  return TELEGRAM_CATALOG.filter((vehicle) => vehicle.category === category)
}

function findVehicle(vehicleId: string) {
  return TELEGRAM_CATALOG.find((vehicle) => vehicle.id === vehicleId) ?? null
}

function formatVehicleCaption(vehicle: TelegramCatalogVehicle) {
  return [
    `🚘 ${vehicle.model}`,
    `${vehicle.category}`,
    `Daily rate: ${formatCurrency(vehicle.rate)}`,
  ].join('\n')
}

async function sendWelcome(chatId: string) {
  await sendMessage(
    chatId,
    '🚗 Welcome to Cape Cars Rentals. Please choose a vehicle category below to view our available cars.',
    getCategoryButtons(),
  )
}

async function sendCategoryCatalog(chatId: string, category: VehicleCategory) {
  const liveVehicles = await getAvailableVehiclesForCategory(category)
  const vehicles = (liveVehicles && liveVehicles.length > 0)
    ? liveVehicles.map((vehicle: any) => ({
        id: TELEGRAM_CATALOG.find((item) => item.model === vehicle.model)?.id || vehicle.model.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        model: vehicle.model,
        category: vehicle.cat,
        rate: vehicle.rate,
        status: vehicle.status,
        imageUrl: vehicle.image_url,
      }))
    : vehiclesForCategory(category).filter((vehicle) => vehicle.status === 'Available')

  await sendMessage(chatId, `${category} — ${formatCurrency(CATEGORY_PRICING[category])} per day. Choose a vehicle below.`)

  for (const vehicle of vehicles) {
    await sendPhoto(
      chatId,
      vehicle.imageUrl,
      formatVehicleCaption(vehicle),
      [[{ text: `Book ${vehicle.model}`, callback_data: `book:${vehicle.id}` }]],
    )
  }
}

function toIsoDate(date: Date) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())).toISOString().slice(0, 10)
}

function nextWeekday(targetDay: number) {
  const now = new Date()
  const date = new Date(now)
  const diff = (targetDay - now.getDay() + 7) % 7 || 7
  date.setDate(now.getDate() + diff)
  return toIsoDate(date)
}

function parseDate(text: string) {
  const value = text.trim().toLowerCase().replace(/,/g, ' ')
  if (!value) return null

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T00:00:00Z`)
    return Number.isNaN(date.getTime()) ? null : value
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
    if (day in weekdays) {
      const now = new Date()
      const date = new Date(now)
      const diff = (weekdays[day] - now.getDay() + 7) % 7
      date.setDate(now.getDate() + diff)
      return toIsoDate(date)
    }
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

function parseRentalDays(text: string) {
  const value = text.trim().toLowerCase()
  if (!value) return null

  const wordNumbers: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
    eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
  }

  const weekWord = value.match(/\b(one|two|three|four)\s+week(s)?\b/)
  if (weekWord) return (wordNumbers[weekWord[1]] ?? 0) * 7

  const dayWord = value.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen)\s+day(s)?\b/)
  if (dayWord) return wordNumbers[dayWord[1]] ?? null

  if (value === 'a week' || value === 'one week') return 7
  if (value === 'weekend') return 2

  const weekDigits = value.match(/(\d{1,2})\s*week(s)?/)
  if (weekDigits) {
    const weeks = Number.parseInt(weekDigits[1], 10)
    if (weeks > 0 && weeks <= 4) return weeks * 7
  }

  const digits = value.match(/(\d{1,2})/)
  if (!digits) return null
  const days = Number.parseInt(digits[1], 10)
  if (!Number.isFinite(days) || days <= 0 || days > 30) return null
  return days
}

function addDays(startDate: string, days: number) {
  const date = new Date(`${startDate}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function extractFileId(message?: TelegramMessage): string | null {
  if (!message) return null
  if (message.photo && message.photo.length > 0) return message.photo[message.photo.length - 1].file_id
  if (message.document?.mime_type?.startsWith('image/')) return message.document.file_id
  return null
}

async function logInboundText(chatId: string, body: string, type: 'text' | 'button' = 'text') {
  const session = await getSession(chatId)
  await logTelegramConversation({
    chatId,
    customerId: session.customer_id ?? null,
    direction: 'inbound',
    messageType: type,
    body,
  })
}

async function handleCategorySelect(callback: CallbackQuery, category: VehicleCategory) {
  const chatId = String(callback.message?.chat.id ?? '')
  if (!chatId) return

  await logInboundText(chatId, `Selected category: ${category}`, 'button')

  await saveSession(chatId, {
    step: 'choosing_vehicle',
    telegram_name: formatTelegramName(callback.from),
    telegram_username: callback.from?.username ?? null,
    selected_category: category,
    selected_vehicle_id: null,
    selected_vehicle_model: null,
    daily_rate: CATEGORY_PRICING[category],
    requested_start_date: null,
    requested_days: null,
    requested_end_date: null,
    total_amount: null,
    id_file_id: null,
    license_file_id: null,
  })

  await answerCallbackQuery(callback.id, category)
  await sendCategoryCatalog(chatId, category)
}

async function handleVehicleSelect(callback: CallbackQuery, vehicleId: string) {
  const chatId = String(callback.message?.chat.id ?? '')
  if (!chatId) return

  const vehicle = findVehicle(vehicleId)
  if (!vehicle) {
    await answerCallbackQuery(callback.id, 'Vehicle not found')
    await sendWelcome(chatId)
    return
  }

  await logInboundText(chatId, `Book ${vehicle.model}`, 'button')

  const bookingId = randomUUID()
  let next = await saveSession(chatId, {
    booking_id: bookingId,
    step: 'awaiting_start_date',
    telegram_name: formatTelegramName(callback.from),
    telegram_username: callback.from?.username ?? null,
    selected_category: vehicle.category,
    selected_vehicle_id: vehicle.id,
    selected_vehicle_model: vehicle.model,
    daily_rate: vehicle.rate,
    requested_start_date: null,
    requested_days: null,
    requested_end_date: null,
    total_amount: null,
    customer_full_name: null,
    customer_phone: null,
    id_file_id: null,
    license_file_id: null,
  })

  next = (await ensureCustomer(next)) ?? next
  await persistBooking(next, 'draft')

  await answerCallbackQuery(callback.id, `Book ${vehicle.model}`)
  await sendMessage(chatId, `Book ${vehicle.model}`)
  await sendMessage(chatId, 'What day would you like to book the vehicle?')
}

async function handleCallback(callback: CallbackQuery) {
  const data = callback.data ?? ''
  const chatId = String(callback.message?.chat.id ?? '')
  if (!chatId) return

  if (data.startsWith('category:')) {
    await handleCategorySelect(callback, data.replace('category:', '') as VehicleCategory)
    return
  }

  if (data.startsWith('book:')) {
    await handleVehicleSelect(callback, data.replace('book:', ''))
    return
  }

  if (data === 'confirm_booking') {
    await logInboundText(chatId, 'Confirmed booking', 'button')
    const next = await saveSession(chatId, { step: 'awaiting_full_name' })
    await persistBooking(next, 'customer_details_pending')
    await answerCallbackQuery(callback.id, 'Confirmed')
    await sendMessage(chatId, 'Please send your full name and surname.')
    return
  }

  if (data === 'change_booking') {
    await logInboundText(chatId, 'Make changes', 'button')
    await saveSession(chatId, {
      step: 'awaiting_start_date',
      requested_start_date: null,
      requested_days: null,
      requested_end_date: null,
      total_amount: null,
    })
    await answerCallbackQuery(callback.id, 'Make changes')
    await sendMessage(chatId, 'No problem. Please send a new booking date.')
  }
}

async function handleMessage(message: TelegramMessage) {
  const chatId = String(message.chat.id)
  const text = message.text?.trim() ?? ''
  let session = await getSession(chatId)

  if (text) await logInboundText(chatId, text, 'text')

  if (text === '/start' || text.toLowerCase() === 'start' || session.step === 'completed') {
    session = await resetSession(chatId, message.from)
    session = (await ensureCustomer(session)) ?? session
    await sendWelcome(chatId)
    return
  }

  if (session.step === 'choosing_category') {
    await sendWelcome(chatId)
    return
  }

  if (session.step === 'choosing_vehicle') {
    await sendMessage(chatId, 'Please choose a vehicle from the category list above.')
    return
  }

  if (session.step === 'awaiting_start_date') {
    const startDate = parseDate(text)
    if (!startDate) {
      await sendMessage(chatId, 'Please send the booking date.')
      return
    }

    session = await saveSession(chatId, {
      step: 'awaiting_days',
      requested_start_date: startDate,
      telegram_name: formatTelegramName(message.from),
      telegram_username: message.from?.username ?? null,
    })
    await persistBooking(session, 'draft')
    await sendMessage(chatId, `Great. ${session.selected_vehicle_model} is set for ${startDate}. How many days would you like to book it for?`)
    return
  }

  if (session.step === 'awaiting_days') {
    const days = parseRentalDays(text)
    if (!days) {
      await sendMessage(chatId, 'Please send how many days you would like to book for.')
      return
    }

    const totalAmount = (session.daily_rate ?? 0) * days
    const endDate = addDays(session.requested_start_date!, days)

    session = await saveSession(chatId, {
      step: 'awaiting_confirmation',
      requested_days: days,
      requested_end_date: endDate,
      total_amount: totalAmount,
    })
    await persistBooking(session, 'quote_ready')

    await sendMessage(
      chatId,
      [
        `Daily rate on ${session.selected_vehicle_model} is ${formatCurrency(session.daily_rate ?? 0)}.`,
        `For ${days} day${days === 1 ? '' : 's'}, your total is ${formatCurrency(totalAmount)}.`,
        '',
        `Start date: ${session.requested_start_date}`,
        `End date: ${endDate}`,
        '',
        'Would you like to confirm or make changes?',
      ].join('\n'),
      [[
        { text: 'Confirm', callback_data: 'confirm_booking' },
        { text: 'Make changes', callback_data: 'change_booking' },
      ]],
    )
    return
  }

  if (session.step === 'awaiting_full_name') {
    if (!text || text.length < 3 || !text.includes(' ')) {
      await sendMessage(chatId, 'Please send your full name and surname.')
      return
    }

    session = await saveSession(chatId, {
      step: 'awaiting_phone',
      customer_full_name: text,
    })
    session = (await ensureCustomer(session)) ?? session
    await persistBooking(session, 'customer_details_pending')
    await sendMessage(chatId, 'Please send your phone number.')
    return
  }

  if (session.step === 'awaiting_phone') {
    if (!text || text.replace(/\D/g, '').length < 7) {
      await sendMessage(chatId, 'Please send your phone number.')
      return
    }

    session = await saveSession(chatId, {
      step: 'awaiting_id_image',
      customer_phone: text,
    })
    session = (await ensureCustomer(session)) ?? session
    await persistBooking(session, 'documents_pending')
    await sendMessage(chatId, 'Please send a clear image of your ID or passport.')
    return
  }

  if (session.step === 'awaiting_id_image') {
    const fileId = extractFileId(message)
    if (!fileId) {
      await sendMessage(chatId, 'Please send a clear image of your ID or passport.')
      return
    }

    await logTelegramConversation({
      chatId,
      customerId: session.customer_id ?? null,
      direction: 'inbound',
      messageType: 'photo',
      body: 'Customer ID or passport image uploaded',
      meta: { fileId },
    })

    session = await saveSession(chatId, { step: 'awaiting_license_image', id_file_id: fileId })
    await persistBooking(session, 'documents_pending')
    await sendMessage(chatId, 'Thanks. Now please send a clear image of the driver’s license.')
    return
  }

  if (session.step === 'awaiting_license_image') {
    const fileId = extractFileId(message)
    if (!fileId) {
      await sendMessage(chatId, 'Please send a clear image of the driver’s license.')
      return
    }

    await logTelegramConversation({
      chatId,
      customerId: session.customer_id ?? null,
      direction: 'inbound',
      messageType: 'photo',
      body: 'Driver license image uploaded',
      meta: { fileId },
    })

    session = await saveSession(chatId, { step: 'completed', license_file_id: fileId })
    session = (await ensureCustomer(session)) ?? session
    await persistBooking(session, 'pre_confirmation')
    await sendMessage(chatId, 'Perfect. Cape Cars will confirm your booking shortly.')
    return
  }

  session = await resetSession(chatId, message.from)
  session = (await ensureCustomer(session)) ?? session
  await sendWelcome(chatId)
}

export async function processTelegramUpdate(update: TelegramUpdate) {
  if (update.callback_query) {
    await handleCallback(update.callback_query)
    return
  }

  if (update.message) {
    await handleMessage(update.message)
  }
}
