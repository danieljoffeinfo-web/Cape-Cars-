const BY_VEHICLE = [
  { model: 'Ferrari 296 GTB',         bookings: 9,  days: 14, revenue: 756000,  util: 85 },
  { model: 'Porsche 911 GT3',         bookings: 14, days: 22, revenue: 836000,  util: 80 },
  { model: 'McLaren 720S',            bookings: 7,  days: 10, revenue: 490000,  util: 64 },
  { model: 'Aston Martin DB12',       bookings: 11, days: 18, revenue: 540000,  util: 60 },
  { model: 'Lamborghini Huracán STO', bookings: 5,  days: 8,  revenue: 368000,  util: 55 },
  { model: 'Porsche Taycan Turbo S',  bookings: 8,  days: 12, revenue: 264000,  util: 52 },
  { model: 'Porsche Cayman GT4 RS',   bookings: 6,  days: 9,  revenue: 243000,  util: 48 },
  { model: 'Audi R8 V10',             bookings: 5,  days: 8,  revenue: 208000,  util: 40 },
  { model: 'BMW M4 CSL',              bookings: 4,  days: 6,  revenue: 84000,   util: 32 },
  { model: 'Lotus Emira V6',          bookings: 3,  days: 4,  revenue: 52000,   util: 22 },
  { model: 'Mercedes-AMG GT Black',   bookings: 0,  days: 0,  revenue: 0,       util: 0  },
]

const MONTHLY = [
  { month: 'Nov', rev: 280 },
  { month: 'Dec', rev: 410 },
  { month: 'Jan', rev: 350 },
  { month: 'Feb', rev: 390 },
  { month: 'Mar', rev: 460 },
  { month: 'Apr', rev: 412 },
]

const maxRev = Math.max(...MONTHLY.map(m => m.rev))

export default function SalesPage() {
  const totalRev = BY_VEHICLE.reduce((s, v) => s + v.revenue, 0)
  const avgUtil  = Math.round(BY_VEHICLE.reduce((s, v) => s + v.util, 0) / BY_VEHICLE.length)

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-light text-neutral-900">Sales Performance</h1>
        <p className="mt-1 text-sm text-neutral-500">Revenue per vehicle, fleet utilisation & booking trends</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Revenue',    value: `R ${(totalRev/1000000).toFixed(2)}M` },
          { label: 'Avg Utilisation',  value: `${avgUtil}%` },
          { label: 'Best performer',   value: '911 GT3' },
          { label: 'Idle vehicle',     value: 'AMG GT' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border border-black/[0.06]">
            <div className="text-[10px] tracking-[0.25em] uppercase text-neutral-400">{s.label}</div>
            <div className="mt-1.5 text-xl font-light tabular-nums text-neutral-900">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Revenue bar chart */}
      <div className="bg-white rounded-2xl p-6 border border-black/[0.06]">
        <div className="text-[11px] tracking-[0.3em] uppercase text-neutral-400 mb-5">Monthly Revenue (R&apos;000)</div>
        <div className="flex items-end gap-3 h-32">
          {MONTHLY.map(m => (
            <div key={m.month} className="flex-1 flex flex-col items-center gap-2">
              <div className="text-xs tabular-nums text-neutral-500">{m.rev}</div>
              <div
                className="w-full rounded-t-lg bg-neutral-900 transition-all"
                style={{ height: `${(m.rev / maxRev) * 100}%`, minHeight: 4 }}
              />
              <div className="text-[10px] uppercase tracking-wide text-neutral-400">{m.month}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Per-vehicle table */}
      <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
        <div className="px-5 py-4 border-b border-black/[0.06]">
          <div className="text-[11px] tracking-[0.3em] uppercase text-neutral-400">Revenue by vehicle</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/[0.06] text-[10px] tracking-[0.2em] uppercase text-neutral-400">
                <th className="text-left px-5 py-3 font-normal">Model</th>
                <th className="text-right px-5 py-3 font-normal">Bookings</th>
                <th className="text-right px-5 py-3 font-normal hidden sm:table-cell">Days booked</th>
                <th className="text-right px-5 py-3 font-normal">Revenue</th>
                <th className="text-left px-5 py-3 font-normal w-32 hidden md:table-cell">Utilisation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04]">
              {BY_VEHICLE.sort((a,b) => b.revenue - a.revenue).map((v, i) => (
                <tr key={i} className={`hover:bg-neutral-50 transition-colors ${v.util === 0 ? 'opacity-40' : ''}`}>
                  <td className="px-5 py-3.5 font-medium text-neutral-900">{v.model}</td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-neutral-600">{v.bookings}</td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-neutral-600 hidden sm:table-cell">{v.days}</td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-neutral-900">R {v.revenue.toLocaleString()}</td>
                  <td className="px-5 py-3.5 hidden md:table-cell">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${v.util > 60 ? 'bg-emerald-500' : v.util > 30 ? 'bg-amber-400' : 'bg-red-400'}`}
                          style={{ width: `${v.util}%` }}
                        />
                      </div>
                      <span className="text-xs tabular-nums text-neutral-500 w-8 text-right">{v.util}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl bg-blue-50 border border-blue-100 px-5 py-4 text-sm text-blue-700">
        💡 <strong>Tip:</strong> Vehicles under 30% utilisation cost you money in depreciation, insurance & servicing. Consider seasonal promotions or rate drops to fill their calendars.
      </div>
    </div>
  )
}
