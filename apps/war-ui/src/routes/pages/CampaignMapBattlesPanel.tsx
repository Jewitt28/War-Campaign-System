import { useMemo, useState } from 'react'
import { NavLink, useParams } from 'react-router-dom'
import { useCampaignMap, useCampaignPhase } from '../../features/campaigns'
import { useBattleDetail, useRecordBattleResult, useResolutionSummary, useResolveTurn, type BattleDetail } from '../../features/resolution'
import { useCampaignStore } from '../../store/useCampaignStore'
import { Notice, SkeletonCard } from '../components'

const CONDITION_OPTIONS = ['ACTIVE', 'WORN', 'DEPLETED', 'SHATTERED']

function BattleResultEditor({
  detail,
  isPending,
  isError,
  errorMessage,
  onSubmit,
}: {
  detail: BattleDetail
  isPending: boolean
  isError: boolean
  errorMessage?: string
  onSubmit: (payload: {
    tabletopResultSummary: string
    winnerFactionId: string
    participantResults: {
      platoonId: string
      postConditionBand: string
    }[]
  }) => void
}) {
  const [tabletopResultSummary, setTabletopResultSummary] = useState(detail.tabletopResultSummary ?? '')
  const [winnerFactionId, setWinnerFactionId] = useState(detail.attackerFactionId)
  const [participantBands, setParticipantBands] = useState<Record<string, string>>(
    Object.fromEntries(
      detail.participants.map((participant) => [
        participant.platoonId,
        participant.postConditionBand ?? participant.preConditionBand ?? 'ACTIVE',
      ]),
    ),
  )

  return (
    <>
      <label className="field-label">
        Winning faction
        <select className="field-input" onChange={(event) => setWinnerFactionId(event.target.value)} value={winnerFactionId}>
          <option value={detail.attackerFactionId}>{detail.attackerFactionName}</option>
          <option value={detail.defenderFactionId}>{detail.defenderFactionName}</option>
        </select>
      </label>

      <label className="field-label">
        Tabletop result summary
        <textarea
          className="field-input field-textarea"
          onChange={(event) => setTabletopResultSummary(event.target.value)}
          value={tabletopResultSummary}
        />
      </label>

      <div className="campaign-grid">
        {detail.participants.map((participant) => (
          <article key={`${participant.platoonId}-${participant.side}`} className="campaign-card">
            <h3>{participant.platoonName}</h3>
            <p className="muted">
              {participant.side} · {participant.factionName}
              {participant.nationName ? ` · ${participant.nationName}` : ''}
            </p>
            <label className="field-label">
              Post-battle condition
              <select
                className="field-input"
                onChange={(event) =>
                  setParticipantBands((current) => ({
                    ...current,
                    [participant.platoonId]: event.target.value,
                  }))
                }
                value={participantBands[participant.platoonId] ?? participant.postConditionBand ?? participant.preConditionBand ?? 'ACTIVE'}
              >
                {CONDITION_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </article>
        ))}
      </div>

      <div className="button-row">
        <button
          className="button-link"
          disabled={isPending || !tabletopResultSummary.trim()}
          onClick={() =>
            onSubmit({
              tabletopResultSummary,
              winnerFactionId,
              participantResults: detail.participants.map((participant) => ({
                platoonId: participant.platoonId,
                postConditionBand:
                  participantBands[participant.platoonId] ?? participant.postConditionBand ?? participant.preConditionBand ?? 'ACTIVE',
              })),
            })
          }
          type="button"
        >
          {isPending ? 'Recording...' : 'Record Result'}
        </button>
      </div>
      {isError ? <Notice tone="error">{errorMessage}</Notice> : null}
    </>
  )
}

export function CampaignMapBattlesPanel() {
  const { campaignId = '' } = useParams()
  const selectedTerritoryId = useCampaignStore((state) => state.selectedTerritoryId)
  const viewerMode = useCampaignStore((state) => state.viewerMode)
  const phase = useCampaignPhase(campaignId)
  const mapSummary = useCampaignMap(campaignId)
  const turnNumber = phase.data?.currentTurnNumber ?? 0
  const resolution = useResolutionSummary(campaignId, turnNumber, Boolean(campaignId && turnNumber && viewerMode === 'GM'))
  const [selectedBattleId, setSelectedBattleId] = useState('')

  const selectedBackendTerritory = useMemo(() => {
    if (!mapSummary.data || !selectedTerritoryId) {
      return null
    }

    return mapSummary.data.territories.find((territory) => territory.key === selectedTerritoryId) ?? null
  }, [mapSummary.data, selectedTerritoryId])

  const filteredBattles = useMemo(() => {
    const battles = resolution.data?.battles ?? []
    if (!selectedBackendTerritory) {
      return battles
    }

    return battles.filter((battle) => battle.territoryId === selectedBackendTerritory.id)
  }, [resolution.data?.battles, selectedBackendTerritory])

  const activeBattleId =
    filteredBattles.length === 0
      ? ''
      : filteredBattles.some((battle) => battle.battleId === selectedBattleId)
        ? selectedBattleId
        : filteredBattles[0].battleId

  const detail = useBattleDetail(campaignId, activeBattleId, Boolean(campaignId && activeBattleId && viewerMode === 'GM'))
  const resolveTurn = useResolveTurn(campaignId, turnNumber)
  const recordBattleResult = useRecordBattleResult(campaignId, activeBattleId)

  const canGenerateResolution =
    phase.data?.currentPhase === 'RESOLUTION' &&
    (resolution.data?.battleCount ?? 0) === 0 &&
    (resolution.data?.eventCount ?? 0) === 0

  if (viewerMode !== 'GM') {
    return (
      <Notice>
        Battle generation and result entry are GM-only for now. Players still reach battle context through the main
        map and platoon views.
      </Notice>
    )
  }

  if (phase.isLoading || mapSummary.isLoading || resolution.isLoading) {
    return <SkeletonCard lines={4} />
  }

  if (phase.isError || mapSummary.isError || resolution.isError || !phase.data || !mapSummary.data || !resolution.data) {
    return <Notice tone="error">Battle tools could not be loaded from the current campaign resolution feed.</Notice>
  }

  return (
    <div className="page-stack">
      <div className="page-header">
        <div className="page-header-copy">
          <h3 className="detail-title">Battles from the map</h3>
          <p className="muted">
            {selectedBackendTerritory
              ? `Focused on ${selectedBackendTerritory.name}.`
              : 'Select a territory on the map to focus its generated battles.'}
          </p>
        </div>
        <div className="button-row">
          <NavLink className="button-secondary" to={`/app/campaigns/${campaignId}/battles`}>
            Full battles page
          </NavLink>
          <button
            className="button-link"
            disabled={!canGenerateResolution || resolveTurn.isPending}
            onClick={() => resolveTurn.mutate()}
            type="button"
          >
            {resolveTurn.isPending ? 'Generating...' : 'Generate Battles'}
          </button>
        </div>
      </div>

      {resolveTurn.isError ? <Notice tone="error">{resolveTurn.error.message}</Notice> : null}

      {filteredBattles.length === 0 ? (
        <Notice>
          {selectedBackendTerritory
            ? 'No generated battle currently targets the selected territory.'
            : 'No battles have been generated for the active turn yet.'}
        </Notice>
      ) : (
        <div className="page-stack">
          <div className="territory-grid">
            {filteredBattles.map((battle) => (
              <button
                key={battle.battleId}
                className={battle.battleId === activeBattleId ? 'territory-tile territory-tile-active' : 'territory-tile'}
                onClick={() => setSelectedBattleId(battle.battleId)}
                type="button"
              >
                <strong>{battle.territoryName}</strong>
                <span>{battle.attackerFactionName} vs {battle.defenderFactionName}</span>
              </button>
            ))}
          </div>

          {detail.isLoading ? (
            <SkeletonCard lines={5} />
          ) : detail.data ? (
            <section className="surface-card page-card page-stack">
              <div className="pill-row">
                <span className="meta-pill">{detail.data.battleStatus}</span>
                <span className="meta-pill">{detail.data.battleMode}</span>
                <span className="meta-pill">Turn {detail.data.turnNumber}</span>
              </div>

              <div className="detail-list">
                <div className="detail-row">
                  <dt>Territory</dt>
                  <dd>{detail.data.territoryName}</dd>
                </div>
                <div className="detail-row">
                  <dt>Forces</dt>
                  <dd>{detail.data.attackerFactionName} vs {detail.data.defenderFactionName}</dd>
                </div>
                <div className="detail-row">
                  <dt>Scenario</dt>
                  <dd>{detail.data.scenarioKey ?? 'Unassigned'}</dd>
                </div>
              </div>

              {detail.data.battleStatus !== 'RESOLVED' ? (
                <BattleResultEditor
                  key={detail.data.battleId}
                  detail={detail.data}
                  errorMessage={recordBattleResult.error?.message}
                  isError={recordBattleResult.isError}
                  isPending={recordBattleResult.isPending}
                  onSubmit={(payload) => recordBattleResult.mutate(payload)}
                />
              ) : (
                <>
                  <div className="campaign-grid">
                    {detail.data.participants.map((participant) => (
                      <article key={`${participant.platoonId}-${participant.side}`} className="campaign-card">
                        <h3>{participant.platoonName}</h3>
                        <p className="muted">
                          {participant.side} · {participant.factionName}
                          {participant.nationName ? ` · ${participant.nationName}` : ''}
                        </p>
                        <p className="muted">
                          Final condition: {participant.postConditionBand ?? participant.preConditionBand ?? 'ACTIVE'}
                        </p>
                      </article>
                    ))}
                  </div>
                  <Notice tone="success">{detail.data.tabletopResultSummary ?? 'Battle result recorded.'}</Notice>
                </>
              )}
            </section>
          ) : null}
        </div>
      )}
    </div>
  )
}
