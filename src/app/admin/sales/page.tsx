export default function SalesPage() {
  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-light text-neutral-900">Sales Performance</h1>
        <p className="mt-1 text-sm text-neutral-500">Revenue per vehicle, fleet utilisation & booking trends</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {['Total Revenue', 'Avg Utilisation', 'Best performer', 'Idle vehicle'].map(label => (
          <div key={label} className="bg-white rounded-2xl p-4 border border-black/[0.06]">
            <div className="text-[10px] tracking-[0.25em] uppercase text-neutral-400">{label}</div>
            <div className="mt-1.5 text-xl font-light tabular-nums text-neutral-400">—</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-black/[0.06] py-24 text-center">
        <div className="text-3xl mb-3">📈</div>
        <div className="text-neutral-500 text-sm">No sales data yet</div>
        <div className="text-neutral-400 text-xs mt-1">Revenue charts will populate once bookings are recorded</div>
      </div>

      <div className="rounded-2xl bg-blue-50 border border-blue-100 px-5 py-4 text-sm text-blue-700">
        💡 <strong>Tip:</strong> Vehicles under 30% utilisation cost you money in depreciation, insurance & servicing. Consider seasonal promotions or rate drops to fill their calendars.
      </div>
    </div>
  )
}
