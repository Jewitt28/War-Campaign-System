import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import { authQueryOptions, useAuth } from '../../features/auth'
import { type FactionInviteInfo, useAcceptInvite, useInvite } from '../../features/invites'
import { queryKeys } from '../../lib/queryKeys'
import { DetailList, Notice, SkeletonCard, StateCard } from '../components'

type AuthenticatedAcceptSectionProps = {
  acceptInviteIsPending: boolean
  currentUser: { displayName?: string; email?: string } | null | undefined
  factionChoice: boolean | null
  factionInvite: FactionInviteInfo | null
  onAccept: (acceptFaction: boolean) => void
  onFactionChoice: (choice: boolean | null) => void
}

function AuthenticatedAcceptSection({
  acceptInviteIsPending,
  currentUser,
  factionChoice,
  factionInvite,
  onAccept,
  onFactionChoice,
}: AuthenticatedAcceptSectionProps) {
  // If there's a faction invite and the user hasn't chosen yet, show the prompt
  if (factionInvite && factionChoice === null) {
    return (
      <>
        <p className="eyebrow">Faction invite</p>
        <h2 className="detail-title">
          {factionInvite.invitedByDisplayName} invited you to join the {factionInvite.factionName}
        </h2>
        <p className="muted">
          You can join as part of the <strong>{factionInvite.factionName}</strong> alongside{' '}
          {factionInvite.invitedByDisplayName}, or join independently as an unaligned player.
        </p>
        <div className="button-row">
          <button className="button-link" onClick={() => onFactionChoice(true)} type="button">
            Join the {factionInvite.factionName}
          </button>
          <button className="button-secondary" onClick={() => onFactionChoice(false)} type="button">
            Join independently (unaligned)
          </button>
        </div>
      </>
    )
  }

  const acceptFaction = factionChoice ?? false

  return (
    <>
      <p className="eyebrow">Authenticated session</p>
      <h2 className="detail-title">Accept as {currentUser?.displayName ?? 'Unknown user'}</h2>
      <p className="muted">
        {factionInvite && acceptFaction
          ? `Joining as part of the ${factionInvite.factionName}. `
          : factionInvite
            ? 'Joining as an unaligned player. '
            : ''}
        Signed in as {currentUser?.email ?? 'unknown email'}.
      </p>
      {factionInvite ? (
        <p className="muted">
          <button className="button-link-inline" onClick={() => onFactionChoice(null)} type="button">
            Change faction choice
          </button>
        </p>
      ) : null}
      <div className="button-row">
        <button
          className="button-link"
          disabled={acceptInviteIsPending}
          onClick={() => onAccept(acceptFaction)}
          type="button"
        >
          {acceptInviteIsPending ? 'Accepting invite...' : 'Accept invite'}
        </button>
        <NavLink className="button-secondary" to="/app/campaigns">
          View campaigns instead
        </NavLink>
      </div>
    </>
  )
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function InvitePage() {
  const { token = '' } = useParams()
  const auth = useAuth()
  const invite = useInvite(token)
  const acceptInvite = useAcceptInvite(token)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [acceptedCampaignId, setAcceptedCampaignId] = useState<string | null>(null)
  // null = undecided (show prompt when faction invite present), true/false = decided
  const [factionChoice, setFactionChoice] = useState<boolean | null>(null)

  if (invite.isLoading || auth.isLoading) {
    return <SkeletonCard lines={5} />
  }

  if (invite.isError || !invite.data) {
    return (
      <StateCard
        title="Invite not found"
        description="The invite token could not be loaded. It may be invalid, revoked, or no longer available."
        actions={<NavLink className="button-link" to="/login">Go to sign in</NavLink>}
      />
    )
  }

  const details = invite.data
  const isAccepted = acceptedCampaignId !== null || details.status === 'ACCEPTED'
  const isExpired = details.expired || details.status === 'REVOKED'
  const isUnauthenticated = !auth.data
  const currentUser = auth.data

  async function handleAccept(acceptFaction: boolean) {
    const response = await acceptInvite.mutateAsync(acceptFaction)
    setAcceptedCampaignId(response.campaignId)
    await queryClient.invalidateQueries({ queryKey: queryKeys.campaigns })
    await queryClient.invalidateQueries({ queryKey: authQueryOptions().queryKey })
    navigate(response.redirectPath, { replace: true })
  }

  if (isAccepted) {
    const targetCampaignId = acceptedCampaignId ?? details.campaignId
    return (
      <section className="surface-card page-card page-stack">
        <p className="eyebrow">Invite</p>
        <h1 className="page-title">Invite accepted</h1>
        <p className="muted">Your membership is active. You can now enter the authenticated app shell.</p>
        <Notice tone="success">Campaign access is now available for {details.campaignName}.</Notice>
        <DetailList
          items={[
            { label: 'Campaign', value: details.campaignName },
            { label: 'Role', value: details.intendedRole },
            { label: 'Faction', value: details.intendedFactionKey ?? 'Unassigned' },
            { label: 'Nation', value: details.intendedNationKey ?? 'Unassigned' },
          ]}
        />
        <div className="button-row">
          <button className="button-link" onClick={() => navigate('/app/campaigns', { replace: true })} type="button">
            Open campaigns
          </button>
          <NavLink className="button-secondary" to={`/app/campaigns/${targetCampaignId}`}>
            Open campaign route scaffold
          </NavLink>
        </div>
      </section>
    )
  }

  if (isExpired) {
    const expiredTitle = details.status === 'REVOKED' ? 'Invite revoked' : 'Invite expired'
    const expiredDescription =
      details.status === 'REVOKED'
        ? 'This invite was revoked by the GM before it was accepted.'
        : 'This invite is no longer valid. Ask the GM to issue a new invite.'

    return (
      <section className="surface-card page-card page-stack">
        <p className="eyebrow">Invite</p>
        <h1 className="page-title">{expiredTitle}</h1>
        <p className="muted">{expiredDescription}</p>
        <DetailList
          items={[
            { label: 'Campaign', value: details.campaignName },
            { label: 'Intended role', value: details.intendedRole },
            { label: 'Expires at', value: formatDate(details.expiresAt) },
          ]}
        />
        <div className="button-row">
          <NavLink className="button-link" to="/login">
            Return to sign in
          </NavLink>
        </div>
      </section>
    )
  }

  return (
    <div className="hero-grid">
      <section className="surface-card page-card page-stack">
        <div className="page-header">
          <div className="page-header-copy">
            <p className="eyebrow">Invite acceptance</p>
            <h1 className="page-title">{details.campaignName}</h1>
            <p className="muted">
              Review the invite below. If you are not signed in, the flow will preserve this return path and send you
              back here after login.
            </p>
          </div>
          <div className="pill-row">
            <span className="meta-pill">Status {details.status}</span>
            <span className="meta-pill">Expires {formatDate(details.expiresAt)}</span>
          </div>
        </div>
        <DetailList
          items={[
            { label: 'Role', value: details.intendedRole },
            { label: 'Faction', value: details.intendedFactionKey ?? 'Unassigned' },
            { label: 'Nation', value: details.intendedNationKey ?? 'Unassigned' },
          ]}
        />
        {acceptInvite.isError ? <Notice tone="error">{acceptInvite.error.message}</Notice> : null}
      </section>

      <section className="surface-card surface-card-strong page-card page-stack">
        {isUnauthenticated ? (
          <>
            <p className="eyebrow">Authentication required</p>
            <h2 className="detail-title">Sign in to accept this invite</h2>
            <p className="muted">
              The invite is valid, but the backend only accepts it for an authenticated user session.
            </p>
            <div className="button-row">
              <NavLink className="button-link" to={`/login?redirect=${encodeURIComponent(`/invite/${token}`)}`}>
                Sign in and return
              </NavLink>
            </div>
          </>
        ) : (
          <AuthenticatedAcceptSection
            acceptInviteIsPending={acceptInvite.isPending}
            currentUser={currentUser}
            factionChoice={factionChoice}
            factionInvite={details.factionInvite}
            onAccept={handleAccept}
            onFactionChoice={setFactionChoice}
          />
        )}
      </section>
    </div>
  )
}
