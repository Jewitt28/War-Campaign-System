import { NavLink, useParams } from 'react-router-dom'
import { Notice } from '../components'

export function GmAdminPlaceholderPage() {
  const { campaignId = '' } = useParams()

  return (
    <section className="page-stack">
      <div className="page-header">
        <div className="page-header-copy">
          <p className="eyebrow">GM-only scaffold</p>
          <h1 className="page-title">Admin route ready</h1>
          <p className="muted">
            The guard is in place and only GM memberships can reach this route. PR F can add admin actions here without
            reworking auth boundaries.
          </p>
        </div>
      </div>
      <Notice>Campaign ID: {campaignId}</Notice>
      <div className="button-row">
        <NavLink className="button-link" to={`/app/campaigns/${campaignId}`}>
          Return to campaign
        </NavLink>
      </div>
    </section>
  )
}
