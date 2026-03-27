import { useState } from 'react'
import { NavLink, useParams } from 'react-router-dom'
import { useCampaign } from '../../features/campaigns'
import { useCampaignPlatoon, useCampaignPlatoons } from '../../features/platoons'
import { Notice, SkeletonCard, StateCard } from '../components'

export function CampaignPlatoonsPage() {
  const { campaignId = '' } = useParams()
  const campaign = useCampaign(campaignId)
  const platoons = useCampaignPlatoons(campaignId)
  const [selectedPlatoonId, setSelectedPlatoonId] = useState('')
  const platoonList = platoons.data ?? []
  const activePlatoonId = platoonList.length === 0
    ? ''
    : platoonList.some((platoon) => platoon.id === selectedPlatoonId)
      ? selectedPlatoonId
      : platoonList[0].id

  const platoonDetail = useCampaignPlatoon(campaignId, activePlatoonId, Boolean(activePlatoonId))

  if (campaign.isLoading || platoons.isLoading || platoonDetail.isLoading) {
    return (
      <div className="page-stack">
        <SkeletonCard lines={4} />
        <SkeletonCard lines={5} />
      </div>
    )
  }

  if (campaign.isError || !campaign.data || platoons.isError || !platoons.data || platoonDetail.isError) {
    return <StateCard title="Platoons unavailable" description="The platoon list or selected platoon detail could not be loaded." />
  }

  const pendingActivation =
    campaign.data.myMembership.role === 'PLAYER' &&
    campaign.data.myMembership.onboarding?.activationStatus === 'PENDING_NEXT_TURN'

  if (platoons.data.length === 0) {
    return <StateCard title="No visible platoons" description="This role currently has no visible platoons in the current turn read model." />
  }

  const detail = platoonDetail.data

  return (
    <section className="page-stack">
      {pendingActivation ? (
        <Notice>
          Platoon detail is read-only until your nation activates next turn. Review visibility here and track activation on the{' '}
          <NavLink to={`/app/campaigns/${campaignId}/waiting`}>waiting page</NavLink>.
        </Notice>
      ) : null}

      <div className="page-header">
        <div className="page-header-copy">
          <p className="eyebrow">Platoons</p>
          <h2 className="detail-title">Force state</h2>
          <p className="muted">Review visible platoons, inspect the selected unit, and jump back to campaign geography where useful.</p>
        </div>
      </div>

      <div className="map-layout">
        <section className="surface-card page-card page-stack">
          <h3 className="detail-title">Visible platoons</h3>
          <div className="territory-grid">
            {platoons.data.map((platoon) => (
              <button
                key={platoon.id}
                className={platoon.id === activePlatoonId ? 'territory-tile territory-tile-active' : 'territory-tile'}
                onClick={() => setSelectedPlatoonId(platoon.id)}
                type="button"
              >
                <strong>{platoon.name}</strong>
                <span>{platoon.currentTerritory?.name ?? 'Unknown territory'}</span>
              </button>
            ))}
          </div>
        </section>

        <aside className="surface-card page-card page-stack">
          {detail ? (
            <>
              <div className="section-stack" style={{ gap: 6 }}>
                <p className="eyebrow">{detail.unitType}</p>
                <h3>{detail.name}</h3>
                <p className="muted">{detail.currentTerritory?.name ?? 'Unknown territory'}</p>
              </div>
              <div className="detail-list">
                <div className="detail-row">
                  <dt>Faction</dt>
                  <dd>{detail.faction.name}</dd>
                </div>
                <div className="detail-row">
                  <dt>Nation</dt>
                  <dd>{detail.nation?.name ?? 'Unassigned'}</dd>
                </div>
                <div className="detail-row">
                  <dt>Readiness</dt>
                  <dd>{detail.readinessStatus}</dd>
                </div>
                <div className="detail-row">
                  <dt>Strength</dt>
                  <dd>{detail.strength}</dd>
                </div>
                <div className="detail-row">
                  <dt>Home territory</dt>
                  <dd>{detail.homeTerritory?.name ?? 'Unknown'}</dd>
                </div>
              </div>
              {'hiddenFromPlayers' in detail ? (
                <Notice>GM detail includes assignment and notes fields when present.</Notice>
              ) : null}
              <div className="button-row">
                <NavLink className="button-secondary" to={`/app/campaigns/${campaignId}/map`}>
                  Open map
                </NavLink>
                <NavLink className="button-secondary" to={`/app/help?campaignId=${campaignId}#platoons`}>
                  Platoon help
                </NavLink>
              </div>
            </>
          ) : (
            <Notice>Select a platoon to inspect it.</Notice>
          )}
        </aside>
      </div>
    </section>
  )
}
