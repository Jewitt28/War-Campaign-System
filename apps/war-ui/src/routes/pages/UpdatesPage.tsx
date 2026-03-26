import { NavLink } from 'react-router-dom'

const shippedSlices = [
  {
    title: 'Auth and invites',
    status: 'PR A',
    interaction: 'Sign in on /login, open an invite link, accept it, and return into the protected app shell.',
  },
  {
    title: 'Campaign lobby and dashboard',
    status: 'PR B',
    interaction: 'Open a campaign to review roster, assignment state, current phase, and what to do next.',
  },
  {
    title: 'Map and territory details',
    status: 'PR C',
    interaction: 'Use layer controls, filter by theatre, select a territory, and inspect player-safe or GM-safe detail.',
  },
  {
    title: 'Orders workflow',
    status: 'PR D',
    interaction: 'Players draft platoon orders, save to trigger backend validation, then lock the submission once validated.',
  },
]

export function UpdatesPage() {
  return (
    <section className="page-stack">
      <div className="page-header">
        <div className="page-header-copy">
          <p className="eyebrow">Alpha updates</p>
          <h1 className="page-title">What was added and how to use it</h1>
          <p className="muted">This page tracks the current playable alpha slice and points users at the interaction flow for each feature.</p>
        </div>
      </div>

      <div className="campaign-grid">
        {shippedSlices.map((slice) => (
          <article key={slice.title} className="campaign-card">
            <div className="pill-row">
              <span className="meta-pill">{slice.status}</span>
            </div>
            <h3>{slice.title}</h3>
            <p className="muted">{slice.interaction}</p>
          </article>
        ))}
      </div>

      <section className="surface-card page-card page-stack">
        <h2 className="detail-title">Suggested user journey</h2>
        <div className="detail-list">
          <div className="detail-row">
            <dt>GM</dt>
            <dd>Sign in, open campaigns, manage the lobby, inspect the map, then review downstream pages as the turn progresses.</dd>
          </div>
          <div className="detail-row">
            <dt>Player</dt>
            <dd>Accept an invite, join the campaign, review dashboard and map state, then submit and lock orders during operations.</dd>
          </div>
        </div>
        <div className="button-row">
          <NavLink className="button-link" to="/app/campaigns">
            Open campaigns
          </NavLink>
        </div>
      </section>
    </section>
  )
}
