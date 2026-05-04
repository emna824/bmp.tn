function ChartCard({ title, subtitle, loading, empty, children }) {
  return (
    <article className="min-h-[320px] rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-colors duration-300 dark:border-slate-700 dark:bg-slate-800 sm:p-5">
      <div className="mb-5">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
        {subtitle ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{subtitle}</p> : null}
      </div>

      {loading ? (
        <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm font-medium text-slate-500 dark:border-slate-700 dark:text-slate-300">
          Loading chart...
        </div>
      ) : empty ? (
        <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-slate-200 px-4 text-center text-sm font-medium text-slate-500 dark:border-slate-700 dark:text-slate-300">
          No data available yet.
        </div>
      ) : (
        <div className="h-56 min-w-0">{children}</div>
      )}
    </article>
  )
}

export default ChartCard
