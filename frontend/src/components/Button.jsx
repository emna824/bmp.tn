function cx(...classes) {
  return classes.filter(Boolean).join(' ')
}

const baseClasses =
  'relative inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-slate-950'

const interactiveClasses =
  'hover:scale-105 hover:brightness-110 active:scale-[0.98]'

const primaryClasses =
  'bg-gradient-to-r from-orange-500 to-yellow-400 text-white shadow-lg shadow-orange-200/60 dark:shadow-orange-950/30'

const secondaryClasses = 'bg-transparent shadow-lg shadow-orange-100/30 dark:shadow-slate-950/25'

function Button({
  children,
  variant = 'primary',
  type = 'button',
  disabled = false,
  className = '',
  ...props
}) {
  const isPrimary = variant === 'primary'
  const isSecondary = variant === 'secondary'

  return (
    <button
      type={type}
      disabled={disabled}
      className={cx(
        baseClasses,
        !disabled && interactiveClasses,
        isPrimary && primaryClasses,
        isSecondary && secondaryClasses,
        className,
      )}
      {...props}
    >
      {isSecondary ? (
        <>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-r from-orange-500 to-yellow-400"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-px rounded-[11px] bg-white/90 dark:bg-slate-900/90"
          />
          <span className="relative bg-gradient-to-r from-orange-500 to-yellow-400 bg-clip-text text-transparent">
            {children}
          </span>
        </>
      ) : (
        children
      )}
    </button>
  )
}

export default Button
