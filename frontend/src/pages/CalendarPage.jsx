import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { endOfDay, format, getDay, parse, startOfDay, startOfWeek } from 'date-fns'
import { enUS } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const locales = { 'en-US': enUS }

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

function safeDate(value) {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function buildProjectEvent(project) {
  const start = safeDate(project?.startDate)
  const end = safeDate(project?.endDate || project?.startDate)

  if (!start || !end) return null

  return {
    id: `project-${project.id || project._id}`,
    title: project?.projectName || 'Project',
    start: startOfDay(start),
    end: endOfDay(end >= start ? end : start),
    allDay: true,
    resource: {
      type: 'project',
      status: project?.status,
    },
  }
}

function buildWorkLogEvent(workLog) {
  const eventDate = safeDate(workLog?.date)
  if (!eventDate) return null

  return {
    id: `task-${workLog?._id || workLog?.id}`,
    title: workLog?.milestoneId?.title || 'Task update',
    start: startOfDay(eventDate),
    end: endOfDay(eventDate),
    allDay: true,
    resource: {
      type: 'task',
      status: workLog?.status,
    },
  }
}

function eventStyleGetter(event) {
  if (event.resource?.type === 'task') {
    return {
      style: {
        backgroundColor: event.resource?.status === 'done' ? '#dcfce7' : '#fee2e2',
        borderColor: event.resource?.status === 'done' ? '#86efac' : '#fca5a5',
        color: event.resource?.status === 'done' ? '#166534' : '#b91c1c',
      },
    }
  }

  if (event.resource?.status === 'in_progress') {
    return {
      style: {
        backgroundColor: '#dbeafe',
        borderColor: '#93c5fd',
        color: '#1d4ed8',
      },
    }
  }

  if (event.resource?.status === 'finished') {
    return {
      style: {
        backgroundColor: '#dcfce7',
        borderColor: '#86efac',
        color: '#166534',
      },
    }
  }

  if (event.resource?.status === 'closed') {
    return {
      style: {
        backgroundColor: '#e2e8f0',
        borderColor: '#cbd5e1',
        color: '#334155',
      },
    }
  }

  return {
    style: {
      backgroundColor: '#fef3c7',
      borderColor: '#fcd34d',
      color: '#92400e',
    },
  }
}

function CalendarPage({ projects, workLogs, loading, onBack }) {
  const { t } = useTranslation()
  const events = useMemo(
    () => [
      ...projects.map(buildProjectEvent).filter(Boolean),
      ...workLogs.map(buildWorkLogEvent).filter(Boolean),
    ],
    [projects, workLogs],
  )

  return (
    <section className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-md">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">{t('calendarUi.planning')}</p>
            <h2 className="mt-2 text-3xl font-semibold text-slate-900">{t('calendarUi.calendarView')}</h2>
            <p className="mt-2 text-sm text-slate-500">{t('calendarUi.calendarDescription')}</p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition-all duration-300 hover:border-orange-200 hover:bg-orange-50"
          >
            {t('calendarUi.backToProjects')}
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-md">
        {loading ? (
          <p className="text-sm text-slate-500">{t('calendarUi.loadingCalendar')}</p>
        ) : (
          <>
            <div className="h-[720px] overflow-hidden rounded-2xl border border-slate-200">
              <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                defaultView="month"
                views={['month', 'week', 'agenda']}
                popup
                eventPropGetter={eventStyleGetter}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
              <span className="rounded-full bg-yellow-100 px-3 py-1 text-yellow-700">{t('status.recruiting')}</span>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-700">{t('status.in_progress')}</span>
              <span className="rounded-full bg-green-100 px-3 py-1 text-green-700">{t('status.finished')}</span>
              <span className="rounded-full bg-gray-200 px-3 py-1 text-gray-700">{t('status.closed')}</span>
              <span className="rounded-full bg-rose-100 px-3 py-1 text-rose-700">{t('status.pending')}</span>
              <span className="rounded-full bg-green-100 px-3 py-1 text-green-700">{t('status.done')}</span>
            </div>
          </>
        )}
      </div>
    </section>
  )
}

export default CalendarPage
