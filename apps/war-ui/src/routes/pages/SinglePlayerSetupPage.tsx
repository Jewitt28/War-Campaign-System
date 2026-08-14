import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useGetSpSetupData, useCompleteSpSetup, useCreateSpCustomNation } from '../../features/admin'
import type { SpNation, SpSetupNationChoice } from '../../features/admin'
import { ColourSwatchPicker, Notice, SkeletonCard, StateCard } from '../components'
import { OnboardingWalkthrough } from './onboarding/OnboardingWalkthrough'
import { DEFAULT_WALKTHROUGH_STEPS } from './onboarding/walkthroughSteps'

type NationAssignment = 'HUMAN' | 'CPU' | 'INACTIVE'
type CpuStrategy = 'AGGRESSIVE' | 'DEFENSIVE' | 'BALANCED'

type NationState = {
  assignment: NationAssignment
  cpuStrategy: CpuStrategy
  homelandTerritoryKey: string | null
}

const FACTION_ORDER = ['allies', 'axis', 'ussr', null]
const FACTION_LABELS: Record<string, string> = {
  allies: 'Allied Forces',
  axis: 'Axis Powers',
  ussr: 'Soviet Bloc',
}
const FACTION_OPTIONS = [
  { key: 'allies', label: 'Allied Forces' },
  { key: 'axis', label: 'Axis Powers' },
  { key: 'ussr', label: 'Soviet Bloc' },
]

function groupByFaction(nations: SpNation[]): [string | null, SpNation[]][] {
  const groups = new Map<string | null, SpNation[]>()
  for (const faction of FACTION_ORDER) {
    groups.set(faction, [])
  }
  for (const nation of nations) {
    const key = nation.factionKey
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(nation)
  }
  return Array.from(groups.entries()).filter(([, members]) => members.length > 0)
}

export function SinglePlayerSetupPage() {
  const navigate = useNavigate()
  const { campaignId = '' } = useParams()
  const setupData = useGetSpSetupData(campaignId)
  const completeSetup = useCompleteSpSetup(campaignId)
  const createCustomNation = useCreateSpCustomNation(campaignId)

  const [assignments, setAssignments] = useState<Record<string, NationState>>({})
  const [groupByFactionEnabled, setGroupByFactionEnabled] = useState(true)
  const [setupResult, setSetupResult] = useState<{ humanNationName: string; cpuCount: number; redirectPath: string } | null>(null)
  const [step, setStep] = useState<'ASSIGN' | 'CONFIRM'>('ASSIGN')
  const [tutorialOpen, setTutorialOpen] = useState(false)
  const [tutorialStep, setTutorialStep] = useState(0)

  // Custom nation form state
  const [customNationName, setCustomNationName] = useState('')
  const [customNationFaction, setCustomNationFaction] = useState('')
  const [customNationColour, setCustomNationColour] = useState('')
  const [showCustomForm, setShowCustomForm] = useState(false)

  function getState(nationKey: string): NationState {
    return assignments[nationKey] ?? { assignment: 'INACTIVE', cpuStrategy: 'BALANCED', homelandTerritoryKey: null }
  }

  function setAssignment(nationKey: string, assignment: NationAssignment, suggestedHomeland: string | null) {
    setAssignments((prev) => {
      const updated: Record<string, NationState> = {}
      for (const [key, state] of Object.entries(prev)) {
        updated[key] = assignment === 'HUMAN' && state.assignment === 'HUMAN'
          ? { ...state, assignment: 'INACTIVE' }
          : state
      }
      const existing = updated[nationKey] ?? { cpuStrategy: 'BALANCED' as CpuStrategy, homelandTerritoryKey: null }
      updated[nationKey] = {
        ...existing,
        assignment,
        homelandTerritoryKey: assignment === 'HUMAN' ? (existing.homelandTerritoryKey ?? suggestedHomeland) : existing.homelandTerritoryKey,
      }
      return updated
    })
  }

  function setCpuStrategy(nationKey: string, strategy: CpuStrategy) {
    setAssignments((prev) => ({
      ...prev,
      [nationKey]: { ...(prev[nationKey] ?? { assignment: 'CPU' as NationAssignment, homelandTerritoryKey: null }), cpuStrategy: strategy },
    }))
  }

  function setHomeland(nationKey: string, key: string) {
    setAssignments((prev) => ({
      ...prev,
      [nationKey]: { ...(prev[nationKey] ?? { assignment: 'INACTIVE' as NationAssignment, cpuStrategy: 'BALANCED' as CpuStrategy, homelandTerritoryKey: null }), homelandTerritoryKey: key || null },
    }))
  }

  const humanCount = Object.values(assignments).filter((s) => s.assignment === 'HUMAN').length

  function handleReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (humanCount !== 1) return
    setStep('CONFIRM')
  }

  async function handleConfirmStart() {
    const nations: SpSetupNationChoice[] = (setupData.data?.nations ?? []).map((n) => {
      const state = getState(n.nationKey)
      return {
        nationKey: n.nationKey,
        assignment: state.assignment,
        cpuStrategy: state.assignment === 'CPU' ? state.cpuStrategy : undefined,
        homelandTerritoryKey: state.assignment === 'HUMAN' ? state.homelandTerritoryKey : undefined,
      }
    })

    const result = await completeSetup.mutateAsync(nations)
    const humanNation = setupData.data?.nations.find((n) => n.nationKey === result.humanNationKey)
    setSetupResult({
      humanNationName: humanNation?.name ?? result.humanNationKey,
      cpuCount: result.cpuNationCount,
      redirectPath: result.redirectPath,
    })
    setTutorialOpen(true)
    setTutorialStep(0)
  }

  async function handleCreateCustomNation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!customNationName.trim()) return

    await createCustomNation.mutateAsync({
      name: customNationName.trim(),
      factionKey: customNationFaction || null,
      color: customNationColour || null,
    })
    setCustomNationName('')
    setCustomNationFaction('')
    setCustomNationColour('')
    setShowCustomForm(false)
  }

  // Post-setup confirmation screen
  if (setupResult) {
    return (
      <section className="page-stack">
        <div className="page-header">
          <div className="page-header-copy">
            <p className="eyebrow">Setup complete</p>
            <h1 className="page-title">Campaign ready</h1>
          </div>
        </div>
        <section className="surface-card surface-card-strong page-card page-stack">
          <p className="eyebrow">Summary</p>
          <h2 className="detail-title">You are playing as {setupResult.humanNationName}</h2>
          <div className="detail-list">
            <div className="detail-row">
              <dt>CPU opponents</dt>
              <dd>{setupResult.cpuCount}</dd>
            </div>
            <div className="detail-row">
              <dt>Starting phase</dt>
              <dd>Strategic — review your position before orders open</dd>
            </div>
            <div className="detail-row">
              <dt>AI GM</dt>
              <dd>Enabled — phases advance automatically when orders are locked</dd>
            </div>
          </div>
          <div className="button-row">
            <button
              className="button-link"
              onClick={() => navigate(setupResult.redirectPath)}
              type="button"
            >
              Enter campaign →
            </button>
          </div>
        </section>

        <OnboardingWalkthrough
          currentStep={tutorialStep}
          open={tutorialOpen}
          onClose={() => setTutorialOpen(false)}
          onFinish={() => setTutorialOpen(false)}
          onNext={() => setTutorialStep((value) => Math.min(value + 1, DEFAULT_WALKTHROUGH_STEPS.length - 1))}
          onPrevious={() => setTutorialStep((value) => Math.max(value - 1, 0))}
          onSkip={() => setTutorialOpen(false)}
          steps={DEFAULT_WALKTHROUGH_STEPS}
        />
      </section>
    )
  }

  if (setupData.isLoading) {
    return (
      <div className="page-stack">
        <SkeletonCard lines={4} />
        <SkeletonCard lines={6} />
      </div>
    )
  }

  if (setupData.isError || !setupData.data) {
    return (
      <StateCard
        title="Setup unavailable"
        description="Could not load the nation list for this campaign."
      />
    )
  }

  const nations = setupData.data.nations
  const territories = setupData.data.territories
  const grouped = groupByFaction(nations)

  const humanNation = nations.find((n) => getState(n.nationKey).assignment === 'HUMAN')
  const activeNations = nations.filter((n) => getState(n.nationKey).assignment !== 'INACTIVE')
  const cpuNations = nations.filter((n) => getState(n.nationKey).assignment === 'CPU')
  const inactiveCount = nations.length - activeNations.length
  const opposingActiveCount = activeNations.filter((n) => n.factionKey !== humanNation?.factionKey).length

  return (
    <section className="page-stack">
      {/* Step breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: 'var(--muted, #94a3b8)', marginBottom: 4 }}>
        <span style={{ opacity: 0.5 }}>1. Create campaign</span>
        <span>→</span>
        <span style={{ color: step === 'ASSIGN' ? 'var(--text, #fff)' : undefined, opacity: step === 'ASSIGN' ? 1 : 0.5, fontWeight: step === 'ASSIGN' ? 600 : undefined }}>2. Nation setup</span>
        <span>→</span>
        <span style={{ color: step === 'CONFIRM' ? 'var(--text, #fff)' : undefined, opacity: step === 'CONFIRM' ? 1 : 0.5, fontWeight: step === 'CONFIRM' ? 600 : undefined }}>3. Review &amp; start</span>
      </div>

      <div className="page-header">
        <div className="page-header-copy">
          <p className="eyebrow">Single player setup</p>
          <h1 className="page-title">{step === 'ASSIGN' ? 'Assign nations' : 'Review setup'}</h1>
          <p className="muted">
            {step === 'ASSIGN'
              ? 'Choose one nation to play as. Assign the rest as CPU opponents or leave them inactive. CPU nations will have orders auto-generated each turn.'
              : 'Check your assignments before starting. You can still go back and change anything.'}
          </p>
        </div>
        <div className="pill-row">
          {humanCount === 1 ? (
            <span className="meta-pill">{nations.length} nations · 1 human assigned</span>
          ) : (
            <span className="meta-pill">{nations.length} nations · no human assigned</span>
          )}
        </div>
      </div>

      {step === 'CONFIRM' ? (
        <section className="surface-card surface-card-strong page-card page-stack">
          <p className="eyebrow">Summary</p>
          <h2 className="detail-title">You will play as {humanNation?.name ?? 'Unknown nation'}</h2>
          <div className="detail-list">
            <div className="detail-row">
              <dt>Your faction</dt>
              <dd>{humanNation?.factionName ?? 'Unaligned'}</dd>
            </div>
            <div className="detail-row">
              <dt>CPU opponents</dt>
              <dd>
                {cpuNations.length === 0
                  ? 'None'
                  : cpuNations.map((n) => `${n.name} (${n.factionName ?? 'Unaligned'})`).join(', ')}
              </dd>
            </div>
            <div className="detail-row">
              <dt>Inactive nations</dt>
              <dd>{inactiveCount}</dd>
            </div>
          </div>
          {cpuNations.length === 0 ? (
            <Notice>No CPU opponents assigned — this will be a sandbox campaign with no AI resistance.</Notice>
          ) : opposingActiveCount === 0 ? (
            <Notice>All active nations share your faction — nobody is set up to oppose you.</Notice>
          ) : null}
          {completeSetup.isError ? (
            <Notice tone="error">{completeSetup.error.message}</Notice>
          ) : null}
          <div className="button-row">
            <button className="button-secondary" disabled={completeSetup.isPending} onClick={() => setStep('ASSIGN')} type="button">
              Back
            </button>
            <button className="button-link" disabled={completeSetup.isPending} onClick={() => void handleConfirmStart()} type="button">
              {completeSetup.isPending ? 'Starting campaign...' : 'Start single player campaign'}
            </button>
          </div>
        </section>
      ) : null}

      {step === 'ASSIGN' ? (
      <>
      {/* Options row */}
      <section className="surface-card page-card page-stack">
        <div className="page-header-copy">
          <h2 className="detail-title">Setup options</h2>
        </div>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={groupByFactionEnabled}
              onChange={(e) => setGroupByFactionEnabled(e.target.checked)}
            />
            <span>
              <strong>Group by faction</strong>
              <span className="muted" style={{ display: 'block', fontSize: '0.85em' }}>
                Show nations grouped under Allied / Axis / Soviet. Uncheck for a flat alphabetical list.
              </span>
            </span>
          </label>
          <button
            className="button-secondary"
            type="button"
            onClick={() => setShowCustomForm((v) => !v)}
          >
            {showCustomForm ? 'Cancel' : '+ Add custom nation'}
          </button>
        </div>

        {showCustomForm ? (
          <form className="field-grid" onSubmit={(event) => void handleCreateCustomNation(event)} style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <label className="field-label" style={{ flex: '1 1 180px' }}>
                Nation name
                <input
                  className="field-input"
                  maxLength={60}
                  onChange={(e) => setCustomNationName(e.target.value)}
                  placeholder="e.g. Free French Forces"
                  type="text"
                  value={customNationName}
                />
              </label>
              <label className="field-label" style={{ flex: '1 1 160px' }}>
                Faction (optional)
                <select
                  className="field-input"
                  onChange={(e) => setCustomNationFaction(e.target.value)}
                  value={customNationFaction}
                >
                  <option value="">Unaligned</option>
                  {FACTION_OPTIONS.map((f) => (
                    <option key={f.key} value={f.key}>{f.label}</option>
                  ))}
                </select>
              </label>
            </div>
            <ColourSwatchPicker label="Nation colour (optional)" value={customNationColour} onChange={setCustomNationColour} />
            <div className="button-row">
              <button
                className="button-link"
                disabled={!customNationName.trim() || createCustomNation.isPending}
                type="submit"
              >
                {createCustomNation.isPending ? 'Adding...' : 'Add nation'}
              </button>
            </div>
            {createCustomNation.isError ? (
              <Notice tone="error">{createCustomNation.error.message}</Notice>
            ) : null}
            {createCustomNation.isSuccess ? (
              <Notice tone="success">Nation added to the list below.</Notice>
            ) : null}
          </form>
        ) : null}
      </section>

      <form onSubmit={handleReview} className="page-stack">
        {groupByFactionEnabled ? (
          grouped.map(([factionKey, factionNations]) => (
            <section key={factionKey ?? 'unaligned'} className="surface-card page-card page-stack">
              <div className="page-header-copy">
                <h2 className="detail-title">
                  {factionKey ? (FACTION_LABELS[factionKey] ?? factionKey) : 'Unaligned / Independent'}
                </h2>
              </div>
              <div className="page-stack" style={{ gap: 4 }}>
                {factionNations.map((nation) => (
                  <NationRow
                    key={nation.nationKey}
                    nation={nation}
                    state={getState(nation.nationKey)}
                    territories={territories}
                    onAssignmentChange={(a) => setAssignment(nation.nationKey, a, nation.suggestedHomelandKey)}
                    onStrategyChange={(s) => setCpuStrategy(nation.nationKey, s)}
                    onHomelandChange={(k) => setHomeland(nation.nationKey, k)}
                  />
                ))}
              </div>
            </section>
          ))
        ) : (
          <section className="surface-card page-card page-stack">
            <div className="page-header-copy">
              <h2 className="detail-title">All nations</h2>
            </div>
            <div className="page-stack" style={{ gap: 4 }}>
              {[...nations].sort((a, b) => a.name.localeCompare(b.name)).map((nation) => (
                <NationRow
                  key={nation.nationKey}
                  nation={nation}
                  state={getState(nation.nationKey)}
                  territories={territories}
                  onAssignmentChange={(a) => setAssignment(nation.nationKey, a, nation.suggestedHomelandKey)}
                  onStrategyChange={(s) => setCpuStrategy(nation.nationKey, s)}
                  onHomelandChange={(k) => setHomeland(nation.nationKey, k)}
                />
              ))}
            </div>
          </section>
        )}

        {humanCount !== 1 ? (
          <Notice>Assign exactly one nation to "Play as me" before continuing.</Notice>
        ) : null}

        <div className="button-row">
          <button
            className="button-link"
            disabled={humanCount !== 1}
            type="submit"
          >
            Review setup →
          </button>
        </div>
      </form>
      </>
      ) : null}
    </section>
  )
}

type NationRowProps = {
  nation: SpNation
  state: NationState
  territories: { key: string; name: string }[]
  onAssignmentChange: (a: NationAssignment) => void
  onStrategyChange: (s: CpuStrategy) => void
  onHomelandChange: (key: string) => void
}

function NationRow({ nation, state, territories, onAssignmentChange, onStrategyChange, onHomelandChange }: NationRowProps) {
  const dotColour = nation.color ?? (nation.factionKey === 'allies' ? '#457b9d' : nation.factionKey === 'axis' ? '#e63946' : nation.factionKey === 'ussr' ? '#e9c46a' : '#64748b')

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 0',
        borderBottom: '1px solid var(--border, rgba(255,255,255,0.08))',
        flexWrap: 'wrap',
      }}
    >
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: dotColour,
          flexShrink: 0,
          display: 'inline-block',
        }}
      />
      <span style={{ flex: '1 1 140px', fontWeight: 500 }}>{nation.name}</span>
      {nation.factionName ? (
        <span className="meta-pill" style={{ flex: '0 0 auto' }}>{nation.factionName}</span>
      ) : (
        <span className="meta-pill" style={{ flex: '0 0 auto', opacity: 0.5 }}>Unaligned</span>
      )}
      <div style={{ flex: '0 0 auto', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {(['HUMAN', 'CPU', 'INACTIVE'] as const).map((option) => (
          <label key={option} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
            <input
              type="radio"
              name={`assignment-${nation.nationKey}`}
              value={option}
              checked={state.assignment === option}
              onChange={() => onAssignmentChange(option)}
            />
            {option === 'HUMAN' ? 'Play as me' : option === 'CPU' ? 'CPU' : 'Inactive'}
          </label>
        ))}
      </div>
      {state.assignment === 'CPU' ? (
        <select
          className="field-input"
          style={{ flex: '0 0 auto', width: 'auto', minWidth: 120 }}
          value={state.cpuStrategy}
          onChange={(e) => onStrategyChange(e.target.value as CpuStrategy)}
        >
          <option value="BALANCED">Balanced</option>
          <option value="AGGRESSIVE">Aggressive</option>
          <option value="DEFENSIVE">Defensive</option>
        </select>
      ) : null}
      {state.assignment === 'HUMAN' && territories.length > 0 ? (
        <select
          className="field-input"
          style={{ flex: '0 0 auto', width: 'auto', minWidth: 160 }}
          value={state.homelandTerritoryKey ?? nation.suggestedHomelandKey ?? ''}
          onChange={(e) => onHomelandChange(e.target.value)}
        >
          <option value="">— No homeland —</option>
          {territories.map((t) => (
            <option key={t.key} value={t.key}>{t.name}</option>
          ))}
        </select>
      ) : null}
    </div>
  )
}
