'use client'

import Link from 'next/link'

export default function AdminButton() {
  return (
    <Link
      href="/admin"
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-[#0e0e10]/90 backdrop-blur-md text-white/60 hover:text-white text-[11px] tracking-[0.2em] uppercase border border-white/[0.08] hover:border-white/20 transition-all shadow-lg"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
      Admin
    </Link>
  )
}
