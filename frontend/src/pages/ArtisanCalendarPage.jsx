import { useMemo } from 'react'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { endOfDay, format, getDay, parse, startOfDay, startOfWeek } from 'date-fns'
import { enUS } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const locales = {
  'en-US': enUS,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

function formatProjectStatus(status) {
  return String(status || 'unknown')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function getProjectDate(value) {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function buildCalendarEvent(project) {
  const start = getProjectDate(project.startDate)
  const end = getProjectDate(project.endDate || project.startDate)

  if (!start || !end) {
    return null
  }

  const safeEnd = end >= start ? end : start

  return {
    id: project.id,
    title: project.projectName,
    start: startOfDay(start),
    end: endOfDay(safeEnd),
    allDay: true,
    resource: project,
  }
}

function eventStyleGetter(event) {
  const status = event.resource?.status

  if (status === 'closed') {
    return {
      style: {
        backgroundColor: '#dbeafe',
        borderColor: '#93c5fd',
        color: '#1e3a8a',
      },
    }
  }

  if (status === 'in_progress') {
    return {
      style: {
        backgroundColor: '#dcfce7',
        borderColor: '#86efac',
        color: '#166534',
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

function ProjectEvent({ event }) {
  return (
    <div className="artisan-calendar-event">
      <strong>{event.title}</strong>
      <span>{formatProjectStatus(event.resource?.status)}</span>
    </div>
  )
}

function ArtisanCalendarPage({ projects, loading, onRetry }) {
  const events = useMemo(
    () => projects.map(buildCalendarEvent).filter(Boolean),
    [projects],
  )

  return (
    <section className="dashboard-card artisan-calendar-card">
      <div className="section-header">
        <div>
          <h3>Projects calendar</h3>
          <p className="subtitle">See your assigned projects by schedule and duration.</p>
        </div>
        <span className="projects-count-badge">{events.length} scheduled</span>
      </div>

      {loading ? (
        <p className="subtitle">Loading project calendar...</p>
      ) : events.length ? (
        <>
          <div className="artisan-calendar-shell">
            <Calendar
              localizer={localizer}
              events={events}
              defaultView="month"
              views={['month', 'week', 'agenda']}
              startAccessor="start"
              endAccessor="end"
              popup
              eventPropGetter={eventStyleGetter}
              components={{ event: ProjectEvent }}
            />
          </div>
          <div className="artisan-calendar-legend">
            <span className="legend-chip status-open">Open</span>
            <span className="legend-chip status-in_progress">In Progress</span>
            <span className="legend-chip status-closed">Closed</span>
          </div>
        </>
      ) : (
        <div className="empty-dashboard-state">
          <h4>No scheduled projects yet</h4>
          <p className="subtitle">Once you are assigned to a project, its dates will appear on this calendar.</p>
          <button type="button" className="secondary-btn" onClick={onRetry}>
            Refresh
          </button>
        </div>
      )}
    </section>
  )
}

export default ArtisanCalendarPage
