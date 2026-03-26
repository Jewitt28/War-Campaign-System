import { NavLink, useParams } from 'react-router-dom'
import { useCampaign, useCampaignPhase } from '../../features/campaigns'
import { useAuditLog, useResolutionSummary } from '../../features/resolution'
import { Notice, SkeletonCard, StateCard } from '../components'

export function CampaignEventsPage() {
  const { campaignId = '' } = useParams()
  const campaign = useCampaign(campaignId)
  const phase = useCampaignPhase(campaignId)
  const turnNumber = phase.data?.currentTurnNumber ?? 0
  const resolution = useResolutionSummary(campaignId, turnNumber, Boolean(turnNumber && campaign.data?.myMembership.role === 'GM'))
  const audit = useAuditLog(campaignId, Boolean(campaign.data?.myMembership.role === 'GM'))

  if (campaign.isLoading || phase.isLoading || (campaign.data?.myMembership.role === 'GM' && (resolution.isLoading || audit.isLoading))) {
    return <SkeletonCard lines={6} />
  }

  if (campaign.isError || !campaign.data || phase.isError || !phase.data) {
    return <StateCard title="Events unavailable" description="The campaign or phase context could not be loaded." />
  }

  if (campaign.data.myMembership.role !== 'GM') {
    return (
      <StateCard
        title="Player event feed pending"
        description="The backend does not yet expose a player-safe event timeline endpoint. This page shows the GM timeline for now."
        actions={<NavLink className="button-link" to={`/app/campaigns/${campaignId}/dashboard`}>Return to dashboard</NavLink>}
      />
    )
  }

  if (resolution.isError || audit.isError || !resolution.data || !audit.data) {
    return <StateCard title="GM event timeline unavailable" description="The resolution summary or audit feed could not be loaded." />
  }

  return (
    <section className="page-stack">
      <div className="page-header">
        <div className="page-header-copy">
          <p className="eyebrow">Events</p>
          <h2 className="detail-title">Turn log and audit trail</h2>
          <p className="muted">GM timeline composed from resolution events and campaign audit entries.</p>
        </div>
      </div>

      <section className="surface-card page-card page-stack">
        <h3 className="detail-title">Resolution events</h3>
        {resolution.data.events.length === 0 ? (
          <Notice>No resolution events recorded for this turn.</Notice>
        ) : (
          <div className="page-stack">
            {resolution.data.events.map((event) => (
              <article key={event.eventId} className="campaign-card">
                <div className="pill-row">
                  <span className="meta-pill">{event.eventType}</span>
                  <span className="meta-pill">{event.visibilityScope}</span>
                </div>
                <p className="muted">
                  {event.territoryName ?? 'Campaign-wide'} {event.actorFactionName ? ` / ${event.actorFactionName}` : ''}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="surface-card page-card page-stack">
        <h3 className="detail-title">Campaign audit</h3>
        {audit.data.length === 0 ? (
          <Notice>No audit entries recorded yet.</Notice>
        ) : (
          <div className="page-stack">
            {audit.data.map((entry) => (
              <article key={entry.auditLogId} className="campaign-card">
                <div className="pill-row">
                  <span className="meta-pill">{entry.actionType}</span>
                  <span className="meta-pill">{entry.entityType}</span>
                </div>
                <p className="muted">{entry.actorDisplayName ?? entry.actorType}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  )
}
