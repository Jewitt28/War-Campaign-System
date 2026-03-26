import { queryOptions, useQuery } from '@tanstack/react-query'
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

export function useCampaigns() {
  return useQuery(campaignsQueryOptions())
}

export function useCampaign(campaignId: string) {
  return useQuery(campaignQueryOptions(campaignId))
}
