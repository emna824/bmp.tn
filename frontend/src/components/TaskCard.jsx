import StatusBadge from './StatusBadge'
import { CheckCircleIcon, ClipboardListIcon, FolderIcon } from './ExecutionIcons'

function TaskCard({ task, saving, onToggle }) {
  const checked = task.status === 'done'

  return (
    <label
      className={`group flex items-start gap-4 rounded-2xl border p-4 shadow-xl backdrop-blur-md transition dark:shadow-slate-950/25 ${checked ? 'border-green-200/60 bg-green-50/55 shadow-green-100/50 dark:border-green-500/25 dark:bg-green-500/10 dark:shadow-green-950/10' : 'border-white/35 bg-white/50 hover:bg-white/60 dark:border-white/10 dark:bg-slate-800/45 dark:hover:bg-slate-800/50'} ${saving ? 'cursor-wait opacity-80' : 'cursor-pointer hover:brightness-[1.03]'}`.trim()}
    >
      <div className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${checked ? 'bg-green-600 text-white dark:bg-green-500' : 'bg-slate-900 text-white dark:bg-slate-700'}`}>
        {checked ? <CheckCircleIcon className="h-5 w-5" /> : <ClipboardListIcon className="h-5 w-5" />}
      </div>

      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Daily task</p>
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">{task.title}</p>
          </div>
          <StatusBadge status={task.status} />
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-300">
          <FolderIcon className="h-4 w-4" />
          <span className="truncate">{task.projectName}</span>
        </div>

        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{task.description || 'Daily task for this milestone.'}</p>

        <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/30 bg-white/35 px-3.5 py-3 backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/30">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-200">
            <input
              type="checkbox"
              checked={checked}
              disabled={saving}
              onChange={(event) => onToggle(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900"
            />
            <span>{saving ? 'Saving update...' : checked ? 'Marked as done' : 'Mark as done'}</span>
          </div>
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
            {checked ? 'Completed' : 'Pending'}
          </span>
        </div>
      </div>
    </label>
  )
}

export default TaskCard
