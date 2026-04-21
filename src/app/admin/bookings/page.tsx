export default function BookingsPage() {
  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-light text-neutral-900">Bookings Tracker</h1>
          <p className="mt-1 text-sm text-neutral-500">Days booked per customer/vehicle, status, and payment records</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-neutral-900 text-white text-sm hover:bg-neutral-800 transition-colors">
          + New booking
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {['Total bookings', 'New (unread)', 'Unpaid', 'Total value'].map(label => (
          <div key={label} className="bg-white rounded-2xl p-4 border border-black/[0.06]">
            <div className="text-[10px] tracking-[0.25em] uppercase text-neutral-400">{label}</div>
            <div className="mt-1.5 text-xl font-light tabular-nums text-neutral-400">—</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-black/[0.06] py-24 text-center">
        <div className="text-3xl mb-3">📅</div>
        <div className="text-neutral-500 text-sm">No bookings yet</div>
        <div className="text-neutral-400 text-xs mt-1">Bookings will appear here once added</div>
      </div>

      <div className="rounded-2xl bg-blue-50 border border-blue-100 px-5 py-4 text-sm text-blue-700">
        💡 <strong>Tip:</strong> Auto-send a payment reminder 48h before a booking date for all unpaid reservations. Reduces no-shows by ~30%.
      </div>
    </div>
  )
}
