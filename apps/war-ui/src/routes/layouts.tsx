import { useQueryClient } from '@tanstack/react-query'
import { NavLink, Navigate, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { authQueryOptions, useAuth } from '../features/auth'
import { useCampaign } from '../features/campaigns'
import { clearDevSessionEmail } from '../lib/session'
import { Notice, SkeletonCard, StateCard } from './components'

function buildLoginRedirect(pathname: string, search: string) {
  const redirect = `${pathname}${search}`
  return `/login?redirect=${encodeURIComponent(redirect)}`
}

export function RootRedirect() {
  const auth = useAuth()

  if (auth.isLoading) {
    return (
      <div className="public-shell">
        <SkeletonCard />
      </div>
    )
  }

  return <Navigate replace to={auth.data ? '/app/campaigns' : '/login'} />
}

export function PublicLayout() {
  return (
    <div className="public-shell">
      <Outlet />
    </div>
  )
}

export function AuthenticatedRoute() {
  const location = useLocation()
  const auth = useAuth()

  if (auth.isLoading) {
    return (
      <div className="public-shell">
        <SkeletonCard lines={4} />
      </div>
    )
  }

  if (!auth.data) {
    return <Navigate replace to={buildLoginRedirect(location.pathname, location.search)} />
  }

  return <Outlet />
}

export function AppShellLayout() {
  const auth = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  async function handleLogout() {
    clearDevSessionEmail()
    queryClient.setQueryData(authQueryOptions().queryKey, null)
    await queryClient.invalidateQueries({ queryKey: authQueryOptions().queryKey })
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell">
      <header className="shell-header">
        <div className="shell-header-inner">
          <div className="brand-block">
            <h1 className="brand-title">WAR Online Campaign</h1>
            <p className="brand-subtitle">Alpha operations shell</p>
          </div>
          <nav className="top-nav" aria-label="Primary">
            <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/app/campaigns">
              Campaigns
            </NavLink>
            <span className="nav-link-disabled">Notifications</span>
            <span className="nav-link-disabled">GM Tools</span>
          </nav>
          <div className="shell-user">
            <div className="user-chip">
              <strong>{auth.data?.displayName ?? 'Unknown operator'}</strong>
              <span>{auth.data?.email ?? 'No session'}</span>
            </div>
            <button className="button-secondary" onClick={handleLogout} type="button">
              Switch User
            </button>
          </div>
        </div>
      </header>
      <main className="shell-main">
        <Outlet />
      </main>
    </div>
  )
}

export function CampaignMembershipRoute() {
  const { campaignId = '' } = useParams()
  const campaign = useCampaign(campaignId)

  if (campaign.isLoading) {
    return <SkeletonCard lines={4} />
  }

  if (campaign.isError) {
    return (
      <StateCard
        title="Campaign access blocked"
        description="This route is membership-gated. Join the campaign through a valid invite or return to your campaigns list."
        actions={<NavLink className="button-link" to="/app/campaigns">Back to campaigns</NavLink>}
      />
    )
  }

  return <Outlet />
}

export function GmOnlyRoute() {
  const { campaignId = '' } = useParams()
  const campaign = useCampaign(campaignId)

  if (campaign.isLoading) {
    return <SkeletonCard lines={3} />
  }

  if (!campaign.data || campaign.data.myMembership.role !== 'GM') {
    return (
      <div className="page-stack">
        <StateCard
          title="GM access required"
          description="This area is reserved for campaign managers. Player sessions cannot enter GM-only routes."
          actions={<NavLink className="button-link" to={`/app/campaigns/${campaignId}`}>Return to campaign</NavLink>}
        />
        <Notice>GM-only guards are wired now so later admin pages can sit behind the same route boundary.</Notice>
      </div>
    )
  }

  return <Outlet />
}
