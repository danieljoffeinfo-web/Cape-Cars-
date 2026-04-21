const BOOKINGS = [
  { id: 'BK-001', customer: 'Anya Patel',     car: 'Ferrari 296 GTB',       type: 'Concierge', date: '21 Apr 2026', days: 2, amount: 'R 108,000', paid: true,  status: 'confirmed' },
  { id: 'BK-002', customer: 'Lena Müller',    car: 'Porsche 911 GT3',       type: 'Afternoon', date: '21 Apr 2026', days: 1, amount: 'R 12,000',  paid: false, status: 'new'       },
  { id: 'BK-003', customer: 'James Venter',   car: 'McLaren 720S',          type: 'Members',   date: '19 Apr 2026', days: 1, amount: 'R 49,000',  paid: true,  status: 'completed' },
  { id: 'BK-004', customer: 'Sipho Dlamini',  car: 'BMW M4 CSL',            type: 'Afternoon', date: '23 Apr 2026', days: 1, amount: 'R 12,000',  paid: false, status: 'new'       },
  { id: 'BK-005', customer: 'Kate Rousseau',  car: 'Aston Martin DB12',     type: 'Members',   date: '18 Apr 2026', days: 3, amount: 'R 90,000',  paid: true,  status: 'completed' },
  { id: 'BK-006', customer: 'Marc Pietersen', car: 'Porsche Cayman GT4 RS', type: 'Afternoon', date: '25 Apr 2026', days: 1, amount: 'R 12,000',  paid: false, status: 'confirmed' },
]

const statusColor: Record<string, string> = {
  new:       'bg-amber-100 text-amber-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-neutral-100 text-neutral-500',
  declined:  'bg-red-100 text-red-600',
}

export default function BookingsPage() {
  const total   = BOOKINGS.reduce((s, b) => s + parseInt(b.amount.replace(/[^0-9]/g, '')), 0)
  const unpaid  = BOOKINGS.filter(b => !b.paid).length
  const newBk   = BOOKINGS.filter(b => b.status === 'new').length

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

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total bookings', value: String(BOOKINGS.length) },
          { label: 'New (unread)',   value: String(newBk) },
          { label: 'Unpaid',        value: String(unpaid) },
          { label: 'Total value',   value: `R ${(total/1000).toFixed(0)}k` },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border border-black/[0.06]">
            <div className="text-[10px] tracking-[0.25em] uppercase text-neutral-400">{s.label}</div>
            <div className="mt-1.5 text-xl font-light tabular-nums text-neutral-900">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/[0.06] text-[10px] tracking-[0.2em] uppercase text-neutral-400">
                <th className="text-left px-5 py-3 font-normal">ID</th>
                <th className="text-left px-5 py-3 font-normal">Customer</th>
                <th className="text-left px-5 py-3 font-normal hidden md:table-cell">Vehicle</th>
                <th className="text-left px-5 py-3 font-normal hidden lg:table-cell">Date</th>
                <th className="text-left px-5 py-3 font-normal hidden sm:table-cell">Type</th>
                <th className="text-left px-5 py-3 font-normal">Payment</th>
                <th className="text-left px-5 py-3 font-normal">Status</th>
                <th className="text-right px-5 py-3 font-normal">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04]">
              {BOOKINGS.map((b) => (
                <tr key={b.id} className="hover:bg-neutral-50 transition-colors cursor-pointer">
                  <td className="px-5 py-4 text-neutral-400 text-xs tabular-nums">{b.id}</td>
                  <td className="px-5 py-4 font-medium text-neutral-900">{b.customer}</td>
                  <td className="px-5 py-4 text-neutral-600 hidden md:table-cell">{b.car}</td>
                  <td className="px-5 py-4 text-neutral-500 hidden lg:table-cell">{b.date}</td>
                  <td className="px-5 py-4 text-neutral-500 hidden sm:table-cell">{b.type}</td>
                  <td className="px-5 py-4">
                    <span className={`text-xs font-medium ${b.paid ? 'text-emerald-600' : 'text-red-500'}`}>
                      {b.paid ? '✓ Paid' : '⚠ Unpaid'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] tracking-[0.15em] uppercase font-medium ${statusColor[b.status]}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right tabular-nums text-neutral-900 font-medium">{b.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl bg-blue-50 border border-blue-100 px-5 py-4 text-sm text-blue-700">
        💡 <strong>Tip:</strong> Auto-send a payment reminder 48h before a booking date for all unpaid reservations. Reduces no-shows by ~30%.
      </div>
    </div>
  )
}
