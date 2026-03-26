import { NavLink } from 'react-router-dom'
import { useCampaigns } from '../../features/campaigns'
import { Notice, SkeletonCard, StateCard } from '../components'

export function CampaignsPage() {
  const campaigns = useCampaigns()

  if (campaigns.isLoading) {
    return (
      <div className="page-stack">
        <SkeletonCard lines={4} />
        <SkeletonCard lines={4} />
      </div>
    )
  }

  if (campaigns.isError) {
    return (
      <StateCard
        title="Campaign list unavailable"
        description="The app shell loaded, but the joined campaigns list could not be fetched from the backend."
      />
    )
  }

  const campaignList = campaigns.data ?? []

  if (campaignList.length === 0) {
    return (
      <div className="page-stack">
        <StateCard
          title="No joined campaigns yet"
          description="This account is authenticated but not attached to any campaigns. Use an invite link to join your first campaign."
        />
        <Notice>Empty states are explicit here so unaffiliated users do not land on a blank screen.</Notice>
      </div>
    )
  }

  return (
    <section className="page-stack">
      <div className="page-header">
        <div className="page-header-copy">
          <p className="eyebrow">Authenticated app</p>
          <h1 className="page-title">My campaigns</h1>
          <p className="muted">Only campaigns joined by the authenticated user are listed here.</p>
        </div>
        <div className="pill-row">
          <span className="meta-pill">{campaignList.length} joined</span>
        </div>
      </div>

      <div className="campaign-grid">
        {campaignList.map((campaign) => (
          <article key={campaign.id} className="campaign-card">
            <div className="section-stack">
              <div className="pill-row">
                <span className="meta-pill">{campaign.currentPhase}</span>
                <span className="meta-pill">{campaign.myRole}</span>
              </div>
              <div className="section-stack" style={{ gap: 6 }}>
                <h3>{campaign.name}</h3>
                <p className="muted">{campaign.memberCount} active members</p>
              </div>
            </div>
            <div className="campaign-actions">
              <NavLink className="button-link" to={`/app/campaigns/${campaign.id}`}>
                Open route scaffold
              </NavLink>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
