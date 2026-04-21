import Link from 'next/link'

const STATS = [
  { label: 'Revenue MTD',       value: '—', delta: 'No data yet',        up: true  },
  { label: 'Active Bookings',   value: '—', delta: 'No bookings yet',    up: true  },
  { label: 'Fleet Utilisation', value: '—', delta: 'Add vehicles first', up: true  },
  { label: 'Outstanding Inv.',  value: '—', delta: 'No invoices yet',    up: false },
]

const QUICK = [
  { href: '/admin/fleet',    label: 'Fleet Catalogue',   desc: 'Vehicles, specs, status & pricing',        icon: '🏎' },
  { href: '/admin/crm',      label: 'Customer CRM',      desc: 'Profiles, history & payment methods',      icon: '👤' },
  { href: '/admin/bookings', label: 'Bookings Tracker',  desc: 'Days booked, status & payment records',    icon: '📅' },
  { href: '/admin/invoices', label: 'Invoice Generator', desc: 'Auto-generate, line items, PDF export',    icon: '🧾' },
  { href: '/admin/sales',    label: 'Sales Performance', desc: 'Revenue per vehicle, utilisation & trends', icon: '📈' },
  { href: '/admin/insights', label: 'Key Insights',      desc: 'Idle vehicles, peak demand, churn risk',   icon: '💡' },
]

export default function AdminDashboard() {
  return (
    <div className="space-y-8 max-w-7xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-light text-neutral-900 tracking-tight">Welcome, Admin.</h1>
          <p className="mt-1 text-sm text-neutral-500">Start by adding your fleet vehicles below.</p>
        </div>
        <Link
          href="/"
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-black/[0.1] text-sm text-neutral-600 hover:text-neutral-900 hover:border-black/20 hover:bg-white transition-all"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Back to site
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 border border-black/[0.06]">
            <div className="text-[10px] tracking-[0.25em] uppercase text-neutral-400">{s.label}</div>
            <div className="mt-2 text-2xl font-light tabular-nums text-neutral-400">{s.value}</div>
            <div className="mt-1.5 text-xs text-neutral-400">{s.delta}</div>
          </div>
        ))}
      </div>

      <div>
        <div className="text-[11px] tracking-[0.3em] uppercase text-neutral-400 mb-4">Modules</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {QUICK.map(m => (
            <Link
              key={m.href}
              href={m.href}
              className="bg-white rounded-2xl p-5 border border-black/[0.06] hover:border-black/20 hover:shadow-sm transition-all group flex items-start gap-4"
            >
              <span className="text-2xl">{m.icon}</span>
              <div>
                <div className="text-sm font-medium text-neutral-900 group-hover:text-neutral-700">{m.label}</div>
                <div className="mt-0.5 text-xs text-neutral-500 leading-relaxed">{m.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-neutral-900 px-6 py-5 text-sm text-white/70">
        🚀 <strong className="text-white">Getting started:</strong> Head to <Link href="/admin/fleet" className="text-white underline underline-offset-2">Fleet Catalogue</Link> to add your first vehicle with photos and descriptions.
      </div>
    </div>
  )
}
