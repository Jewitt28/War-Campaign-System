import { NavLink, useParams } from 'react-router-dom'
import { useAdvancePhase, useExportSnapshot, useRebuildVisibility } from '../../features/admin'
import { Notice } from '../components'

export function GmAdminPlaceholderPage() {
  const { campaignId = '' } = useParams()
  const advancePhase = useAdvancePhase(campaignId)
  const rebuildVisibility = useRebuildVisibility(campaignId)
  const exportSnapshot = useExportSnapshot(campaignId)

  function confirmAndRun(action: 'advance' | 'rebuild' | 'export') {
    if (action === 'advance') {
      const confirmed = window.confirm(
        'Advance the campaign phase now? This changes the live turn state for all members.',
      )
      if (confirmed) {
        advancePhase.mutate()
      }
      return
    }

    if (action === 'rebuild') {
      const confirmed = window.confirm(
        'Rebuild visibility now? Use this after assignment or resolution changes that affect what factions can see.',
      )
      if (confirmed) {
        rebuildVisibility.mutate()
      }
      return
    }

    const confirmed = window.confirm(
      'Export a campaign snapshot now? This returns a large state payload for review or backup.',
    )
    if (confirmed) {
      exportSnapshot.mutate()
    }
  }

  return (
    <section className="page-stack">
      <div className="page-header">
        <div className="page-header-copy">
          <p className="eyebrow">GM-only scaffold</p>
          <h1 className="page-title">GM admin tools</h1>
          <p className="muted">
            The guard is in place and only GM memberships can reach this route. Core admin actions are wired to the
            existing backend endpoints here.
          </p>
        </div>
      </div>
      <Notice>Campaign ID: {campaignId}</Notice>
      <div className="button-row">
        <button className="button-link" onClick={() => confirmAndRun('advance')} type="button">
          Advance phase
        </button>
        <button className="button-secondary" onClick={() => confirmAndRun('rebuild')} type="button">
          Rebuild visibility
        </button>
        <button className="button-secondary" onClick={() => confirmAndRun('export')} type="button">
          Export snapshot
        </button>
      </div>
      <Notice>Phase reopen is not available yet because the backend does not expose a reopen endpoint.</Notice>
      {advancePhase.data ? <Notice tone="success">Phase advanced to {advancePhase.data.currentPhase}.</Notice> : null}
      {rebuildVisibility.data ? (
        <Notice tone="success">
          Visibility rebuilt for {rebuildVisibility.data.viewerFactionCount} factions across {rebuildVisibility.data.visibilityRowCount} rows.
        </Notice>
      ) : null}
      {exportSnapshot.data ? (
        <Notice tone="success">
          Snapshot exported with {exportSnapshot.data.members.length} members, {exportSnapshot.data.territories.length} territories, and {exportSnapshot.data.auditLog.length} audit entries.
        </Notice>
      ) : null}
      <div className="button-row">
        <NavLink className="button-link" to={`/app/campaigns/${campaignId}`}>
          Return to campaign
        </NavLink>
      </div>
    </section>
  )
}
