function BaseIcon({ className = 'h-5 w-5', children }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function FolderIcon(props) {
  return (
    <BaseIcon {...props}>
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2h6.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5Z" />
    </BaseIcon>
  )
}

export function CalendarIcon(props) {
  return (
    <BaseIcon {...props}>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
      <path d="M3 10h18" />
      <path d="M8 14h3" />
      <path d="M13 14h3" />
    </BaseIcon>
  )
}

export function CheckCircleIcon(props) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.3 2.3 4.8-5" />
    </BaseIcon>
  )
}

export function RefreshIcon(props) {
  return (
    <BaseIcon {...props}>
      <path d="M20 6v5h-5" />
      <path d="M4 18v-5h5" />
      <path d="M6.8 9A7 7 0 0 1 18 7l2 2" />
      <path d="M17.2 15A7 7 0 0 1 6 17l-2-2" />
    </BaseIcon>
  )
}

export function ClipboardListIcon(props) {
  return (
    <BaseIcon {...props}>
      <rect x="5" y="4.5" width="14" height="16" rx="2.5" />
      <path d="M9 4h6" />
      <path d="M8 9h8" />
      <path d="M8 13h8" />
      <path d="M8 17h5" />
    </BaseIcon>
  )
}

export function UsersIcon(props) {
  return (
    <BaseIcon {...props}>
      <path d="M16 19a4 4 0 0 0-8 0" />
      <circle cx="12" cy="11" r="3" />
      <path d="M20 19a3.5 3.5 0 0 0-3-3.4" />
      <path d="M4 19a3.5 3.5 0 0 1 3-3.4" />
      <path d="M17 8.5a2.5 2.5 0 1 0 0-5" />
      <path d="M7 8.5a2.5 2.5 0 1 1 0-5" />
    </BaseIcon>
  )
}

export function ArrowRightIcon(props) {
  return (
    <BaseIcon {...props}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </BaseIcon>
  )
}

export function SparkIcon(props) {
  return (
    <BaseIcon {...props}>
      <path d="m12 3 1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7Z" />
      <path d="m19 14 .8 2 .2.2 2 .8-2 .8-.2.2-.8 2-.8-2-.2-.2-2-.8 2-.8.2-.2Z" />
      <path d="m5 14 .8 2 .2.2 2 .8-2 .8-.2.2-.8 2-.8-2-.2-.2-2-.8 2-.8.2-.2Z" />
    </BaseIcon>
  )
}

export function RocketIcon(props) {
  return (
    <BaseIcon {...props}>
      <path d="M5 19c1.5-3 4-5.5 7-7 3-1.5 5-4.5 5-8 0 0-4 0-7 3-3 3-3 7-3 7Z" />
      <path d="m13 11 3 3" />
      <path d="M6 18 4 20" />
      <path d="M9 21H4v-5" />
    </BaseIcon>
  )
}

export function TargetIcon(props) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="1" />
    </BaseIcon>
  )
}

export function PlusIcon(props) {
  return (
    <BaseIcon {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </BaseIcon>
  )
}

export function ClockIcon(props) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6l4 2" />
    </BaseIcon>
  )
}

export function LayersIcon(props) {
  return (
    <BaseIcon {...props}>
      <path d="m12 4 8 4-8 4-8-4 8-4Z" />
      <path d="m4 12 8 4 8-4" />
      <path d="m4 16 8 4 8-4" />
    </BaseIcon>
  )
}
