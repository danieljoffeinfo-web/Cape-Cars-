const INVOICES = [
  { id: 'INV-024', customer: 'Anya Patel',     car: 'Ferrari 296 GTB',   days: 2, subtotal: 108000, vat: 15132, total: 124132, due: '28 Apr 2026', status: 'unpaid'   },
  { id: 'INV-023', customer: 'Lena Müller',    car: 'Porsche 911 GT3',   days: 1, subtotal: 12000,  vat: 1680,  total: 13680,  due: '25 Apr 2026', status: 'unpaid'   },
  { id: 'INV-022', customer: 'James Venter',   car: 'McLaren 720S',      days: 1, subtotal: 49000,  vat: 6860,  total: 55860,  due: '22 Apr 2026', status: 'paid'     },
  { id: 'INV-021', customer: 'Kate Rousseau',  car: 'Aston Martin DB12', days: 3, subtotal: 90000,  vat: 12600, total: 102600, due: '20 Apr 2026', status: 'paid'     },
  { id: 'INV-020', customer: 'Marc Pietersen', car: 'Porsche Cayman GT4 RS', days: 1, subtotal: 12000, vat: 1680, total: 13680, due: '18 Apr 2026', status: 'overdue' },
]

const statusColor: Record<string, string> = {
  paid:    'bg-emerald-100 text-emerald-700',
  unpaid:  'bg-amber-100 text-amber-700',
  overdue: 'bg-red-100 text-red-600',
}

export default function InvoicesPage() {
  const outstanding = INVOICES.filter(i => i.status !== 'paid').reduce((s, i) => s + i.total, 0)

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-light text-neutral-900">Invoice Generator</h1>
          <p className="mt-1 text-sm text-neutral-500">Auto-generated from bookings · line items · VAT · PDF export</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-neutral-900 text-white text-sm hover:bg-neutral-800 transition-colors">
          + New invoice
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total invoices', value: String(INVOICES.length) },
          { label: 'Outstanding',   value: `R ${(outstanding/1000).toFixed(0)}k` },
          { label: 'Overdue',       value: String(INVOICES.filter(i => i.status === 'overdue').length) },
          { label: 'VAT collected', value: `R ${INVOICES.filter(i=>i.status==='paid').reduce((s,i)=>s+i.vat,0).toLocaleString()}` },
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
                <th className="text-left px-5 py-3 font-normal">Invoice</th>
                <th className="text-left px-5 py-3 font-normal">Customer</th>
                <th className="text-left px-5 py-3 font-normal hidden md:table-cell">Vehicle</th>
                <th className="text-right px-5 py-3 font-normal hidden sm:table-cell">Subtotal</th>
                <th className="text-right px-5 py-3 font-normal hidden lg:table-cell">VAT (14%)</th>
                <th className="text-right px-5 py-3 font-normal">Total</th>
                <th className="text-left px-5 py-3 font-normal">Status</th>
                <th className="text-right px-5 py-3 font-normal">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04]">
              {INVOICES.map((inv) => (
                <tr key={inv.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-5 py-4 text-neutral-400 text-xs tabular-nums">
                    <div>{inv.id}</div>
                    <div className="text-neutral-300 mt-0.5">Due {inv.due}</div>
                  </td>
                  <td className="px-5 py-4 font-medium text-neutral-900">{inv.customer}</td>
                  <td className="px-5 py-4 text-neutral-500 hidden md:table-cell">{inv.car} · {inv.days}d</td>
                  <td className="px-5 py-4 text-right tabular-nums text-neutral-600 hidden sm:table-cell">R {inv.subtotal.toLocaleString()}</td>
                  <td className="px-5 py-4 text-right tabular-nums text-neutral-500 hidden lg:table-cell">R {inv.vat.toLocaleString()}</td>
                  <td className="px-5 py-4 text-right tabular-nums text-neutral-900 font-medium">R {inv.total.toLocaleString()}</td>
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] tracking-[0.15em] uppercase font-medium ${statusColor[inv.status]}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button className="text-xs text-neutral-400 hover:text-neutral-900 transition-colors mr-3">PDF</button>
                    <button className="text-xs text-neutral-400 hover:text-neutral-900 transition-colors">Send</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl bg-blue-50 border border-blue-100 px-5 py-4 text-sm text-blue-700">
        💡 <strong>Tip:</strong> Auto-generate an invoice the moment a booking is marked &apos;confirmed&apos; — reduces admin lag and gets payment requests out faster.
      </div>
    </div>
  )
}
