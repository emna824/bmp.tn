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

export function BellIcon(props) {
  return (
    <BaseIcon {...props}>
      <path d="M6 10a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9Z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </BaseIcon>
  )
}

export function SearchIcon(props) {
  return (
    <BaseIcon {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </BaseIcon>
  )
}

export function SunIcon(props) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2.5" />
      <path d="M12 19.5V22" />
      <path d="m4.9 4.9 1.8 1.8" />
      <path d="m17.3 17.3 1.8 1.8" />
      <path d="M2 12h2.5" />
      <path d="M19.5 12H22" />
      <path d="m4.9 19.1 1.8-1.8" />
      <path d="m17.3 6.7 1.8-1.8" />
    </BaseIcon>
  )
}

export function MoonIcon(props) {
  return (
    <BaseIcon {...props}>
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5Z" />
    </BaseIcon>
  )
}

export function TranslateIcon(props) {
  return (
    <BaseIcon {...props}>
      <path d="M4 5h10" />
      <path d="M9 3v2" />
      <path d="M8 5a14 14 0 0 1-4 7" />
      <path d="M6 9c1.2 2 2.8 3.8 5 5" />
      <path d="M14 9h6" />
      <path d="m17 9-3 8" />
      <path d="m20 17-3-8-3 8" />
    </BaseIcon>
  )
}

export function ProjectIcon(props) {
  return (
    <BaseIcon {...props}>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
      <path d="M4 10h16" />
      <path d="M8 14h3" />
      <path d="M13 14h3" />
    </BaseIcon>
  )
}

export function CheckCircleIcon(props) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.2 2.2L15.8 9" />
    </BaseIcon>
  )
}

export function XCircleIcon(props) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 9 6 6" />
      <path d="m15 9-6 6" />
    </BaseIcon>
  )
}

export function MarketplaceIcon(props) {
  return (
    <BaseIcon {...props}>
      <path d="M6 7h12l1 12H5L6 7Z" />
      <path d="M9 7V5a3 3 0 0 1 6 0v2" />
      <path d="M7 11h10" />
    </BaseIcon>
  )
}

export function InvoiceIcon(props) {
  return (
    <BaseIcon {...props}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 8h6" />
      <path d="M9 12h6" />
      <path d="M9 16h4" />
    </BaseIcon>
  )
}

export function QuoteIcon(props) {
  return (
    <BaseIcon {...props}>
      <path d="M8 9h8" />
      <path d="M8 13h5" />
      <path d="M5 4h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H12l-4 4v-4H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
    </BaseIcon>
  )
}

export function ChatIcon(props) {
  return (
    <BaseIcon {...props}>
      <path d="M7 10h10" />
      <path d="M7 14h6" />
      <path d="M5 4h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-5l-4 4v-4H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
    </BaseIcon>
  )
}

export function BotIcon(props) {
  return (
    <BaseIcon {...props}>
      <rect x="5" y="8" width="14" height="10" rx="4" />
      <path d="M12 4v4" />
      <path d="M8.5 13h.01" />
      <path d="M15.5 13h.01" />
      <path d="M9.5 17c1.5 1 3.5 1 5 0" />
    </BaseIcon>
  )
}

export function SendIcon(props) {
  return (
    <BaseIcon {...props}>
      <path d="m4 11 15-7-7 15-2-6-6-2Z" />
      <path d="m10 13 4-4" />
    </BaseIcon>
  )
}

export function MicIcon(props) {
  return (
    <BaseIcon {...props}>
      <path d="M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" />
      <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
      <path d="M12 18v3" />
      <path d="M8 21h8" />
    </BaseIcon>
  )
}

export function StopIcon(props) {
  return (
    <BaseIcon {...props}>
      <rect x="7" y="7" width="10" height="10" rx="2" />
    </BaseIcon>
  )
}

export function PlayIcon(props) {
  return (
    <BaseIcon {...props}>
      <path d="M8 5v14l11-7-11-7Z" />
    </BaseIcon>
  )
}

export function PauseIcon(props) {
  return (
    <BaseIcon {...props}>
      <path d="M9 5v14" />
      <path d="M15 5v14" />
    </BaseIcon>
  )
}

export function InfoIcon(props) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v5" />
      <path d="M12 7.5h.01" />
    </BaseIcon>
  )
}

export function CreditCardIcon(props) {
  return (
    <BaseIcon {...props}>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18" />
      <path d="M7 15h4" />
    </BaseIcon>
  )
}

export function DownloadIcon(props) {
  return (
    <BaseIcon {...props}>
      <path d="M12 4v10" />
      <path d="m8 10 4 4 4-4" />
      <path d="M5 19h14" />
    </BaseIcon>
  )
}

export function ShareIcon(props) {
  return (
    <BaseIcon {...props}>
      <circle cx="18" cy="5" r="2" />
      <circle cx="6" cy="12" r="2" />
      <circle cx="18" cy="19" r="2" />
      <path d="m8 11 8-5" />
      <path d="m8 13 8 5" />
    </BaseIcon>
  )
}

export function EditIcon(props) {
  return (
    <BaseIcon {...props}>
      <path d="M4 20h4l10-10-4-4L4 16v4Z" />
      <path d="m13 7 4 4" />
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

export function BrandMark({ className = 'brand-mark', title = 'BMP logo' }) {
  return (
    <svg className={className} viewBox="0 0 48 48" role="img" aria-label={title}>
      <defs>
        <linearGradient id="bmpBrandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffb77f" />
          <stop offset="100%" stopColor="#ff8a00" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="14" fill="url(#bmpBrandGradient)" />
      <path
        d="M24 10c2 0 3.2 1.2 3.2 3.1 0 1.1-.5 2.1-1.3 3l3.7 12.2a1.8 1.8 0 0 1-1.8 2.3h-1.7l-1.1-5.4h-2l-1.1 5.4h-1.7a1.8 1.8 0 0 1-1.8-2.3l3.7-12.2a4.4 4.4 0 0 1-1.3-3c0-1.9 1.2-3.1 3.2-3.1Zm0 3a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6Zm0 7.2-1.1 3h2.2l-1.1-3Z"
        fill="#ffffff"
      />
    </svg>
  )
}
