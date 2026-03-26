import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { queryKeys } from '../lib/queryKeys'
import type { Platoon, PlatoonTrait } from '../domain/types'

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
  mpBase: number
  traits: PlatoonTrait[]
  entrenched: boolean
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
  mpBase: number
  traits: PlatoonTrait[]
  entrenched: boolean
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
  mpBase: number
  traits: PlatoonTrait[]
  entrenched: boolean
}

export type PlatoonDetail = PlatoonSummary & {
  hiddenFromPlayers?: boolean
  assignedMember?: {
    id: string
    userId: string
    displayName: string
    email: string
  } | null
  homeTerritory: ReferenceDto | null
  notes?: string | null
}

export type CreateCampaignPlatoonInput = {
  platoonKey: string
  name: string
  factionId?: string | null
  nationId?: string | null
  homeTerritoryId: string
  unitType?: string
  condition?: string
  strength?: number
  mpBase: number
  traits: PlatoonTrait[]
  entrenched?: boolean
  hiddenFromPlayers?: boolean
}

export type UpdateCampaignPlatoonInput = {
  name?: string
  condition?: string
  mpBase?: number
  traits?: PlatoonTrait[]
  entrenched?: boolean
  strength?: number
  hiddenFromPlayers?: boolean
}

type PlatoonViewDto = Pick<
  PlatoonSummaryDto,
  | 'id'
  | 'key'
  | 'name'
  | 'unitType'
  | 'faction'
  | 'nation'
  | 'currentTerritory'
  | 'readinessStatus'
  | 'strength'
  | 'mpBase'
  | 'traits'
  | 'entrenched'
>

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
    mpBase: dto.mpBase,
    traits: dto.traits ?? [],
    entrenched: dto.entrenched,
  }
}

function mapPlatoonDetail(dto: PlatoonDetailDto): PlatoonDetail {
  return {
    ...mapPlatoon(dto),
    hiddenFromPlayers: dto.hiddenFromPlayers,
    assignedMember: dto.assignedMember ?? null,
    homeTerritory: dto.homeTerritory,
    notes: dto.notes ?? null,
  }
}

export function mapPlatoonToStorePlatoon(
  platoon: PlatoonViewDto,
  fallback?: Platoon,
): Platoon {
  return {
    id: platoon.id,
    faction: fallback?.faction ?? (platoon.faction.key as Platoon['faction']),
    nation:
      fallback?.nation ??
      (platoon.nation?.key as Platoon['nation']),
    name: platoon.name,
    territoryId: platoon.currentTerritory?.key ?? fallback?.territoryId ?? '',
    condition: fallback?.condition ?? 'FRESH',
    strengthPct:
      fallback?.strengthPct ?? Math.max(0, Math.min(100, Math.round(platoon.strength))),
    mpBase: platoon.mpBase,
    traits: platoon.traits ?? fallback?.traits ?? [],
    entrenched: platoon.entrenched ?? fallback?.entrenched ?? false,
  }
}

async function fetchPlatoons(campaignId: string) {
  const response = await api.get<PlatoonSummaryDto[]>(`/api/campaigns/${campaignId}/platoons`)
  return response.data.map(mapPlatoon)
}

async function fetchPlatoon(campaignId: string, platoonId: string) {
  const response = await api.get<PlatoonDetailDto>(`/api/campaigns/${campaignId}/platoons/${platoonId}`)
  return mapPlatoonDetail(response.data)
}

async function createPlatoon(campaignId: string, payload: CreateCampaignPlatoonInput) {
  const response = await api.post<PlatoonDetailDto>(`/api/campaigns/${campaignId}/platoons`, payload)
  return mapPlatoonDetail(response.data)
}

async function updatePlatoon(campaignId: string, platoonId: string, payload: UpdateCampaignPlatoonInput) {
  const response = await api.put<PlatoonDetailDto>(`/api/campaigns/${campaignId}/platoons/${platoonId}`, payload)
  return mapPlatoonDetail(response.data)
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

export function useCreateCampaignPlatoon(campaignId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateCampaignPlatoonInput) => createPlatoon(campaignId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.campaignPlatoons(campaignId) })
    },
  })
}

export function useUpdateCampaignPlatoon(campaignId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      platoonId,
      payload,
    }: {
      platoonId: string
      payload: UpdateCampaignPlatoonInput
    }) => updatePlatoon(campaignId, platoonId, payload),
    onSuccess: async (_updatedPlatoon, variables) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.campaignPlatoons(campaignId) })
      await queryClient.invalidateQueries({ queryKey: queryKeys.campaignPlatoon(campaignId, variables.platoonId) })
    },
  })
}
