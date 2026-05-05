import { ChatIcon } from './Icons'

/**
 * Lightweight launcher only — loads the full assistant chunk on first click.
 */
function PremiumAssistantGate({ onActivate }) {
  return (
    <button
      type="button"
      onClick={onActivate}
      className="fixed bottom-6 right-6 z-[110] grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-orange-400 via-orange-500 to-amber-500 text-white shadow-[0_18px_45px_rgba(249,115,22,0.42)] transition-all duration-300 hover:scale-110 hover:shadow-[0_22px_55px_rgba(249,115,22,0.52)] focus:outline-none focus:ring-4 focus:ring-orange-300/35 max-sm:bottom-5 max-sm:right-5"
      aria-label="Open BMP Assistant"
      aria-expanded={false}
      aria-controls="bmp-assistant-panel"
      data-tour="artisan-assistant"
    >
      <span className="absolute inset-0 rounded-full bg-orange-300/25 blur-md" aria-hidden="true" />
      <ChatIcon className="relative h-7 w-7" />
    </button>
  )
}

export default PremiumAssistantGate
