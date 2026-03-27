import { useState } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import {
  useAdvancePhase,
  useArchiveCampaign,
  useCampaignInvites,
  useCompleteCampaign,
  useCreateCampaignInvite,
  useExportSnapshot,
  useRebuildVisibility,
  useResetDemoCampaign,
  useRevokeCampaignInvite,
} from '../../features/admin'
import type { CampaignInvite } from '../../features/admin'
import { useCampaign } from '../../features/campaigns'
import { Notice, SkeletonCard, StateCard } from '../components'

type AdminAction = 'advance' | 'rebuild' | 'export' | 'complete' | 'archive' | 'reset'
type InviteRole = 'PLAYER' | 'OBSERVER' | 'GM'

export function GmAdminPlaceholderPage() {
  const navigate = useNavigate()
  const { campaignId = '' } = useParams()
  const campaign = useCampaign(campaignId)
  const invites = useCampaignInvites(campaignId)
  const advancePhase = useAdvancePhase(campaignId)
  const rebuildVisibility = useRebuildVisibility(campaignId)
  const exportSnapshot = useExportSnapshot(campaignId)
  const completeCampaign = useCompleteCampaign(campaignId)
  const archiveCampaign = useArchiveCampaign(campaignId)
  const resetDemoCampaign = useResetDemoCampaign(campaignId)
  const createInvite = useCreateCampaignInvite(campaignId)
  const revokeInvite = useRevokeCampaignInvite(campaignId)
  const [inviteeEmail, setInviteeEmail] = useState('')
  const [intendedRole, setIntendedRole] = useState<InviteRole>('PLAYER')
  const [expiresInDays, setExpiresInDays] = useState('7')
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null)

  async function confirmAndRun(action: AdminAction) {
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

    if (action === 'export') {
      const confirmed = window.confirm(
        'Export a campaign snapshot now? This returns a large state payload for review or backup.',
      )
      if (confirmed) {
        exportSnapshot.mutate()
      }
      return
    }

    if (action === 'complete') {
      const confirmed = window.confirm(
        'Mark this campaign as completed? It stays visible, but the lifecycle will show as completed for members.',
      )
      if (confirmed) {
        completeCampaign.mutate()
      }
      return
    }

    if (action === 'archive') {
      const confirmed = window.confirm(
        'Archive this campaign now? Archived campaigns stay in the system but are considered closed.',
      )
      if (confirmed) {
        archiveCampaign.mutate()
      }
      return
    }

    const confirmed = window.confirm(
      'Reset the demo campaign? The current campaign will be archived and you will be moved into a fresh replacement campaign.',
    )
    if (!confirmed) {
      return
    }

    const freshCampaign = await resetDemoCampaign.mutateAsync()
    navigate(`/app/campaigns/${freshCampaign.campaignId}/admin`, { replace: true })
  }

  async function handleCreateInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsedExpiry = Number.parseInt(expiresInDays, 10)
    await createInvite.mutateAsync({
      inviteeEmail: inviteeEmail.trim(),
      intendedRole,
      expiresInDays: Number.isFinite(parsedExpiry) ? parsedExpiry : 7,
    })
    setInviteeEmail('')
    setIntendedRole('PLAYER')
    setExpiresInDays('7')
  }

  async function handleCopyInvite(invite: CampaignInvite) {
    const inviteUrl = buildInviteUrl(invite.inviteToken)
    await navigator.clipboard.writeText(inviteUrl)
    setCopiedInviteId(invite.inviteId)
    window.setTimeout(() => setCopiedInviteId((current) => (current === invite.inviteId ? null : current)), 1800)
  }

  async function handleRevokeInvite(invite: CampaignInvite) {
    const confirmed = window.confirm(
      `Revoke the invite for ${invite.inviteeEmail}? Existing pending links will stop working immediately.`,
    )
    if (!confirmed) {
      return
    }
    await revokeInvite.mutateAsync(invite.inviteId)
  }

  if (campaign.isLoading) {
    return (
      <div className="page-stack">
        <SkeletonCard lines={4} />
        <SkeletonCard lines={5} />
      </div>
    )
  }

  if (campaign.isError || !campaign.data) {
    return (
      <StateCard
        title="GM admin unavailable"
        description="The campaign detail could not be loaded, so lifecycle and invite controls are unavailable."
        actions={
          <NavLink className="button-link" to="/app/campaigns">
            Back to campaigns
          </NavLink>
        }
      />
    )
  }

  const lifecycleResult =
    resetDemoCampaign.data ??
    archiveCampaign.data ??
    completeCampaign.data

  return (
    <section className="page-stack">
      <div className="page-header">
        <div className="page-header-copy">
          <p className="eyebrow">GM control room</p>
          <h1 className="page-title">Campaign admin</h1>
          <p className="muted">
            Create and manage invite links, close or archive the current campaign, and reset the local demo into a
            fresh playtestable state.
          </p>
        </div>
        <div className="pill-row">
          <span className="meta-pill">{campaign.data.name}</span>
          <span className="meta-pill">{campaign.data.currentPhase}</span>
          <span className="meta-pill">{campaign.data.myMembership.role}</span>
        </div>
      </div>

      <Notice>
        Campaign ID: {campaignId}. Use this page to send invite links and manage the campaign lifecycle without
        dropping into the database.
      </Notice>

      <section className="surface-card page-card page-stack">
        <div className="page-header">
          <div className="page-header-copy">
            <h2 className="detail-title">Campaign lifecycle</h2>
            <p className="muted">
              Operational controls for the current campaign. Reset demo is intended for local/dev playtest recovery.
            </p>
          </div>
        </div>
        <div className="button-row">
          <button className="button-link" onClick={() => void confirmAndRun('advance')} type="button">
            Advance phase
          </button>
          <button className="button-secondary" onClick={() => void confirmAndRun('rebuild')} type="button">
            Rebuild visibility
          </button>
          <button className="button-secondary" onClick={() => void confirmAndRun('export')} type="button">
            Export snapshot
          </button>
          <button className="button-secondary" onClick={() => void confirmAndRun('complete')} type="button">
            Complete campaign
          </button>
          <button className="button-secondary" onClick={() => void confirmAndRun('archive')} type="button">
            Archive campaign
          </button>
          <button className="button-danger" onClick={() => void confirmAndRun('reset')} type="button">
            Reset demo campaign
          </button>
        </div>
        <Notice>
          Create a brand-new campaign from <NavLink to="/app/campaigns">My campaigns</NavLink>. This admin page is for
          the currently open campaign.
        </Notice>
        {advancePhase.data ? <Notice tone="success">Phase advanced to {advancePhase.data.currentPhase}.</Notice> : null}
        {rebuildVisibility.data ? (
          <Notice tone="success">
            Visibility rebuilt for {rebuildVisibility.data.viewerFactionCount} factions across{' '}
            {rebuildVisibility.data.visibilityRowCount} rows.
          </Notice>
        ) : null}
        {exportSnapshot.data ? (
          <Notice tone="success">
            Snapshot exported with {exportSnapshot.data.members.length} members, {exportSnapshot.data.territories.length}{' '}
            territories, and {exportSnapshot.data.auditLog.length} audit entries.
          </Notice>
        ) : null}
        {lifecycleResult ? (
          <Notice tone="success">
            {lifecycleResult.campaignName} is now {lifecycleResult.campaignStatus} in {lifecycleResult.currentPhase} turn{' '}
            {lifecycleResult.currentTurnNumber}.
          </Notice>
        ) : null}
        {advancePhase.error ? <Notice tone="error">{advancePhase.error.message}</Notice> : null}
        {rebuildVisibility.error ? <Notice tone="error">{rebuildVisibility.error.message}</Notice> : null}
        {exportSnapshot.error ? <Notice tone="error">{exportSnapshot.error.message}</Notice> : null}
        {completeCampaign.error ? <Notice tone="error">{completeCampaign.error.message}</Notice> : null}
        {archiveCampaign.error ? <Notice tone="error">{archiveCampaign.error.message}</Notice> : null}
        {resetDemoCampaign.error ? <Notice tone="error">{resetDemoCampaign.error.message}</Notice> : null}
      </section>

      <section className="surface-card page-card page-stack">
        <div className="page-header">
          <div className="page-header-copy">
            <h2 className="detail-title">Invite players and observers</h2>
            <p className="muted">
              Generate invite links here, then copy and send them directly. Players accept the link and land back in
              the authenticated app shell.
            </p>
          </div>
        </div>

        <form className="field-grid" onSubmit={(event) => void handleCreateInvite(event)}>
          <label className="field-label">
            Invitee email
            <input
              className="field-input"
              onChange={(event) => setInviteeEmail(event.target.value)}
              placeholder="player1@war.local"
              type="email"
              value={inviteeEmail}
            />
          </label>
          <div className="campaign-grid">
            <label className="field-label">
              Intended role
              <select
                className="field-input"
                onChange={(event) => setIntendedRole(event.target.value as InviteRole)}
                value={intendedRole}
              >
                <option value="PLAYER">PLAYER</option>
                <option value="OBSERVER">OBSERVER</option>
                <option value="GM">GM</option>
              </select>
            </label>
            <label className="field-label">
              Expires in days
              <input
                className="field-input"
                max={30}
                min={1}
                onChange={(event) => setExpiresInDays(event.target.value)}
                type="number"
                value={expiresInDays}
              />
            </label>
          </div>
          <div className="button-row">
            <button className="button-link" disabled={createInvite.isPending || !inviteeEmail.trim()} type="submit">
              {createInvite.isPending ? 'Creating invite...' : 'Create invite link'}
            </button>
          </div>
        </form>

        <Notice>
          Setup flow: create the campaign, create invite links here, send the copied `/invite/:token` URLs, then assign
          roles and nations from the lobby once users join.
        </Notice>

        {createInvite.data ? (
          <Notice tone="success">
            Invite created for {createInvite.data.inviteeEmail}. Copy the generated link from the list below.
          </Notice>
        ) : null}
        {createInvite.error ? <Notice tone="error">{createInvite.error.message}</Notice> : null}
        {revokeInvite.error ? <Notice tone="error">{revokeInvite.error.message}</Notice> : null}

        {invites.isLoading ? (
          <SkeletonCard lines={4} />
        ) : invites.isError ? (
          <Notice tone="error">Invite list unavailable. {invites.error.message}</Notice>
        ) : invites.data && invites.data.length > 0 ? (
          <div className="page-stack">
            {invites.data.map((invite) => {
              const inviteUrl = buildInviteUrl(invite.inviteToken)
              return (
                <article key={invite.inviteId} className="campaign-card">
                  <div className="section-stack">
                    <div className="pill-row">
                      <span className="meta-pill">{invite.intendedRole}</span>
                      <span className="meta-pill">{invite.status}</span>
                    </div>
                    <div className="section-stack" style={{ gap: 6 }}>
                      <h3>{invite.inviteeEmail}</h3>
                      <p className="muted">Expires {formatDate(invite.expiresAt)}</p>
                      <p className="muted" style={{ overflowWrap: 'anywhere' }}>
                        {inviteUrl}
                      </p>
                    </div>
                  </div>
                  <div className="campaign-actions">
                    <button className="button-link" onClick={() => void handleCopyInvite(invite)} type="button">
                      {copiedInviteId === invite.inviteId ? 'Copied' : 'Copy invite link'}
                    </button>
                    <NavLink className="button-secondary" to={`/invite/${invite.inviteToken}`}>
                      Open invite page
                    </NavLink>
                    {invite.status === 'PENDING' ? (
                      <button className="button-danger" onClick={() => void handleRevokeInvite(invite)} type="button">
                        Revoke
                      </button>
                    ) : null}
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <StateCard
            title="No invite links yet"
            description="Create a player or observer invite above, then copy and send the generated link."
          />
        )}
      </section>

      <div className="button-row">
        <NavLink className="button-link" to={`/app/campaigns/${campaignId}`}>
          Return to campaign
        </NavLink>
        <NavLink className="button-secondary" to="/app/campaigns">
          Back to campaigns
        </NavLink>
      </div>
    </section>
  )
}

function buildInviteUrl(inviteToken: string) {
  if (typeof window === 'undefined') {
    return `/invite/${inviteToken}`
  }

  return new URL(`${import.meta.env.BASE_URL}invite/${inviteToken}`, window.location.origin).toString()
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value)
}
