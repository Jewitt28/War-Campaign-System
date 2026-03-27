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

  return (
    <section className="page-stack">
      {pendingActivation ? (
        <StateCard
          title="Activation scheduled for next turn"
          description="Your nation and starter package are staged. You can review the campaign in read-only mode until the next turn begins."
          actions={
            <>
              <NavLink className="button-link" to={`/app/campaigns/${campaignId}/waiting`}>
                Open waiting status
              </NavLink>
              <NavLink className="button-secondary" to="/app/help#activation">
                Read activation help
              </NavLink>
            </>
          }
        />
      ) : null}

      <div className="hero-grid">
        <section className="surface-card page-card page-stack">
          <p className="eyebrow">Campaign dashboard</p>
          <h2 className="detail-title">Current situation</h2>
          <div className="detail-list">
            <div className="detail-row">
              <dt>Current phase</dt>
              <dd>{phase.data.currentPhase}</dd>
            </div>
            <div className="detail-row">
              <dt>Turn number</dt>
              <dd>{phase.data.currentTurnNumber}</dd>
            </div>
            <div className="detail-row">
              <dt>Phase deadline</dt>
              <dd>{formatTimestamp(phase.data.phaseEndsAt)}</dd>
            </div>
            <div className="detail-row">
              <dt>Rules context</dt>
              <dd>{mapSummary.data.fogOfWarEnabled ? 'Fog of war enabled' : 'Open information campaign'}</dd>
            </div>
          </div>
        </section>

        <section className="surface-card surface-card-strong page-card page-stack">
          <p className="eyebrow">Next action</p>
          <h2 className="detail-title">
            {isGm
              ? 'Manage readiness and advance the loop'
              : pendingActivation
                ? 'Review the board while activation is pending'
                : 'Review status and prepare your move'}
          </h2>
          <p className="muted">
            {isGm
              ? 'Check assignments in the lobby, review map state, and advance the campaign when the table is ready.'
              : pendingActivation
                ? 'Use the waiting page for activation timing, then review the lobby, dashboard, and map in read-only mode.'
                : 'Use the lobby to verify your assignment, then move into map and orders pages as they come online.'}
          </p>
          <div className="button-row">
            {pendingActivation ? (
              <NavLink className="button-link" to={`/app/campaigns/${campaignId}/waiting`}>
                Open waiting page
              </NavLink>
            ) : null}
            <NavLink className="button-link" to={`/app/campaigns/${campaignId}/lobby`}>
              Open lobby
            </NavLink>
            <NavLink className="button-secondary" to={`/app/campaigns/${campaignId}/map`}>
              Open map
            </NavLink>
            <NavLink className="button-secondary" to={`/app/help?campaignId=${campaignId}#dashboard`}>
              Dashboard help
            </NavLink>
          </div>
        </section>
      </div>

      <section className="surface-card page-card page-stack">
        <div className="page-header">
          <div className="page-header-copy">
            <p className="eyebrow">Quick links</p>
            <h2 className="detail-title">Route scaffolds for the play loop</h2>
          </div>
        </div>
        <div className="campaign-grid">
          <article className="campaign-card">
            <h3>Map</h3>
            <p className="muted">Territory reading surface and campaign geography.</p>
            <div className="pill-row">
              <span className="meta-pill">Ready</span>
            </div>
          </article>
          <article className="campaign-card">
            <h3>Orders</h3>
            <p className="muted">Draft, validate, and lock player submissions.</p>
            <div className="pill-row">
              <span className="meta-pill">PR D</span>
            </div>
          </article>
          <article className="campaign-card">
            <h3>Platoons</h3>
            <p className="muted">Force state, battles, and event history.</p>
            <div className="pill-row">
              <span className="meta-pill">PR E</span>
            </div>
          </article>
        </div>
      </section>
    </section>
  )
}
