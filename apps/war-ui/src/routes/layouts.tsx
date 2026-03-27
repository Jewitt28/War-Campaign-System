import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { NavLink, Navigate, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { authQueryOptions, useAuth } from '../features/auth'
import { useCampaign } from '../features/campaigns'
import { useMarkNotificationRead, useNotifications } from '../features/notifications'
import type { UserNotification } from '../features/notifications'
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
  const notifications = useNotifications()
  const markNotificationRead = useMarkNotificationRead()
  const [drawerOpen, setDrawerOpen] = useState(false)

  async function handleLogout() {
    clearDevSessionEmail()
    queryClient.setQueryData(authQueryOptions().queryKey, null)
    await queryClient.invalidateQueries({ queryKey: authQueryOptions().queryKey })
    navigate('/login', { replace: true })
  }

  function buildNotificationLink(notification: UserNotification) {
    const payload = notification.payloadJson ? safeParse(notification.payloadJson) : null
    const payloadCampaignId = typeof payload?.campaignId === 'string' ? payload.campaignId : null
    const campaignId = notification.campaignId ?? payloadCampaignId
    if (!campaignId) {
      return '/app/campaigns'
    }
    if (typeof payload?.battleId === 'string') {
      return `/app/campaigns/${campaignId}/battles`
    }
    if (typeof payload?.territoryId === 'string') {
      return `/app/campaigns/${campaignId}/map`
    }
    if (typeof payload?.turnNumber === 'number' && notification.type.includes('ORDERS')) {
      return `/app/campaigns/${campaignId}/orders`
    }
    if (notification.type.includes('RESOLUTION')) {
      return `/app/campaigns/${campaignId}/events`
    }
    return `/app/campaigns/${campaignId}/dashboard`
  }

  async function handleNotificationClick(notification: UserNotification) {
    if (!notification.readAt) {
      await markNotificationRead.mutateAsync(notification.id)
    }
    setDrawerOpen(false)
    navigate(buildNotificationLink(notification))
  }

  const unreadCount = notifications.data?.filter((notification) => !notification.readAt).length ?? 0

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
            <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/app/updates">
              Updates
            </NavLink>
            <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/app/help">
              Help
            </NavLink>
            <button className="button-secondary" onClick={() => setDrawerOpen((value) => !value)} type="button">
              Notifications {unreadCount > 0 ? `(${unreadCount})` : ''}
            </button>
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
        {drawerOpen ? (
          <section className="surface-card page-card page-stack">
            <div className="page-header">
              <div className="page-header-copy">
                <h2 className="detail-title">Notifications</h2>
                <p className="muted">Open an item to mark it read and jump to the relevant campaign page.</p>
              </div>
            </div>
            {notifications.isLoading ? (
              <SkeletonCard lines={4} />
            ) : notifications.data && notifications.data.length > 0 ? (
              <div className="page-stack">
                {notifications.data.map((notification) => (
                  <button
                    key={notification.id}
                    className="territory-tile"
                    onClick={() => void handleNotificationClick(notification)}
                    type="button"
                  >
                    <strong>{notification.title}</strong>
                    <span>{notification.body}</span>
                  </button>
                ))}
              </div>
            ) : (
              <Notice>No notifications yet.</Notice>
            )}
          </section>
        ) : null}
        <Outlet />
      </main>
    </div>
  )
}

function safeParse(payloadJson: string) {
  try {
    return JSON.parse(payloadJson) as Record<string, unknown>
  } catch {
    return null
  }
}

export function CampaignMembershipRoute() {
  const location = useLocation()
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

  const onboarding = campaign.data?.myMembership.onboarding
  const isPlayer = campaign.data?.myMembership.role === 'PLAYER'
  const isOnboardingRoute =
    location.pathname === `/app/campaigns/${campaignId}/onboarding` ||
    location.pathname.startsWith(`/app/campaigns/${campaignId}/onboarding/`)

  if (
    isPlayer &&
    onboarding &&
    onboarding.onboardingStatus !== 'NOT_REQUIRED' &&
    onboarding.onboardingStatus !== 'COMPLETE' &&
    !isOnboardingRoute
  ) {
    return <Navigate replace to={`/app/campaigns/${campaignId}/onboarding`} />
  }

  if (
    isPlayer &&
    onboarding &&
    onboarding.onboardingStatus === 'COMPLETE' &&
    isOnboardingRoute
  ) {
    return (
      <Navigate
        replace
        to={
          onboarding.activationStatus === 'PENDING_NEXT_TURN'
            ? `/app/campaigns/${campaignId}/waiting`
            : `/app/campaigns/${campaignId}`
        }
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
