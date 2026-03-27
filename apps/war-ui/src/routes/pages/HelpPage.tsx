import { NavLink, useSearchParams } from 'react-router-dom'
import { useCampaigns } from '../../features/campaigns'
import { Notice, SkeletonCard, StateCard } from '../components'

const topics = [
  {
    id: 'campaign-basics',
    title: 'Campaign basics',
    body: 'Use the campaign workspace header for phase, turn, and role context. This is the quickest way to stay oriented while moving between pages.',
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    body: 'Start here after login. The dashboard shows the current phase, turn, and the next action you should take.',
  },
  {
    id: 'lobby',
    title: 'Lobby',
    body: 'Use the lobby to check your role, faction, nation, and readiness before the campaign advances.',
  },
  {
    id: 'map',
    title: 'Map',
    body: 'The map is the strategic reading surface. Select territories to inspect campaign geography and control.',
  },
  {
    id: 'orders',
    title: 'Orders',
    body: 'Player orders are draftable only during the active operations window and become locked after validation.',
  },
  {
    id: 'platoons',
    title: 'Platoons',
    body: 'Review visible force state, current territory, and readiness from the platoons page before planning movement or attacks.',
  },
  {
    id: 'activation',
    title: 'Activation timing',
    body: 'Mid-campaign joins may be staged until the next turn. While pending, the app remains read-only for orders and force-management actions.',
  },
  {
    id: 'notifications',
    title: 'Notifications',
    body: 'The notification drawer links you directly into campaign pages, battle results, and phase updates.',
  },
]

export function HelpPage() {
  const campaigns = useCampaigns()
  const [searchParams] = useSearchParams()
  const campaignId = searchParams.get('campaignId') ?? campaigns.data?.[0]?.id ?? null

  if (campaigns.isLoading) {
    return <SkeletonCard lines={5} />
  }

  if (campaigns.isError) {
    return (
      <StateCard
        title="Help unavailable"
        description="The help page could not load joined campaigns for tutorial replay."
      />
    )
  }

  return (
    <section className="page-stack">
      <div className="page-header">
        <div className="page-header-copy">
          <p className="eyebrow">Help</p>
          <h1 className="page-title">Quick rules and navigation guide</h1>
          <p className="muted">These are stable reference points for the current app shell and onboarding flow.</p>
        </div>
      </div>

      <section className="surface-card page-card page-stack">
        <div className="campaign-grid">
          {topics.map((topic) => (
            <article key={topic.id} className="campaign-card" id={topic.id}>
              <h2>{topic.title}</h2>
              <p className="muted">{topic.body}</p>
              <div className="pill-row">
                <span className="meta-pill">#{topic.id}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="surface-card surface-card-strong page-card page-stack">
        <p className="eyebrow">Walkthrough</p>
        <h2 className="detail-title">Replay the player tutorial</h2>
        <p className="muted">
          The tutorial is saved per campaign membership. Reopen it from onboarding if you want the guided sequence again.
        </p>
        <div className="button-row">
          {campaignId ? (
            <NavLink className="button-link" to={`/app/campaigns/${campaignId}/onboarding?tour=1`}>
              Replay tutorial
            </NavLink>
          ) : null}
          <NavLink className="button-secondary" to="/app/campaigns">
            Back to campaigns
          </NavLink>
        </div>
        {campaignId ? null : <Notice>No campaign is available yet for tutorial replay.</Notice>}
      </section>
    </section>
  )
}
