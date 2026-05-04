function cx(...classes) {
  return classes.filter(Boolean).join(' ')
}

const baseClasses =
  'relative inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-slate-950'

const interactiveClasses =
  'hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0'

const primaryClasses =
  'bg-gradient-to-r from-orange-500 to-amber-400 text-white shadow-sm shadow-orange-200/50 dark:shadow-orange-950/30'

const secondaryClasses =
  'border border-gray-200 bg-white text-slate-700 shadow-sm hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-orange-400/40 dark:hover:bg-orange-500/10 dark:hover:text-orange-200'

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
      {children}
    </button>
  )
}

export default Button
