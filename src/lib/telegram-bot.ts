import { randomUUID } from 'crypto'
import { CATEGORY_ORDER, CATEGORY_PRICING, TELEGRAM_CATALOG, TELEGRAM_CATALOG_IMAGE_BY_MODEL, type VehicleCategory } from '@/lib/telegram-catalog'
import { buildTelegramProxyUrl, getVehicleById, getVehiclesForCustomerCategory, logTelegramConversation, type VehicleBlockedRange, upsertTelegramBooking, upsertTelegramCustomer } from '@/lib/telegram-admin'
import { notifyAdminNewBooking } from '@/lib/telegram-admin-bot'

type Locale = 'en' | 'ru'

export type SessionStep =
  | 'choosing_language'
  | 'choosing_category'
  | 'choosing_vehicle'
  | 'awaiting_start_date'
  | 'awaiting_end_date'
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
  blocked_ranges?: VehicleBlockedRange[]
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
  message?: { chat: { id: number | string }; message_id?: number }
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
  blockedRanges: VehicleBlockedRange[]
  isBlocked: boolean
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

const MONTH_NAMES: Record<Locale, string[]> = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  ru: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
}

const DAY_NAMES: Record<Locale, string[]> = {
  en: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
  ru: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
}

const TEXT = {
  welcome: {
    en: '⛰️ Welcome to Cape Cars Rentals. View our available vehicles below.',
    ru: '⛰️ Добро пожаловать в Cape Cars Rentals. Посмотрите доступные автомобили ниже.',
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
  calendarStart: {
    en: (model: string) => `📅 ${model}\n\nSelect your start date.\n✖ = already booked`,
    ru: (model: string) => `📅 ${model}\n\nВыберите дату начала аренды.\n✖ = уже забронировано`,
  },
  calendarEnd: {
    en: (startDate: string) => `📅 Start date: ${startDate}\n\nNow select your return date.\n✖ = already booked`,
    ru: (startDate: string) => `📅 Дата начала: ${startDate}\n\nВыберите дату возврата.\n✖ = уже забронировано`,
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
    en: (bookingCode: string) => `Perfect. Your booking request ${bookingCode} has been sent to Cape Cars and is now pending confirmation for 24 hours. We'll confirm it with you shortly.`,
    ru: (bookingCode: string) => `Отлично. Ваша заявка ${bookingCode} отправлена в Cape Cars и сейчас ожидает подтверждения в течение 24 часов. Мы скоро свяжемся с вами для подтверждения.`,
  },
  alreadyCompleted: {
    en: (bookingCode: string) => `Your booking request ${bookingCode} is already pending with Cape Cars. We'll confirm it with you shortly. Send /start only if you want to begin a new booking.`,
    ru: (bookingCode: string) => `Ваша заявка ${bookingCode} уже ожидает подтверждения в Cape Cars. Мы скоро свяжемся с вами. Отправьте /start, только если хотите начать новое бронирование.`,
  },
  vehicleNotFound: {
    en: 'Vehicle not found',
    ru: 'Автомобиль не найден',
  },
  noVehicles: {
    en: 'There are no vehicles in this category right now.',
    ru: 'Сейчас в этой категории нет автомобилей.',
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
    blocked_ranges: [],
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

function bookingCode(bookingId?: string | null) {
  return bookingId ? `CC-${bookingId.replace(/-/g, '').slice(0, 8).toUpperCase()}` : 'CC-PENDING'
}

async function getSession(chatId: string): Promise<BotSession> {
  return memorySessions.get(chatId) ?? defaultSession(chatId)
}

async function saveSession(chatId: string, patch: Partial<BotSession>): Promise<BotSession> {
  const next: BotSession = {
    ...(await getSession(chatId)),
    ...patch,
    chat_id: chatId,
    updated_at: new Date().toISOString(),
  }
  memorySessions.set(chatId, next)
  return next
}

async function resetSession(chatId: string, person?: { first_name?: string; last_name?: string; username?: string }, locale?: Locale | null): Promise<BotSession> {
  return saveSession(chatId, {
    ...defaultSession(chatId),
    locale: locale ?? null,
    step: locale ? 'choosing_category' : 'choosing_language',
    telegram_name: formatTelegramName(person),
    telegram_username: person?.username ?? null,
  })
}

async function ensureCustomer(session: BotSession): Promise<BotSession | null> {
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
  try {
    await telegramApi('sendMessage', {
      chat_id: chatId,
      text,
      reply_markup: buttons ? { inline_keyboard: buttons } : undefined,
    })
  } catch (error) {
    console.error('sendMessage failed', { chatId, error })
    return
  }
  await logTelegramConversation({
    chatId,
    customerId: session.customer_id ?? null,
    direction: 'outbound',
    messageType: 'text',
    body: text,
    meta: buttons ? { buttons } : null,
  })
}

async function editMessage(chatId: string, messageId: number, text: string, buttons?: TelegramInlineButton[][]) {
  try {
    await telegramApi('editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text,
      reply_markup: buttons ? { inline_keyboard: buttons } : undefined,
    })
  } catch (error) {
    console.error('editMessage failed', { chatId, messageId, error })
  }
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

async function resolveVehicleChoice(vehicleId: string, source: 'db' | 'static', categoryHint?: VehicleCategory | null): Promise<VehicleChoice | null> {
  if (source === 'db') {
    if (categoryHint) {
      const vehicles = await getVehiclesForCustomerCategory(categoryHint)
      const matched = vehicles.find((vehicle) => vehicle.id === vehicleId)
      if (matched) {
        return {
          id: matched.id,
          model: matched.model,
          category: matched.cat as VehicleCategory,
          rate: matched.rate,
          status: matched.status,
          imageUrl: TELEGRAM_CATALOG_IMAGE_BY_MODEL[matched.model] || matched.image_url || '',
          source: 'db',
          blockedRanges: matched.blockedRanges,
          isBlocked: matched.isBlocked,
        }
      }
    }

    const vehicle = await getVehicleById(vehicleId)
    if (!vehicle) return null
    return {
      id: vehicle.id,
      model: vehicle.model,
      category: vehicle.cat as VehicleCategory,
      rate: vehicle.rate,
      status: vehicle.status,
      imageUrl: TELEGRAM_CATALOG_IMAGE_BY_MODEL[vehicle.model] || vehicle.image_url || '',
      source: 'db',
      blockedRanges: [],
      isBlocked: vehicle.status === 'Booked',
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
    blockedRanges: [],
    isBlocked: vehicle.status === 'Booked',
  }
}

function datesOverlap(startA: string, endA: string, startB: string, endB: string) {
  return startA <= endB && endA >= startB
}

function formatVehicleCaption(vehicle: VehicleChoice, locale: Locale) {
  return [
    `🚘 ${vehicle.model}`,
    `${CATEGORY_LABELS[locale][vehicle.category]}`,
    locale === 'ru' ? `Ставка в день: ${formatCurrency(vehicle.rate)}` : `Daily rate: ${formatCurrency(vehicle.rate)}`,
  ].join('\n')
}

function toIsoDate(date: Date) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())).toISOString().slice(0, 10)
}

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function buildCalendarKeyboard(
  year: number,
  month: number,
  blockedRanges: VehicleBlockedRange[],
  mode: 'start' | 'end',
  locale: Locale,
  startDate?: string | null,
): TelegramInlineButton[][] {
  const today = toIsoDate(new Date())
  const monthStr = pad2(month + 1)
  const currentYM = today.slice(0, 7)
  const thisYM = `${year}-${monthStr}`

  const prevD = new Date(year, month - 1, 1)
  const nextD = new Date(year, month + 1, 1)
  const prevYM = `${prevD.getFullYear()}-${pad2(prevD.getMonth() + 1)}`
  const nextYM = `${nextD.getFullYear()}-${pad2(nextD.getMonth() + 1)}`
  const canPrev = prevYM >= currentYM

  const header: TelegramInlineButton[] = [
    { text: canPrev ? '‹' : ' ', callback_data: canPrev ? `cal:nav:${mode}:${prevYM}` : 'cal:noop' },
    { text: `${MONTH_NAMES[locale][month]} ${year}`, callback_data: 'cal:noop' },
    { text: '›', callback_data: `cal:nav:${mode}:${nextYM}` },
  ]

  const dayRow: TelegramInlineButton[] = DAY_NAMES[locale].map((d) => ({ text: d, callback_data: 'cal:noop' }))

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7

  const cells: Array<number | null> = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const rows: TelegramInlineButton[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    const row: TelegramInlineButton[] = []
    for (let j = 0; j < 7; j++) {
      const day = cells[i + j] ?? null
      if (day === null) {
        row.push({ text: ' ', callback_data: 'cal:noop' })
        continue
      }

      const dateStr = `${year}-${monthStr}-${pad2(day)}`
      const isPast = thisYM < currentYM || dateStr < today
      const isBlocked = blockedRanges.some((r) => dateStr >= r.startDate && dateStr <= r.endDate)
      const isBeforeOrOnStart = mode === 'end' && startDate != null && dateStr <= startDate
      const wouldOverlap = mode === 'end' && startDate != null
        && blockedRanges.some((r) => datesOverlap(startDate, dateStr, r.startDate, r.endDate))

      const disabled = isPast || isBlocked || isBeforeOrOnStart || wouldOverlap

      row.push({
        text: isBlocked ? '✖' : disabled ? '·' : String(day),
        callback_data: disabled ? 'cal:noop' : `cal:select:${dateStr}`,
      })
    }
    while (row.length < 7) row.push({ text: ' ', callback_data: 'cal:noop' })
    rows.push(row)
  }

  return [header, dayRow, ...rows]
}

async function sendWelcome(chatId: string) {
  await sendMessage(
    chatId,
    `${TEXT.welcome.en}\n\n\n${TEXT.welcome.ru}`,
    getLanguageButtons(),
  )
}

async function sendCategoryPrompt(chatId: string, locale: Locale) {
  await sendMessage(chatId, `${TEXT.chooseCategory[locale]}`, getCategoryButtons(locale))
}

async function sendCategoryCatalog(chatId: string, category: VehicleCategory, locale: Locale) {
  const liveVehicles = await getVehiclesForCustomerCategory(category)
  const vehicles: VehicleChoice[] = (liveVehicles && liveVehicles.length > 0)
    ? liveVehicles
      .filter((vehicle) => vehicle.image_url || TELEGRAM_CATALOG_IMAGE_BY_MODEL[vehicle.model])
      .map((vehicle) => ({
        id: vehicle.id,
        model: vehicle.model,
        category: vehicle.cat as VehicleCategory,
        rate: vehicle.rate,
        status: vehicle.status,
        imageUrl: TELEGRAM_CATALOG_IMAGE_BY_MODEL[vehicle.model] || vehicle.image_url || '',
        source: 'db' as const,
        blockedRanges: vehicle.blockedRanges,
        isBlocked: vehicle.isBlocked,
      }))
    : vehiclesForCategory(category)
      .map((vehicle) => ({
        id: vehicle.id,
        model: vehicle.model,
        category: vehicle.category,
        rate: vehicle.rate,
        status: vehicle.status,
        imageUrl: vehicle.imageUrl,
        source: 'static' as const,
        blockedRanges: [],
        isBlocked: vehicle.status === 'Booked',
      }))

  if (vehicles.length === 0) {
    await sendMessage(chatId, TEXT.noVehicles[locale], getCategoryButtons(locale))
    return
  }

  const introRate = liveVehicles && liveVehicles.length > 0 ? null : CATEGORY_PRICING[category]
  await sendMessage(chatId, TEXT.categoryIntro[locale](category, introRate))

  for (const vehicle of vehicles) {
    if (!vehicle.imageUrl) continue
    try {
      await sendPhoto(
        chatId,
        vehicle.imageUrl,
        formatVehicleCaption(vehicle, locale),
        [[{ text: TEXT.bookingVehicle[locale](vehicle.model), callback_data: `${vehicle.source === 'db' ? 'bookdb' : 'book'}:${vehicle.id}` }]],
      )
    } catch (error) {
      console.error('sendPhoto failed for vehicle', vehicle.id, error)
      await sendMessage(
        chatId,
        formatVehicleCaption(vehicle, locale),
        [[{ text: TEXT.bookingVehicle[locale](vehicle.model), callback_data: `${vehicle.source === 'db' ? 'bookdb' : 'book'}:${vehicle.id}` }]],
      )
    }
  }
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
    blocked_ranges: [],
  })

  await answerCallbackQuery(callback.id, CATEGORY_LABELS[locale][category])
  await sendCategoryCatalog(chatId, category, locale)
}

async function handleVehicleSelect(callback: CallbackQuery, vehicleId: string, source: 'db' | 'static') {
  const chatId = String(callback.message?.chat.id ?? '')
  if (!chatId) return

  const session = await getSession(chatId)
  const locale = t(session.locale)
  const vehicle = await resolveVehicleChoice(vehicleId, source, session.selected_category)
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
    blocked_ranges: vehicle.blockedRanges,
  })

  next = (await ensureCustomer(next)) ?? next
  await persistBooking(next, 'draft')

  await answerCallbackQuery(callback.id, TEXT.bookingVehicle[locale](vehicle.model))

  const now = new Date()
  const keyboard = buildCalendarKeyboard(now.getFullYear(), now.getMonth(), vehicle.blockedRanges, 'start', locale)
  await sendMessage(chatId, TEXT.calendarStart[locale](vehicle.model), keyboard)
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

  if (data === 'cal:noop') {
    await answerCallbackQuery(callback.id)
    return
  }

  if (data.startsWith('cal:select:')) {
    const selectedDate = data.slice('cal:select:'.length)
    const session = await getSession(chatId)
    const locale = t(session.locale)

    await answerCallbackQuery(callback.id)
    await logInboundText(chatId, `Selected date: ${selectedDate}`, 'button')

    if (session.step === 'awaiting_start_date') {
      const next = await saveSession(chatId, {
        step: 'awaiting_end_date',
        requested_start_date: selectedDate,
        requested_days: null,
        requested_end_date: null,
        total_amount: null,
      })
      await persistBooking(next, 'draft')

      const [yr, mo] = selectedDate.split('-').map(Number)
      const keyboard = buildCalendarKeyboard(yr, mo - 1, next.blocked_ranges ?? [], 'end', locale, selectedDate)
      await sendMessage(chatId, TEXT.calendarEnd[locale](selectedDate), keyboard)
      return
    }

    if (session.step === 'awaiting_end_date') {
      const startDate = session.requested_start_date!
      const msPerDay = 1000 * 60 * 60 * 24
      const days = Math.round((new Date(selectedDate).getTime() - new Date(startDate).getTime()) / msPerDay)
      const totalAmount = (session.daily_rate ?? 0) * days

      const next = await saveSession(chatId, {
        step: 'awaiting_confirmation',
        requested_end_date: selectedDate,
        requested_days: days,
        total_amount: totalAmount,
      })
      await persistBooking(next, 'quote_ready')

      await sendMessage(
        chatId,
        TEXT.confirmSummary[locale](
          session.selected_vehicle_model || 'Vehicle',
          session.daily_rate ?? 0,
          days,
          totalAmount,
          startDate,
          selectedDate,
        ),
        [
          [{ text: locale === 'ru' ? 'Подтвердить' : 'Confirm', callback_data: 'confirm_booking' }],
          [{ text: locale === 'ru' ? 'Изменить даты' : 'Change dates', callback_data: 'change_booking' }],
          [{ text: locale === 'ru' ? 'Другие автомобили' : 'View other vehicles', callback_data: 'view_other_vehicles' }],
        ],
      )
      return
    }

    return
  }

  if (data.startsWith('cal:nav:')) {
    const parts = data.split(':')
    const mode = parts[2] as 'start' | 'end'
    const [navYear, navMonth] = parts[3].split('-').map(Number)
    const messageId = callback.message?.message_id

    const session = await getSession(chatId)
    const locale = t(session.locale)

    await answerCallbackQuery(callback.id)

    const keyboard = buildCalendarKeyboard(
      navYear,
      navMonth - 1,
      session.blocked_ranges ?? [],
      mode,
      locale,
      mode === 'end' ? session.requested_start_date : null,
    )

    const text = mode === 'start'
      ? TEXT.calendarStart[locale](session.selected_vehicle_model ?? '')
      : TEXT.calendarEnd[locale](session.requested_start_date ?? '')

    if (messageId) {
      await editMessage(chatId, messageId, text, keyboard)
    } else {
      await sendMessage(chatId, text, keyboard)
    }
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
    const next = await saveSession(chatId, {
      step: 'awaiting_start_date',
      requested_start_date: null,
      requested_days: null,
      requested_end_date: null,
      total_amount: null,
    })
    await answerCallbackQuery(callback.id, locale === 'ru' ? 'Изменить' : 'Make changes')
    const now = new Date()
    const keyboard = buildCalendarKeyboard(now.getFullYear(), now.getMonth(), next.blocked_ranges ?? [], 'start', locale)
    await sendMessage(chatId, TEXT.calendarStart[locale](next.selected_vehicle_model ?? ''), keyboard)
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
      blocked_ranges: [],
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

  if (text === '/start' || text.toLowerCase() === 'start') {
    session = await resetSession(chatId, message.from)
    session = (await ensureCustomer(session)) ?? session
    await sendWelcome(chatId)
    return
  }

  if (session.step === 'completed') {
    await sendMessage(chatId, TEXT.alreadyCompleted[t(session.locale)](bookingCode(session.booking_id)))
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
    const now = new Date()
    const keyboard = buildCalendarKeyboard(now.getFullYear(), now.getMonth(), session.blocked_ranges ?? [], 'start', locale)
    await sendMessage(chatId, TEXT.calendarStart[locale](session.selected_vehicle_model ?? ''), keyboard)
    return
  }

  if (session.step === 'awaiting_end_date') {
    const startDate = session.requested_start_date!
    const [yr, mo] = startDate.split('-').map(Number)
    const keyboard = buildCalendarKeyboard(yr, mo - 1, session.blocked_ranges ?? [], 'end', locale, startDate)
    await sendMessage(chatId, TEXT.calendarEnd[locale](startDate), keyboard)
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
        idFileId: session.id_file_id ?? null,
        licenseFileId: fileId ?? null,
      })
    } catch (error) {
      console.error('notifyAdminNewBooking failed', error)
    }

    await sendMessage(chatId, TEXT.done[locale](bookingCode(session.booking_id)))
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
