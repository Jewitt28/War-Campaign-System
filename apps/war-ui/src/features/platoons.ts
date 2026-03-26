import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { queryKeys } from '../lib/queryKeys'

type ReferenceDto = {
  id: string
  key: string
  name: string
}

type NationReferenceDto = ReferenceDto & {
  factionId: string | null
}

type PlatoonSummaryDto = {
  id: string
  key: string
  name: string
  unitType: string
  faction: ReferenceDto
  nation: NationReferenceDto | null
  currentTerritory: ReferenceDto | null
  readinessStatus: string
  strength: number
}

type PlatoonDetailDto = {
  id: string
  key: string
  name: string
  unitType: string
  hiddenFromPlayers?: boolean
  faction: ReferenceDto
  nation: NationReferenceDto | null
  assignedMember?: {
    id: string
    userId: string
    displayName: string
    email: string
  } | null
  homeTerritory: ReferenceDto | null
  currentTerritory: ReferenceDto | null
  readinessStatus: string
  strength: number
  notes?: string | null
}

export type PlatoonSummary = {
  id: string
  key: string
  name: string
  unitType: string
  faction: ReferenceDto
  nation: NationReferenceDto | null
  currentTerritory: ReferenceDto | null
  readinessStatus: string
  strength: number
}

export type PlatoonDetail = PlatoonDetailDto

function mapPlatoon(dto: PlatoonSummaryDto): PlatoonSummary {
  return {
    id: dto.id,
    key: dto.key,
    name: dto.name,
    unitType: dto.unitType,
    faction: dto.faction,
    nation: dto.nation,
    currentTerritory: dto.currentTerritory,
    readinessStatus: dto.readinessStatus,
    strength: dto.strength,
  }
}

async function fetchPlatoons(campaignId: string) {
  const response = await api.get<PlatoonSummaryDto[]>(`/api/campaigns/${campaignId}/platoons`)
  return response.data.map(mapPlatoon)
}

async function fetchPlatoon(campaignId: string, platoonId: string) {
  const response = await api.get<PlatoonDetailDto>(`/api/campaigns/${campaignId}/platoons/${platoonId}`)
  return response.data
}

export function useCampaignPlatoons(campaignId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.campaignPlatoons(campaignId),
    queryFn: () => fetchPlatoons(campaignId),
    enabled: Boolean(campaignId && enabled),
  })
}

export function useCampaignPlatoon(campaignId: string, platoonId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.campaignPlatoon(campaignId, platoonId),
    queryFn: () => fetchPlatoon(campaignId, platoonId),
    enabled: Boolean(campaignId && platoonId && enabled),
  })
}
