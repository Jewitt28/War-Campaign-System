import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { NavLink, useParams } from 'react-router-dom'
import type { CampaignMembership } from '../../features/campaigns'
import { useCampaign, useCampaignMap, useCampaignMembers, useUpdateCampaignMember } from '../../features/campaigns'
import { Notice, SkeletonCard, StateCard } from '../components'

function resolveFactionName(factionId: string | null, factionMap: Map<string, string>) {
  return factionId ? factionMap.get(factionId) ?? factionId : 'Unassigned'
}

function resolveNationName(nationId: string | null, nationMap: Map<string, string>) {
  return nationId ? nationMap.get(nationId) ?? nationId : 'Unassigned'
}

function rosterState(member: CampaignMembership) {
  if (member.role === 'GM') {
    return 'Managing campaign'
  }

  if (!member.factionId || !member.nationId) {
    return 'Awaiting assignment'
  }

  return 'Ready'
}

function AssignmentForm({
  campaignId,
  member,
  isGm,
  factionOptions,
  nationOptions,
}: {
  campaignId: string
  member: CampaignMembership
  isGm: boolean
  factionOptions: { id: string; name: string }[]
  nationOptions: { id: string; name: string; factionId: string | null }[]
}) {
  const updateMember = useUpdateCampaignMember(campaignId)
  const [role, setRole] = useState(member.role)
  const [factionId, setFactionId] = useState(member.factionId ?? '')
  const [nationId, setNationId] = useState(member.nationId ?? '')

  const filteredNationOptions = useMemo(() => {
    if (!factionId) {
      return nationOptions
    }

    return nationOptions.filter((nation) => nation.factionId === factionId)
  }, [factionId, nationOptions])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await updateMember.mutateAsync({
      memberId: member.id,
      payload: {
        role,
        factionId: factionId || null,
        nationId: nationId || null,
      },
    })
  }

  if (!isGm || member.role === 'GM') {
    return null
  }

  return (
    <form className="field-grid" onSubmit={handleSubmit}>
      <label className="field-label">
        Role
        <select className="field-input" onChange={(event) => setRole(event.target.value)} value={role}>
          <option value="PLAYER">PLAYER</option>
          <option value="OBSERVER">OBSERVER</option>
        </select>
      </label>
      <label className="field-label">
        Faction
        <select
          className="field-input"
          onChange={(event) => {
            setFactionId(event.target.value)
            setNationId('')
          }}
          value={factionId}
        >
          <option value="">Unassigned</option>
          {factionOptions.map((faction) => (
            <option key={faction.id} value={faction.id}>
              {faction.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field-label">
        Nation
        <select className="field-input" onChange={(event) => setNationId(event.target.value)} value={nationId}>
          <option value="">Unassigned</option>
          {filteredNationOptions.map((nation) => (
            <option key={nation.id} value={nation.id}>
              {nation.name}
            </option>
          ))}
        </select>
      </label>
      <div className="button-row">
        <button className="button-secondary" disabled={updateMember.isPending} type="submit">
          {updateMember.isPending ? 'Saving...' : 'Save assignment'}
        </button>
      </div>
      {updateMember.isError ? <Notice tone="error">{updateMember.error.message}</Notice> : null}
      {updateMember.isSuccess ? <Notice tone="success">Member assignment updated.</Notice> : null}
    </form>
  )
}

export function CampaignLobbyPage() {
  const { campaignId = '' } = useParams()
  const campaign = useCampaign(campaignId)
  const members = useCampaignMembers(campaignId)
  const mapSummary = useCampaignMap(campaignId)

  if (campaign.isLoading || members.isLoading || mapSummary.isLoading) {
    return (
      <div className="page-stack">
        <SkeletonCard lines={4} />
        <SkeletonCard lines={5} />
      </div>
    )
  }

  if (campaign.isError || members.isError || mapSummary.isError || !campaign.data || !members.data || !mapSummary.data) {
    return (
      <StateCard
        title="Lobby unavailable"
        description="The campaign lobby could not be loaded. Member roster, assignment summary, or map reference data is missing."
      />
    )
  }

  const factionMap = new Map(mapSummary.data.factions.map((faction) => [faction.id, faction.name]))
  const nationMap = new Map(mapSummary.data.nations.map((nation) => [nation.id, nation.name]))
  const isGm = campaign.data.myMembership.role === 'GM'
  const pendingActivation =
    campaign.data.myMembership.role === 'PLAYER' &&
    campaign.data.myMembership.onboarding?.activationStatus === 'PENDING_NEXT_TURN'
  const readinessCount = members.data.filter((member) => rosterState(member) === 'Ready').length

  return (
    <section className="page-stack">
      {pendingActivation ? (
        <Notice>
          Your onboarding is complete, but your nation activates at the start of the next turn. See the{' '}
          <NavLink to={`/app/campaigns/${campaignId}/waiting`}>waiting page</NavLink> or the{' '}
          <NavLink to={`/app/help?campaignId=${campaignId}#activation`}>activation guide</NavLink>.
        </Notice>
      ) : null}

      <div className="hero-grid">
        <section className="surface-card page-card page-stack">
          <p className="eyebrow">Campaign lobby</p>
          <h2 className="detail-title">Assignment summary</h2>
          <div className="detail-list">
            <div className="detail-row">
              <dt>Your role</dt>
              <dd>{campaign.data.myMembership.role}</dd>
            </div>
            <div className="detail-row">
              <dt>Your faction</dt>
              <dd>{resolveFactionName(campaign.data.myMembership.factionId, factionMap)}</dd>
            </div>
            <div className="detail-row">
              <dt>Your nation</dt>
              <dd>{resolveNationName(campaign.data.myMembership.nationId, nationMap)}</dd>
            </div>
            <div className="detail-row">
              <dt>Readiness</dt>
              <dd>
                {readinessCount} of {members.data.length} members ready
              </dd>
            </div>
          </div>
        </section>

        <section className="surface-card surface-card-strong page-card page-stack">
          <p className="eyebrow">Waiting state</p>
          <h2 className="detail-title">{campaign.data.currentPhase === 'LOBBY' ? 'Pre-game assembly' : 'Operational handoff'}</h2>
          <p className="muted">
            {campaign.data.currentPhase === 'LOBBY'
              ? 'Use this lobby to verify roster, assignments, and role coverage before the GM advances into the strategic phase.'
              : 'The lobby remains the cleanest place to confirm membership and assignment integrity mid-campaign.'}
          </p>
          {isGm ? (
            <Notice>GM sessions can update player and observer assignments directly from the roster below.</Notice>
          ) : (
            <Notice>
              Player sessions are read-only here. Assignment changes remain invisible and inaccessible outside GM contexts.
              <span> </span>
              <NavLink to={`/app/help?campaignId=${campaignId}#lobby`}>Lobby help</NavLink>
            </Notice>
          )}
        </section>
      </div>

      <section className="surface-card page-card page-stack">
        <div className="page-header">
          <div className="page-header-copy">
            <p className="eyebrow">Member roster</p>
            <h2 className="detail-title">Campaign members</h2>
          </div>
        </div>
        <div className="campaign-grid">
          {members.data.map((member) => (
            <article key={member.id} className="campaign-card">
              <div className="section-stack">
                <div className="pill-row">
                  <span className="meta-pill">{member.role}</span>
                  <span className="meta-pill">{rosterState(member)}</span>
                </div>
                <div className="section-stack" style={{ gap: 6 }}>
                  <h3>{member.displayName}</h3>
                  <p className="muted">{member.email}</p>
                </div>
              </div>
              <div className="detail-list">
                <div className="detail-row">
                  <dt>Faction</dt>
                  <dd>{resolveFactionName(member.factionId, factionMap)}</dd>
                </div>
                <div className="detail-row">
                  <dt>Nation</dt>
                  <dd>{resolveNationName(member.nationId, nationMap)}</dd>
                </div>
              </div>
              <AssignmentForm
                campaignId={campaignId}
                factionOptions={mapSummary.data.factions.map((faction) => ({ id: faction.id, name: faction.name }))}
                isGm={isGm}
                member={member}
                nationOptions={mapSummary.data.nations.map((nation) => ({
                  id: nation.id,
                  name: nation.name,
                  factionId: nation.factionId,
                }))}
              />
            </article>
          ))}
        </div>
      </section>
    </section>
  )
}
