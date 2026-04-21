export default function InsightsPage() {
  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-light text-neutral-900">Key Insights</h1>
        <p className="mt-1 text-sm text-neutral-500">Idle vehicles, peak demand, high-value customers & churn risk</p>
      </div>

      <div className="bg-white rounded-2xl border border-black/[0.06] py-24 text-center">
        <div className="text-3xl mb-3">💡</div>
        <div className="text-neutral-500 text-sm">No insights yet</div>
        <div className="text-neutral-400 text-xs mt-1">Insights will surface automatically as fleet & booking data grows</div>
      </div>

      <div className="rounded-2xl bg-blue-50 border border-blue-100 px-5 py-4 text-sm text-blue-700">
        💡 <strong>Tip:</strong> Check Insights every Monday morning — it surfaces the week&apos;s biggest opportunities before they become problems.
      </div>
    </div>
  )
}
