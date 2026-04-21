export default function InvoicesPage() {
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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {['Total invoices', 'Outstanding', 'Overdue', 'VAT collected'].map(label => (
          <div key={label} className="bg-white rounded-2xl p-4 border border-black/[0.06]">
            <div className="text-[10px] tracking-[0.25em] uppercase text-neutral-400">{label}</div>
            <div className="mt-1.5 text-xl font-light tabular-nums text-neutral-400">—</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-black/[0.06] py-24 text-center">
        <div className="text-3xl mb-3">🧾</div>
        <div className="text-neutral-500 text-sm">No invoices yet</div>
        <div className="text-neutral-400 text-xs mt-1">Invoices will be generated automatically from bookings</div>
      </div>

      <div className="rounded-2xl bg-blue-50 border border-blue-100 px-5 py-4 text-sm text-blue-700">
        💡 <strong>Tip:</strong> Auto-generate an invoice the moment a booking is marked &apos;confirmed&apos; — reduces admin lag and gets payment requests out faster.
      </div>
    </div>
  )
}
