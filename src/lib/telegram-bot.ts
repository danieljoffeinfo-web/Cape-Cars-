import { randomUUID } from 'crypto'
import { CATEGORY_ORDER, CATEGORY_PRICING, TELEGRAM_CATALOG, type TelegramCatalogVehicle, type VehicleCategory } from '@/lib/telegram-catalog'
import { buildAbsoluteTelegramProxyUrl, buildTelegramProxyUrl, getAvailableVehiclesForCategory, getVehicleById, logTelegramConversation, upsertTelegramBooking, upsertTelegramCustomer } from '@/lib/telegram-admin'
import { notifyAdminNewBooking } from '@/lib/telegram-admin-bot'

type Locale = 'en' | 'ru'

export type SessionStep =
  | 'choosing_language'
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
  locale?: Locale | null
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

type VehicleChoice = {
  id: string
  model: string
  category: VehicleCategory
  rate: number
  status: string
  imageUrl: string
  source: 'db' | 'static'
}

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const memorySessions = new Map<string, BotSession>()

const CATEGORY_LABELS: Record<Locale, Record<VehicleCategory, string>> = {
  en: {
    'Luxury Vehicles': 'Luxury Vehicles',
    'Mid Tier Vehicles': 'Mid Tier Vehicles',
    'Large Vehicles': 'Large Vehicles',
  },
  ru: {
    'Luxury Vehicles': 'Люксовые автомобили',
    'Mid Tier Vehicles': 'Автомобили среднего класса',
    'Large Vehicles': 'Большие автомобили',
  },
}

const TEXT = {
  welcome: {
    en: '🚗 Welcome to Cape Cars Rentals. View our available vehicles below.',
    ru: '🚗 Добро пожаловать в Cape Cars Rentals. Посмотрите доступные автомобили ниже.',
  },
  chooseCategory: {
    en: 'Choose a vehicle category below.',
    ru: 'Выберите категорию автомобиля ниже.',
  },
  categoryIntro: {
    en: (category: VehicleCategory, rate?: number | null) => rate ? `${CATEGORY_LABELS.en[category]} — ${formatCurrency(rate)} per day. Choose a vehicle below.` : `${CATEGORY_LABELS.en[category]}. Choose a vehicle below.`,
    ru: (category: VehicleCategory, rate?: number | null) => rate ? `${CATEGORY_LABELS.ru[category]} — ${formatCurrency(rate)} в день. Выберите автомобиль ниже.` : `${CATEGORY_LABELS.ru[category]}. Выберите автомобиль ниже.`,
  },
  chooseVehicle: {
    en: 'Please choose a vehicle from the category list above.',
    ru: 'Пожалуйста, выберите автомобиль из списка выше.',
  },
  bookingVehicle: {
    en: (model: string) => `Book ${model}`,
    ru: (model: string) => `Забронировать ${model}`,
  },
  askStartDate: {
    en: 'What starting date would you like to book the vehicle?',
    ru: 'С какой даты вы хотите забронировать автомобиль?',
  },
  badStartDate: {
    en: 'Please send the starting date for the booking.',
    ru: 'Пожалуйста, отправьте дату начала бронирования.',
  },
  askDays: {
    en: (model: string, date: string) => `Great. ${model} is set for ${date}. For how many days would you like to book it?`,
    ru: (model: string, date: string) => `Отлично. ${model} выбран с ${date}. На сколько дней вы хотите его забронировать?`,
  },
  badDays: {
    en: 'Please send how many days you would like to book for.',
    ru: 'Пожалуйста, отправьте количество дней для бронирования.',
  },
  confirmSummary: {
    en: (model: string, dailyRate: number, days: number, totalAmount: number, startDate: string, endDate: string) => [
      `Daily rate on ${model} is ${formatCurrency(dailyRate)}.`,
      `For ${days} day${days === 1 ? '' : 's'}, your total is ${formatCurrency(totalAmount)}.`,
      '',
      `Start date: ${startDate}`,
      `End date: ${endDate}`,
      '',
      'Would you like to confirm, make changes, or view other vehicles?',
    ].join('\n'),
    ru: (model: string, dailyRate: number, days: number, totalAmount: number, startDate: string, endDate: string) => [
      `Дневная ставка на ${model}: ${formatCurrency(dailyRate)}.`,
      `За ${days} дн. сумма составит ${formatCurrency(totalAmount)}.`,
      '',
      `Дата начала: ${startDate}`,
      `Дата окончания: ${endDate}`,
      '',
      'Подтвердить, изменить данные или посмотреть другие автомобили?',
    ].join('\n'),
  },
  fullName: {
    en: 'Please send your full name and surname.',
    ru: 'Пожалуйста, отправьте ваше полное имя и фамилию.',
  },
  phone: {
    en: 'Please send your phone number.',
    ru: 'Пожалуйста, отправьте ваш номер телефона.',
  },
  idPassport: {
    en: 'Please send a clear image of your ID or passport.',
    ru: 'Пожалуйста, отправьте чёткое фото вашего ID или паспорта.',
  },
  license: {
    en: 'Thanks. Now please send a clear image of the driver’s license.',
    ru: 'Спасибо. Теперь отправьте чёткое фото водительского удостоверения.',
  },
  done: {
    en: 'Perfect. Cape Cars will confirm your booking shortly.',
    ru: 'Отлично. Cape Cars скоро подтвердит ваше бронирование.',
  },
  restartDate: {
    en: 'No problem. Please send a new starting date.',
    ru: 'Без проблем. Пожалуйста, отправьте новую дату начала.',
  },
  vehicleNotFound: {
    en: 'Vehicle not found',
    ru: 'Автомобиль не найден',
  },
  noVehicles: {
    en: 'There are no available vehicles in this category right now.',
    ru: 'Сейчас в этой категории нет доступных автомобилей.',
  },
} as const

function defaultSession(chatId: string): BotSession {
  return {
    chat_id: chatId,
    booking_id: null,
    customer_id: null,
    step: 'choosing_language',
    locale: null,
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

function t(locale: Locale | null | undefined) {
  return locale === 'ru' ? 'ru' : 'en'
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

async function resetSession(chatId: string, person?: { first_name?: string; last_name?: string; username?: string }, locale?: Locale | null) {
  return saveSession(chatId, {
    ...defaultSession(chatId),
    locale: locale ?? null,
    step: locale ? 'choosing_category' : 'choosing_language',
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

function getLanguageButtons() {
  return [[
    { text: 'View vehicles', callback_data: 'lang:en' },
    { text: 'Посмотреть автомобили', callback_data: 'lang:ru' },
  ]]
}

function getCategoryButtons(locale: Locale) {
  return CATEGORY_ORDER.map((category) => [{ text: CATEGORY_LABELS[locale][category], callback_data: `category:${category}` }])
}

function vehiclesForCategory(category: VehicleCategory) {
  return TELEGRAM_CATALOG.filter((vehicle) => vehicle.category === category)
}

async function resolveVehicleChoice(vehicleId: string, source: 'db' | 'static'): Promise<VehicleChoice | null> {
  if (source === 'db') {
    const vehicle = await getVehicleById(vehicleId)
    if (!vehicle) return null
    return {
      id: vehicle.id,
      model: vehicle.model,
      category: vehicle.cat as VehicleCategory,
      rate: vehicle.rate,
      status: vehicle.status,
      imageUrl: vehicle.image_url || '',
      source: 'db',
    }
  }

  const vehicle = TELEGRAM_CATALOG.find((item) => item.id === vehicleId)
  if (!vehicle) return null
  return {
    id: vehicle.id,
    model: vehicle.model,
    category: vehicle.category,
    rate: vehicle.rate,
    status: vehicle.status,
    imageUrl: vehicle.imageUrl,
    source: 'static',
  }
}

function formatVehicleCaption(vehicle: VehicleChoice, locale: Locale) {
  return [
    `🚘 ${vehicle.model}`,
    `${CATEGORY_LABELS[locale][vehicle.category]}`,
    locale === 'ru' ? `Ставка в день: ${formatCurrency(vehicle.rate)}` : `Daily rate: ${formatCurrency(vehicle.rate)}`,
  ].join('\n')
}

async function sendWelcome(chatId: string) {
  await sendMessage(
    chatId,
    `${TEXT.welcome.en}\n${TEXT.welcome.ru}`,
    getLanguageButtons(),
  )
}

async function sendCategoryPrompt(chatId: string, locale: Locale) {
  await sendMessage(chatId, `${TEXT.chooseCategory[locale]}`, getCategoryButtons(locale))
}

async function sendCategoryCatalog(chatId: string, category: VehicleCategory, locale: Locale) {
  const liveVehicles = await getAvailableVehiclesForCategory(category)
  const vehicles: VehicleChoice[] = (liveVehicles && liveVehicles.length > 0)
    ? liveVehicles
      .filter((vehicle) => vehicle.image_url)
      .map((vehicle) => ({
        id: vehicle.id,
        model: vehicle.model,
        category: vehicle.cat as VehicleCategory,
        rate: vehicle.rate,
        status: vehicle.status,
        imageUrl: vehicle.image_url || '',
        source: 'db' as const,
      }))
    : vehiclesForCategory(category)
      .filter((vehicle) => vehicle.status === 'Available')
      .map((vehicle) => ({
        id: vehicle.id,
        model: vehicle.model,
        category: vehicle.category,
        rate: vehicle.rate,
        status: vehicle.status,
        imageUrl: vehicle.imageUrl,
        source: 'static' as const,
      }))

  if (vehicles.length === 0) {
    await sendMessage(chatId, TEXT.noVehicles[locale], getCategoryButtons(locale))
    return
  }

  const introRate = liveVehicles && liveVehicles.length > 0 ? null : CATEGORY_PRICING[category]
  await sendMessage(chatId, TEXT.categoryIntro[locale](category, introRate))

  for (const vehicle of vehicles) {
    if (!vehicle.imageUrl) continue
    await sendPhoto(
      chatId,
      vehicle.imageUrl,
      formatVehicleCaption(vehicle, locale),
      [[{ text: TEXT.bookingVehicle[locale](vehicle.model), callback_data: `${vehicle.source === 'db' ? 'bookdb' : 'book'}:${vehicle.id}` }]],
    )
  }
}

function toIsoDate(date: Date) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())).toISOString().slice(0, 10)
}

function nextWeekday(targetDay: number, allowSameDay = false) {
  const now = new Date()
  const date = new Date(now)
  let diff = (targetDay - now.getDay() + 7) % 7
  if (!allowSameDay && diff === 0) diff = 7
  date.setDate(now.getDate() + diff)
  return toIsoDate(date)
}

function parseDate(text: string) {
  const original = text.trim().toLowerCase().replace(/,/g, ' ')
  if (!original) return null

  let value = original
    .replace(/\b(\d{1,2})(st|nd|rd|th)\b/g, '$1')
    .replace(/\bof\b/g, ' ')
    .replace(/\bна\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const replacements: Record<string, string> = {
    'понедельник': 'monday',
    'вторник': 'tuesday',
    'среда': 'wednesday',
    'четверг': 'thursday',
    'пятница': 'friday',
    'суббота': 'saturday',
    'воскресенье': 'sunday',
    'следующий ': 'next ',
    'следующую ': 'next ',
    'эта ': 'this ',
    'этот ': 'this ',
    'сегодня': 'today',
    'завтра': 'tomorrow',
    'января': 'january',
    'февраля': 'february',
    'марта': 'march',
    'апреля': 'april',
    'мая': 'may',
    'июня': 'june',
    'июля': 'july',
    'августа': 'august',
    'сентября': 'september',
    'октября': 'october',
    'ноября': 'november',
    'декабря': 'december',
  }

  for (const [from, to] of Object.entries(replacements)) {
    value = value.replaceAll(from, to)
  }

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
    if (day in weekdays) return nextWeekday(weekdays[day], true)
  }

  const slashMatch = value.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/)
  if (slashMatch) {
    const [, d, m, y] = slashMatch
    const year = y ? Number(y.length === 2 ? `20${y}` : y) : new Date().getFullYear()
    const date = new Date(year, Number(m) - 1, Number(d))
    return Number.isNaN(date.getTime()) ? null : toIsoDate(date)
  }

  if (/^\d{1,2}$/.test(value)) {
    const today = new Date()
    const day = Number(value)
    let candidate = new Date(today.getFullYear(), today.getMonth(), day)
    const floorToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    if (candidate.getDate() !== day || candidate < floorToday) {
      candidate = new Date(today.getFullYear(), today.getMonth() + 1, day)
    }
    return Number.isNaN(candidate.getTime()) ? null : toIsoDate(candidate)
  }

  const monthNames = ['january','february','march','april','may','june','july','august','september','october','november','december']
  const directDayMonth = value.match(/^(\d{1,2})\s+([a-z]+)(?:\s+(\d{4}))?$/)
  if (directDayMonth && monthNames.includes(directDayMonth[2])) {
    const day = Number(directDayMonth[1])
    const month = monthNames.indexOf(directDayMonth[2])
    const year = directDayMonth[3] ? Number(directDayMonth[3]) : new Date().getFullYear()
    const date = new Date(year, month, day)
    return Number.isNaN(date.getTime()) ? null : toIsoDate(date)
  }

  const directMonthDay = value.match(/^([a-z]+)\s+(\d{1,2})(?:\s+(\d{4}))?$/)
  if (directMonthDay && monthNames.includes(directMonthDay[1])) {
    const month = monthNames.indexOf(directMonthDay[1])
    const day = Number(directMonthDay[2])
    const year = directMonthDay[3] ? Number(directMonthDay[3]) : new Date().getFullYear()
    const date = new Date(year, month, day)
    return Number.isNaN(date.getTime()) ? null : toIsoDate(date)
  }

  const natural = new Date(value)
  if (!Number.isNaN(natural.getTime())) return toIsoDate(natural)
  return null
}

function parseRentalDays(text: string) {
  const raw = text.trim().toLowerCase()
  if (!raw) return null

  let value = raw
  const replacements: Record<string, string> = {
    'одна': 'one',
    'один': 'one',
    'два': 'two',
    'три': 'three',
    'четыре': 'four',
    'пять': 'five',
    'шесть': 'six',
    'семь': 'seven',
    'восемь': 'eight',
    'девять': 'nine',
    'десять': 'ten',
    'одиннадцать': 'eleven',
    'двенадцать': 'twelve',
    'тринадцать': 'thirteen',
    'четырнадцать': 'fourteen',
    'неделя': 'week',
    'недели': 'weeks',
    'недель': 'weeks',
    'день': 'day',
    'дня': 'days',
    'дней': 'days',
  }
  for (const [from, to] of Object.entries(replacements)) {
    value = value.replaceAll(from, to)
  }

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

  const session = await getSession(chatId)
  const locale = t(session.locale)
  await logInboundText(chatId, `Selected category: ${category}`, 'button')

  await saveSession(chatId, {
    step: 'choosing_vehicle',
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

  await answerCallbackQuery(callback.id, CATEGORY_LABELS[locale][category])
  await sendCategoryCatalog(chatId, category, locale)
}

async function handleVehicleSelect(callback: CallbackQuery, vehicleId: string, source: 'db' | 'static') {
  const chatId = String(callback.message?.chat.id ?? '')
  if (!chatId) return

  const session = await getSession(chatId)
  const locale = t(session.locale)
  const vehicle = await resolveVehicleChoice(vehicleId, source)
  if (!vehicle) {
    await answerCallbackQuery(callback.id, TEXT.vehicleNotFound[locale])
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

  await answerCallbackQuery(callback.id, TEXT.bookingVehicle[locale](vehicle.model))
  await sendMessage(chatId, TEXT.bookingVehicle[locale](vehicle.model))
  await sendMessage(chatId, TEXT.askStartDate[locale])
}

async function handleCallback(callback: CallbackQuery) {
  const data = callback.data ?? ''
  const chatId = String(callback.message?.chat.id ?? '')
  if (!chatId) return

  if (data.startsWith('lang:')) {
    const locale = data.replace('lang:', '') as Locale
    let session = await resetSession(chatId, callback.from, locale)
    session = (await ensureCustomer(session)) ?? session
    await answerCallbackQuery(callback.id, locale === 'ru' ? 'Русский' : 'English')
    await sendCategoryPrompt(chatId, locale)
    return
  }

  if (data.startsWith('category:')) {
    await handleCategorySelect(callback, data.replace('category:', '') as VehicleCategory)
    return
  }

  if (data.startsWith('bookdb:')) {
    await handleVehicleSelect(callback, data.replace('bookdb:', ''), 'db')
    return
  }

  if (data.startsWith('book:')) {
    await handleVehicleSelect(callback, data.replace('book:', ''), 'static')
    return
  }

  const session = await getSession(chatId)
  const locale = t(session.locale)

  if (data === 'confirm_booking') {
    await logInboundText(chatId, 'Confirmed booking', 'button')
    const next = await saveSession(chatId, { step: 'awaiting_full_name' })
    await persistBooking(next, 'customer_details_pending')
    await answerCallbackQuery(callback.id, locale === 'ru' ? 'Подтверждено' : 'Confirmed')
    await sendMessage(chatId, TEXT.fullName[locale])
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
    await answerCallbackQuery(callback.id, locale === 'ru' ? 'Изменить' : 'Make changes')
    await sendMessage(chatId, TEXT.restartDate[locale])
    return
  }

  if (data === 'view_other_vehicles') {
    await logInboundText(chatId, 'View other vehicles', 'button')
    await saveSession(chatId, {
      step: 'choosing_category',
      booking_id: null,
      requested_start_date: null,
      requested_days: null,
      requested_end_date: null,
      total_amount: null,
      selected_vehicle_id: null,
      selected_vehicle_model: null,
      selected_category: null,
      daily_rate: null,
      customer_full_name: null,
      customer_phone: null,
      id_file_id: null,
      license_file_id: null,
    })
    await answerCallbackQuery(callback.id, locale === 'ru' ? 'Другие автомобили' : 'Other vehicles')
    await sendCategoryPrompt(chatId, locale)
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

  const locale = t(session.locale)

  if (session.step === 'choosing_language' || !session.locale) {
    await sendWelcome(chatId)
    return
  }

  if (session.step === 'choosing_category') {
    await sendCategoryPrompt(chatId, locale)
    return
  }

  if (session.step === 'choosing_vehicle') {
    await sendMessage(chatId, TEXT.chooseVehicle[locale])
    return
  }

  if (session.step === 'awaiting_start_date') {
    const startDate = parseDate(text)
    if (!startDate) {
      await sendMessage(chatId, TEXT.badStartDate[locale])
      return
    }

    session = await saveSession(chatId, {
      step: 'awaiting_days',
      requested_start_date: startDate,
      telegram_name: formatTelegramName(message.from),
      telegram_username: message.from?.username ?? null,
    })
    await persistBooking(session, 'draft')
    await sendMessage(chatId, TEXT.askDays[locale](session.selected_vehicle_model || 'Vehicle', startDate))
    return
  }

  if (session.step === 'awaiting_days') {
    const days = parseRentalDays(text)
    if (!days) {
      await sendMessage(chatId, TEXT.badDays[locale])
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
      TEXT.confirmSummary[locale](session.selected_vehicle_model || 'Vehicle', session.daily_rate ?? 0, days, totalAmount, session.requested_start_date || '', endDate),
      [
        [{ text: locale === 'ru' ? 'Подтвердить' : 'Confirm', callback_data: 'confirm_booking' }],
        [{ text: locale === 'ru' ? 'Изменить' : 'Make changes', callback_data: 'change_booking' }],
        [{ text: locale === 'ru' ? 'Другие автомобили' : 'View other vehicles', callback_data: 'view_other_vehicles' }],
      ],
    )
    return
  }

  if (session.step === 'awaiting_full_name') {
    if (!text || text.length < 3 || !text.includes(' ')) {
      await sendMessage(chatId, TEXT.fullName[locale])
      return
    }

    session = await saveSession(chatId, {
      step: 'awaiting_phone',
      customer_full_name: text,
    })
    session = (await ensureCustomer(session)) ?? session
    await persistBooking(session, 'customer_details_pending')
    await sendMessage(chatId, TEXT.phone[locale])
    return
  }

  if (session.step === 'awaiting_phone') {
    if (!text || text.replace(/\D/g, '').length < 7) {
      await sendMessage(chatId, TEXT.phone[locale])
      return
    }

    session = await saveSession(chatId, {
      step: 'awaiting_id_image',
      customer_phone: text,
    })
    session = (await ensureCustomer(session)) ?? session
    await persistBooking(session, 'documents_pending')
    await sendMessage(chatId, TEXT.idPassport[locale])
    return
  }

  if (session.step === 'awaiting_id_image') {
    const fileId = extractFileId(message)
    if (!fileId) {
      await sendMessage(chatId, TEXT.idPassport[locale])
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
    await sendMessage(chatId, TEXT.license[locale])
    return
  }

  if (session.step === 'awaiting_license_image') {
    const fileId = extractFileId(message)
    if (!fileId) {
      await sendMessage(chatId, TEXT.license[locale])
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
    await persistBooking(session, 'pending')

    try {
      await notifyAdminNewBooking({
        bookingId: session.booking_id ?? '',
        chatId,
        customerName: session.customer_full_name ?? session.telegram_name ?? null,
        phone: session.customer_phone ?? null,
        username: session.telegram_username ?? null,
        vehicleName: session.selected_vehicle_model ?? null,
        vehicleCategory: session.selected_category ?? null,
        startDate: session.requested_start_date ?? null,
        endDate: session.requested_end_date ?? null,
        totalDays: session.requested_days ?? null,
        totalAmount: session.total_amount ?? null,
        idImageUrl: session.id_file_id ? buildAbsoluteTelegramProxyUrl(session.id_file_id) : null,
        licenseImageUrl: fileId ? buildAbsoluteTelegramProxyUrl(fileId) : null,
      })
    } catch (error) {
      console.error('notifyAdminNewBooking failed', error)
    }

    await sendMessage(chatId, TEXT.done[locale])
    return
  }

  session = await resetSession(chatId, message.from, session.locale)
  session = (await ensureCustomer(session)) ?? session
  await sendCategoryPrompt(chatId, t(session.locale))
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
