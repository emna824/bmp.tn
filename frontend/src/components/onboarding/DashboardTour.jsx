import { Joyride, STATUS } from 'react-joyride'
import {
  artisanTutorialSteps,
  markArtisanTutorialCompleted,
} from '../../onboarding/tutorialSteps'

const joyrideStyles = {
  options: {
    arrowColor: 'var(--onboarding-tooltip-bg)',
    backgroundColor: 'var(--onboarding-tooltip-bg)',
    beaconSize: 34,
    overlayColor: 'rgba(2, 6, 23, 0.68)',
    primaryColor: '#2563eb',
    spotlightShadow: '0 0 0 9999px rgba(2, 6, 23, 0.68), 0 18px 52px rgba(37, 99, 235, 0.28)',
    textColor: 'var(--onboarding-tooltip-text)',
    width: 390,
    zIndex: 1500,
  },
  beacon: {
    backgroundColor: '#2563eb',
    border: '0',
    boxShadow: '0 0 0 8px rgba(37, 99, 235, 0.16), 0 0 28px rgba(37, 99, 235, 0.5)',
  },
  buttonBack: {
    color: 'var(--onboarding-muted-text)',
    fontSize: 13,
    fontWeight: 700,
    marginRight: 12,
  },
  buttonClose: {
    color: 'var(--onboarding-muted-text)',
    height: 34,
    padding: 10,
    width: 34,
  },
  buttonNext: {
    backgroundColor: '#2563eb',
    borderRadius: 999,
    boxShadow: '0 10px 28px rgba(37, 99, 235, 0.28)',
    color: '#fff',
    fontSize: 13,
    fontWeight: 800,
    padding: '10px 16px',
  },
  buttonSkip: {
    color: 'var(--onboarding-muted-text)',
    fontSize: 13,
    fontWeight: 700,
  },
  spotlight: {
    borderRadius: 18,
  },
  tooltip: {
    animation: 'onboardingTooltipIn 220ms ease both',
    border: '1px solid var(--onboarding-tooltip-border)',
    borderRadius: 18,
    boxShadow: '0 24px 70px rgba(15, 23, 42, 0.26)',
    padding: 0,
  },
  tooltipContainer: {
    lineHeight: 1.55,
    padding: '20px 20px 4px',
    textAlign: 'left',
  },
  tooltipContent: {
    color: 'var(--onboarding-muted-text)',
    fontSize: 14,
    padding: '8px 0 0',
  },
  tooltipTitle: {
    color: 'var(--onboarding-tooltip-text)',
    fontSize: 18,
    fontWeight: 800,
    lineHeight: 1.25,
    margin: 0,
  },
}

function DashboardTour({
  run = false,
  onClose,
}) {
  const handleEvent = (data) => {
    const { status } = data
    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED]

    if (finishedStatuses.includes(status)) {
      markArtisanTutorialCompleted()
      onClose?.()
    }
  }

  if (!artisanTutorialSteps.length) return null

  return (
    <Joyride
      continuous
      disableOverlayClose
      disableScrolling={false}
      hideCloseButton={false}
      locale={{
        back: 'Previous',
        close: 'Close',
        last: 'Finish',
        next: 'Next',
        skip: 'Skip tutorial',
      }}
      onEvent={handleEvent}
      run={run}
      scrollOffset={96}
      showProgress
      showSkipButton
      spotlightClicks
      steps={artisanTutorialSteps}
      styles={joyrideStyles}
    />
  )
}

export default DashboardTour
