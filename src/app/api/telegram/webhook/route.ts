import { NextRequest, NextResponse } from 'next/server'
import { processTelegramUpdate } from '@/lib/telegram-bot'

export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'telegram-webhook',
    tokenConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN),
  })
}

export async function POST(request: NextRequest) {
  try {
    const update = await request.json()
    await processTelegramUpdate(update)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('telegram webhook error', error)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
