function GuideButton({ onClick }) {
  return (
    <button
      type="button"
      className="onboarding-guide-button"
      onClick={onClick}
      aria-label="Start dashboard guide"
      title="Start dashboard guide"
    >
      <span className="onboarding-guide-button-glow" aria-hidden="true" />
      <span className="onboarding-guide-mark" aria-hidden="true">?</span>
    </button>
  )
}

export default GuideButton
