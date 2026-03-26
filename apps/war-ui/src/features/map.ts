import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { queryKeys } from '../lib/queryKeys'

type TerritoryFactionRefDto = {
  id: string
  key: string
  name: string
}

type TerritoryNationRefDto = {
  id: string
  factionId: string | null
  key: string
  name: string
}

type TheatreRefDto = {
  id: string
  key: string
  name: string
  displayOrder: number
  active: boolean
}

type PlayerTerritoryDto = {
  id: string
  key: string
  name: string
  theatre: TheatreRefDto
  terrainType: string
  strategicTagsJson: string | null
  baseIndustry: number
  baseManpower: number
  hasPort: boolean
  hasAirfield: boolean
  maxFortLevel: number
  strategicStatus: string | null
  fortLevel: number
  supplyStatus: string | null
  controllingFaction: TerritoryFactionRefDto | null
  controllerNation: TerritoryNationRefDto | null
}

type GmTerritoryDto = PlayerTerritoryDto & {
  partisanRisk: number
  damageJson: string | null
  notes: string | null
  metadataJson: string | null
}

export type TerritoryFactionReference = {
  id: string
  key: string
  name: string
}

export type TerritoryNationReference = {
  id: string
  factionId: string | null
  key: string
  name: string
}

export type TheatreReference = {
  id: string
  key: string
  name: string
  displayOrder: number
  active: boolean
}

export type PlayerTerritoryDetail = {
  id: string
  key: string
  name: string
  theatre: TheatreReference
  terrainType: string
  strategicTagsJson: string | null
  baseIndustry: number
  baseManpower: number
  hasPort: boolean
  hasAirfield: boolean
  maxFortLevel: number
  strategicStatus: string | null
  fortLevel: number
  supplyStatus: string | null
  controllingFaction: TerritoryFactionReference | null
  controllerNation: TerritoryNationReference | null
}

export type GmTerritoryDetail = PlayerTerritoryDetail & {
  partisanRisk: number
  damageJson: string | null
  notes: string | null
  metadataJson: string | null
}

function mapTheatre(dto: TheatreRefDto): TheatreReference {
  return {
    id: dto.id,
    key: dto.key,
    name: dto.name,
    displayOrder: dto.displayOrder,
    active: dto.active,
  }
}

function mapFaction(dto: TerritoryFactionRefDto | null): TerritoryFactionReference | null {
  if (!dto) {
    return null
  }

  return {
    id: dto.id,
    key: dto.key,
    name: dto.name,
  }
}

function mapNation(dto: TerritoryNationRefDto | null): TerritoryNationReference | null {
  if (!dto) {
    return null
  }

  return {
    id: dto.id,
    factionId: dto.factionId,
    key: dto.key,
    name: dto.name,
  }
}

function mapPlayerTerritory(dto: PlayerTerritoryDto): PlayerTerritoryDetail {
  return {
    id: dto.id,
    key: dto.key,
    name: dto.name,
    theatre: mapTheatre(dto.theatre),
    terrainType: dto.terrainType,
    strategicTagsJson: dto.strategicTagsJson,
    baseIndustry: dto.baseIndustry,
    baseManpower: dto.baseManpower,
    hasPort: dto.hasPort,
    hasAirfield: dto.hasAirfield,
    maxFortLevel: dto.maxFortLevel,
    strategicStatus: dto.strategicStatus,
    fortLevel: dto.fortLevel,
    supplyStatus: dto.supplyStatus,
    controllingFaction: mapFaction(dto.controllingFaction),
    controllerNation: mapNation(dto.controllerNation),
  }
}

function mapGmTerritory(dto: GmTerritoryDto): GmTerritoryDetail {
  return {
    ...mapPlayerTerritory(dto),
    partisanRisk: dto.partisanRisk,
    damageJson: dto.damageJson,
    notes: dto.notes,
    metadataJson: dto.metadataJson,
  }
}

async function fetchPlayerTerritory(campaignId: string, territoryId: string) {
  const response = await api.get<PlayerTerritoryDto>(`/api/campaigns/${campaignId}/territories/${territoryId}`)
  return mapPlayerTerritory(response.data)
}

async function fetchGmTerritory(campaignId: string, territoryId: string) {
  const response = await api.get<GmTerritoryDto>(`/api/campaigns/${campaignId}/territories/${territoryId}/gm`)
  return mapGmTerritory(response.data)
}

export function usePlayerTerritory(campaignId: string, territoryId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.playerTerritory(campaignId, territoryId),
    queryFn: () => fetchPlayerTerritory(campaignId, territoryId),
    enabled: Boolean(campaignId && territoryId && enabled),
  })
}

export function useGmTerritory(campaignId: string, territoryId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.gmTerritory(campaignId, territoryId),
    queryFn: () => fetchGmTerritory(campaignId, territoryId),
    enabled: Boolean(campaignId && territoryId && enabled),
  })
}
