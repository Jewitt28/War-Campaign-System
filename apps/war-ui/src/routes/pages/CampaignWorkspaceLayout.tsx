import { NavLink, Outlet, useParams } from 'react-router-dom'
import { useCampaign, useCampaignPhase } from '../../features/campaigns'
import { Notice, SkeletonCard, StateCard } from '../components'

function formatRelativeTimer(date: Date | null) {
  if (!date) {
    return 'Timing unavailable'
  }

  const diff = date.getTime() - Date.now()
  const totalMinutes = Math.round(diff / 60_000)

  if (totalMinutes <= 0) {
    return 'Phase deadline reached'
  }

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) {
    return `${minutes}m remaining`
  }

  return `${hours}h ${minutes}m remaining`
}

export function CampaignWorkspaceLayout() {
  const { campaignId = '' } = useParams()
  const campaign = useCampaign(campaignId)
  const phase = useCampaignPhase(campaignId)

  if (campaign.isLoading || phase.isLoading) {
    return (
      <div className="page-stack">
        <SkeletonCard lines={4} />
        <SkeletonCard lines={3} />
      </div>
    )
  }

  if (campaign.isError || !campaign.data || phase.isError || !phase.data) {
    return (
      <StateCard
        title="Campaign workspace unavailable"
        description="The campaign shell loaded, but the lobby/dashboard workspace could not be assembled from backend data."
      />
    )
  }

  const currentPhase = phase.data.currentPhase
  const currentTurn = phase.data.currentTurnNumber
  const timerCopy = formatRelativeTimer(phase.data.phaseEndsAt)
  const onboarding = campaign.data.myMembership.onboarding
  const pendingActivation =
    campaign.data.myMembership.role === 'PLAYER' && onboarding?.activationStatus === 'PENDING_NEXT_TURN'

  return (
    <section className="page-stack">
      <div className="page-header">
        <div className="page-header-copy">
          <p className="eyebrow">Campaign workspace</p>
          <h1 className="page-title">{campaign.data.name}</h1>
          <p className="muted">
            Phase, turn, and role context stay visible here so players and GMs know what happens next without drilling
            into a deeper page first.
          </p>
        </div>
        <div className="pill-row">
          <span className="meta-pill">Turn {currentTurn}</span>
          <span className="meta-pill">Phase {currentPhase}</span>
          <span className="meta-pill">{campaign.data.myMembership.role}</span>
        </div>
      </div>

      <section className="surface-card page-card page-stack">
        <div className="page-header">
          <div className="page-header-copy">
            <h2 className="detail-title">Campaign navigation</h2>
            <p className="muted">PR B adds the first stable in-campaign subnav and phase strip.</p>
          </div>
          <div className="pill-row">
            <span className="meta-pill">{timerCopy}</span>
            <span className="meta-pill">Phase read normalized</span>
          </div>
        </div>
        <nav className="top-nav" aria-label="Campaign sections">
          <NavLink
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            to={`/app/campaigns/${campaignId}/lobby`}
          >
            Lobby
          </NavLink>
          <NavLink
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            to={`/app/campaigns/${campaignId}/dashboard`}
          >
            Dashboard
          </NavLink>
          <NavLink
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            to={`/app/campaigns/${campaignId}/map`}
          >
            Map
          </NavLink>
          <NavLink
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            to={`/app/campaigns/${campaignId}/orders`}
          >
            Orders
          </NavLink>
          <NavLink
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            to={`/app/campaigns/${campaignId}/platoons`}
          >
            Platoons
          </NavLink>
          <NavLink
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            to={`/app/campaigns/${campaignId}/battles`}
          >
            Battles
          </NavLink>
          <NavLink
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            to={`/app/campaigns/${campaignId}/events`}
          >
            Events
          </NavLink>
          {campaign.data.myMembership.role === 'GM' ? (
            <NavLink
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              to={`/app/campaigns/${campaignId}/admin`}
            >
              Admin
            </NavLink>
          ) : null}
          <NavLink
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            to={`/app/help?campaignId=${campaignId}#campaign-basics`}
          >
            Help
          </NavLink>
        </nav>
      </section>

      {pendingActivation ? (
        <Notice>
          Your faction is staged for activation at the start of the next turn. Use the{' '}
          <NavLink to={`/app/campaigns/${campaignId}/waiting`}>waiting page</NavLink> for status and quick links.
        </Notice>
      ) : null}

      {campaign.data.myMembership.role === 'GM' ? (
        <Notice>GM controls remain role-safe. Assignment tools appear in the lobby, and GM-only admin tools stay behind their own route guard.</Notice>
      ) : null}

      <Outlet />
    </section>
  )
}
