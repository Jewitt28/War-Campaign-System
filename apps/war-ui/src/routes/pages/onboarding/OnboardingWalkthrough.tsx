type WalkthroughStep = {
  title: string
  body: string
}

type OnboardingWalkthroughProps = {
  open: boolean
  currentStep: number
  steps: WalkthroughStep[]
  onClose: () => void
  onFinish: () => void
  onNext: () => void
  onPrevious: () => void
  onSkip: () => void
}

export function OnboardingWalkthrough({
  open,
  currentStep,
  steps,
  onClose,
  onFinish,
  onNext,
  onPrevious,
  onSkip,
}: OnboardingWalkthroughProps) {
  if (!open) {
    return null
  }

  const activeStep = steps[currentStep]

  return (
    <div
      aria-modal="true"
      className="surface-card page-card page-stack"
      role="dialog"
      style={{
        position: 'fixed',
        inset: '10vh 5vw auto',
        zIndex: 50,
        maxWidth: 760,
        margin: '0 auto',
        boxShadow: '0 30px 80px rgba(0, 0, 0, 0.4)',
      }}
    >
      <div className="page-header">
        <div className="page-header-copy">
          <p className="eyebrow">Player walkthrough</p>
          <h2 className="detail-title">{activeStep?.title ?? 'Tutorial'}</h2>
        </div>
        <div className="pill-row">
          <span className="meta-pill">
            Step {currentStep + 1} of {steps.length}
          </span>
        </div>
      </div>

      <p className="muted">{activeStep?.body ?? ''}</p>

      <div className="button-row">
        <button className="button-secondary" onClick={onSkip} type="button">
          Skip tutorial
        </button>
        <button className="button-secondary" disabled={currentStep === 0} onClick={onPrevious} type="button">
          Back
        </button>
        {currentStep < steps.length - 1 ? (
          <button className="button-link" onClick={onNext} type="button">
            Next
          </button>
        ) : (
          <button className="button-link" onClick={onFinish} type="button">
            Finish
          </button>
        )}
        <button className="button-secondary" onClick={onClose} type="button">
          Close
        </button>
      </div>
    </div>
  )
}
