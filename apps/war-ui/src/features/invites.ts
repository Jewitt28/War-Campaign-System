import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { queryKeys } from '../lib/queryKeys'

type FactionInviteInfoDto = {
  factionId: string
  factionKey: string
  factionName: string
  invitedByDisplayName: string
}

type InviteDetailsDto = {
  campaignId: string
  campaignName: string
  intendedRole: string
  status: string
  expiresAt: string
  expired: boolean
  intendedFactionKey: string | null
  intendedNationKey: string | null
  factionInvite: FactionInviteInfoDto | null
}

type AcceptInviteDto = {
  campaignId: string
  membershipId: string
  role: string
  intendedFactionKey: string | null
  intendedNationKey: string | null
  status: string
  onboardingRequired: boolean
  activationStatus: string
  redirectPath: string
}

export type FactionInviteInfo = {
  factionId: string
  factionKey: string
  factionName: string
  invitedByDisplayName: string
}

export type InviteDetails = {
  campaignId: string
  campaignName: string
  intendedRole: string
  status: string
  expiresAt: Date
  expired: boolean
  intendedFactionKey: string | null
  intendedNationKey: string | null
  factionInvite: FactionInviteInfo | null
}

export type AcceptedInvite = {
  campaignId: string
  membershipId: string
  role: string
  intendedFactionKey: string | null
  intendedNationKey: string | null
  status: string
  onboardingRequired: boolean
  activationStatus: string
  redirectPath: string
}

function mapInvite(dto: InviteDetailsDto): InviteDetails {
  return {
    campaignId: dto.campaignId,
    campaignName: dto.campaignName,
    intendedRole: dto.intendedRole,
    status: dto.status,
    expiresAt: new Date(dto.expiresAt),
    expired: dto.expired,
    intendedFactionKey: dto.intendedFactionKey,
    intendedNationKey: dto.intendedNationKey,
    factionInvite: dto.factionInvite ?? null,
  }
}

function mapAcceptedInvite(dto: AcceptInviteDto): AcceptedInvite {
  return {
    campaignId: dto.campaignId,
    membershipId: dto.membershipId,
    role: dto.role,
    intendedFactionKey: dto.intendedFactionKey,
    intendedNationKey: dto.intendedNationKey,
    status: dto.status,
    onboardingRequired: dto.onboardingRequired,
    activationStatus: dto.activationStatus,
    redirectPath: dto.redirectPath,
  }
}

async function fetchInvite(token: string) {
  const response = await api.get<InviteDetailsDto>(`/api/invites/${token}`)
  return mapInvite(response.data)
}

async function acceptInvite(token: string, acceptFactionInvite: boolean) {
  const response = await api.post<AcceptInviteDto>(`/api/invites/${token}/accept`, { acceptFactionInvite })
  return mapAcceptedInvite(response.data)
}

type CreatePlayerInviteDto = {
  inviteId: string
  token: string
  url: string
  factionName: string | null
}

async function createPlayerInvite(campaignId: string, includeFactionInvite: boolean) {
  const response = await api.post<CreatePlayerInviteDto>(
    `/api/campaigns/${campaignId}/invites/player`,
    { includeFactionInvite },
  )
  return response.data
}

export type CreatePlayerInviteResult = CreatePlayerInviteDto

export function useInvite(token: string) {
  return useQuery({
    queryKey: queryKeys.invite(token),
    queryFn: () => fetchInvite(token),
    enabled: Boolean(token),
  })
}

export function useAcceptInvite(token: string) {
  return useMutation({
    mutationFn: (acceptFactionInvite: boolean) => acceptInvite(token, acceptFactionInvite),
  })
}

export function useCreatePlayerInvite(campaignId: string) {
  return useMutation({
    mutationFn: (includeFactionInvite: boolean) => createPlayerInvite(campaignId, includeFactionInvite),
  })
}
