# Cape Cars

Telegram customer booking bot + admin bot. Next.js 14 on Vercel.

## Stack
- Next.js 14 (App Router), TypeScript
- Supabase (auth + DB), `@supabase/ssr`
- Tailwind CSS
- Package manager: npm

## Dev
```bash
npm run dev    # port 3333
npm run build
npm run lint
```

## Key files
- `src/lib/telegram-bot.ts` — customer-facing bot
- `src/lib/telegram-admin-bot.ts` — admin bot
- `src/lib/fleet.ts` — vehicle/fleet logic
- `src/app/api/telegram/webhook/route.ts` — always return 200 to Telegram

## Env vars
`TELEGRAM_BOT_TOKEN`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
