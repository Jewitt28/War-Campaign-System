import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, useParams } from 'react-router-dom'
import { loadTheatresData, type NormalizedData, type TheatreId } from '../../data/theatres'
import type { NationDoctrineState } from '../../data/doctrine'
import type { NationResearchState } from '../../data/research'
import type { NationUpgradesState } from '../../data/upgrades'
import type { EconomyPool } from '../../domain/strategicEconomy'
import type { Phase, PlatoonCondition, Platoon } from '../../domain/types'
import { useCampaign, useCampaignMap, useCampaignPhase } from '../../features/campaigns'
import {
  useCampaignMapBridge,
  useSaveCampaignMapSetup,
  useSaveCampaignNationStates,
  type CampaignMapBridge,
} from '../../features/mapBridge'
import { useCampaignPlatoons } from '../../features/platoons'
import MapBoard from '../../map/MapBoard'
import { NATION_BY_ID, type NationKey } from '../../setup/NationDefinitions'
import {
  useCampaignStore,
  type CustomFaction,
  type CustomNation,
  type FactionKey,
  type FactionMetadata,
  type ViewerMode,
} from '../../store/useCampaignStore'
import SetupPanel from '../../setup/SetupPanel'
import CommandHub from '../../ui/CommandHub'
import CommandPanel from '../../ui/CommandPanel'
import NationCommandPanel from '../../ui/NationCommandPanel'
import { Notice, SkeletonCard, StateCard } from '../components'
import { CampaignMapBattlesPanel } from './CampaignMapBattlesPanel'
import { CampaignMapOrdersPanel } from './CampaignMapOrdersPanel'

const BACKEND_NATION_KEY_ALIASES: Record<string, NationKey> = {
  uk: 'great_britain',
  united_kingdom: 'great_britain',
  de: 'germany',
  jp: 'imperial_japan',
  japan: 'imperial_japan',
  su: 'soviet_union',
  soviet: 'soviet_union',
  ussr: 'soviet_union',
  nl: 'the_netherlands',
  netherlands: 'the_netherlands',
  holland: 'the_netherlands',
  ppa: 'polish_peoples_army',
  polish_peoples_army: 'polish_peoples_army',
}

type HydratedMapState = {
  viewerMode: ViewerMode
  viewerNation: NationKey
  viewerFaction: FactionKey
  mode: 'SETUP' | 'PLAY'
  phase: Phase
  turnNumber: number
  activeTheatres: Record<TheatreId, boolean>
  adjacencyByTerritory: Record<string, string[]>
  territoryNameById: Record<string, string>
  territoryMetaById: Record<string, { theatreId: TheatreId; traits: string[] }>
  ownerByTerritory: Record<string, NationKey | 'neutral' | 'contested'>
  intelByTerritory: Record<string, Partial<Record<NationKey, 'NONE' | 'KNOWN' | 'SCOUTED' | 'FULL'>>>
  platoonsById: Record<string, Platoon>
  regions: NormalizedData['territoryGroups']
  customs: CustomFaction[]
  customNations: CustomNation[]
  factions: FactionMetadata[]
  nationsEnabled: Record<NationKey, boolean>
  useDefaultFactions: boolean
  homelandsByNation: Partial<Record<NationKey, string>>
  resourcePointsByNation: Partial<Record<NationKey, number>>
  suppliesByNation: Partial<Record<NationKey, number>>
  manpowerPoolsByNation: Partial<Record<NationKey, number>>
  economyPoolsByNation: Partial<Record<NationKey, EconomyPool>>
  nationResearchState: Partial<Record<NationKey, NationResearchState>>
  nationDoctrineState: Partial<Record<NationKey, NationDoctrineState>>
  nationUpgradesState: Partial<Record<NationKey, NationUpgradesState>>
}

type BridgeNationState = CampaignMapBridge['nationStates'][string]

function normalizeKey(value: string | null | undefined) {
  return value?.trim().toLowerCase().replace(/[\s-]+/g, '_') ?? null
}

function toNationKey(value: string | null | undefined): NationKey | null {
  if (!value) {
    return null
  }

  if (value.startsWith('custom:')) {
    return value as NationKey
  }

  const normalized = normalizeKey(value)
  if (!normalized) {
    return null
  }

  if (normalized in NATION_BY_ID) {
    return normalized as NationKey
  }

  return BACKEND_NATION_KEY_ALIASES[normalized] ?? null
}

function toFactionKey(value: string | null | undefined): FactionKey | null {
  if (!value) {
    return null
  }

  if (value.startsWith('custom:')) {
    return value as FactionKey
  }

  const normalized = normalizeKey(value)
  if (normalized === 'allies' || normalized === 'axis' || normalized === 'ussr') {
    return normalized
  }

  return null
}

function mapBackendPhaseToPrototype(phase: string): Phase {
  switch (phase) {
    case 'OPERATIONS':
      return 'ORDERS'
    case 'RESOLUTION':
      return 'RESOLUTION'
    case 'INTERTURN':
      return 'BATTLES'
    case 'LOBBY':
    case 'STRATEGIC':
    default:
      return 'SETUP'
  }
}

function mapReadinessToCondition(readinessStatus: string): PlatoonCondition {
  const normalized = readinessStatus.trim().toUpperCase()
  if (normalized.includes('SHATTER')) {
    return 'SHATTERED'
  }
  if (normalized.includes('DEPLET') || normalized.includes('BROKEN')) {
    return 'DEPLETED'
  }
  if (normalized.includes('WORN') || normalized.includes('REDUCED') || normalized.includes('DAMAGED')) {
    return 'WORN'
  }

  return 'FRESH'
}

function defaultFactionForNation(
  nation: NationKey,
  customNations: CustomNation[],
  useDefaultFactions: boolean,
): FactionKey {
  if (!useDefaultFactions) {
    return 'neutral'
  }

  if (nation.startsWith('custom:')) {
    return customNations.find((customNation) => customNation.id === nation)?.defaultFaction ?? 'neutral'
  }

  return NATION_BY_ID[nation as keyof typeof NATION_BY_ID]?.defaultFaction ?? 'neutral'
}

function fallbackViewerNation(
  explicitNation: NationKey | null | undefined,
  platoonNation: NationKey | null | undefined,
  allNations: NationKey[],
) {
  return explicitNation ?? platoonNation ?? allNations[0] ?? 'great_britain'
}

function buildFactionState(customs: CustomFaction[], customNations: CustomNation[]): FactionMetadata[] {
  const factions: FactionMetadata[] = [
    {
      id: 'allies',
      name: 'Allies',
      nations: Object.values(NATION_BY_ID)
        .filter((nation) => nation.defaultFaction === 'allies')
        .map((nation) => nation.id),
    },
    {
      id: 'axis',
      name: 'Axis',
      nations: Object.values(NATION_BY_ID)
        .filter((nation) => nation.defaultFaction === 'axis')
        .map((nation) => nation.id),
    },
    {
      id: 'ussr',
      name: 'USSR',
      nations: Object.values(NATION_BY_ID)
        .filter((nation) => nation.defaultFaction === 'ussr')
        .map((nation) => nation.id),
    },
    ...customs.map((customFaction) => ({
      id: `custom:${customFaction.id}` as FactionKey,
      name: customFaction.name,
      color: customFaction.color,
      nations: customNations
        .filter((customNation) => customNation.defaultFaction === `custom:${customFaction.id}`)
        .map((customNation) => customNation.id),
    })),
  ]

  for (const customNation of customNations) {
    if (customNation.defaultFaction === 'allies' || customNation.defaultFaction === 'axis' || customNation.defaultFaction === 'ussr') {
      const faction = factions.find((entry) => entry.id === customNation.defaultFaction)
      if (faction && !faction.nations.includes(customNation.id)) {
        faction.nations = [...faction.nations, customNation.id]
      }
    }
  }

  return factions
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJsonValue)
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, sortJsonValue(nestedValue)]),
    )
  }

  return value
}

function stableStringify(value: unknown) {
  return JSON.stringify(sortJsonValue(value))
}

export function CampaignMapPage() {
  const { campaignId = '' } = useParams()
  const campaign = useCampaign(campaignId)
  const mapSummary = useCampaignMap(campaignId)
  const phase = useCampaignPhase(campaignId)
  const bridge = useCampaignMapBridge(campaignId)
  const platoons = useCampaignPlatoons(campaignId)
  const bridgeData = bridge.data
  const saveSetup = useSaveCampaignMapSetup(campaignId)
  const saveNationStates = useSaveCampaignNationStates(campaignId)
  const [staticMapData, setStaticMapData] = useState<NormalizedData | null>(null)
  const [staticMapError, setStaticMapError] = useState<string | null>(null)
  const [sidebarTab, setSidebarTab] = useState<'overview' | 'orders' | 'command' | 'hq' | 'battles' | 'setup'>('overview')
  const lastHydrationSignature = useRef<string | null>(null)
  const lastSavedSetupSignature = useRef<string | null>(null)
  const lastSavedNationSignature = useRef<string | null>(null)

  const activeTheatresSnapshot = useCampaignStore((state) => state.activeTheatres)
  const useDefaultFactionsSnapshot = useCampaignStore((state) => state.useDefaultFactions)
  const nationsEnabledSnapshot = useCampaignStore((state) => state.nationsEnabled)
  const customFactionsSnapshot = useCampaignStore((state) => state.customs)
  const customNationsSnapshot = useCampaignStore((state) => state.customNations)
  const homelandsByNationSnapshot = useCampaignStore((state) => state.homelandsByNation)
  const suppliesByNationSnapshot = useCampaignStore((state) => state.suppliesByNation)
  const manpowerPoolsByNationSnapshot = useCampaignStore((state) => state.manpowerPoolsByNation)
  const resourcePointsByNationSnapshot = useCampaignStore((state) => state.resourcePointsByNation)
  const economyPoolsByNationSnapshot = useCampaignStore((state) => state.economyPoolsByNation)
  const nationResearchStateSnapshot = useCampaignStore((state) => state.nationResearchState)
  const nationDoctrineStateSnapshot = useCampaignStore((state) => state.nationDoctrineState)
  const nationUpgradesStateSnapshot = useCampaignStore((state) => state.nationUpgradesState)

  useEffect(() => {
    let isMounted = true

    loadTheatresData()
      .then((data) => {
        if (!isMounted) {
          return
        }
        setStaticMapData(data)
        setStaticMapError(null)
      })
      .catch((error: unknown) => {
        if (!isMounted) {
          return
        }
        setStaticMapError(error instanceof Error ? error.message : 'Unable to load static theatre geometry.')
      })

    return () => {
      isMounted = false
    }
  }, [])

  const isLoading =
    campaign.isLoading || mapSummary.isLoading || phase.isLoading || bridge.isLoading || platoons.isLoading || !staticMapData
  const hasError =
    campaign.isError ||
    mapSummary.isError ||
    phase.isError ||
    bridge.isError ||
    platoons.isError ||
    !campaign.data ||
    !mapSummary.data ||
    !phase.data ||
    !bridge.data ||
    !platoons.data ||
    Boolean(staticMapError)

  const hydratedState = useMemo<HydratedMapState | null>(() => {
    if (!campaign.data || !mapSummary.data || !phase.data || !bridgeData || !platoons.data || !staticMapData) {
      return null
    }

    const customs: CustomFaction[] = bridgeData.customFactions.map((customFaction) => ({
      id: customFaction.id,
      name: customFaction.name,
      color: customFaction.color ?? '#8b5cf6',
    }))
    const customNations: CustomNation[] = bridgeData.customNations
      .map((customNation) => {
        const nationKey = toNationKey(customNation.key)
        const defaultFaction = toFactionKey(customNation.defaultFactionKey) ?? 'neutral'
        if (!nationKey) {
          return null
        }

        return {
          id: nationKey,
          name: customNation.name,
          defaultFaction,
          color: customNation.color ?? '#22c55e',
        }
      })
      .filter((customNation): customNation is CustomNation => Boolean(customNation))

    const factionKeyById = new Map(
      mapSummary.data.factions
        .map((faction) => [faction.id, toFactionKey(faction.key)] as const)
        .filter((entry): entry is readonly [string, FactionKey] => Boolean(entry[1])),
    )
    const nationKeyById = new Map(
      mapSummary.data.nations
        .map((nation) => [nation.id, toNationKey(nation.key)] as const)
        .filter((entry): entry is readonly [string, NationKey] => Boolean(entry[1])),
    )
    const supportedNationKeys = Array.from(
      new Set([...Array.from(nationKeyById.values()), ...customNations.map((nation) => nation.id)]),
    )
    const membershipNation = nationKeyById.get(campaign.data.myMembership.nationId ?? '')
    const membershipFaction = factionKeyById.get(campaign.data.myMembership.factionId ?? '')
    const firstVisiblePlatoonNation =
      platoons.data
        .map((platoon) => toNationKey(platoon.nation?.key))
        .find((nation): nation is NationKey => Boolean(nation)) ?? null
    const viewerNation = fallbackViewerNation(membershipNation, firstVisiblePlatoonNation, supportedNationKeys)
    const viewerFaction =
      membershipFaction ??
      factionKeyById.get(
        mapSummary.data.nations.find((nation) => toNationKey(nation.key) === viewerNation)?.factionId ?? '',
      ) ??
      defaultFactionForNation(viewerNation, customNations, bridgeData.useDefaultFactions)
    const viewerMode: ViewerMode = campaign.data.myMembership.role === 'GM' ? 'GM' : 'PLAYER'

    const territoryNameById = Object.fromEntries(staticMapData.territories.map((territory) => [territory.id, territory.name]))
    const territoryMetaById = Object.fromEntries(
      staticMapData.territories.map((territory) => [
        territory.id,
        {
          theatreId: territory.theatreId,
          traits: territory.traits,
        },
      ]),
    )
    const adjacencyByTerritory = Object.fromEntries(staticMapData.territories.map((territory) => [territory.id, territory.adj]))
    const activeTheatres = {
      WE: bridgeData.activeTheatres.WE ?? mapSummary.data.theatres.find((theatre) => theatre.key === 'WE')?.active ?? true,
      EE: bridgeData.activeTheatres.EE ?? mapSummary.data.theatres.find((theatre) => theatre.key === 'EE')?.active ?? true,
      NA: bridgeData.activeTheatres.NA ?? mapSummary.data.theatres.find((theatre) => theatre.key === 'NA')?.active ?? true,
      PA: bridgeData.activeTheatres.PA ?? mapSummary.data.theatres.find((theatre) => theatre.key === 'PA')?.active ?? true,
    } satisfies Record<TheatreId, boolean>

    const ownerByTerritory = Object.fromEntries(
      staticMapData.territories.map((territory) => [territory.id, 'neutral']),
    ) as Record<string, NationKey | 'neutral' | 'contested'>
    const intelByTerritory = Object.fromEntries(
      staticMapData.territories.map((territory) => [territory.id, {}]),
    ) as Record<string, Partial<Record<NationKey, 'NONE' | 'KNOWN' | 'SCOUTED' | 'FULL'>>>

    for (const territory of mapSummary.data.territories) {
      const territoryKey = territory.key
      if (!(territoryKey in territoryNameById)) {
        continue
      }

      const nationKey = nationKeyById.get(territory.controllerNationId ?? '')
      ownerByTerritory[territoryKey] = territory.strategicStatus === 'CONTESTED' ? 'contested' : nationKey ?? 'neutral'

      if (viewerMode === 'GM') {
        for (const nation of supportedNationKeys) {
          intelByTerritory[territoryKey][nation] = 'FULL'
        }
      } else {
        intelByTerritory[territoryKey][viewerNation] = 'FULL'
      }
    }

    const platoonsById = Object.fromEntries(
      platoons.data
        .filter((platoon) => platoon.currentTerritory?.key && toNationKey(platoon.nation?.key))
        .map((platoon) => {
          const nationKey = toNationKey(platoon.nation?.key) as NationKey
          const factionKey =
            toFactionKey(platoon.faction.key) ?? defaultFactionForNation(nationKey, customNations, bridgeData.useDefaultFactions)
          const mapped: Platoon = {
            id: platoon.id,
            faction: factionKey,
            nation: nationKey,
            name: platoon.name,
            territoryId: platoon.currentTerritory?.key ?? '',
            condition: mapReadinessToCondition(platoon.readinessStatus),
            strengthPct: Math.max(0, Math.min(100, Math.round(platoon.strength))),
            mpBase: platoon.mpBase,
            traits: platoon.traits ?? [],
            entrenched: platoon.entrenched ?? false,
          }
          return [platoon.id, mapped]
        }),
    ) as Record<string, Platoon>

    const nationStateEntries = Object.entries(bridgeData.nationStates)
      .map(([nationKey, state]) => [toNationKey(nationKey), state] as const)
      .filter((entry): entry is readonly [NationKey, BridgeNationState] => Boolean(entry[0]))

    return {
      viewerMode,
      viewerNation,
      viewerFaction,
      mode: mapBackendPhaseToPrototype(phase.data.currentPhase) === 'SETUP' ? 'SETUP' : 'PLAY',
      phase: mapBackendPhaseToPrototype(phase.data.currentPhase),
      turnNumber: phase.data.currentTurnNumber,
      activeTheatres,
      adjacencyByTerritory,
      territoryNameById,
      territoryMetaById,
      ownerByTerritory,
      intelByTerritory,
      platoonsById,
      regions: staticMapData.territoryGroups,
      customs,
      customNations,
      factions: buildFactionState(customs, customNations),
      nationsEnabled: Object.fromEntries(
          Object.entries(bridgeData.nationsEnabled)
          .map(([key, enabled]) => [toNationKey(key), enabled] as const)
          .filter((entry): entry is readonly [NationKey, boolean] => Boolean(entry[0])),
      ) as Record<NationKey, boolean>,
      useDefaultFactions: bridgeData.useDefaultFactions,
      homelandsByNation: Object.fromEntries(
        Object.entries(bridgeData.homelandsByNation)
          .map(([key, territoryId]) => [toNationKey(key), territoryId] as const)
          .filter((entry): entry is readonly [NationKey, string] => Boolean(entry[0])),
      ) as Partial<Record<NationKey, string>>,
      resourcePointsByNation: Object.fromEntries(nationStateEntries.map(([nationKey, state]) => [nationKey, state.resourcePoints])),
      suppliesByNation: Object.fromEntries(nationStateEntries.map(([nationKey, state]) => [nationKey, state.supplies])),
      manpowerPoolsByNation: Object.fromEntries(nationStateEntries.map(([nationKey, state]) => [nationKey, state.manpower])),
      economyPoolsByNation: Object.fromEntries(
        nationStateEntries.map(([nationKey, state]) => [nationKey, state.economyPool as EconomyPool]),
      ),
      nationResearchState: Object.fromEntries(
        nationStateEntries
          .filter(([, state]) => Boolean(state.researchState))
          .map(([nationKey, state]) => [nationKey, state.researchState as unknown as NationResearchState]),
      ),
      nationDoctrineState: Object.fromEntries(
        nationStateEntries
          .filter(([, state]) => Boolean(state.doctrineState))
          .map(([nationKey, state]) => [nationKey, state.doctrineState as unknown as NationDoctrineState]),
      ),
      nationUpgradesState: Object.fromEntries(
        nationStateEntries
          .filter(([, state]) => Boolean(state.upgradesState))
          .map(([nationKey, state]) => [nationKey, state.upgradesState as unknown as NationUpgradesState]),
      ),
    }
  }, [bridgeData, campaign.data, mapSummary.data, phase.data, platoons.data, staticMapData])

  const hydrationSignature = useMemo(
    () => (hydratedState ? stableStringify(hydratedState) : null),
    [hydratedState],
  )

  useEffect(() => {
    if (!hydratedState || !hydrationSignature || hydrationSignature === lastHydrationSignature.current) {
      return
    }

    useCampaignStore.setState((current) => ({
      ...current,
      mode: hydratedState.mode,
      playMode: 'ONE_SCREEN',
      commandHubExpanded: false,
      leftPanelView: 'NONE',
      viewerMode: hydratedState.viewerMode,
      viewerNation: hydratedState.viewerNation,
      viewerFaction: hydratedState.viewerFaction,
      playerFactionId: hydratedState.viewerMode === 'PLAYER' ? hydratedState.viewerFaction : null,
      phase: hydratedState.phase,
      turnNumber: hydratedState.turnNumber,
      activeTheatres: hydratedState.activeTheatres,
      adjacencyByTerritory: hydratedState.adjacencyByTerritory,
      territoryNameById: hydratedState.territoryNameById,
      territoryMetaById: hydratedState.territoryMetaById,
      ownerByTerritory: hydratedState.ownerByTerritory,
      intelByTerritory: hydratedState.intelByTerritory,
      platoonsById: hydratedState.platoonsById,
      regions: hydratedState.regions,
      customs: hydratedState.customs,
      customNations: hydratedState.customNations,
      factions: hydratedState.factions,
      nationsEnabled: {
        ...current.nationsEnabled,
        ...hydratedState.nationsEnabled,
      },
      useDefaultFactions: hydratedState.useDefaultFactions,
      homelandsByNation: hydratedState.homelandsByNation,
      resourcePointsByNation: {
        ...current.resourcePointsByNation,
        ...hydratedState.resourcePointsByNation,
      } as typeof current.resourcePointsByNation,
      suppliesByNation: {
        ...current.suppliesByNation,
        ...hydratedState.suppliesByNation,
      } as typeof current.suppliesByNation,
      manpowerPoolsByNation: {
        ...current.manpowerPoolsByNation,
        ...hydratedState.manpowerPoolsByNation,
      } as typeof current.manpowerPoolsByNation,
      economyPoolsByNation: {
        ...current.economyPoolsByNation,
        ...hydratedState.economyPoolsByNation,
      } as typeof current.economyPoolsByNation,
      nationResearchState: {
        ...current.nationResearchState,
        ...hydratedState.nationResearchState,
      } as typeof current.nationResearchState,
      nationDoctrineState: {
        ...current.nationDoctrineState,
        ...hydratedState.nationDoctrineState,
      } as typeof current.nationDoctrineState,
      nationUpgradesState: {
        ...current.nationUpgradesState,
        ...hydratedState.nationUpgradesState,
      } as typeof current.nationUpgradesState,
      selectedRegionId:
        current.selectedRegionId && hydratedState.regions.some((region) => region.id === current.selectedRegionId)
          ? current.selectedRegionId
          : hydratedState.regions[0]?.id ?? null,
      selectedTerritoryId:
        current.selectedTerritoryId && current.selectedTerritoryId in hydratedState.territoryNameById
          ? current.selectedTerritoryId
          : null,
      selectedPlatoonId:
        current.selectedPlatoonId && current.selectedPlatoonId in hydratedState.platoonsById ? current.selectedPlatoonId : null,
      orderDraftType: null,
      locksByTerritory: {},
      contestsByTerritory: {},
    }))
    lastHydrationSignature.current = hydrationSignature
  }, [hydratedState, hydrationSignature])

  const setupPayload = useMemo(
    () => ({
      useDefaultFactions: useDefaultFactionsSnapshot,
      activeTheatres: activeTheatresSnapshot,
      nationsEnabled: nationsEnabledSnapshot,
      customFactions: [...customFactionsSnapshot]
        .sort((left, right) => left.id.localeCompare(right.id))
        .map((customFaction) => ({
          id: customFaction.id,
          name: customFaction.name,
          color: customFaction.color,
        })),
      customNations: [...customNationsSnapshot]
        .sort((left, right) => left.id.localeCompare(right.id))
        .map((customNation) => ({
          key: customNation.id,
          name: customNation.name,
          defaultFactionKey: customNation.defaultFaction,
          color: customNation.color,
        })),
      homelandsByNation: Object.fromEntries(
        Object.entries(homelandsByNationSnapshot).filter((entry): entry is [string, string] => Boolean(entry[1])),
      ),
    }),
    [
      activeTheatresSnapshot,
      customFactionsSnapshot,
      customNationsSnapshot,
      homelandsByNationSnapshot,
      nationsEnabledSnapshot,
      useDefaultFactionsSnapshot,
    ],
  )

  const serverSetupPayload = useMemo(
    () =>
      bridge.data
        ? {
            useDefaultFactions: bridge.data.useDefaultFactions,
            activeTheatres: bridge.data.activeTheatres,
            nationsEnabled: Object.fromEntries(
              Object.entries(bridge.data.nationsEnabled)
                .map(([key, enabled]) => [toNationKey(key) ?? key, enabled])
                .sort(([left], [right]) => String(left).localeCompare(String(right))),
            ),
            customFactions: [...bridge.data.customFactions]
              .sort((left, right) => left.id.localeCompare(right.id))
              .map((customFaction) => ({
                id: customFaction.id,
                name: customFaction.name,
                color: customFaction.color ?? '#8b5cf6',
              })),
            customNations: [...bridge.data.customNations]
              .sort((left, right) => left.key.localeCompare(right.key))
              .map((customNation) => ({
                key: customNation.key,
                name: customNation.name,
                defaultFactionKey: customNation.defaultFactionKey,
                color: customNation.color ?? '#22c55e',
              })),
            homelandsByNation: Object.fromEntries(
              Object.entries(bridge.data.homelandsByNation)
                .map(([key, territoryId]) => [toNationKey(key) ?? key, territoryId])
                .sort(([left], [right]) => String(left).localeCompare(String(right))),
            ),
          }
        : null,
    [bridge.data],
  )

  const serverNationKeys = useMemo(
    () =>
      bridge.data
        ? Object.keys(bridge.data.nationStates)
            .map((nationKey) => toNationKey(nationKey))
            .filter((nationKey): nationKey is NationKey => Boolean(nationKey))
        : [],
    [bridge.data],
  )

  const nationStatesPayload = useMemo(
    () => ({
      nationStates: Object.fromEntries(
        serverNationKeys
          .sort((left, right) => left.localeCompare(right))
          .map((nationKey) => [
            nationKey,
            {
              supplies: suppliesByNationSnapshot[nationKey] ?? 0,
              manpower: manpowerPoolsByNationSnapshot[nationKey] ?? 0,
              resourcePoints: resourcePointsByNationSnapshot[nationKey] ?? 0,
              economyPool: economyPoolsByNationSnapshot[nationKey] ?? {
                industry: 0,
                political: 0,
                logistics: 0,
                intelligence: 0,
              },
              researchState: nationResearchStateSnapshot[nationKey] ?? null,
              doctrineState: nationDoctrineStateSnapshot[nationKey] ?? null,
              upgradesState: nationUpgradesStateSnapshot[nationKey] ?? null,
            },
          ]),
      ),
    }),
    [
      economyPoolsByNationSnapshot,
      manpowerPoolsByNationSnapshot,
      nationDoctrineStateSnapshot,
      nationResearchStateSnapshot,
      nationUpgradesStateSnapshot,
      resourcePointsByNationSnapshot,
      serverNationKeys,
      suppliesByNationSnapshot,
    ],
  )

  const serverNationStatesPayload = useMemo(
    () =>
      bridge.data
        ? {
            nationStates: Object.fromEntries(
              Object.entries(bridge.data.nationStates)
                .map(([nationKey, state]) => [toNationKey(nationKey) ?? nationKey, state])
                .sort(([left], [right]) => String(left).localeCompare(String(right))),
            ),
          }
        : null,
    [bridge.data],
  )

  const setupSignature = useMemo(() => stableStringify(setupPayload), [setupPayload])
  const nationStatesSignature = useMemo(() => stableStringify(nationStatesPayload), [nationStatesPayload])
  const serverSetupSignature = useMemo(
    () => (serverSetupPayload ? stableStringify(serverSetupPayload) : null),
    [serverSetupPayload],
  )
  const serverNationSignature = useMemo(
    () => (serverNationStatesPayload ? stableStringify(serverNationStatesPayload) : null),
    [serverNationStatesPayload],
  )

  useEffect(() => {
    if (serverSetupSignature) {
      lastSavedSetupSignature.current = serverSetupSignature
    }
  }, [serverSetupSignature])

  useEffect(() => {
    if (serverNationSignature) {
      lastSavedNationSignature.current = serverNationSignature
    }
  }, [serverNationSignature])

  useEffect(() => {
    if (campaign.data?.myMembership.role !== 'GM' || !bridge.data) {
      return
    }

    if (setupSignature === lastSavedSetupSignature.current || saveSetup.isPending) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      saveSetup.mutate(setupPayload, {
        onSuccess: () => {
          lastSavedSetupSignature.current = setupSignature
        },
      })
    }, 500)

    return () => window.clearTimeout(timeoutId)
  }, [bridge.data, campaign.data?.myMembership.role, saveSetup, setupPayload, setupSignature])

  useEffect(() => {
    if (!bridge.data || saveNationStates.isPending || Object.keys(nationStatesPayload.nationStates).length === 0) {
      return
    }

    if (nationStatesSignature === lastSavedNationSignature.current) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      saveNationStates.mutate(nationStatesPayload, {
        onSuccess: () => {
          lastSavedNationSignature.current = nationStatesSignature
        },
      })
    }, 500)

    return () => window.clearTimeout(timeoutId)
  }, [bridge.data, nationStatesPayload, nationStatesSignature, saveNationStates])

  const defaultSidebarTab = useMemo(() => {
    if (!hydratedState) {
      return 'overview' as const
    }

    if (hydratedState.mode === 'SETUP' && hydratedState.viewerMode === 'GM') {
      return 'setup' as const
    }

    if (hydratedState.viewerMode === 'PLAYER') {
      return 'command' as const
    }

    return 'overview' as const
  }, [hydratedState])

  const availableSidebarTabs = useMemo(() => {
    const tabs: Array<'overview' | 'orders' | 'command' | 'hq' | 'battles' | 'setup'> = [
      'overview',
      'orders',
      'command',
      'hq',
      'battles',
    ]
    if (campaign.data?.myMembership.role === 'GM') {
      tabs.push('setup')
    }
    return tabs
  }, [campaign.data?.myMembership.role])

  const safeSidebarTab = availableSidebarTabs.includes(sidebarTab) ? sidebarTab : defaultSidebarTab

  if (isLoading) {
    return (
      <div className="page-stack">
        <SkeletonCard lines={4} />
        <SkeletonCard lines={7} />
      </div>
    )
  }

  if (hasError || !campaign.data || !mapSummary.data || !phase.data || !bridge.data || !platoons.data || !staticMapData) {
    return (
      <StateCard
        title="Playable map unavailable"
        description="The routed campaign shell loaded, but the legacy SVG map could not be restored from campaign, bridge, or theatre data."
        actions={<NavLink className="button-link" to={`/app/campaigns/${campaignId}/dashboard`}>Back to dashboard</NavLink>}
      />
    )
  }

  return (
    <section className="page-stack">
      <div className="page-header">
        <div className="page-header-copy">
          <p className="eyebrow">Campaign map</p>
          <h2 className="detail-title">Playable strategic map restored</h2>
          <p className="muted">
            The routed campaign page now mounts the original SVG map surface again, with setup, HQ, and battle tools
            persisted through backend bridge APIs instead of living only in the local store.
          </p>
        </div>
        <div className="pill-row">
          <span className="meta-pill">Turn {phase.data.currentTurnNumber}</span>
          <span className="meta-pill">{phase.data.currentPhase}</span>
          <span className="meta-pill">{campaign.data.myMembership.role}</span>
        </div>
      </div>

      {saveSetup.isError ? <Notice tone="error">{saveSetup.error.message}</Notice> : null}
      {saveNationStates.isError ? <Notice tone="error">{saveNationStates.error.message}</Notice> : null}

      <Notice>
        The map is the primary campaign surface again. Setup, command, doctrine, research, upgrades, homelands, and
        world chat now hydrate from backend bridge state. Backend-authoritative order submission still lives on{' '}
        <NavLink className="button-link" to={`/app/campaigns/${campaignId}/orders`}>
          Orders
        </NavLink>
        .
      </Notice>

      <div className="map-layout map-layout-stacked">
        <section className="surface-card page-card" style={{ padding: 0, minHeight: 980, overflow: 'hidden' }}>
          <MapBoard />
        </section>

        <section className="surface-card page-card page-stack">
          <div className="page-header">
            <div className="page-header-copy">
              <h3 className="detail-title">Map operations</h3>
              <p className="muted">Setup, nation command, HQ, and battle tools now expand beneath the playable map instead of being constrained to a thin sidebar.</p>
            </div>
          </div>

          <div className="button-row">
            <button className={safeSidebarTab === 'overview' ? 'button-link' : 'button-secondary'} onClick={() => setSidebarTab('overview')} type="button">
              Overview
            </button>
            <button className={safeSidebarTab === 'orders' ? 'button-link' : 'button-secondary'} onClick={() => setSidebarTab('orders')} type="button">
              Orders
            </button>
            <button className={safeSidebarTab === 'command' ? 'button-link' : 'button-secondary'} onClick={() => setSidebarTab('command')} type="button">
              Forces
            </button>
            <button className={safeSidebarTab === 'hq' ? 'button-link' : 'button-secondary'} onClick={() => setSidebarTab('hq')} type="button">
              HQ
            </button>
            <button className={safeSidebarTab === 'battles' ? 'button-link' : 'button-secondary'} onClick={() => setSidebarTab('battles')} type="button">
              Battles
            </button>
            {campaign.data.myMembership.role === 'GM' ? (
              <button className={safeSidebarTab === 'setup' ? 'button-link' : 'button-secondary'} onClick={() => setSidebarTab('setup')} type="button">
                Setup
              </button>
            ) : null}
          </div>

          {safeSidebarTab === 'overview' ? <CommandPanel data={staticMapData} /> : null}
          {safeSidebarTab === 'orders' ? <CampaignMapOrdersPanel /> : null}
          {safeSidebarTab === 'command' && campaign.data && mapSummary.data ? (
            <NationCommandPanel
              campaignId={campaignId}
              data={staticMapData}
              mapSummary={mapSummary.data}
              membership={campaign.data.myMembership}
              onOpenOrders={() => setSidebarTab('orders')}
            />
          ) : null}
          {safeSidebarTab === 'hq' ? <CommandHub campaignId={campaignId} data={staticMapData} /> : null}
          {safeSidebarTab === 'battles' ? <CampaignMapBattlesPanel /> : null}
          {safeSidebarTab === 'setup' && campaign.data.myMembership.role === 'GM' ? <SetupPanel /> : null}
        </section>
      </div>
    </section>
  )
}
