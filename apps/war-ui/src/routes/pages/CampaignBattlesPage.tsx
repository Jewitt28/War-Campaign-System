import { useState } from 'react'
import { NavLink, useParams } from 'react-router-dom'
import { useCampaign, useCampaignPhase } from '../../features/campaigns'
import { useBattleDetail, useRecordBattleResult, useResolutionSummary } from '../../features/resolution'
import { Notice, SkeletonCard, StateCard } from '../components'

export function CampaignBattlesPage() {
  const { campaignId = '' } = useParams()
  const campaign = useCampaign(campaignId)
  const phase = useCampaignPhase(campaignId)
  const turnNumber = phase.data?.currentTurnNumber ?? 0
  const resolution = useResolutionSummary(campaignId, turnNumber, Boolean(turnNumber && campaign.data?.myMembership.role === 'GM'))
  const [selectedBattleId, setSelectedBattleId] = useState('')
  const battleList = resolution.data?.battles ?? []
  const activeBattleId = battleList.length === 0
    ? ''
    : battleList.some((battle) => battle.battleId === selectedBattleId)
      ? selectedBattleId
      : battleList[0].battleId
  const detail = useBattleDetail(campaignId, activeBattleId, Boolean(activeBattleId && campaign.data?.myMembership.role === 'GM'))
  const recordResult = useRecordBattleResult(campaignId, activeBattleId)
  const [tabletopResultSummary, setTabletopResultSummary] = useState('')

  if (campaign.isLoading || phase.isLoading || (campaign.data?.myMembership.role === 'GM' && resolution.isLoading)) {
    return <SkeletonCard lines={5} />
  }

  if (campaign.isError || !campaign.data || phase.isError || !phase.data) {
    return <StateCard title="Battles unavailable" description="The campaign or phase context could not be loaded." />
  }

  if (campaign.data.myMembership.role !== 'GM') {
    return (
      <StateCard
        title="Battle list pending player feed"
        description="Battle detail reads exist, but the backend does not yet expose a player-safe battle list endpoint. This page is full for GM sessions only."
        actions={<NavLink className="button-link" to={`/app/campaigns/${campaignId}/platoons`}>Open platoons instead</NavLink>}
      />
    )
  }

  if (resolution.isError || !resolution.data) {
    return <StateCard title="Resolution feed unavailable" description="GM battle views currently depend on the turn resolution summary feed." />
  }

  return (
    <section className="page-stack">
      <div className="page-header">
        <div className="page-header-copy">
          <p className="eyebrow">Battles</p>
          <h2 className="detail-title">Current turn engagements</h2>
          <p className="muted">GM view of generated battles for the active turn, with battle result entry when the backend supports it.</p>
        </div>
      </div>

      {resolution.data.battles.length === 0 ? (
        <StateCard title="No generated battles" description="No battles exist in the current resolution summary for this turn." />
      ) : (
        <div className="map-layout">
          <section className="surface-card page-card page-stack">
            <h3 className="detail-title">Battle list</h3>
            <div className="territory-grid">
              {resolution.data.battles.map((battle) => (
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
          </section>

          <aside className="surface-card page-card page-stack">
            {detail.isLoading ? (
              <SkeletonCard lines={5} />
            ) : detail.data ? (
              <>
                <div className="section-stack" style={{ gap: 6 }}>
                  <p className="eyebrow">{detail.data.battleMode}</p>
                  <h3>{detail.data.territoryName}</h3>
                  <p className="muted">{detail.data.attackerFactionName} vs {detail.data.defenderFactionName}</p>
                </div>
                <div className="detail-list">
                  <div className="detail-row">
                    <dt>Status</dt>
                    <dd>{detail.data.battleStatus}</dd>
                  </div>
                  <div className="detail-row">
                    <dt>Scenario</dt>
                    <dd>{detail.data.scenarioKey ?? 'Unassigned'}</dd>
                  </div>
                  <div className="detail-row">
                    <dt>Result</dt>
                    <dd>{detail.data.tabletopResultSummary ?? 'Not yet recorded'}</dd>
                  </div>
                </div>
                <div className="campaign-grid">
                  {detail.data.participants.map((participant) => (
                    <article key={`${participant.platoonId}-${participant.side}`} className="campaign-card">
                      <h3>{participant.platoonName}</h3>
                      <p className="muted">{participant.side} / {participant.factionName}</p>
                    </article>
                  ))}
                </div>
                {detail.data.battleStatus !== 'RESOLVED' ? (
                  <>
                    <label className="field-label">
                      GM tabletop result summary
                      <textarea
                        className="field-input field-textarea"
                        onChange={(event) => setTabletopResultSummary(event.target.value)}
                        value={tabletopResultSummary}
                      />
                    </label>
                    <div className="button-row">
                      <button
                        className="button-link"
                        disabled={recordResult.isPending || !tabletopResultSummary.trim()}
                        onClick={() =>
                          recordResult.mutate({
                            tabletopResultSummary,
                            winnerFactionId: detail.data.attackerFactionId,
                            participantResults: detail.data.participants.map((participant) => ({
                              platoonId: participant.platoonId,
                              postConditionBand: participant.postConditionBand ?? participant.preConditionBand ?? 'ACTIVE',
                            })),
                          })
                        }
                        type="button"
                      >
                        {recordResult.isPending ? 'Recording...' : 'Record result'}
                      </button>
                    </div>
                    {recordResult.isError ? <Notice tone="error">{recordResult.error.message}</Notice> : null}
                  </>
                ) : null}
              </>
            ) : (
              <Notice>Select a battle to inspect it.</Notice>
            )}
          </aside>
        </div>
      )}
    </section>
  )
}
