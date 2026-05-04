function ChartCard({ title, subtitle, loading, empty, children }) {
  return (
    <article className="min-h-[340px] rounded-xl bg-white p-6 shadow transition-colors duration-300 dark:bg-slate-800">
      <div className="mb-5">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
        {subtitle ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{subtitle}</p> : null}
      </div>

      {loading ? (
        <div className="flex h-60 items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm font-medium text-slate-500 dark:border-slate-700 dark:text-slate-300">
          Loading chart...
        </div>
      ) : empty ? (
        <div className="flex h-60 items-center justify-center rounded-xl border border-dashed border-slate-200 px-4 text-center text-sm font-medium text-slate-500 dark:border-slate-700 dark:text-slate-300">
          No data available yet.
        </div>
      ) : (
        <div className="h-60">{children}</div>
      )}
    </article>
  )
}

export default ChartCard
