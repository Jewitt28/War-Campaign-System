import { useMemo, useState, type FormEvent } from 'react'
import { NavLink, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useCampaign } from '../../features/campaigns'
import {
  useCampaignOnboarding,
  useCompleteOnboarding,
  useCompleteOnboardingTutorial,
  useSelectOnboardingFaction,
  useSelectOnboardingHomeland,
  useSelectOnboardingNation,
  type CampaignOnboarding,
  type OnboardingActivationStatus,
  type OnboardingFactionOption,
  type OnboardingHomelandOption,
  type OnboardingNationOption,
} from '../../features/onboarding'
import { Notice, SkeletonCard, StateCard } from '../components'
import { OnboardingWalkthrough } from './onboarding/OnboardingWalkthrough'

type StepName = 'FACTION' | 'NATION' | 'HOMELAND' | 'CONFIRM' | 'WAITING' | 'DONE'

const TUTORIAL_VERSION = 'player_onboarding_v1'

function normalizeStep(value: string | undefined, fallback: StepName): StepName {
  switch (value) {
    case 'faction':
    case 'FACTION':
      return 'FACTION'
    case 'nation':
    case 'NATION':
      return 'NATION'
    case 'homeland':
    case 'HOMELAND':
      return 'HOMELAND'
    case 'confirm':
    case 'CONFIRM':
      return 'CONFIRM'
    case 'waiting':
    case 'WAITING':
      return 'WAITING'
    case 'done':
    case 'DONE':
      return 'DONE'
    default:
      return fallback
  }
}

function stepToPath(campaignId: string, step: StepName) {
  if (step === 'WAITING') {
    return `/app/campaigns/${campaignId}/waiting`
  }
  if (step === 'DONE') {
    return `/app/campaigns/${campaignId}`
  }
  return `/app/campaigns/${campaignId}/onboarding/${step.toLowerCase()}`
}

function formatActivationMessage(data: CampaignOnboarding) {
  if (data.activationStatus === 'ACTIVE') {
    return 'Your membership is active now.'
  }

  if (data.activationTurnNumber != null) {
    return `You will activate at the start of turn ${data.activationTurnNumber}. Until then, this membership is read-only.`
  }

  return 'Your membership is staged and will activate when the campaign advances.'
}

function groupHomelands(homelands: OnboardingHomelandOption[]) {
  return homelands.reduce<Record<string, OnboardingHomelandOption[]>>((groups, homeland) => {
    const key = homeland.theatreName
    groups[key] = [...(groups[key] ?? []), homeland]
    return groups
  }, {})
}

export function CampaignOnboardingPage() {
  const { campaignId = '' } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const campaign = useCampaign(campaignId)
  const onboarding = useCampaignOnboarding(campaignId)
  const selectFaction = useSelectOnboardingFaction(campaignId)
  const selectNation = useSelectOnboardingNation(campaignId)
  const selectHomeland = useSelectOnboardingHomeland(campaignId)
  const completeOnboarding = useCompleteOnboarding(campaignId)
  const completeTutorial = useCompleteOnboardingTutorial(campaignId)

  const [customFactionName, setCustomFactionName] = useState('')
  const [customFactionColor, setCustomFactionColor] = useState('')
  const [customNationName, setCustomNationName] = useState('')
  const [customNationColor, setCustomNationColor] = useState('')
  const [selectedHomelandId, setSelectedHomelandId] = useState('')
  const forceTutorial = new URLSearchParams(location.search).get('tour') === '1'
  const [tutorialRequested, setTutorialRequested] = useState(forceTutorial)
  const [tutorialDismissed, setTutorialDismissed] = useState(false)
  const [tutorialStep, setTutorialStep] = useState(0)
  const [redirectPath, setRedirectPath] = useState<string | null>(null)

  const onboardingData = onboarding.data
  const stepName = normalizeStep(location.pathname.split('/').pop(), onboardingData?.nextStep ? normalizeStep(onboardingData.nextStep, 'CONFIRM') : 'FACTION')
  const tutorialCompleted = onboardingData?.tutorialCompletedAt != null

  const homelandGroups = useMemo(() => {
    return onboardingData ? groupHomelands(onboardingData.eligibleHomelands) : {}
  }, [onboardingData])

  if (campaign.isLoading || onboarding.isLoading) {
    return (
      <div className="page-stack">
        <SkeletonCard lines={4} />
        <SkeletonCard lines={5} />
      </div>
    )
  }

  if (campaign.isError || onboarding.isError || !campaign.data || !onboardingData) {
    return (
      <StateCard
        title="Onboarding unavailable"
        description="The onboarding flow could not be loaded for this campaign membership."
        actions={<NavLink className="button-link" to={`/app/campaigns/${campaignId}`}>Return to campaign</NavLink>}
      />
    )
  }

  const membership = campaign.data.myMembership as typeof campaign.data.myMembership & { onboarding?: { activationStatus: OnboardingActivationStatus } }
  const isPlayer = membership.role === 'PLAYER'
  const currentOnboarding = onboardingData
  const resolvedHomelandId = selectedHomelandId || currentOnboarding.selectedHomeland?.id || ''

  if (!isPlayer) {
    return (
      <StateCard
        title="Onboarding not required"
        description="This page is only used for player memberships."
        actions={<NavLink className="button-link" to={`/app/campaigns/${campaignId}`}>Return to campaign</NavLink>}
      />
    )
  }

  async function handleFactionChoice(option: OnboardingFactionOption) {
    const next = await selectFaction.mutateAsync({ factionId: option.id })
    navigate(stepToPath(campaignId, normalizeStep(next.nextStep, 'FACTION')), { replace: true })
  }

  async function handleCustomFactionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = await selectFaction.mutateAsync({
      customFactionName: customFactionName.trim(),
      customFactionColor: customFactionColor.trim() || null,
    })
    navigate(stepToPath(campaignId, normalizeStep(next.nextStep, 'FACTION')), { replace: true })
  }

  async function handleNationChoice(option: OnboardingNationOption) {
    const next = await selectNation.mutateAsync({ nationId: option.id })
    navigate(stepToPath(campaignId, normalizeStep(next.nextStep, 'NATION')), { replace: true })
  }

  async function handleCustomNationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = await selectNation.mutateAsync({
      customNationName: customNationName.trim(),
      customNationColor: customNationColor.trim() || null,
    })
    navigate(stepToPath(campaignId, normalizeStep(next.nextStep, 'NATION')), { replace: true })
  }

  async function handleHomelandChoice() {
    if (!resolvedHomelandId) {
      return
    }
    const next = await selectHomeland.mutateAsync({ territoryId: resolvedHomelandId })
    navigate(stepToPath(campaignId, normalizeStep(next.nextStep, 'HOMELAND')), { replace: true })
  }

  async function handleComplete() {
    const result = await completeOnboarding.mutateAsync()
    if (currentOnboarding.tutorialCompletedAt == null) {
      setRedirectPath(result.redirectPath)
      setTutorialRequested(true)
      setTutorialDismissed(false)
      setTutorialStep(0)
    } else {
      navigate(result.redirectPath, { replace: true })
    }
  }

  async function finishTutorial() {
    await completeTutorial.mutateAsync({ tutorialVersion: TUTORIAL_VERSION })
    setTutorialRequested(false)
    setTutorialDismissed(true)
    const target = redirectPath ?? (currentOnboarding.activationStatus === 'PENDING_NEXT_TURN'
      ? `/app/campaigns/${campaignId}/waiting`
      : `/app/campaigns/${campaignId}/dashboard`)
    navigate(target, { replace: true })
  }

  const eligibleStep = normalizeStep(currentOnboarding.nextStep, 'FACTION')
  const activeStep = stepName === 'DONE' ? eligibleStep : stepName
  const tutorialOpen = tutorialRequested || (!tutorialCompleted && currentOnboarding.status === 'COMPLETE' && !tutorialDismissed)

  return (
    <section className="page-stack">
      <div className="page-header">
        <div className="page-header-copy">
          <p className="eyebrow">Player onboarding</p>
          <h1 className="page-title">{campaign.data.name}</h1>
          <p className="muted">Complete the setup steps below. The backend keeps the authoritative membership state.</p>
        </div>
        <div className="pill-row">
          <span className="meta-pill">{onboardingData.status}</span>
          <span className="meta-pill">{onboardingData.activationStatus}</span>
          <span className="meta-pill">{activeStep}</span>
        </div>
      </div>

      <Notice tone={onboardingData.activationStatus === 'PENDING_NEXT_TURN' ? 'default' : 'success'}>
        {formatActivationMessage(onboardingData)}
      </Notice>

      {activeStep === 'FACTION' ? (
        <section className="surface-card page-card page-stack">
          <div className="page-header">
            <div className="page-header-copy">
              <h2 className="detail-title">Choose a faction</h2>
              <p className="muted">Pick an existing faction or create a new one if the campaign allows it.</p>
            </div>
          </div>
          <div className="campaign-grid">
            {onboardingData.eligibleFactions.map((faction) => (
              <button key={faction.id} className="campaign-card" onClick={() => void handleFactionChoice(faction)} type="button">
                <div className="pill-row">
                  <span className="meta-pill">{faction.key}</span>
                  {faction.custom ? <span className="meta-pill">Custom</span> : null}
                </div>
                <h3>{faction.name}</h3>
                <p className="muted">{faction.color ?? 'No campaign color set'}</p>
              </button>
            ))}
          </div>
          {onboardingData.settings.allowPlayerCreatedFactions ? (
            <form className="field-grid" onSubmit={(event) => void handleCustomFactionSubmit(event)}>
              <label className="field-label">
                Custom faction name
                <input className="field-input" onChange={(event) => setCustomFactionName(event.target.value)} value={customFactionName} />
              </label>
              <label className="field-label">
                Custom faction color
                <input className="field-input" onChange={(event) => setCustomFactionColor(event.target.value)} value={customFactionColor} />
              </label>
              <button className="button-link" disabled={!customFactionName.trim() || selectFaction.isPending} type="submit">
                {selectFaction.isPending ? 'Saving faction...' : 'Create faction'}
              </button>
            </form>
          ) : null}
          {selectFaction.isError ? <Notice tone="error">{selectFaction.error.message}</Notice> : null}
        </section>
      ) : null}

      {activeStep === 'NATION' ? (
        <section className="surface-card page-card page-stack">
          <div className="page-header">
            <div className="page-header-copy">
              <h2 className="detail-title">Choose a nation</h2>
              <p className="muted">Select a nation that belongs to your chosen faction, or create a custom one if allowed.</p>
            </div>
          </div>
          <div className="campaign-grid">
            {onboardingData.eligibleNations.map((nation) => (
              <button key={nation.id} className="campaign-card" onClick={() => void handleNationChoice(nation)} type="button">
                <div className="pill-row">
                  <span className="meta-pill">{nation.key}</span>
                  {nation.custom ? <span className="meta-pill">Custom</span> : null}
                </div>
                <h3>{nation.name}</h3>
                <p className="muted">{nation.factionKey ?? 'No faction assigned'}</p>
              </button>
            ))}
          </div>
          {onboardingData.settings.allowCustomNationCreation ? (
            <form className="field-grid" onSubmit={(event) => void handleCustomNationSubmit(event)}>
              <label className="field-label">
                Custom nation name
                <input className="field-input" onChange={(event) => setCustomNationName(event.target.value)} value={customNationName} />
              </label>
              <label className="field-label">
                Custom nation color
                <input className="field-input" onChange={(event) => setCustomNationColor(event.target.value)} value={customNationColor} />
              </label>
              <button className="button-link" disabled={!customNationName.trim() || selectNation.isPending} type="submit">
                {selectNation.isPending ? 'Saving nation...' : 'Create nation'}
              </button>
            </form>
          ) : null}
          {selectNation.isError ? <Notice tone="error">{selectNation.error.message}</Notice> : null}
        </section>
      ) : null}

      {activeStep === 'HOMELAND' ? (
        <section className="surface-card page-card page-stack">
          <div className="page-header">
            <div className="page-header-copy">
              <h2 className="detail-title">Choose a homeland</h2>
              <p className="muted">Pick one eligible territory. The list is grouped by theatre for faster scanning.</p>
            </div>
          </div>
            <label className="field-label">
              Homeland territory
            <select className="field-input" onChange={(event) => setSelectedHomelandId(event.target.value)} value={resolvedHomelandId}>
              <option value="">Select a homeland</option>
              {Object.entries(homelandGroups).map(([theatreName, territories]) => (
                <optgroup key={theatreName} label={theatreName}>
                  {territories.map((territory) => (
                    <option key={territory.id} value={territory.id}>
                      {territory.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <div className="campaign-grid">
            {Object.entries(homelandGroups).map(([theatreName, territories]) => (
              <article key={theatreName} className="campaign-card">
                <h3>{theatreName}</h3>
                <div className="page-stack">
                  {territories.map((territory) => (
                    <button
                      key={territory.id}
                      className={resolvedHomelandId === territory.id ? 'button-link' : 'button-secondary'}
                      onClick={() => setSelectedHomelandId(territory.id)}
                      type="button"
                    >
                      {territory.name}
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </div>
          <div className="button-row">
            <button className="button-link" disabled={!selectedHomelandId || selectHomeland.isPending} onClick={() => void handleHomelandChoice()} type="button">
              {selectHomeland.isPending ? 'Saving homeland...' : 'Confirm homeland'}
            </button>
          </div>
          {selectHomeland.isError ? <Notice tone="error">{selectHomeland.error.message}</Notice> : null}
        </section>
      ) : null}

      {activeStep === 'WAITING' ? (
        <section className="surface-card page-card page-stack">
          <div className="page-header">
            <div className="page-header-copy">
              <h2 className="detail-title">Waiting for activation</h2>
              <p className="muted">Your onboarding is complete, but the campaign has not advanced to the next turn yet.</p>
            </div>
          </div>
          <Notice>
            {onboardingData.activationTurnNumber != null
              ? `You will become active at the start of turn ${onboardingData.activationTurnNumber}.`
              : 'You will become active when the GM advances the campaign.'}
          </Notice>
          <div className="button-row">
            <NavLink className="button-link" to={`/app/campaigns/${campaignId}/waiting`}>
              Open waiting page
            </NavLink>
            <NavLink className="button-secondary" to={`/app/campaigns/${campaignId}/dashboard`}>
              Open dashboard
            </NavLink>
          </div>
        </section>
      ) : null}

      {activeStep === 'CONFIRM' || onboardingData.status === 'COMPLETE' ? (
        <section className="surface-card page-card page-stack">
          <div className="page-header">
            <div className="page-header-copy">
              <h2 className="detail-title">Confirm setup</h2>
              <p className="muted">Review the selected faction, nation, and homeland before finalizing your membership.</p>
            </div>
          </div>
          <div className="detail-list">
            <div className="detail-row">
              <dt>Faction</dt>
              <dd>{onboardingData.selectedFaction?.name ?? 'Unassigned'}</dd>
            </div>
            <div className="detail-row">
              <dt>Nation</dt>
              <dd>{onboardingData.selectedNation?.name ?? 'Unassigned'}</dd>
            </div>
            <div className="detail-row">
              <dt>Homeland</dt>
              <dd>{onboardingData.selectedHomeland?.name ?? 'Unassigned'}</dd>
            </div>
            <div className="detail-row">
              <dt>Starter platoon</dt>
              <dd>{onboardingData.starterPlatoonName}</dd>
            </div>
          </div>
          <Notice>
            {onboardingData.activationStatus === 'PENDING_NEXT_TURN'
              ? `Your homeland and ${onboardingData.starterPlatoonName} will materialize at the next turn transition.`
              : `Your homeland and ${onboardingData.starterPlatoonName} are active now.`}
          </Notice>
          {onboardingData.status !== 'COMPLETE' ? (
            <div className="button-row">
              <button className="button-link" disabled={completeOnboarding.isPending} onClick={() => void handleComplete()} type="button">
                {completeOnboarding.isPending ? 'Finalizing setup...' : 'Complete onboarding'}
              </button>
              <NavLink className="button-secondary" to={`/app/campaigns/${campaignId}/dashboard`}>
                Return later
              </NavLink>
            </div>
          ) : (
            <div className="button-row">
              <button
                className="button-link"
                onClick={() => {
                  setTutorialRequested(true)
                  setTutorialDismissed(false)
                  setTutorialStep(0)
                }}
                type="button"
              >
                Replay tutorial
              </button>
              <NavLink className="button-secondary" to={onboardingData.activationStatus === 'PENDING_NEXT_TURN' ? `/app/campaigns/${campaignId}/waiting` : `/app/campaigns/${campaignId}/dashboard`}>
                Continue
              </NavLink>
            </div>
          )}
          {completeOnboarding.isError ? <Notice tone="error">{completeOnboarding.error.message}</Notice> : null}
        </section>
      ) : null}

      <Notice>
        {onboardingData.status === 'COMPLETE'
          ? `Setup is complete. Tutorial ${tutorialCompleted ? 'has already been recorded' : 'can still be replayed'} from this page.`
          : 'You can return to this flow later. Progress is stored by the backend after each step.'}
      </Notice>

      <OnboardingWalkthrough
        currentStep={tutorialStep}
        open={tutorialOpen}
        onClose={() => {
          setTutorialRequested(false)
          setTutorialDismissed(true)
        }}
        onFinish={() => void finishTutorial()}
        onNext={() => setTutorialStep((value) => Math.min(value + 1, 4))}
        onPrevious={() => setTutorialStep((value) => Math.max(value - 1, 0))}
        onSkip={() => void finishTutorial()}
        steps={[
          {
            title: 'Dashboard',
            body: 'The dashboard shows the current phase, turn, and the next action you should take.',
          },
          {
            title: 'Lobby',
            body: 'The lobby is where your role, faction, and nation assignment are shown before play begins.',
          },
          {
            title: 'Map',
            body: 'Use the map to inspect territories, selections, and campaign geography.',
          },
          {
            title: 'Orders',
            body: 'Orders are saved and locked from the campaign workflow once your membership is active.',
          },
          {
            title: 'Help and notifications',
            body: 'Use help topics for rules context and the notifications drawer for campaign links.',
          },
        ]}
      />
    </section>
  )
}
