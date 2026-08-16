import { NavLink, useParams } from 'react-router-dom'
import {
  useCampaign,
  useCampaignMap,
  useCampaignMembers,
  useCampaignPhase,
  type CampaignMapTerritory,
} from '../../features/campaigns'
import { useAuditLog, useResolutionSummary } from '../../features/resolution'
import { SkeletonCard, StateCard } from '../components'

const PHASE_ORDER = ['LOBBY', 'STRATEGIC', 'OPERATIONS', 'RESOLUTION'] as const
const PHASE_LABELS: Record<string, string> = {
  LOBBY: 'Lobby',
  STRATEGIC: 'Strategic',
  OPERATIONS: 'Operations',
  RESOLUTION: 'Resolution',
}

const CONTEST_BORDER_COLORS = ['#3b82f6', '#ef4444', '#f97316', '#8a6a24']

function formatTimestamp(date: Date | null) {
  if (!date) {
    return 'Not scheduled'
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function formatShortTime(date: Date) {
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(date)
}

function submissionStatusTag(status: string | undefined) {
  switch (status) {
    case 'LOCKED':
    case 'REVEALED':
    case 'RESOLVED':
      return { label: status === 'LOCKED' ? 'Locked' : status === 'REVEALED' ? 'Revealed' : 'Resolved', className: 'status-tag-success' }
    case 'DRAFT':
    case 'VALIDATED':
      return { label: 'Draft', className: 'status-tag-warning' }
    case 'VOID':
      return { label: 'Void', className: 'status-tag-muted' }
    default:
      return { label: 'Not started', className: 'status-tag-danger' }
  }
}

function contestSummary(territory: CampaignMapTerritory) {
  switch (territory.strategicStatus) {
    case 'CONTESTED':
      return 'Contested'
    case 'OCCUPIED':
      return 'Occupied'
    case 'DEVASTATED':
      return 'Devastated'
    default:
      return territory.strategicStatus ?? 'Unresolved'
  }
}

export function CampaignDashboardPage() {
  const { campaignId = '' } = useParams()
  const campaign = useCampaign(campaignId)
  const mapSummary = useCampaignMap(campaignId)
  const phase = useCampaignPhase(campaignId)
  const members = useCampaignMembers(campaignId)

  const isGm = campaign.data?.myMembership.role === 'GM'
  const currentTurnNumber = phase.data?.currentTurnNumber ?? 0
  const resolution = useResolutionSummary(campaignId, currentTurnNumber, isGm)
  const auditLog = useAuditLog(campaignId, isGm)

  if (campaign.isLoading || mapSummary.isLoading || phase.isLoading) {
    return (
      <div className="page-stack">
        <SkeletonCard lines={4} />
        <SkeletonCard lines={4} />
      </div>
    )
  }

  if (campaign.isError || mapSummary.isError || phase.isError || !campaign.data || !mapSummary.data || !phase.data) {
    return (
      <StateCard
        title="Dashboard unavailable"
        description="The campaign dashboard could not be loaded from the current backend projections."
      />
    )
  }

  const onboarding = campaign.data.myMembership.onboarding
  const pendingActivation = !isGm && onboarding?.activationStatus === 'PENDING_NEXT_TURN'
  const currentPhase = phase.data.currentPhase
  const currentPhaseIndex = PHASE_ORDER.indexOf(currentPhase as (typeof PHASE_ORDER)[number])

  function phaseGuidance(): { title: string; body: string } {
    if (pendingActivation) {
      return {
        title: 'Activation scheduled for next turn',
        body: 'Your nation and starter package are staged. Review the campaign in read-only mode until the next turn begins.',
      }
    }
    switch (currentPhase) {
      case 'LOBBY':
        return {
          title: 'Campaign is in the lobby',
          body: 'The GM is setting up the campaign. Once all players have joined and assignments are confirmed, the GM will start the first turn.',
        }
      case 'STRATEGIC':
        return {
          title: 'Strategic phase — review your position',
          body: 'Study the map and review your forces. The Operations phase will begin shortly — prepare your orders.',
        }
      case 'OPERATIONS':
        return {
          title: 'Operations phase — submit your orders',
          body: `Turn ${currentTurnNumber}: Issue orders to each of your platoons, then lock your submission. Once all players lock, the turn resolves automatically.`,
        }
      case 'RESOLUTION':
        return {
          title: 'Resolution in progress',
          body: 'Turn results are being processed. Check the Events and Battles pages to see outcomes. The next Strategic phase will begin shortly.',
        }
      default:
        return {
          title: isGm ? 'Manage readiness and advance the loop' : 'Review status and prepare your move',
          body: isGm
            ? 'Check assignments in the lobby, review map state, and advance the campaign when the table is ready.'
            : 'Use the lobby to verify your assignment, then move into map and orders pages as they come online.',
        }
    }
  }

  const guidance = phaseGuidance()

  const playerMembers = (members.data ?? []).filter((member) => member.role !== 'GM')
  const submissionsByMember = new Map((resolution.data?.submissions ?? []).map((s) => [s.submittedByMemberId, s]))
  const factionsById = new Map(mapSummary.data.factions.map((f) => [f.id, f]))
  const nationsById = new Map(mapSummary.data.nations.map((n) => [n.id, n]))

  const contestedTerritories = mapSummary.data.territories.filter((t) => t.strategicStatus === 'CONTESTED').slice(0, 3)

  return (
    <div className="page-stack">
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 360px', gap: 1, background: 'var(--border)', border: '1px solid var(--border)' }}>
        <div style={{ background: 'var(--surface)', padding: 24, display: 'flex', flexDirection: 'column', gap: 28 }}>
          {/* Turn sequence */}
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: '1px solid var(--border-strong)', paddingBottom: 6 }}>
              <h2 className="detail-title">Turn sequence</h2>
              {phase.data.phaseEndsAt ? (
                <span className="eyebrow" style={{ fontSize: '0.68rem' }}>Deadline {formatTimestamp(phase.data.phaseEndsAt)}</span>
              ) : null}
            </div>
            <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)' }}>
              {PHASE_ORDER.map((p, index) => {
                const isPast = currentPhaseIndex >= 0 && index < currentPhaseIndex
                const isCurrent = index === currentPhaseIndex
                const stateLabel = isCurrent ? PHASE_LABELS[currentPhase] ?? currentPhase : isPast ? 'Closed' : 'Pending'
                return (
                  <li
                    key={p}
                    style={{
                      padding: '14px 16px',
                      borderRight: index < 3 ? '1px solid var(--border)' : undefined,
                      background: isCurrent ? 'var(--surface-strong)' : undefined,
                    }}
                  >
                    <div
                      className="eyebrow"
                      style={{
                        fontSize: '0.68rem',
                        color: isCurrent ? 'var(--accent)' : isPast ? 'var(--muted)' : 'var(--muted)',
                        fontWeight: isCurrent ? 700 : 400,
                      }}
                    >
                      {String(index + 1).padStart(2, '0')} {PHASE_LABELS[p]}
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '0.95rem',
                        marginTop: 4,
                        fontWeight: isCurrent ? 600 : 400,
                        color: isCurrent ? 'var(--text)' : 'var(--muted)',
                      }}
                    >
                      {stateLabel}
                    </div>
                  </li>
                )
              })}
            </ol>
          </div>

          {/* Submission register (GM only) */}
          {isGm ? (
            <div>
              <div style={{ borderBottom: '1px solid var(--border-strong)', paddingBottom: 6 }}>
                <h2 className="detail-title">Submission register</h2>
              </div>
              {resolution.isLoading ? (
                <SkeletonCard lines={3} />
              ) : resolution.isError || !resolution.data ? (
                <p className="muted" style={{ marginTop: 12 }}>Submission register is unavailable for this turn.</p>
              ) : playerMembers.length === 0 ? (
                <p className="muted" style={{ marginTop: 12 }}>No players have joined yet.</p>
              ) : (
                <table className="register-table">
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>Faction</th>
                      <th>Nation</th>
                      <th>Orders</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {playerMembers.map((member) => {
                      const submission = submissionsByMember.get(member.id)
                      const faction = member.factionId ? factionsById.get(member.factionId) : null
                      const nation = member.nationId ? nationsById.get(member.nationId) : null
                      const tag = submissionStatusTag(submission?.status)
                      return (
                        <tr key={member.id}>
                          <td>{member.displayName}</td>
                          <td>{faction?.name ?? '—'}</td>
                          <td>{nation?.name ?? '—'}</td>
                          <td>{submission ? submission.orderCount : 0}</td>
                          <td>
                            <span className={`status-tag ${tag.className}`}>{tag.label}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          ) : null}

          {/* Front line */}
          <div>
            <div style={{ borderBottom: '1px solid var(--border-strong)', paddingBottom: 6 }}>
              <h2 className="detail-title">Front line</h2>
            </div>
            {contestedTerritories.length === 0 ? (
              <p className="muted" style={{ marginTop: 12 }}>No contested territories this turn.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${contestedTerritories.length},1fr)`, gap: 1, background: 'var(--border)', marginTop: 14 }}>
                {contestedTerritories.map((territory, index) => (
                  <div
                    key={territory.id}
                    style={{
                      background: 'var(--surface)',
                      padding: '14px 16px',
                      borderTop: `3px solid ${CONTEST_BORDER_COLORS[index % CONTEST_BORDER_COLORS.length]}`,
                    }}
                  >
                    <div className="eyebrow" style={{ fontSize: '0.66rem' }}>
                      {territory.key} · {contestSummary(territory)}
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1.05rem', marginTop: 6 }}>
                      {territory.name}
                    </div>
                    <div className="muted" style={{ fontSize: '0.82rem', marginTop: 6 }}>
                      {territory.supplyStatus ? `Supply ${territory.supplyStatus.toLowerCase()}` : `Fort level ${territory.fortLevel}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside style={{ background: 'var(--surface)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '24px 22px', borderBottom: '1px solid var(--border)', background: 'var(--surface-strong)' }}>
            <p className="eyebrow" style={{ color: 'var(--accent)', fontWeight: 700 }}>Next action</p>
            <h3 className="detail-title" style={{ fontSize: '1.2rem', marginTop: 8 }}>{guidance.title}</h3>
            <p className="muted" style={{ marginTop: 10, fontSize: '0.85rem' }}>{guidance.body}</p>
            <div className="button-row" style={{ flexDirection: 'column', marginTop: 18 }}>
              {pendingActivation ? (
                <NavLink className="button-link" style={{ textAlign: 'left' }} to={`/app/campaigns/${campaignId}/waiting`}>
                  Open waiting page
                </NavLink>
              ) : null}
              {currentPhase === 'OPERATIONS' ? (
                <NavLink className="button-link" style={{ textAlign: 'left' }} to={`/app/campaigns/${campaignId}/orders`}>
                  Submit orders
                </NavLink>
              ) : null}
              {currentPhase === 'RESOLUTION' ? (
                <NavLink className="button-link" style={{ textAlign: 'left' }} to={`/app/campaigns/${campaignId}/events`}>
                  View events
                </NavLink>
              ) : null}
              <NavLink
                className="button-secondary"
                style={{ textAlign: 'left' }}
                to={`/app/campaigns/${campaignId}/map`}
              >
                Open map
              </NavLink>
              <NavLink className="button-secondary" style={{ textAlign: 'left' }} to={`/app/campaigns/${campaignId}/lobby`}>
                Lobby
              </NavLink>
              {isGm ? (
                <NavLink className="button-secondary" style={{ textAlign: 'left' }} to={`/app/campaigns/${campaignId}/admin`}>
                  GM admin
                </NavLink>
              ) : null}
            </div>
          </div>

          {isGm ? (
            <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p className="eyebrow" style={{ fontSize: '0.68rem' }}>Dispatch log</p>
              {auditLog.isLoading ? (
                <SkeletonCard lines={3} />
              ) : auditLog.isError || !auditLog.data || auditLog.data.length === 0 ? (
                <p className="muted" style={{ fontSize: '0.85rem' }}>No dispatches recorded yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {auditLog.data.slice(0, 5).map((entry) => (
                    <div key={entry.auditLogId} style={{ display: 'grid', gridTemplateColumns: '58px 1fr', gap: 10 }}>
                      <span className="muted" style={{ fontSize: '0.72rem' }}>{formatShortTime(entry.createdAt)}</span>
                      <span style={{ fontSize: '0.85rem', lineHeight: 1.5 }}>
                        {entry.actorDisplayName ? <strong>{entry.actorDisplayName}</strong> : 'System'}
                        {' — '}
                        {entry.actionType.replaceAll('_', ' ').toLowerCase()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                <span>Fog of war</span>
                <span style={{ color: mapSummary.data.fogOfWarEnabled ? 'var(--success)' : 'var(--muted)', fontWeight: 700 }}>
                  {mapSummary.data.fogOfWarEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  )
}
