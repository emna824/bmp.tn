import { useMemo } from 'react'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { endOfDay, format, getDay, parse, startOfDay, startOfWeek } from 'date-fns'
import { enUS } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { CalendarIcon, CheckCircleIcon, FolderIcon, LayersIcon } from '../components/ExecutionIcons'
import { buildCalendarEvents } from '../utils/execution'

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: { 'en-US': enUS },
})

const EVENT_STYLES = {
  'project:recruiting': { backgroundColor: '#fef3c7', borderColor: '#facc15', color: '#a16207' },
  'project:in_progress': { backgroundColor: '#dbeafe', borderColor: '#60a5fa', color: '#1d4ed8' },
  'project:finished': { backgroundColor: '#dcfce7', borderColor: '#4ade80', color: '#15803d' },
  'project:closed': { backgroundColor: '#e5e7eb', borderColor: '#94a3b8', color: '#334155' },
  'milestone:pending': { backgroundColor: '#f1f5f9', borderColor: '#cbd5e1', color: '#475569' },
  'milestone:in_progress': { backgroundColor: '#dbeafe', borderColor: '#60a5fa', color: '#1d4ed8' },
  'milestone:done': { backgroundColor: '#dcfce7', borderColor: '#4ade80', color: '#15803d' },
  'worklog:done': { backgroundColor: '#bbf7d0', borderColor: '#22c55e', color: '#166534' },
}

function getEventDates(event) {
  const start = new Date(event.start)
  const end = new Date(event.end || event.start)

  if (event.allDay) {
    return {
      ...event,
      start: startOfDay(start),
      end: endOfDay(end),
    }
  }

  return event
}

function EventContent({ event }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-semibold">{event.title}</span>
      <span className="text-[11px] capitalize opacity-80">{event.resource?.kind}</span>
    </div>
  )
}

function CalendarPage({ projects = [], milestones = [], logs = [] }) {
  const events = useMemo(
    () => buildCalendarEvents({ projects, milestones, logs }).map(getEventDates),
    [projects, milestones, logs],
  )

  const summary = useMemo(
    () => [
      {
        label: 'Projects',
        value: projects.length,
        note: 'Project windows',
        icon: FolderIcon,
      },
      {
        label: 'Milestones',
        value: milestones.length,
        note: 'Task ranges',
        icon: LayersIcon,
      },
      {
        label: 'Done logs',
        value: logs.filter((log) => log.status === 'done').length,
        note: 'Completed daily work',
        icon: CheckCircleIcon,
      },
      {
        label: 'Events',
        value: events.length,
        note: 'Shown on calendar',
        icon: CalendarIcon,
      },
    ],
    [events.length, logs, milestones.length, projects.length],
  )

  const eventPropGetter = (event) => {
    const key = `${event.resource?.kind}:${event.resource?.status}`
    return {
      style: EVENT_STYLES[key] || EVENT_STYLES['milestone:pending'],
    }
  }

  return (
    <section className="overflow-hidden rounded-[28px] border border-white/35 bg-white/50 shadow-xl shadow-slate-200/45 backdrop-blur-md dark:border-white/10 dark:bg-slate-800/40 dark:shadow-slate-950/35">
      <div className="border-b border-white/25 bg-gradient-to-r from-white/55 via-white/35 to-blue-50/55 p-5 backdrop-blur-sm dark:border-white/10 dark:from-slate-900/70 dark:via-slate-800/45 dark:to-slate-800/65">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm shadow-slate-300/50">
              <CalendarIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Calendar View</h2>
              <p className="text-sm text-slate-500 dark:text-slate-300">Project windows, milestones, and completed daily work logs.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-500 dark:text-slate-300">
            <span className="rounded-full bg-yellow-100 px-3 py-1.5 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-200">Recruiting projects</span>
            <span className="rounded-full bg-blue-100 px-3 py-1.5 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">Active work</span>
            <span className="rounded-full bg-green-100 px-3 py-1.5 text-green-700 dark:bg-green-500/15 dark:text-green-200">Done items</span>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summary.map((item) => {
            const Icon = item.icon

            return (
              <div key={item.label} className="rounded-2xl border border-white/30 bg-white/40 p-4 shadow-lg shadow-slate-100/40 backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/30 dark:shadow-slate-950/20">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-300">{item.label}</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">{item.value}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-slate-700">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-300">{item.note}</p>
              </div>
            )
          })}
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <div className="overflow-hidden rounded-[24px] border border-white/30 dark:border-white/10">
          <div className="[&_.rbc-calendar]:min-h-[640px] [&_.rbc-calendar]:bg-white [&_.rbc-calendar]:p-3 [&_.rbc-event]:rounded-lg [&_.rbc-event]:border [&_.rbc-event-content]:px-0.5 [&_.rbc-header]:border-slate-200 [&_.rbc-header]:bg-slate-50 [&_.rbc-header]:py-3 [&_.rbc-month-row]:border-slate-200 [&_.rbc-time-view]:border-slate-200 [&_.rbc-timeslot-group]:border-slate-200 [&_.rbc-day-bg]:border-slate-200 [&_.rbc-today]:bg-blue-50/60 [&_.rbc-toolbar]:mb-4 [&_.rbc-toolbar]:flex-wrap [&_.rbc-toolbar]:gap-3 [&_.rbc-toolbar-label]:text-lg [&_.rbc-toolbar-label]:font-semibold [&_.rbc-toolbar-label]:text-slate-900 [&_.rbc-toolbar-button]:rounded-lg [&_.rbc-toolbar-button]:border [&_.rbc-toolbar-button]:border-slate-200 [&_.rbc-toolbar-button]:px-3 [&_.rbc-toolbar-button]:py-2 [&_.rbc-toolbar-button]:text-sm [&_.rbc-toolbar-button]:text-slate-600 [&_.rbc-toolbar-button.rbc-active]:bg-slate-900 [&_.rbc-toolbar-button.rbc-active]:text-white dark:[&_.rbc-calendar]:bg-slate-900 dark:[&_.rbc-header]:border-slate-700 dark:[&_.rbc-header]:bg-slate-800 dark:[&_.rbc-header]:text-slate-200 dark:[&_.rbc-month-row]:border-slate-700 dark:[&_.rbc-time-view]:border-slate-700 dark:[&_.rbc-timeslot-group]:border-slate-700 dark:[&_.rbc-day-bg]:border-slate-700 dark:[&_.rbc-toolbar-label]:text-slate-50 dark:[&_.rbc-toolbar-button]:border-slate-700 dark:[&_.rbc-toolbar-button]:bg-slate-800 dark:[&_.rbc-toolbar-button]:text-slate-200 dark:[&_.rbc-time-content]:border-slate-700 dark:[&_.rbc-day-slot_.rbc-time-slot]:border-slate-700 dark:[&_.rbc-month-view]:border-slate-700 dark:[&_.rbc-agenda-view]:border-slate-700 dark:[&_.rbc-agenda-view]:text-slate-200 dark:[&_.rbc-off-range-bg]:bg-slate-950 dark:[&_.rbc-off-range]:text-slate-500 dark:[&_.rbc-today]:bg-blue-500/10]">
            <Calendar
              localizer={localizer}
              events={events}
              defaultView="month"
              views={['month', 'week', 'agenda']}
              startAccessor="start"
              endAccessor="end"
              popup
              eventPropGetter={eventPropGetter}
              components={{ event: EventContent }}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

export default CalendarPage
