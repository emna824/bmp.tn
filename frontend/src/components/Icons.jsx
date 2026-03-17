function BaseIcon({ children, className = 'icon' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      {children}
    </svg>
  )
}

export function UserIcon(props) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c1.7-3.3 4.5-5 8-5s6.3 1.7 8 5" />
    </BaseIcon>
  )
}

export function MailIcon(props) {
  return (
    <BaseIcon {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </BaseIcon>
  )
}

export function LockIcon(props) {
  return (
    <BaseIcon {...props}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </BaseIcon>
  )
}

export function LogoutIcon(props) {
  return (
    <BaseIcon {...props}>
      <path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </BaseIcon>
  )
}

export function SettingsIcon(props) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1 1 0 0 1 0 1.4l-1 1a1 1 0 0 1-1.4 0l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a1 1 0 0 1-1 1h-1.4a1 1 0 0 1-1-1v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a1 1 0 0 1-1.4 0l-1-1a1 1 0 0 1 0-1.4l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a1 1 0 0 1-1-1v-1.4a1 1 0 0 1 1-1h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a1 1 0 0 1 0-1.4l1-1a1 1 0 0 1 1.4 0l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a1 1 0 0 1 1-1h1.4a1 1 0 0 1 1 1v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a1 1 0 0 1 1.4 0l1 1a1 1 0 0 1 0 1.4l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6h.2a1 1 0 0 1 1 1V13a1 1 0 0 1-1 1h-.2a1 1 0 0 0-.9.6Z" />
    </BaseIcon>
  )
}

export function ShieldIcon(props) {
  return (
    <BaseIcon {...props}>
      <path d="M12 3 5 6v6c0 5 3.5 8 7 9 3.5-1 7-4 7-9V6l-7-3Z" />
    </BaseIcon>
  )
}

export function HomeIcon(props) {
  return (
    <BaseIcon {...props}>
      <path d="m3 10 9-7 9 7" />
      <path d="M5 9v11h14V9" />
    </BaseIcon>
  )
}

export function MenuIcon(props) {
  return (
    <BaseIcon {...props}>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </BaseIcon>
  )
}

export function CloseIcon(props) {
  return (
    <BaseIcon {...props}>
      <path d="m6 6 12 12" />
      <path d="m18 6-12 12" />
    </BaseIcon>
  )
}

export function BmpLogo({ className = 'brand-logo', title = 'BMP.tn logo' }) {
  return (
    <svg className={className} viewBox="0 0 64 64" role="img" aria-label={title}>
      <defs>
        <linearGradient id="bmpBlue" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0f66d8" />
          <stop offset="100%" stopColor="#0a4fb3" />
        </linearGradient>
        <linearGradient id="bmpGreen" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#18a96b" />
          <stop offset="100%" stopColor="#0c8f58" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="16" fill="#f4f8ff" />
      <rect x="8" y="8" width="48" height="48" rx="14" fill="#dfe8f4" />
      <path d="M16 46V18h11.5c4.6 0 8 2.9 8 7.1 0 2.2-.9 4-2.5 5 2.4 1 3.8 3 3.8 5.8 0 4.9-3.9 8.1-9 8.1H16Z" fill="url(#bmpBlue)" />
      <path d="M23.6 29.2h3.2c1.8 0 3-1.2 3-2.8 0-1.7-1.2-2.8-3-2.8h-3.2v5.6Zm0 11.2H27c2.2 0 3.5-1.3 3.5-3.3 0-2-1.3-3.3-3.5-3.3h-3.4v6.6Z" fill="#ffffff" />
      <path d="M40 18h8c6.4 0 11 4.9 11 11.5S54.4 41 48 41h-2.8v5H40V18Z" fill="url(#bmpGreen)" />
      <path d="M45.2 35.7H48c3.2 0 5.4-2.5 5.4-6.2 0-3.7-2.2-6.1-5.4-6.1h-2.8v12.3Z" fill="#ffffff" />
    </svg>
  )
}
