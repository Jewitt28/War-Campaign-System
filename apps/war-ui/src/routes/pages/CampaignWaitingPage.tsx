import { NavLink, useParams } from 'react-router-dom'
import { useCampaign } from '../../features/campaigns'
import { useCampaignOnboarding } from '../../features/onboarding'
import { Notice, SkeletonCard, StateCard } from '../components'

export function CampaignWaitingPage() {
  const { campaignId = '' } = useParams()
  const campaign = useCampaign(campaignId)
  const onboarding = useCampaignOnboarding(campaignId)

  if (campaign.isLoading || onboarding.isLoading) {
    return (
      <div className="page-stack">
        <SkeletonCard lines={4} />
        <SkeletonCard lines={4} />
      </div>
    )
  }

  if (campaign.isError || onboarding.isError || !campaign.data || !onboarding.data) {
    return (
      <StateCard
        title="Waiting state unavailable"
        description="The activation waiting view could not be loaded for this campaign membership."
        actions={<NavLink className="button-link" to={`/app/campaigns/${campaignId}`}>Return to campaign</NavLink>}
      />
    )
  }

  const activationTurn = onboarding.data.activationTurnNumber

  if (onboarding.data.activationStatus !== 'PENDING_NEXT_TURN') {
    return (
      <StateCard
        title="Activation complete"
        description="This membership is active. Return to the dashboard or map to continue play."
        actions={<NavLink className="button-link" to={`/app/campaigns/${campaignId}/dashboard`}>Open dashboard</NavLink>}
      />
    )
  }

  return (
    <section className="page-stack">
      <div className="hero-grid">
        <section className="surface-card page-card page-stack">
          <p className="eyebrow">Waiting state</p>
          <h1 className="page-title">{campaign.data.name}</h1>
          <p className="muted">
            You have completed onboarding. The backend will activate your homeland and starter platoon at the start of the next turn.
          </p>
          <div className="detail-list">
            <div className="detail-row">
              <dt>Activation turn</dt>
              <dd>{activationTurn ?? 'Next turn'}</dd>
            </div>
            <div className="detail-row">
              <dt>Starter platoon</dt>
              <dd>{onboarding.data.starterPlatoonName}</dd>
            </div>
            <div className="detail-row">
              <dt>Current state</dt>
              <dd>{onboarding.data.activationStatus}</dd>
            </div>
          </div>
        </section>

        <section className="surface-card surface-card-strong page-card page-stack">
          <p className="eyebrow">What you can do now</p>
          <h2 className="detail-title">Read-only until activation</h2>
          <p className="muted">
            You can review the campaign, read help topics, and watch for notifications. Orders and platoon edits remain locked until activation.
          </p>
          <div className="button-row">
            <NavLink className="button-link" to={`/app/campaigns/${campaignId}/dashboard`}>
              Open dashboard
            </NavLink>
            <NavLink className="button-secondary" to={`/app/campaigns/${campaignId}/map`}>
              Open map
            </NavLink>
            <NavLink className="button-secondary" to="/app/help">
              Help topics
            </NavLink>
            <NavLink className="button-secondary" to={`/app/campaigns/${campaignId}/onboarding?tour=1`}>
              Replay tutorial
            </NavLink>
          </div>
        </section>
      </div>

      <Notice>
        Your membership will become fully playable when the campaign advances to the next turn.
      </Notice>
    </section>
  )
}
