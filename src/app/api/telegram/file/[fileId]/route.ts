import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN

export async function GET(_: NextRequest, { params }: { params: { fileId: string } }) {
  try {
    if (!TELEGRAM_TOKEN) {
      return NextResponse.json({ ok: false, error: 'Missing token' }, { status: 500 })
    }

    const fileId = decodeURIComponent(params.fileId)
    const metaRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getFile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_id: fileId }),
      cache: 'no-store',
    })

    const meta = await metaRes.json()
    const filePath = meta?.result?.file_path
    if (!metaRes.ok || !filePath) {
      return NextResponse.json({ ok: false, error: 'File not found' }, { status: 404 })
    }

    const fileRes = await fetch(`https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${filePath}`, {
      cache: 'no-store',
    })

    if (!fileRes.ok) {
      return NextResponse.json({ ok: false, error: 'Unable to fetch file' }, { status: 502 })
    }

    const contentType = fileRes.headers.get('content-type') || 'application/octet-stream'
    const buffer = await fileRes.arrayBuffer()

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=300',
      },
    })
  } catch (error) {
    console.error('telegram file proxy error', error)
    return NextResponse.json({ ok: false, error: 'Proxy failed' }, { status: 500 })
  }
}
