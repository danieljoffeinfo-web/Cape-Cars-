import Link from 'next/link'

const STATS = [
  { label: 'Revenue MTD',       value: 'R 412,000', delta: '+18%',  up: true  },
  { label: 'Active Bookings',   value: '7',          delta: '3 today', up: true  },
  { label: 'Fleet Utilisation', value: '64%',        delta: '7/11 available', up: true },
  { label: 'Outstanding Inv.',  value: 'R 86,500',   delta: '4 unpaid', up: false },
]

const QUICK = [
  { href: '/admin/fleet',    label: 'Fleet Catalogue',   desc: 'Vehicles, specs, status & pricing',        icon: '🏎' },
  { href: '/admin/crm',      label: 'Customer CRM',      desc: 'Profiles, history & payment methods',      icon: '👤' },
  { href: '/admin/bookings', label: 'Bookings Tracker',  desc: 'Days booked, status & payment records',    icon: '📅' },
  { href: '/admin/invoices', label: 'Invoice Generator', desc: 'Auto-generate, line items, PDF export',    icon: '🧾' },
  { href: '/admin/sales',    label: 'Sales Performance', desc: 'Revenue per vehicle, utilisation & trends', icon: '📈' },
  { href: '/admin/insights', label: 'Key Insights',      desc: 'Idle vehicles, peak demand, churn risk',   icon: '💡' },
]

const RECENT = [
  { name: 'James Venter',   car: 'Porsche 911 GT3',    type: 'Members',    status: 'confirmed', amount: 'R 135,000' },
  { name: 'Lena Müller',    car: 'Ferrari 296 GTB',    type: 'Concierge',  status: 'new',       amount: 'R 54,000'  },
  { name: 'Sipho Dlamini',  car: 'McLaren 720S',       type: 'Afternoon',  status: 'confirmed', amount: 'R 12,000'  },
  { name: 'Kate Rousseau',  car: 'Aston Martin DB12',  type: 'Members',    status: 'completed', amount: 'R 135,000' },
  { name: 'Marc Pietersen', car: 'BMW M4 CSL',         type: 'Afternoon',  status: 'new',       amount: 'R 12,000'  },
]

const statusColor: Record<string, string> = {
  new:       'bg-amber-100 text-amber-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-neutral-100 text-neutral-500',
  declined:  'bg-red-100 text-red-600',
}

export default function AdminDashboard() {
  return (
    <div className="space-y-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-light text-neutral-900 tracking-tight">Good morning, Admin.</h1>
          <p className="mt-1 text-sm text-neutral-500">Here&apos;s what&apos;s happening at Cape Cars today.</p>
        </div>
        <Link
          href="/"
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-black/[0.1] text-sm text-neutral-600 hover:text-neutral-900 hover:border-black/20 hover:bg-white transition-all"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Back to site
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 border border-black/[0.06]">
            <div className="text-[10px] tracking-[0.25em] uppercase text-neutral-400">{s.label}</div>
            <div className="mt-2 text-2xl font-light tabular-nums text-neutral-900">{s.value}</div>
            <div className={`mt-1.5 text-xs ${s.up ? 'text-emerald-600' : 'text-red-500'}`}>{s.delta}</div>
          </div>
        ))}
      </div>

      {/* Modules grid */}
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

      {/* Recent bookings */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="text-[11px] tracking-[0.3em] uppercase text-neutral-400">Recent Bookings</div>
          <Link href="/admin/bookings" className="text-xs text-neutral-500 hover:text-neutral-900">View all →</Link>
        </div>
        <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/[0.06] text-[10px] tracking-[0.2em] uppercase text-neutral-400">
                  <th className="text-left px-5 py-3 font-normal">Customer</th>
                  <th className="text-left px-5 py-3 font-normal">Vehicle</th>
                  <th className="text-left px-5 py-3 font-normal hidden md:table-cell">Type</th>
                  <th className="text-left px-5 py-3 font-normal">Status</th>
                  <th className="text-right px-5 py-3 font-normal">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04]">
                {RECENT.map((r, i) => (
                  <tr key={i} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-5 py-3.5 text-neutral-900 font-medium">{r.name}</td>
                    <td className="px-5 py-3.5 text-neutral-600">{r.car}</td>
                    <td className="px-5 py-3.5 text-neutral-500 hidden md:table-cell">{r.type}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] tracking-[0.15em] uppercase font-medium ${statusColor[r.status]}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-neutral-900">{r.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
