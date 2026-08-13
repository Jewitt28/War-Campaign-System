import { NavLink, useParams } from 'react-router-dom'
import { useCampaign, useCampaignMap, useCampaignPhase } from '../../features/campaigns'
import { SkeletonCard, StateCard } from '../components'

function formatTimestamp(date: Date | null) {
  if (!date) {
    return 'Not scheduled'
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function CampaignDashboardPage() {
  const { campaignId = '' } = useParams()
  const campaign = useCampaign(campaignId)
  const mapSummary = useCampaignMap(campaignId)
  const phase = useCampaignPhase(campaignId)

  if (campaign.isLoading || mapSummary.isLoading || phase.isLoading) {
    return (
      <div className="page-stack">
        <SkeletonCard lines={4} />
        <SkeletonCard lines={4} />
      </div>
    )
  }

  if (campaign.isError || mapSummary.isError || phase.isError || !campaign.data || !mapSummary.data || !phase.data) {
    return (
      <StateCard
        title="Dashboard unavailable"
        description="The campaign dashboard could not be loaded from the current backend projections."
      />
    )
  }

  const isGm = campaign.data.myMembership.role === 'GM'
  const onboarding = campaign.data.myMembership.onboarding
  const pendingActivation = !isGm && onboarding?.activationStatus === 'PENDING_NEXT_TURN'
  const currentPhase = phase.data.currentPhase
  const currentTurnNumber = phase.data.currentTurnNumber

  function phaseGuidance(): { title: string; body: string } {
    if (pendingActivation) {
      return {
        title: 'Activation scheduled for next turn',
        body: 'Your nation and starter package are staged. Review the campaign in read-only mode until the next turn begins.',
      }
    }
    switch (currentPhase) {
      case 'LOBBY':
        return {
          title: 'Campaign is in the lobby',
          body: 'The GM is setting up the campaign. Once all players have joined and assignments are confirmed, the GM will start the first turn.',
        }
      case 'STRATEGIC':
        return {
          title: 'Strategic phase — review your position',
          body: 'Study the map and review your forces. The Operations phase will begin shortly — prepare your orders.',
        }
      case 'OPERATIONS':
        return {
          title: 'Operations phase — submit your orders',
          body: `Turn ${currentTurnNumber}: Issue orders to each of your platoons, then lock your submission. Once all players lock, the turn resolves automatically.`,
        }
      case 'RESOLUTION':
        return {
          title: 'Resolution in progress',
          body: 'Turn results are being processed. Check the Events and Battles pages to see outcomes. The next Strategic phase will begin shortly.',
        }
      default:
        return {
          title: isGm ? 'Manage readiness and advance the loop' : 'Review status and prepare your move',
          body: isGm
            ? 'Check assignments in the lobby, review map state, and advance the campaign when the table is ready.'
            : 'Use the lobby to verify your assignment, then move into map and orders pages as they come online.',
        }
    }
  }

  const guidance = phaseGuidance()

  return (
    <div className="hero-grid">
      <section className="surface-card page-card page-stack">
        <p className="eyebrow">Situation</p>
        <h2 className="detail-title">Campaign status</h2>
        <div className="detail-list">
          <div className="detail-row">
            <dt>Phase</dt>
            <dd>{phase.data.currentPhase}</dd>
          </div>
          <div className="detail-row">
            <dt>Turn</dt>
            <dd>{phase.data.currentTurnNumber}</dd>
          </div>
          <div className="detail-row">
            <dt>Phase deadline</dt>
            <dd>{formatTimestamp(phase.data.phaseEndsAt)}</dd>
          </div>
          <div className="detail-row">
            <dt>Fog of war</dt>
            <dd>{mapSummary.data.fogOfWarEnabled ? 'Enabled' : 'Disabled'}</dd>
          </div>
          <div className="detail-row">
            <dt>Role</dt>
            <dd>{campaign.data.myMembership.role}</dd>
          </div>
        </div>
      </section>

      <section className="surface-card surface-card-strong page-card page-stack">
        <p className="eyebrow">Next action</p>
        <h2 className="detail-title">{guidance.title}</h2>
        <p className="muted">{guidance.body}</p>
        <div className="button-row">
          {pendingActivation ? (
            <NavLink className="button-link" to={`/app/campaigns/${campaignId}/waiting`}>
              Open waiting page
            </NavLink>
          ) : null}
          {currentPhase === 'OPERATIONS' ? (
            <NavLink className="button-link" to={`/app/campaigns/${campaignId}/orders`}>
              Submit orders
            </NavLink>
          ) : null}
          {currentPhase === 'RESOLUTION' ? (
            <NavLink className="button-link" to={`/app/campaigns/${campaignId}/events`}>
              View events
            </NavLink>
          ) : null}
          <NavLink
            className={currentPhase === 'OPERATIONS' || currentPhase === 'RESOLUTION' ? 'button-secondary' : 'button-link'}
            to={`/app/campaigns/${campaignId}/map`}
          >
            Open map
          </NavLink>
          <NavLink className="button-secondary" to={`/app/campaigns/${campaignId}/lobby`}>
            Lobby
          </NavLink>
          {isGm ? (
            <NavLink className="button-secondary" to={`/app/campaigns/${campaignId}/admin`}>
              GM admin
            </NavLink>
          ) : null}
        </div>
      </section>
    </div>
  )
}
