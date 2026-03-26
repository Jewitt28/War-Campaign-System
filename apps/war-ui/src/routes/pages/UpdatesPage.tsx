import { NavLink } from 'react-router-dom'

const shippedSlices = [
  {
    title: 'Auth and invites',
    status: 'PR A',
    interaction: 'Sign in on /login, open an invite link, accept it, and return into the protected app shell.',
    audience: 'GM and player',
  },
  {
    title: 'Campaign lobby and dashboard',
    status: 'PR B',
    interaction: 'Open a campaign to review roster, assignment state, current phase, and what to do next.',
    audience: 'GM and player',
  },
  {
    title: 'Map and territory details',
    status: 'PR C',
    interaction: 'Use layer controls, filter by theatre, select a territory, and inspect player-safe or GM-safe detail.',
    audience: 'GM and player',
  },
  {
    title: 'Orders workflow',
    status: 'PR D',
    interaction: 'Players draft platoon orders, save to trigger backend validation, then lock the submission once validated.',
    audience: 'Player',
  },
  {
    title: 'Platoons, battles, and events',
    status: 'PR E',
    interaction: 'Review visible platoons, inspect battle summaries, and read turn outcomes where the backend exposes a safe feed.',
    audience: 'GM and player',
  },
  {
    title: 'Admin tools and notifications',
    status: 'PR F',
    interaction: 'GMs can run core admin actions from the admin route, while all users can open notifications and jump straight into the relevant campaign page.',
    audience: 'GM and player',
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
              <span className="meta-pill">{slice.audience}</span>
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

      <section className="surface-card page-card page-stack">
        <h2 className="detail-title">What changed most recently</h2>
        <div className="detail-list">
          <div className="detail-row">
            <dt>Players</dt>
            <dd>Map, platoons, and orders now form the main loop: inspect the board state, review available forces, then submit and lock orders.</dd>
          </div>
          <div className="detail-row">
            <dt>GMs</dt>
            <dd>Lobby assignment controls, battle and event review, and the new admin route reduce the amount of manual intervention needed between turns.</dd>
          </div>
          <div className="detail-row">
            <dt>Everyone</dt>
            <dd>The notification drawer and route error states make it easier to recover from failures and re-enter the right campaign context.</dd>
          </div>
        </div>
      </section>
    </section>
  )
}
