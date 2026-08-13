import { NavLink, Outlet, useParams } from 'react-router-dom'
import { useCampaign, useCampaignPhase } from '../../features/campaigns'
import { SkeletonCard, StateCard } from '../components'

function formatRelativeTimer(date: Date | null) {
  if (!date) {
    return null
  }

  const diff = date.getTime() - Date.now()
  const totalMinutes = Math.round(diff / 60_000)

  if (totalMinutes <= 0) {
    return 'Deadline reached'
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
        description="The campaign shell loaded, but the workspace could not be assembled from backend data."
      />
    )
  }

  const currentPhase = phase.data.currentPhase
  const currentTurn = phase.data.currentTurnNumber
  const timerCopy = formatRelativeTimer(phase.data.phaseEndsAt)

  return (
    <section className="page-stack">
      <div className="page-header">
        <div className="page-header-copy">
          <h1 className="page-title">{campaign.data.name}</h1>
        </div>
        <div className="pill-row">
          <span className="meta-pill">Turn {currentTurn}</span>
          <span className="meta-pill">{currentPhase}</span>
          <span className="meta-pill">{campaign.data.myMembership.role}</span>
          {timerCopy ? <span className="meta-pill">{timerCopy}</span> : null}
        </div>
      </div>

      <nav className="top-nav" aria-label="Campaign sections">
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
        <NavLink
          className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          to={`/app/campaigns/${campaignId}/lobby`}
        >
          Lobby
        </NavLink>
        {campaign.data.myMembership.role === 'GM' ? (
          <NavLink
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            to={`/app/campaigns/${campaignId}/admin`}
          >
            Admin
          </NavLink>
        ) : null}
      </nav>

      <Outlet />
    </section>
  )
}
