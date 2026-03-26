import { NavLink, useParams } from 'react-router-dom'
import { useCampaign } from '../../features/campaigns'
import { DetailList, SkeletonCard, StateCard } from '../components'

export function CampaignWorkspacePage() {
  const { campaignId = '' } = useParams()
  const campaign = useCampaign(campaignId)

  if (campaign.isLoading) {
    return <SkeletonCard lines={4} />
  }

  if (campaign.isError || !campaign.data) {
    return (
      <StateCard
        title="Campaign unavailable"
        description="The campaign scaffold route exists, but the campaign detail query did not load."
      />
    )
  }

  return (
    <section className="page-stack">
      <div className="page-header">
        <div className="page-header-copy">
          <p className="eyebrow">Membership-gated route</p>
          <h1 className="page-title">{campaign.data.name}</h1>
          <p className="muted">
            This scaffold is intentionally thin. PR B will replace it with the campaign lobby and dashboard layouts.
          </p>
        </div>
        <div className="pill-row">
          <span className="meta-pill">Phase {campaign.data.currentPhase}</span>
          <span className="meta-pill">Role {campaign.data.myMembership.role}</span>
        </div>
      </div>

      <div className="hero-grid">
        <section className="surface-card page-card page-stack">
          <h2 className="detail-title">Membership summary</h2>
          <DetailList
            items={[
              { label: 'Signed in as', value: campaign.data.myMembership.displayName },
              { label: 'Email', value: campaign.data.myMembership.email },
              { label: 'Role', value: campaign.data.myMembership.role },
              { label: 'Faction assignment', value: campaign.data.myMembership.factionId ?? 'Pending assignment' },
              { label: 'Nation assignment', value: campaign.data.myMembership.nationId ?? 'Pending assignment' },
            ]}
          />
        </section>

        <section className="surface-card surface-card-strong page-card page-stack">
          <h2 className="detail-title">Next route slices</h2>
          <div className="placeholder-panel">
            <p className="muted">Lobby, dashboard, map, orders, platoons, battles, events, and admin tools will mount here in sequence.</p>
          </div>
          <div className="button-row">
            <NavLink className="button-link" to="/app/campaigns">
              Back to campaigns
            </NavLink>
            {campaign.data.myMembership.role === 'GM' ? (
              <NavLink className="button-secondary" to={`/app/campaigns/${campaignId}/admin`}>
                Open GM-only scaffold
              </NavLink>
            ) : null}
          </div>
        </section>
      </div>
    </section>
  )
}
