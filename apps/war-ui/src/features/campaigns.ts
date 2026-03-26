import { useMutation, queryOptions, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { queryKeys } from '../lib/queryKeys'

type CampaignSummaryDto = {
  id: string
  name: string
  currentPhase: string
  myRole: string
  memberCount: number
}

type CampaignMemberDto = {
  id: string
  userId: string
  email: string
  displayName: string
  role: string
  factionId: string | null
  nationId: string | null
}

type CampaignDetailDto = {
  id: string
  name: string
  currentPhase: string
  createdByUserId: string
  createdByDisplayName: string
  memberCount: number
  myMembership: CampaignMemberDto
  factions: CampaignFactionDto[]
}

type CampaignFactionDto = {
  id: string
  key: string
  name: string
  type: string
  color: string | null
  playerControlled: boolean
}

type CampaignMapDto = {
  campaignId: string
  campaignName: string
  currentTurnNumber: number
  currentPhase: string
  phaseStartedAt: string | null
  phaseEndsAt: string | null
  fogOfWarEnabled: boolean
  timersEnabled: boolean
  factions: CampaignFactionDto[]
  nations: CampaignNationDto[]
  theatres: CampaignTheatreDto[]
  territories: CampaignMapTerritoryDto[]
}

type CampaignNationDto = {
  id: string
  factionId: string | null
  key: string
  name: string
  npc: boolean
}

type CampaignTheatreDto = {
  id: string
  key: string
  name: string
  displayOrder: number
  active: boolean
}

type CampaignPhaseDto = {
  campaignId: string
  currentTurnNumber: number
  currentPhase: string
  phaseStartedAt: string | null
  phaseEndsAt: string | null
}

type CampaignMapTerritoryDto = {
  id: string
  key: string
  name: string
  theatreId: string
  strategicStatus: string | null
  controllingFactionId: string | null
  controllerNationId: string | null
  fortLevel: number
  supplyStatus: string | null
}

type UpdateCampaignMemberRequest = {
  role?: string
  factionId?: string | null
  nationId?: string | null
}

export type CampaignSummary = {
  id: string
  name: string
  currentPhase: string
  myRole: string
  memberCount: number
}

export type CampaignMembership = {
  id: string
  userId: string
  email: string
  displayName: string
  role: string
  factionId: string | null
  nationId: string | null
}

export type CampaignDetail = {
  id: string
  name: string
  currentPhase: string
  createdByUserId: string
  createdByDisplayName: string
  memberCount: number
  myMembership: CampaignMembership
  factions: CampaignFaction[]
}

export type CampaignFaction = {
  id: string
  key: string
  name: string
  type: string
  color: string | null
  playerControlled: boolean
}

export type CampaignNation = {
  id: string
  factionId: string | null
  key: string
  name: string
  npc: boolean
}

export type CampaignMapSummary = {
  campaignId: string
  campaignName: string
  currentTurnNumber: number
  currentPhase: string
  phaseStartedAt: Date | null
  phaseEndsAt: Date | null
  fogOfWarEnabled: boolean
  timersEnabled: boolean
  factions: CampaignFaction[]
  nations: CampaignNation[]
  theatres: CampaignTheatre[]
  territories: CampaignMapTerritory[]
}

export type CampaignTheatre = {
  id: string
  key: string
  name: string
  displayOrder: number
  active: boolean
}

export type CampaignPhaseSummary = {
  campaignId: string
  currentTurnNumber: number
  currentPhase: string
  phaseStartedAt: Date | null
  phaseEndsAt: Date | null
}

export type CampaignMapTerritory = {
  id: string
  key: string
  name: string
  theatreId: string
  strategicStatus: string | null
  controllingFactionId: string | null
  controllerNationId: string | null
  fortLevel: number
  supplyStatus: string | null
}

function mapMembership(dto: CampaignMemberDto): CampaignMembership {
  return {
    id: dto.id,
    userId: dto.userId,
    email: dto.email,
    displayName: dto.displayName,
    role: dto.role,
    factionId: dto.factionId,
    nationId: dto.nationId,
  }
}

function mapFaction(dto: CampaignFactionDto): CampaignFaction {
  return {
    id: dto.id,
    key: dto.key,
    name: dto.name,
    type: dto.type,
    color: dto.color,
    playerControlled: dto.playerControlled,
  }
}

function mapNation(dto: CampaignNationDto): CampaignNation {
  return {
    id: dto.id,
    factionId: dto.factionId,
    key: dto.key,
    name: dto.name,
    npc: dto.npc,
  }
}

function mapTheatre(dto: CampaignTheatreDto): CampaignTheatre {
  return {
    id: dto.id,
    key: dto.key,
    name: dto.name,
    displayOrder: dto.displayOrder,
    active: dto.active,
  }
}

function mapTerritory(dto: CampaignMapTerritoryDto): CampaignMapTerritory {
  return {
    id: dto.id,
    key: dto.key,
    name: dto.name,
    theatreId: dto.theatreId,
    strategicStatus: dto.strategicStatus,
    controllingFactionId: dto.controllingFactionId,
    controllerNationId: dto.controllerNationId,
    fortLevel: dto.fortLevel,
    supplyStatus: dto.supplyStatus,
  }
}

function mapCampaignSummary(dto: CampaignSummaryDto): CampaignSummary {
  return {
    id: dto.id,
    name: dto.name,
    currentPhase: dto.currentPhase,
    myRole: dto.myRole,
    memberCount: dto.memberCount,
  }
}

function mapCampaignDetail(dto: CampaignDetailDto): CampaignDetail {
  return {
    id: dto.id,
    name: dto.name,
    currentPhase: dto.currentPhase,
    createdByUserId: dto.createdByUserId,
    createdByDisplayName: dto.createdByDisplayName,
    memberCount: dto.memberCount,
    myMembership: mapMembership(dto.myMembership),
    factions: dto.factions.map(mapFaction),
  }
}

function mapCampaignMap(dto: CampaignMapDto): CampaignMapSummary {
  return {
    campaignId: dto.campaignId,
    campaignName: dto.campaignName,
    currentTurnNumber: dto.currentTurnNumber,
    currentPhase: dto.currentPhase,
    phaseStartedAt: dto.phaseStartedAt ? new Date(dto.phaseStartedAt) : null,
    phaseEndsAt: dto.phaseEndsAt ? new Date(dto.phaseEndsAt) : null,
    fogOfWarEnabled: dto.fogOfWarEnabled,
    timersEnabled: dto.timersEnabled,
    factions: dto.factions.map(mapFaction),
    nations: dto.nations.map(mapNation),
    theatres: dto.theatres.map(mapTheatre),
    territories: dto.territories.map(mapTerritory),
  }
}

function mapCampaignPhase(dto: CampaignPhaseDto): CampaignPhaseSummary {
  return {
    campaignId: dto.campaignId,
    currentTurnNumber: dto.currentTurnNumber,
    currentPhase: dto.currentPhase,
    phaseStartedAt: dto.phaseStartedAt ? new Date(dto.phaseStartedAt) : null,
    phaseEndsAt: dto.phaseEndsAt ? new Date(dto.phaseEndsAt) : null,
  }
}

async function fetchCampaigns() {
  const response = await api.get<CampaignSummaryDto[]>('/api/campaigns')
  return response.data.map(mapCampaignSummary)
}

async function fetchCampaign(campaignId: string) {
  const response = await api.get<CampaignDetailDto>(`/api/campaigns/${campaignId}`)
  return mapCampaignDetail(response.data)
}

async function fetchCampaignMembers(campaignId: string) {
  const response = await api.get<CampaignMemberDto[]>(`/api/campaigns/${campaignId}/members`)
  return response.data.map(mapMembership)
}

async function fetchCampaignMap(campaignId: string) {
  const response = await api.get<CampaignMapDto>(`/api/campaigns/${campaignId}/map`)
  return mapCampaignMap(response.data)
}

async function fetchCampaignPhase(campaignId: string) {
  const response = await api.get<CampaignPhaseDto>(`/api/campaigns/${campaignId}/phase`)
  return mapCampaignPhase(response.data)
}

async function updateCampaignMember(campaignId: string, memberId: string, payload: UpdateCampaignMemberRequest) {
  const response = await api.patch<CampaignMemberDto>(`/api/campaigns/${campaignId}/members/${memberId}`, payload)
  return mapMembership(response.data)
}

export const campaignsQueryOptions = () =>
  queryOptions({
    queryKey: queryKeys.campaigns,
    queryFn: fetchCampaigns,
  })

export const campaignQueryOptions = (campaignId: string) =>
  queryOptions({
    queryKey: queryKeys.campaign(campaignId),
    queryFn: () => fetchCampaign(campaignId),
    enabled: Boolean(campaignId),
  })

export const campaignMembersQueryOptions = (campaignId: string) =>
  queryOptions({
    queryKey: queryKeys.campaignMembers(campaignId),
    queryFn: () => fetchCampaignMembers(campaignId),
    enabled: Boolean(campaignId),
  })

export const campaignMapQueryOptions = (campaignId: string) =>
  queryOptions({
    queryKey: queryKeys.campaignMap(campaignId),
    queryFn: () => fetchCampaignMap(campaignId),
    enabled: Boolean(campaignId),
  })

export const campaignPhaseQueryOptions = (campaignId: string) =>
  queryOptions({
    queryKey: queryKeys.campaignPhase(campaignId),
    queryFn: () => fetchCampaignPhase(campaignId),
    enabled: Boolean(campaignId),
  })

export function useCampaigns() {
  return useQuery(campaignsQueryOptions())
}

export function useCampaign(campaignId: string) {
  return useQuery(campaignQueryOptions(campaignId))
}

export function useCampaignMembers(campaignId: string) {
  return useQuery(campaignMembersQueryOptions(campaignId))
}

export function useCampaignMap(campaignId: string) {
  return useQuery(campaignMapQueryOptions(campaignId))
}

export function useCampaignPhase(campaignId: string) {
  return useQuery(campaignPhaseQueryOptions(campaignId))
}

export function useUpdateCampaignMember(campaignId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ memberId, payload }: { memberId: string; payload: UpdateCampaignMemberRequest }) =>
      updateCampaignMember(campaignId, memberId, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.campaign(campaignId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.campaignMembers(campaignId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.campaignMap(campaignId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.campaignPhase(campaignId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.campaigns }),
      ])
    },
  })
}
