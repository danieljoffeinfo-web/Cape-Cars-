const CUSTOMERS = [
  { name: 'James Venter',   email: 'james@venter.co.za',    phone: '+27 82 441 0012', bookings: 8,  ltv: 'R 980,000',  tier: 'VIP',    last: '15 Apr 2026', risk: 'low' },
  { name: 'Lena Müller',    email: 'lena.m@gmail.com',      phone: '+27 71 233 4456', bookings: 3,  ltv: 'R 162,000',  tier: 'Regular',last: '20 Apr 2026', risk: 'low' },
  { name: 'Sipho Dlamini',  email: 'sipho@gmail.com',       phone: '+27 83 009 1122', bookings: 1,  ltv: 'R 12,000',   tier: 'New',    last: '19 Apr 2026', risk: 'medium' },
  { name: 'Kate Rousseau',  email: 'kate.r@outlook.com',    phone: '+27 79 887 5543', bookings: 5,  ltv: 'R 725,000',  tier: 'VIP',    last: '12 Apr 2026', risk: 'low' },
  { name: 'Marc Pietersen', email: 'marc@pietersen.biz',    phone: '+27 84 333 9900', bookings: 2,  ltv: 'R 85,000',   tier: 'Regular',last: '8 Mar 2026',  risk: 'high' },
  { name: 'Anya Patel',     email: 'anya.patel@icloud.com', phone: '+27 72 654 3210', bookings: 12, ltv: 'R 1,620,000',tier: 'VIP',    last: '21 Apr 2026', risk: 'low' },
]

const tierColor: Record<string, string> = {
  VIP:     'bg-neutral-900 text-white',
  Regular: 'bg-neutral-100 text-neutral-700',
  New:     'bg-blue-50 text-blue-700',
}
const riskColor: Record<string, string> = {
  low:    'text-emerald-600',
  medium: 'text-amber-600',
  high:   'text-red-500',
}

export default function CRMPage() {
  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-light text-neutral-900">Customer CRM</h1>
          <p className="mt-1 text-sm text-neutral-500">Profiles, booking history, payment methods & account notes</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-neutral-900 text-white text-sm hover:bg-neutral-800 transition-colors">
          + Add customer
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total customers', value: '6' },
          { label: 'VIP',             value: '3' },
          { label: 'Churn risk',      value: '1' },
          { label: 'Total LTV',       value: 'R 3.58M' },
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
                <th className="text-left px-5 py-3 font-normal">Customer</th>
                <th className="text-left px-5 py-3 font-normal hidden md:table-cell">Contact</th>
                <th className="text-left px-5 py-3 font-normal">Bookings</th>
                <th className="text-left px-5 py-3 font-normal hidden sm:table-cell">LTV</th>
                <th className="text-left px-5 py-3 font-normal">Tier</th>
                <th className="text-left px-5 py-3 font-normal hidden lg:table-cell">Last booking</th>
                <th className="text-left px-5 py-3 font-normal">Churn risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04]">
              {CUSTOMERS.map((c, i) => (
                <tr key={i} className="hover:bg-neutral-50 transition-colors cursor-pointer">
                  <td className="px-5 py-4">
                    <div className="font-medium text-neutral-900">{c.name}</div>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <div className="text-neutral-600 text-xs">{c.email}</div>
                    <div className="text-neutral-400 text-xs mt-0.5">{c.phone}</div>
                  </td>
                  <td className="px-5 py-4 tabular-nums text-neutral-700">{c.bookings}</td>
                  <td className="px-5 py-4 tabular-nums text-neutral-900 hidden sm:table-cell">{c.ltv}</td>
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] tracking-[0.15em] uppercase font-medium ${tierColor[c.tier]}`}>
                      {c.tier}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-neutral-500 hidden lg:table-cell">{c.last}</td>
                  <td className="px-5 py-4">
                    <span className={`text-xs font-medium capitalize ${riskColor[c.risk]}`}>● {c.risk}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl bg-blue-50 border border-blue-100 px-5 py-4 text-sm text-blue-700">
        💡 <strong>Tip:</strong> High-churn-risk customers haven&apos;t booked in 45+ days. Consider a personal outreach or a loyalty offer before they go cold.
      </div>
    </div>
  )
}
