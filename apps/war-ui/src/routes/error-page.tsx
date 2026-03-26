import { isRouteErrorResponse, useRouteError, NavLink } from 'react-router-dom'

export function RouteErrorPage() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Unexpected route failure'

  return (
    <div className="public-shell">
      <section className="surface-card page-card page-stack">
        <p className="eyebrow">Route error</p>
        <h1 className="page-title">This page failed to load</h1>
        <p className="muted">{message}</p>
        <div className="button-row">
          <NavLink className="button-link" to="/app/campaigns">
            Back to campaigns
          </NavLink>
        </div>
      </section>
    </div>
  )
}
