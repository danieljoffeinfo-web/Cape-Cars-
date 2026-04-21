const INSIGHTS = [
  {
    type: 'warning',
    icon: '🚗',
    title: 'Idle vehicle detected',
    body: 'Mercedes-AMG GT Black has 0 bookings in the last 30 days and is currently in Service. Consider a maintenance review and re-list date.',
    action: 'View vehicle',
    href: '/admin/fleet',
  },
  {
    type: 'opportunity',
    icon: '📈',
    title: 'Peak demand: weekends',
    body: '78% of all bookings fall on Fri–Sun. Consider a weekday discount (Mon–Thu) to smooth utilisation and generate incremental revenue.',
    action: 'View bookings',
    href: '/admin/bookings',
  },
  {
    type: 'star',
    icon: '⭐',
    title: 'High-value customer',
    body: 'Anya Patel has booked 12 times with a lifetime value of R 1.62M. She hasn\'t received a loyalty offer yet — an ideal retention candidate.',
    action: 'View customer',
    href: '/admin/crm',
  },
  {
    type: 'warning',
    icon: '⚠️',
    title: 'Churn risk: Marc Pietersen',
    body: 'No booking in 44 days. Last booking was unpaid for 9 days. Consider a personal call or a priority access offer to re-engage.',
    action: 'View customer',
    href: '/admin/crm',
  },
  {
    type: 'opportunity',
    icon: '💰',
    title: 'Upsell opportunity: Photography add-on',
    body: 'Only 2 of 31 recent bookings included a photography add-on (R 9,500 each). Proactively offer it at checkout to boost revenue ~6%.',
    action: 'View invoices',
    href: '/admin/invoices',
  },
  {
    type: 'info',
    icon: '🔧',
    title: 'Service due: Porsche 911 GT3',
    body: 'Estimated mileage puts the 911 GT3 ~200km from its next scheduled tyre rotation. Plan a 1-day service window to avoid disrupting bookings.',
    action: 'View fleet',
    href: '/admin/fleet',
  },
]

const typeStyle: Record<string, { card: string; dot: string }> = {
  warning:     { card: 'border-amber-200 bg-amber-50',   dot: 'bg-amber-400' },
  opportunity: { card: 'border-emerald-200 bg-emerald-50', dot: 'bg-emerald-500' },
  star:        { card: 'border-blue-200 bg-blue-50',     dot: 'bg-blue-500' },
  info:        { card: 'border-neutral-200 bg-neutral-50', dot: 'bg-neutral-400' },
}

const DEMAND = [
  { day: 'Mon', pct: 22 },
  { day: 'Tue', pct: 18 },
  { day: 'Wed', pct: 24 },
  { day: 'Thu', pct: 30 },
  { day: 'Fri', pct: 74 },
  { day: 'Sat', pct: 92 },
  { day: 'Sun', pct: 68 },
]

export default function InsightsPage() {
  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-light text-neutral-900">Key Insights</h1>
        <p className="mt-1 text-sm text-neutral-500">Idle vehicles, peak demand, high-value customers & churn risk</p>
      </div>

      {/* Demand heatmap */}
      <div className="bg-white rounded-2xl p-6 border border-black/[0.06]">
        <div className="text-[11px] tracking-[0.3em] uppercase text-neutral-400 mb-5">Demand by day of week</div>
        <div className="flex items-end gap-2 h-24">
          {DEMAND.map(d => (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5">
              <div
                className="w-full rounded-t-md transition-all"
                style={{
                  height: `${d.pct}%`,
                  minHeight: 4,
                  background: d.pct > 70
                    ? '#0e0e10'
                    : d.pct > 40
                    ? 'rgba(14,14,16,0.4)'
                    : 'rgba(14,14,16,0.12)',
                }}
              />
              <div className="text-[10px] uppercase tracking-wide text-neutral-400">{d.day}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-4 text-xs text-neutral-500">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#0e0e10]"/>High demand</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-neutral-300"/>Low demand</span>
        </div>
      </div>

      {/* Insight cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {INSIGHTS.map((ins, i) => {
          const style = typeStyle[ins.type]
          return (
            <div key={i} className={`rounded-2xl p-5 border ${style.card} flex flex-col gap-3`}>
              <div className="flex items-start gap-3">
                <span className="text-xl shrink-0 mt-0.5">{ins.icon}</span>
                <div>
                  <div className="font-medium text-neutral-900 text-sm">{ins.title}</div>
                  <p className="mt-1 text-sm text-neutral-600 leading-relaxed">{ins.body}</p>
                </div>
              </div>
              <a href={ins.href} className="self-start text-xs font-medium text-neutral-700 hover:text-neutral-900 border border-neutral-300 px-3 py-1.5 rounded-full hover:bg-white transition-colors">
                {ins.action} →
              </a>
            </div>
          )
        })}
      </div>

      <div className="rounded-2xl bg-blue-50 border border-blue-100 px-5 py-4 text-sm text-blue-700">
        💡 <strong>Tip:</strong> Check Insights every Monday morning — it surfaces the week&apos;s biggest opportunities before they become problems.
      </div>
    </div>
  )
}
