// src/store/useCampaignStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { visibilityOrder, type VisibilityLevel } from "../data/visibility";
import {
  RESEARCH_NODES,
  RESEARCH_NODES_BY_ID,
  type NationResearchState,
  type ResearchRecommendation,
  type ResearchTree,
} from "../data/research";
import {
  DOCTRINE_STANCES,
  DOCTRINE_STANCES_BY_ID,
  DOCTRINE_TRAITS_BY_ID,
  type DoctrinePenalty,
  type NationDoctrineState,
} from "../data/doctrine";
import { UPGRADES_BY_ID, type NationUpgradesState } from "../data/upgrades";
import { getUpgradeEligibility } from "../strategy/selectors/getUpgradeEligibility";
import { getPlatoonModifiers } from "../strategy/selectors/getStrategicModifiers";
import {
  NATION_BY_ID,
  type BaseNationKey,
  type NationKey,
} from "../setup/NationDefinitions";

import type {
  Phase,
  PlatoonOrder,
  TerritoryLock,
  Contest,
  Platoon,
  BattleOutcome,
  PlatoonCondition,
  PlatoonTrait,
} from "../domain/types";
import { resolveTurn } from "../domain/resolveTurn";
import { resolveBattles as resolveBattlesFn } from "../domain/resolveBattles";

export type BaseFactionKey = "allies" | "axis" | "ussr";
export type FactionKey = BaseFactionKey | "neutral" | `custom:${string}`;
export type OwnerKey = NationKey | "neutral" | "contested";
export type SuppliesByNation = Record<string, number>;

export type Mode = "SETUP" | "PLAY";
export type ViewerMode = "PLAYER" | "GM";
export type PlayMode = "ONE_SCREEN" | "MULTI-SCREEN";
export type TurnLogType =
  | "NOTE"
  | "MOVE"
  | "SUPPLY"
  | "PLATOON"
  | "ORDERS"
  | "BATTLE"
  | "ERROR";

export type LeftPanelView =
  | "NONE"
  | "NATION_HUB"
  | "MY_FORCES"
  | "FACTION_COMMAND"
  | "GM_TOOLS";

export type TurnLogEntry = {
  id: string;
  ts: number;
  type: TurnLogType;
  text: string;
};

type IntelByTerritory = Record<
  string,
  Partial<Record<NationKey, VisibilityLevel>>
>;

export type CustomFaction = { id: string; name: string; color: string };
export type CustomNation = {
  id: NationKey;
  name: string;
  defaultFaction: FactionKey;
  color: string;
};
export type FactionMetadata = {
  id: FactionKey;
  name: string;
  color?: string;
  nations: NationKey[];
};

export type DoctrinePenaltyState = {
  penalty: DoctrinePenalty;
  appliedTurn: number;
};

export type RegionInfo = {
  id: string;
  name: string;
  theatreId: "WE" | "EE" | "NA" | "PA";
  territories: string[];
  bonus?: string;
};

export type CampaignState = {
  // --- app ---
  mode: Mode;
  playMode: PlayMode;
  commandHubExpanded: boolean;
  activeTheatres: Record<"WE" | "EE" | "NA" | "PA", boolean>;
  leftPanelView: LeftPanelView;
  baseEnabled: Record<BaseFactionKey, boolean>;

  // Nations
  nationsEnabled: Record<NationKey, boolean>;
  customNations: CustomNation[];
  selectedSetupNation: NationKey | null;
  selectSetupNation: (n: NationKey | null) => void;

  homelandsByNation: Partial<Record<NationKey, string>>;
  setNationHomeland: (nation: NationKey, territoryId: string) => void;

  // Existing faction/custom system (kept for now)
  customs: CustomFaction[];
  factions: FactionMetadata[];
  createCustomNation: (
    name: string,
    defaultFaction: FactionKey,
    color: string,
  ) => void;
  selectedSetupFaction: BaseFactionKey | "custom" | null;
  selectedCustomId: string | null;

  regions: RegionInfo[];
  selectedRegionId: string | null;
  setSelectedRegion: (id: string | null) => void;
  setRegions: (regions: RegionInfo[]) => void;

  viewerNation: NationKey;
  viewerFaction: FactionKey;
  playerFactionId: FactionKey | null;
  viewerMode: ViewerMode;
  setViewerMode: (m: ViewerMode) => void;

  // v1 homeland storage (bridge)
  homelands: Partial<Record<FactionKey, string>>;
  homelandUnlock: boolean;
  setHomelandUnlock: (unlock: boolean) => void;
  ownerByTerritory: Record<string, OwnerKey>;
  intelByTerritory: IntelByTerritory;
  territoryNameById: Record<string, string>;

  selectedTerritoryId: string | null;
  turnLog: TurnLogEntry[];
  selectedPlatoonId: string | null;
  orderDraftType: PlatoonOrder["type"] | null;

  setMode: (m: Mode) => void;
  setPlayMode: (m: PlayMode) => void;
  setCommandHubExpanded: (expanded: boolean) => void;
  setLeftPanelView: (view: LeftPanelView) => void;
  toggleTheatre: (id: "WE" | "EE" | "NA" | "PA") => void;

  selectSetupFaction: (f: BaseFactionKey | "custom" | null) => void;
  createCustomFaction: (name: string, color: string) => void;
  selectCustomFaction: (id: string | null) => void;

  setViewerFaction: (f: FactionKey) => void;
  setViewerNation: (nation: NationKey) => void;
  setPlayerFactionId: (faction: FactionKey | null) => void;
  setSelectedTerritory: (id: string | null) => void;
  setSelectedPlatoonId: (id: string | null) => void;
  setOrderDraftType: (type: PlatoonOrder["type"] | null) => void;
  // v1
  setHomeland: (factionKey: FactionKey, territoryId: string) => void;
  applyHomeland: (nationKey: NationKey) => void;

  // GM-only mutators
  setOwner: (territoryId: string, ownerKey: OwnerKey) => void;
  setIntelLevel: (
    territoryId: string,
    nation: NationKey,
    level: VisibilityLevel,
  ) => void;
  bulkSetIntelLevel: (
    territoryIds: string[],
    nation: NationKey,
    level: VisibilityLevel,
  ) => void;

  addNote: (text: string) => void;
  resetAll: () => void;

  autoSetupWorld: () => void;

  // --- mechanics ---
  phase: Phase;
  turnNumber: number;

  platoonsById: Record<string, Platoon>;
  ordersByTurn: Record<number, Record<string, PlatoonOrder[]>>;
  locksByTerritory: Record<string, TerritoryLock | undefined>;
  contestsByTerritory: Record<string, Contest | undefined>;
  adjacencyByTerritory: Record<string, string[]>;
  createPlatoon: (
    faction: FactionKey,
    territoryId: string,
    name?: string,
  ) => void;
  createPlatoonWithLoadout: (
    faction: FactionKey,
    territoryId: string,
    payload: {
      name?: string;
      traits?: PlatoonTrait[];
      mpBase?: number;
      condition?: PlatoonCondition;
      strengthPct?: number;
    },
  ) => void;

  setPlatoonOrderMove: (
    turn: number,
    faction: FactionKey,
    platoonId: string,
    path: string[],
    forcedMarch?: boolean,
  ) => void;
  setPlatoonOrderHold: (
    turn: number,
    faction: FactionKey,
    platoonId: string,
  ) => void;

  setPlatoonOrderRecon: (
    turn: number,
    faction: FactionKey,
    platoonId: string,
    targets: string[],
  ) => void;
  setPlatoonOrderIntel: (
    turn: number,
    faction: FactionKey,
    platoonId: string,
    target: string,
  ) => void;
  cancelDraftOrder: (turn: number, orderId: string) => void;

  submitFactionOrders: (turn: number, nation: NationKey) => void;

  resolveCurrentTurn: (isAdjacent: (a: string, b: string) => boolean) => void;
  resolveBattles: (outcomes: BattleOutcome[]) => void;
  setAdjacencyByTerritory: (adjacency: Record<string, string[]>) => void;
  setTerritoryNameById: (names: Record<string, string>) => void;
  setPhase: (p: Phase) => void;
  nextPhase: (isAdjacent: (a: string, b: string) => boolean) => void;

  clearLocksAndContests: () => void;

  // Supplies
  suppliesByNation: SuppliesByNation;
  ensureSupplies: () => void;
  getSupplies: (nation: NationKey) => number;
  spendSupplies: (
    nation: NationKey,
    amount: number,
    reason?: string,
  ) => boolean;
  addSupplies: (nation: NationKey, amount: number, reason?: string) => void;

  // Resources (upgrade points)
  resourcePointsByNation: Record<NationKey, number>;
  ensureResourcePoints: () => void;
  getResourcePoints: (nation: NationKey) => number;
  spendResourcePoints: (
    nation: NationKey,
    amount: number,
    reason?: string,
  ) => boolean;
  addResourcePoints: (
    nation: NationKey,
    amount: number,
    reason?: string,
  ) => void;

  // Research
  nationResearchState: Record<NationKey, NationResearchState>;
  startResearch: (nation: NationKey, nodeId: string) => void;
  cancelResearch: (nation: NationKey) => void;
  getResearchRecommendations: (nationId: NationKey) => ResearchRecommendation[];

  // Doctrine
  nationDoctrineState: Record<NationKey, NationDoctrineState>;
  doctrinePenaltyByNation: Partial<Record<NationKey, DoctrinePenaltyState>>;
  switchDoctrineStance: (nation: NationKey, stanceId: string) => void;
  equipDoctrineTrait: (nation: NationKey, traitId: string) => void;
  unequipDoctrineTrait: (nation: NationKey, traitId: string) => void;

  // Upgrades
  nationUpgradesState: Record<NationKey, NationUpgradesState>;
  applyUpgrade: (args: {
    nation: NationKey;
    upgradeId: string;
    territoryId?: string | null;
    platoonId?: string | null;
  }) => void;
  removeUpgrade: (nation: NationKey, upgradeInstanceId: string) => void;
};

const uid = () => Math.random().toString(16).slice(2) + Date.now().toString(16);

function logNote(text: string, type: TurnLogType = "NOTE"): TurnLogEntry {
  return { ts: Date.now(), type, text, id: uid() };
}

const defaultResearchState = (): NationResearchState => ({
  progressTurns: 0,
  completedResearch: [],
});

const defaultDoctrineState = (): NationDoctrineState => ({
  activeStanceId: DOCTRINE_STANCES[0]?.id ?? "DOC_MOBILE_WARFARE",
  equippedTraitIds: [],
  traitSlots: 3,
});

const defaultUpgradesState = (): NationUpgradesState => ({
  applied: [],
});
const isBaseFactionKey = (f: FactionKey): f is BaseFactionKey =>
  f === "allies" || f === "axis" || f === "ussr";

function getNationFaction(
  nation: NationKey,
  customNations: CustomNation[],
): BaseFactionKey {
  if (nation.startsWith("custom:")) {
    const f =
      customNations.find((n) => n.id === nation)?.defaultFaction ?? "allies";
    return isBaseFactionKey(f) ? f : "allies";
  }

  const f = NATION_BY_ID[nation as BaseNationKey]?.defaultFaction ?? "allies";
  return isBaseFactionKey(f as FactionKey) ? (f as BaseFactionKey) : "allies";
}

function prerequisitesMet(
  nodeId: string,
  completed: string[],
  activeId?: string,
) {
  const node = RESEARCH_NODES_BY_ID[nodeId];
  if (!node) return false;
  if (completed.includes(nodeId)) return false;
  if (activeId && activeId !== nodeId) return false;
  return node.prerequisites.every((id) => completed.includes(id));
}

function canManageDoctrine(phase: Phase) {
  return phase === "SETUP" || phase === "ORDERS";
}

function hasResearchRequirements(
  researchState: NationResearchState,
  requiredResearch?: string[],
) {
  if (!requiredResearch?.length) return true;
  return requiredResearch.every((id) =>
    researchState.completedResearch.includes(id),
  );
}

type ResearchRecommendationState = Pick<
  CampaignState,
  | "nationResearchState"
  | "customNations"
  | "platoonsById"
  | "suppliesByNation"
  | "territoryNameById"
  | "intelByTerritory"
>;

export function buildResearchRecommendations(
  state: ResearchRecommendationState,
  nationId: NationKey,
): ResearchRecommendation[] {
  const researchState =
    state.nationResearchState[nationId] ?? defaultResearchState();
  const nationFaction = getNationFaction(nationId, state.customNations);
  const activeNode = researchState.activeResearchId
    ? RESEARCH_NODES_BY_ID[researchState.activeResearchId]
    : null;

  const alliedResearchTrees = new Set<ResearchTree>();
  for (const [otherNation, otherState] of Object.entries(
    state.nationResearchState,
  )) {
    if (otherNation === nationId) continue;
    if (!otherState.activeResearchId) continue;
    const otherFaction = getNationFaction(
      otherNation as NationKey,
      state.customNations,
    );
    if (otherFaction !== nationFaction) continue;
    const otherNode = RESEARCH_NODES_BY_ID[otherState.activeResearchId];
    if (otherNode) alliedResearchTrees.add(otherNode.tree);
  }

  const platoonCount = Object.values(state.platoonsById).filter(
    (platoon) => platoon.nation === nationId,
  ).length;
  const supplies = state.suppliesByNation?.[nationId] ?? 0;
  const unsuppliedRatio =
    platoonCount === 0
      ? 0
      : Math.max(0, (platoonCount - supplies) / platoonCount);

  const territoryIds = Object.keys(state.territoryNameById);
  const knownTerritories = territoryIds.filter((id) => {
    const level = state.intelByTerritory[id]?.[nationId];
    return level && level !== "NONE";
  }).length;
  const intelCoverage =
    territoryIds.length === 0 ? 0 : knownTerritories / territoryIds.length;

  return RESEARCH_NODES.filter((node) =>
    prerequisitesMet(node.id, researchState.completedResearch, activeNode?.id),
  )
    .map((node) => {
      let score = 0;
      const reasons: string[] = [];

      if (node.tree === "LOGISTICS" && unsuppliedRatio > 0.25) {
        score += 3;
        reasons.push("More than 25% of forces are unsupplied.");
      }
      if (node.tree === "INTELLIGENCE" && intelCoverage < 0.5) {
        score += 3;
        reasons.push("Intel coverage is below 50%.");
      }
      if (alliedResearchTrees.has(node.tree)) {
        score -= 2;
        reasons.push("Allied nation is already researching this tree.");
      }

      return {
        nodeId: node.id,
        score,
        reasons,
      };
    })
    .filter((rec) => rec.score !== 0)
    .sort((a, b) => b.score - a.score);
}

function advanceResearchForNewTurn(
  nationResearchState: Record<NationKey, NationResearchState>,
) {
  const nextResearch: Record<NationKey, NationResearchState> = {
    ...nationResearchState,
  };
  const logs: TurnLogEntry[] = [];

  for (const [nationId, state] of Object.entries(nationResearchState)) {
    if (!state.activeResearchId) continue;
    const node = RESEARCH_NODES_BY_ID[state.activeResearchId];
    if (!node) continue;
    const nextProgress = state.progressTurns + 1;
    if (nextProgress >= node.timeTurns) {
      const completed = Array.from(
        new Set([...state.completedResearch, node.id]),
      );
      nextResearch[nationId as NationKey] = {
        progressTurns: 0,
        completedResearch: completed,
      };
      logs.push(
        logNote(`Research complete: ${nationId} finished ${node.name}.`),
      );
    } else {
      nextResearch[nationId as NationKey] = {
        ...state,
        progressTurns: nextProgress,
      };
    }
  }

  return { nextResearch, logs };
}

function requireGM(s: CampaignState) {
  return s.viewerMode === "GM";
}

function playerCanActAsNation(s: CampaignState, nation: NationKey) {
  return requireGM(s) || s.viewerNation === nation;
}
function nextIntelLevel(
  current: VisibilityLevel | undefined,
  incoming: VisibilityLevel,
) {
  const currentIdx = visibilityOrder.indexOf(current ?? "NONE");
  const incomingIdx = visibilityOrder.indexOf(incoming);
  return visibilityOrder[Math.max(currentIdx, incomingIdx)] ?? incoming;
}

function applyReconOrders(args: {
  orders: PlatoonOrder[];
  platoonsById: Record<string, Platoon>;
  intelByTerritory: IntelByTerritory;
  isAdjacent: (a: string, b: string) => boolean;
}) {
  const nextIntel: IntelByTerritory = { ...args.intelByTerritory };
  const log: string[] = [];

  const reconOrders = args.orders.filter(
    (o) => o.type === "RECON" && o.submittedAt,
  );

  for (const order of reconOrders) {
    const platoon = args.platoonsById[order.platoonId];
    if (!platoon) continue;

    const from = platoon.territoryId;
    const hasReconTrait = platoon.traits?.includes("RECON");
    const maxTargets = hasReconTrait ? 2 : 1;
    const targets = (order.reconTargets ?? []).slice(0, maxTargets);

    if (!targets.length) continue;

    const validTargets = targets.filter((tid) => args.isAdjacent(from, tid));
    if (!validTargets.length) continue;

    for (const tid of validTargets) {
      const prev = nextIntel[tid] ?? {};
      nextIntel[tid] = {
        ...prev,
        [platoon.nation]: nextIntelLevel(prev[platoon.nation], "SCOUTED"),
      };
    }

    log.push(`RECON: ${platoon.name} scouted ${validTargets.join(", ")}.`);
  }

  return { nextIntel, log };
}
const initialState: Omit<
  CampaignState,
  | "setMode"
  | "setPlayMode"
  | "setCommandHubExpanded"
  | "setLeftPanelView"
  | "createPlatoonWithLoadout"
  | "toggleTheatre"
  | "selectSetupFaction"
  | "setSelectedPlatoonId"
  | "setOrderDraftType"
  | "createCustomFaction"
  | "createCustomNation"
  | "setOrderDraftType"
  | "setPlatoonOrderIntel"
  | "selectCustomFaction"
  | "setViewerFaction"
  | "setSelectedTerritory"
  | "setHomeland"
  | "applyHomeland"
  | "setHomelandUnlock"
  | "setOwner"
  | "setIntelLevel"
  | "bulkSetIntelLevel"
  | "setViewerNation"
  | "setPlayerFactionId"
  | "setRegions"
  | "setSelectedRegion"
  | "setViewerMode"
  | "addNote"
  | "resetAll"
  | "autoSetupWorld"
  | "createPlatoon"
  | "setPlatoonOrderMove"
  | "setPlatoonOrderHold"
  | "setPlatoonOrderRecon"
  | "setPlatoonOrderIntel"
  | "cancelDraftOrder"
  | "setAdjacencyByTerritory"
  | "setTerritoryNameById"
  | "submitFactionOrders"
  | "resolveCurrentTurn"
  | "resolveBattles"
  | "setPhase"
  | "nextPhase"
  | "clearLocksAndContests"
  | "selectSetupNation"
  | "setNationHomeland"
  | "ensureSupplies"
  | "getSupplies"
  | "addSupplies"
  | "spendSupplies"
  | "ensureResourcePoints"
  | "getResourcePoints"
  | "addResourcePoints"
  | "spendResourcePoints"
  | "setViewerNation"
  | "startResearch"
  | "cancelResearch"
  | "getResearchRecommendations"
  | "switchDoctrineStance"
  | "equipDoctrineTrait"
  | "unequipDoctrineTrait"
  | "applyUpgrade"
  | "removeUpgrade"
> = {
  mode: "SETUP",
  playMode: "ONE_SCREEN",
  commandHubExpanded: false,
  leftPanelView: "NONE",
  activeTheatres: { WE: true, EE: true, NA: true, PA: true },
  baseEnabled: { allies: true, axis: true, ussr: true },

  nationsEnabled: {
    belgium: false,
    bulgaria: false,
    finland: false,
    france: false,
    germany: false,
    great_britain: false,
    greece: false,
    hungary: false,
    imperial_japan: false,
    italy: false,
    norway: false,
    partisans: false,
    poland: false,
    polish_peoples_army: false,
    romania: false,
    soviet_union: false,
    the_netherlands: false,
    us: false,
  },

  customNations: [],
  selectedSetupNation: null,
  homelandsByNation: {},

  customs: [],
  factions: [
    {
      id: "allies",
      name: "Allies",
      nations: Object.values(NATION_BY_ID)
        .filter((nation) => nation.defaultFaction === "allies")
        .map((nation) => nation.id),
    },
    {
      id: "axis",
      name: "Axis",
      nations: Object.values(NATION_BY_ID)
        .filter((nation) => nation.defaultFaction === "axis")
        .map((nation) => nation.id),
    },
    {
      id: "ussr",
      name: "USSR",
      nations: Object.values(NATION_BY_ID)
        .filter((nation) => nation.defaultFaction === "ussr")
        .map((nation) => nation.id),
    },
  ],
  selectedSetupFaction: null,
  selectedCustomId: null,

  regions: [],
  selectedRegionId: null,

  viewerNation: "great_britain",
  viewerFaction: "allies",
  playerFactionId: null,
  viewerMode: "GM",

  homelands: {},
  homelandUnlock: false,
  ownerByTerritory: {},
  intelByTerritory: {},
  territoryNameById: {},

  selectedTerritoryId: null,
  selectedPlatoonId: null,
  orderDraftType: null,
  turnLog: [],

  phase: "SETUP",
  turnNumber: 1,

  platoonsById: {},
  ordersByTurn: {},
  locksByTerritory: {},
  contestsByTerritory: {},
  adjacencyByTerritory: {},

  suppliesByNation: Object.fromEntries(
    Object.values(NATION_BY_ID).map((nation) => [nation.id, 100]),
  ),
  resourcePointsByNation: Object.fromEntries(
    Object.values(NATION_BY_ID).map((nation) => [nation.id, 15]),
  ) as Record<NationKey, number>,

  nationResearchState: Object.fromEntries(
    Object.values(NATION_BY_ID).map((nation) => [
      nation.id,
      defaultResearchState(),
    ]),
  ) as Record<NationKey, NationResearchState>,
  nationDoctrineState: Object.fromEntries(
    Object.values(NATION_BY_ID).map((nation) => [
      nation.id,
      defaultDoctrineState(),
    ]),
  ) as Record<NationKey, NationDoctrineState>,
  doctrinePenaltyByNation: {},
  nationUpgradesState: Object.fromEntries(
    Object.values(NATION_BY_ID).map((nation) => [
      nation.id,
      defaultUpgradesState(),
    ]),
  ) as Record<NationKey, NationUpgradesState>,
};
function consumeSubmittedOrdersForTurn(
  ordersByTurn: Record<number, Record<string, PlatoonOrder[]>>,
  turn: number,
) {
  const byTurn = ordersByTurn[turn] ?? {};
  const nextByTurn: Record<string, PlatoonOrder[]> = {};

  for (const [faction, list] of Object.entries(byTurn)) {
    nextByTurn[faction] = (list ?? []).filter((o) => !o.submittedAt);
  }

  return { ...ordersByTurn, [turn]: nextByTurn };
}

// ✅ FIX: use (set, get) so supplies funcs can call get()
export const useCampaignStore = create<CampaignState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ---- basic app controls ----
      setMode: (m) => set({ mode: m }),
      setPlayMode: (m) => set({ playMode: m }),
      setCommandHubExpanded: (expanded) =>
        set({ commandHubExpanded: expanded }),
      setLeftPanelView: (view) => set({ leftPanelView: view }),

      toggleTheatre: (id) =>
        set((s) => ({
          activeTheatres: { ...s.activeTheatres, [id]: !s.activeTheatres[id] },
        })),

      setViewerMode: (m) => set({ viewerMode: m }),

      // Nations
      selectSetupNation: (n) => set({ selectedSetupNation: n }),
      setNationHomeland: (nation, territoryId) =>
        set((s) => ({
          homelandsByNation: { ...s.homelandsByNation, [nation]: territoryId },
        })),

      // Existing faction/customs (kept)
      selectSetupFaction: (f) =>
        set((s) => ({
          selectedSetupFaction: f,
          selectedCustomId: f === "custom" ? s.selectedCustomId : null,
        })),

      createCustomFaction: (name, color) => {
        const id = uid();
        const factionId = `custom:${id}` as FactionKey;
        const next: CustomFaction = {
          id,
          name: (name || "Custom Faction").trim(),
          color,
        };
        set((s) => ({
          customs: [...s.customs, next],
          factions: [
            ...s.factions,
            { id: factionId, name: next.name, color, nations: [] },
          ],
          selectedSetupFaction: "custom",
          selectedCustomId: id,
        }));
      },
      createCustomNation: (name, defaultFaction, color) => {
        const id = `custom:${uid()}` as NationKey;
        const next: CustomNation = {
          id,
          name: (name || "Custom Nation").trim(),
          defaultFaction,
          color,
        };
        set((s) => ({
          customNations: [...s.customNations, next],
          nationsEnabled: { ...s.nationsEnabled, [id]: true },
          selectedSetupNation: id,
          viewerNation: id,
          viewerFaction: defaultFaction,
          nationResearchState: {
            ...s.nationResearchState,
            [id]: defaultResearchState(),
          },
          nationDoctrineState: {
            ...s.nationDoctrineState,
            [id]: defaultDoctrineState(),
          },
          nationUpgradesState: {
            ...s.nationUpgradesState,
            [id]: defaultUpgradesState(),
          },
          resourcePointsByNation: {
            ...s.resourcePointsByNation,
            [id]: 15,
          },
          factions: s.factions.map((faction) =>
            faction.id === defaultFaction
              ? {
                  ...faction,
                  nations: Array.from(
                    new Set([...faction.nations, id]),
                  ) as NationKey[],
                }
              : faction,
          ),
        }));
      },

      selectCustomFaction: (id) =>
        set({ selectedSetupFaction: "custom", selectedCustomId: id }),
      setViewerNation: (nation) =>
        set((s) => {
          const priorDefault =
            (s.viewerNation.startsWith("custom:")
              ? s.customNations.find((n) => n.id === s.viewerNation)
                  ?.defaultFaction
              : NATION_BY_ID[s.viewerNation as BaseNationKey]
                  ?.defaultFaction) ?? "allies";
          const nextDefault =
            (nation.startsWith("custom:")
              ? s.customNations.find((n) => n.id === nation)?.defaultFaction
              : NATION_BY_ID[nation as BaseNationKey]?.defaultFaction) ??
            "allies";
          const shouldSyncFaction = s.viewerFaction === priorDefault;

          return {
            viewerNation: nation,
            viewerFaction: shouldSyncFaction ? nextDefault : s.viewerFaction,
            selectedTerritoryId: null,
          };
        }),

      // GM can swap faction; PLAYER cannot
      setViewerFaction: (f) => set({ viewerFaction: f }),
      setPlayerFactionId: (faction) => set({ playerFactionId: faction }),

      setSelectedTerritory: (id) => set({ selectedTerritoryId: id }),
      setSelectedPlatoonId: (id) => set({ selectedPlatoonId: id }),
      setOrderDraftType: (type) => set({ orderDraftType: type }),
      setHomelandUnlock: (unlock) => set({ homelandUnlock: unlock }),

      setRegions: (regions) => set({ regions }),
      setSelectedRegion: (id) => set({ selectedRegionId: id }),

      // v1 homelands (bridge)
      setHomeland: (factionKey, territoryId) =>
        set((s) => ({
          homelands: { ...s.homelands, [factionKey]: territoryId },
        })),

      applyHomeland: (nationKey) =>
        set((s) => {
          const homelandTid = s.homelandsByNation[nationKey];
          if (!homelandTid) return s;

          const allTerritoryIds = new Set<string>();
          for (const r of s.regions)
            for (const id of r.territories) allTerritoryIds.add(id);

          const nextIntel: IntelByTerritory = { ...s.intelByTerritory };

          for (const tid of allTerritoryIds) {
            const prev = nextIntel[tid] ?? {};
            nextIntel[tid] = { ...prev, [nationKey]: "NONE" };
          }

          {
            const prev = nextIntel[homelandTid] ?? {};
            nextIntel[homelandTid] = { ...prev, [nationKey]: "FULL" };
          }

          return {
            viewerNation: nationKey,
            ownerByTerritory: {
              ...s.ownerByTerritory,
              [homelandTid]: nationKey,
            },
            intelByTerritory: nextIntel,
          };
        }),

      // -------- GM-only mutators --------
      setOwner: (territoryId, ownerKey) =>
        set((s) => {
          if (!requireGM(s)) return s;
          return {
            ownerByTerritory: {
              ...s.ownerByTerritory,
              [territoryId]: ownerKey,
            },
          };
        }),

      setIntelLevel: (territoryId, nation, level) =>
        set((s) => {
          if (!requireGM(s)) return s;
          const prev = s.intelByTerritory[territoryId] || {};
          return {
            intelByTerritory: {
              ...s.intelByTerritory,
              [territoryId]: { ...prev, [nation]: level },
            },
          };
        }),

      bulkSetIntelLevel: (territoryIds, nation, level) =>
        set((s) => {
          if (!requireGM(s)) return s;
          const next = { ...s.intelByTerritory };
          for (const id of territoryIds) {
            const prev = next[id] || {};
            next[id] = { ...prev, [nation]: level };
          }
          return { intelByTerritory: next };
        }),

      // -------- notes / reset --------
      addNote: (text) =>
        set((s) => ({ turnLog: [logNote(text), ...s.turnLog] })),

      resetAll: () => set({ ...initialState }),

      // -------- world start --------
      autoSetupWorld: () =>
        set((s) => {
          if (!requireGM(s)) return s;
          const enabledNations = Object.entries(s.nationsEnabled)
            .filter(([, enabled]) => enabled)
            .map(([nation]) => nation as NationKey);

          const allTerritories = new Set<string>();
          for (const r of s.regions)
            for (const t of r.territories) allTerritories.add(t);

          const nextIntel: IntelByTerritory = {};
          const nextOwners: Record<string, OwnerKey> = {
            ...s.ownerByTerritory,
          };

          for (const tid of allTerritories) nextIntel[tid] = {};

          for (const nation of enabledNations) {
            for (const tid of allTerritories) nextIntel[tid][nation] = "NONE";

            const homeland = s.homelandsByNation[nation];
            if (!homeland) continue;

            nextOwners[homeland] = nation;
            nextIntel[homeland][nation] = "FULL";
          }

          return {
            mode: "PLAY",
            ownerByTerritory: nextOwners,
            intelByTerritory: nextIntel,
            phase: "ORDERS" as const,
            turnNumber: 1,
            turnLog: [logNote("Auto-setup world: PLAY started"), ...s.turnLog],
          };
        }),

      // -------- mechanics (players can only act as their own nation) --------
      createPlatoon: (faction, territoryId, name) =>
        set((s) => {
          if (!playerCanActAsNation(s, s.viewerNation)) return s;

          const id = uid();
          const next: Platoon = {
            id,
            faction,
            nation: s.viewerNation,
            name: name?.trim() || `Platoon ${id.slice(0, 4)}`,
            territoryId,
            condition: "FRESH",
            strengthPct: 100,
            mpBase: 1,
          };

          return {
            platoonsById: { ...s.platoonsById, [id]: next },
            turnLog: [
              logNote(`Created platoon for ${faction} at ${territoryId}`),
              ...s.turnLog,
            ],
          };
        }),
      createPlatoonWithLoadout: (faction, territoryId, payload) =>
        set((s) => {
          if (!playerCanActAsNation(s, s.viewerNation)) return s;

          const id = uid();
          const next: Platoon = {
            id,
            faction,
            nation: s.viewerNation,
            name: payload.name?.trim() || `Platoon ${id.slice(0, 4)}`,
            territoryId,
            condition: payload.condition ?? "FRESH",
            strengthPct: payload.strengthPct ?? 100,
            mpBase: payload.mpBase ?? 1,
            traits: payload.traits ?? [],
          };

          return {
            platoonsById: { ...s.platoonsById, [id]: next },
            turnLog: [
              logNote(
                `Created platoon for ${faction} at ${territoryId} (loadout)`,
              ),
              ...s.turnLog,
            ],
          };
        }),

      setPlatoonOrderMove: (turn, _faction, platoonId, path, forcedMarch) =>
        set((s) => {
          const platoon = s.platoonsById[platoonId];
          if (!platoon) return s;
          if (!playerCanActAsNation(s, platoon.nation)) return s;

          const orderFaction = platoon.faction;

          const byTurn: Record<string, PlatoonOrder[]> = {
            ...(s.ordersByTurn[turn] ?? {}),
          };
          const list: PlatoonOrder[] = [...(byTurn[orderFaction] ?? [])];

          const from = platoon.territoryId;

          const existingIdx = list.findIndex((o) => o.platoonId === platoonId);
          const next: PlatoonOrder = {
            id: existingIdx >= 0 ? list[existingIdx].id : uid(),
            turn,
            faction: orderFaction,
            platoonId,
            type: "MOVE",
            from,
            path,
            forcedMarch: !!forcedMarch,
            submittedAt: list[existingIdx]?.submittedAt,
          };

          if (existingIdx >= 0) list[existingIdx] = next;
          else list.push(next);

          byTurn[orderFaction] = list;
          return { ordersByTurn: { ...s.ordersByTurn, [turn]: byTurn } };
        }),
      setPlatoonOrderHold: (turn, _faction, platoonId) =>
        set((s) => {
          const platoon = s.platoonsById[platoonId];
          if (!platoon) return s;
          if (!playerCanActAsNation(s, platoon.nation)) return s;

          const orderFaction = platoon.faction;

          const byTurn: Record<string, PlatoonOrder[]> = {
            ...(s.ordersByTurn[turn] ?? {}),
          };
          const list: PlatoonOrder[] = [...(byTurn[orderFaction] ?? [])];
          const existingIdx = list.findIndex((o) => o.platoonId === platoonId);

          const next: PlatoonOrder = {
            id: existingIdx >= 0 ? list[existingIdx].id : uid(),
            turn,
            faction: orderFaction,
            platoonId,
            type: "HOLD",
            from: platoon.territoryId,
            submittedAt: list[existingIdx]?.submittedAt,
          };

          if (existingIdx >= 0) list[existingIdx] = next;
          else list.push(next);
          byTurn[orderFaction] = list;
          return { ordersByTurn: { ...s.ordersByTurn, [turn]: byTurn } };
        }),
      setPlatoonOrderRecon: (turn, _faction, platoonId, targets) =>
        set((s) => {
          const platoon = s.platoonsById[platoonId];
          if (!platoon) return s;
          if (!playerCanActAsNation(s, platoon.nation)) return s;

          const orderFaction = platoon.faction;

          const byTurn: Record<string, PlatoonOrder[]> = {
            ...(s.ordersByTurn[turn] ?? {}),
          };
          const list: PlatoonOrder[] = [...(byTurn[orderFaction] ?? [])];
          const existingIdx = list.findIndex((o) => o.platoonId === platoonId);
          const maxTargets = platoon.traits?.includes("RECON") ? 2 : 1;
          const reconTargets = Array.from(
            new Set(targets.map((t) => t.trim()).filter(Boolean)),
          ).slice(0, maxTargets);

          const next: PlatoonOrder = {
            id: existingIdx >= 0 ? list[existingIdx].id : uid(),
            turn,
            faction: orderFaction,
            platoonId,
            type: "RECON",
            from: platoon.territoryId,
            reconTargets,
            submittedAt: list[existingIdx]?.submittedAt,
          };
          if (existingIdx >= 0) list[existingIdx] = next;
          else list.push(next);
          byTurn[orderFaction] = list;
          return { ordersByTurn: { ...s.ordersByTurn, [turn]: byTurn } };
        }),
      setPlatoonOrderIntel: (turn, _faction, platoonId, target) =>
        set((s) => {
          const platoon = s.platoonsById[platoonId];
          if (!platoon) return s;
          if (!playerCanActAsNation(s, platoon.nation)) return s;

          const orderFaction = platoon.faction;

          const byTurn: Record<string, PlatoonOrder[]> = {
            ...(s.ordersByTurn[turn] ?? {}),
          };
          const list: PlatoonOrder[] = [...(byTurn[orderFaction] ?? [])];
          const existingIdx = list.findIndex((o) => o.platoonId === platoonId);
          const intelTargets = [target.trim()].filter(Boolean);

          const next: PlatoonOrder = {
            id: existingIdx >= 0 ? list[existingIdx].id : uid(),
            turn,
            faction: orderFaction,
            platoonId,
            type: "INTEL",
            from: platoon.territoryId,
            reconTargets: intelTargets,
            submittedAt: list[existingIdx]?.submittedAt,
          };
          if (existingIdx >= 0) list[existingIdx] = next;
          else list.push(next);
          byTurn[orderFaction] = list;
          return { ordersByTurn: { ...s.ordersByTurn, [turn]: byTurn } };
        }),
      cancelDraftOrder: (turn, orderId) =>
        set((s) => {
          const byTurn = s.ordersByTurn[turn];
          if (!byTurn) return s;

          let targetPlatoonNation: NationKey | null = null;
          let foundSubmitted = false;

          for (const list of Object.values(byTurn)) {
            const match = list.find((order) => order.id === orderId);
            if (match) {
              foundSubmitted = Boolean(match.submittedAt);
              const platoon = s.platoonsById[match.platoonId];
              targetPlatoonNation = platoon?.nation ?? null;
              break;
            }
          }

          if (!targetPlatoonNation || foundSubmitted) return s;
          if (!playerCanActAsNation(s, targetPlatoonNation)) return s;

          const nextByTurn: Record<string, PlatoonOrder[]> = {};
          for (const [factionKey, list] of Object.entries(byTurn)) {
            nextByTurn[factionKey] = list.filter(
              (order) => order.id !== orderId,
            );
          }

          return { ordersByTurn: { ...s.ordersByTurn, [turn]: nextByTurn } };
        }),

      submitFactionOrders: (turn, nation) =>
        set((s) => {
          if (!playerCanActAsNation(s, nation)) return s;

          const byTurn: Record<string, PlatoonOrder[]> = {
            ...(s.ordersByTurn[turn] ?? {}),
          };
          const nextByTurn: Record<string, PlatoonOrder[]> = {};

          for (const [factionKey, list] of Object.entries(byTurn)) {
            nextByTurn[factionKey] = list.map((o) => {
              const platoon = s.platoonsById[o.platoonId];
              if (platoon?.nation !== nation) return o;
              return { ...o, submittedAt: Date.now() };
            });
          }

          return {
            ordersByTurn: { ...s.ordersByTurn, [turn]: nextByTurn },
            turnLog: [
              logNote(`Orders submitted: ${nation} (Turn ${turn})`, "ORDERS"),
              ...s.turnLog,
            ],
          };
        }),

      // -------- GM-only mechanics --------
      resolveCurrentTurn: (isAdjacent) =>
        set((s) => {
          if (!requireGM(s)) return s;

          const byTurn = s.ordersByTurn[s.turnNumber] ?? {};
          const allOrders = Object.values(byTurn).flat() as PlatoonOrder[];
          const { nextIntel, log: reconLog } = applyReconOrders({
            orders: allOrders,
            platoonsById: s.platoonsById,
            intelByTerritory: s.intelByTerritory,
            isAdjacent,
          });

          const { nextPlatoons, nextOwners, nextLocks, nextContests, log } =
            resolveTurn({
              turn: s.turnNumber,
              platoonsById: s.platoonsById,
              orders: allOrders,
              ownerByTerritory: s.ownerByTerritory,

              locksByTerritory: s.locksByTerritory,
              contestsByTerritory: s.contestsByTerritory,
              isAdjacent,
              getPlatoonModifiers: (platoonId) =>
                getPlatoonModifiers(
                  {
                    nationDoctrineState: s.nationDoctrineState,
                    nationResearchState: s.nationResearchState,
                    nationUpgradesState: s.nationUpgradesState,
                    platoonsById: s.platoonsById,
                  },
                  platoonId,
                ),
            });

          return {
            platoonsById: nextPlatoons,
            ownerByTerritory: nextOwners,
            locksByTerritory: nextLocks,
            contestsByTerritory: nextContests,
            intelByTerritory: nextIntel,
            ordersByTurn: consumeSubmittedOrdersForTurn(
              s.ordersByTurn,
              s.turnNumber,
            ),
            turnLog: [
              ...reconLog.map((t) => logNote(t, "ORDERS")),
              ...log.map((t) => logNote(t)),
              ...s.turnLog,
            ],
          };
        }),

      resolveBattles: (outcomes) =>
        set((s) => {
          if (!requireGM(s)) return s;

          const { nextPlatoons, nextOwners, nextLocks, nextContests, log } =
            resolveBattlesFn({
              platoonsById: s.platoonsById,
              ownerByTerritory: s.ownerByTerritory,
              locksByTerritory: s.locksByTerritory,
              contestsByTerritory: s.contestsByTerritory,
              adjacencyByTerritory: s.adjacencyByTerritory,
              outcomes,
            });

          return {
            platoonsById: nextPlatoons,
            ownerByTerritory: nextOwners,
            locksByTerritory: nextLocks,
            contestsByTerritory: nextContests,
            turnLog: [...log.map((t) => logNote(t)), ...s.turnLog],
          };
        }),
      setAdjacencyByTerritory: (adjacency) =>
        set({ adjacencyByTerritory: adjacency }),
      setTerritoryNameById: (names) => set({ territoryNameById: names }),

      setPhase: (p) =>
        set((s) => {
          if (!requireGM(s)) return s;
          return { phase: p };
        }),

      nextPhase: (isAdjacent) =>
        set((s) => {
          if (!requireGM(s)) return s;

          const factions: FactionKey[] = ["allies", "axis", "ussr"]; // adjust if needed
          const idx = Math.max(0, factions.indexOf(s.viewerFaction));
          const rotatedFaction = factions[(idx + 1) % factions.length];

          if (s.phase === "SETUP")
            return { phase: "ORDERS" as const, viewerFaction: rotatedFaction };
          if (s.phase === "ORDERS")
            return {
              phase: "RESOLUTION" as const,
              viewerFaction: rotatedFaction,
            };

          if (s.phase === "RESOLUTION") {
            const byTurn = s.ordersByTurn[s.turnNumber] ?? {};
            const allOrders = Object.values(byTurn).flat() as PlatoonOrder[];

            const { nextIntel, log: reconLog } = applyReconOrders({
              orders: allOrders,
              platoonsById: s.platoonsById,
              intelByTerritory: s.intelByTerritory,
              isAdjacent,
            });
            const { nextPlatoons, nextOwners, nextLocks, nextContests, log } =
              resolveTurn({
                turn: s.turnNumber,
                platoonsById: s.platoonsById,
                orders: allOrders,
                ownerByTerritory: s.ownerByTerritory,
                locksByTerritory: s.locksByTerritory,

                contestsByTerritory: s.contestsByTerritory,
                isAdjacent,
              });
            const pendingContests = Object.values(nextContests).filter(
              (contest) => contest?.status === "BATTLE_PENDING",
            );
            const contestCount =
              Object.values(nextContests).filter(Boolean).length;
            const lockCount = Object.values(nextLocks).filter(Boolean).length;

            if (pendingContests.length === 0) {
              const nextViewerFaction = factions[(idx + 2) % factions.length];
              const { nextResearch, logs: researchLogs } =
                advanceResearchForNewTurn(s.nationResearchState);
              return {
                phase: "ORDERS" as const,
                turnNumber: s.turnNumber + 1,
                viewerFaction: nextViewerFaction,
                platoonsById: nextPlatoons,
                ownerByTerritory: nextOwners,
                locksByTerritory: nextLocks,
                contestsByTerritory: nextContests,
                intelByTerritory: nextIntel,
                nationResearchState: nextResearch,
                ordersByTurn: consumeSubmittedOrdersForTurn(
                  s.ordersByTurn,
                  s.turnNumber,
                ),
                turnLog: [
                  logNote(
                    `Skipped Battles phase (no pending contests; ${contestCount} contests, ${lockCount} locks).`,
                    "BATTLE",
                  ),
                  ...researchLogs,
                  ...reconLog.map((t) => logNote(t, "ORDERS")),
                  ...log.map((t) => logNote(t)),
                  ...s.turnLog,
                ],
              };
            }

            return {
              phase: "BATTLES" as const,
              viewerFaction: rotatedFaction,
              platoonsById: nextPlatoons,
              ownerByTerritory: nextOwners,
              locksByTerritory: nextLocks,
              contestsByTerritory: nextContests,
              intelByTerritory: nextIntel,
              ordersByTurn: consumeSubmittedOrdersForTurn(
                s.ordersByTurn,
                s.turnNumber,
              ),
              turnLog: [
                ...reconLog.map((t) => logNote(t, "ORDERS")),
                ...log.map((t) => logNote(t)),
                ...s.turnLog,
              ],
            };
          }

          // BATTLES -> next turn -> ORDERS
          const { nextResearch, logs: researchLogs } =
            advanceResearchForNewTurn(s.nationResearchState);
          return {
            phase: "ORDERS" as const,
            turnNumber: s.turnNumber + 1,
            viewerFaction: rotatedFaction,
            nationResearchState: nextResearch,
            turnLog: [...researchLogs, ...s.turnLog],
          };
        }),

      // -------- Supplies (now valid because we have get()) --------
      ensureSupplies: () => {
        const s = get();
        const m = { ...(s.suppliesByNation ?? {}) };

        for (const nation of Object.values(NATION_BY_ID)) {
          if (m[nation.id] == null) m[nation.id] = 100;
        }

        for (const c of s.customNations ?? []) {
          if (m[c.id] == null) m[c.id] = 100;
        }

        set({ suppliesByNation: m });
      },

      getSupplies: (nation: NationKey) => {
        const s = get();
        return (s.suppliesByNation?.[nation] ?? 0) | 0;
      },

      spendSupplies: (nation: NationKey, amount: number, reason?: string) => {
        const s = get();
        const cur = s.suppliesByNation?.[nation] ?? 0;
        const cost = Math.max(0, Math.floor(amount));
        if (cur < cost) return false;

        const next = cur - cost;
        set({ suppliesByNation: { ...s.suppliesByNation, [nation]: next } });

        if (Array.isArray(s.turnLog) && cost > 0) {
          set({
            turnLog: [
              {
                ts: Date.now(),
                type: "SUPPLY",
                text: `${nation} spent ${cost} supplies${reason ? ` (${reason})` : ""} (now ${next})`,
                id: uid(),
              },
              ...s.turnLog,
            ],
          });
        }

        return true;
      },

      addSupplies: (nation: NationKey, amount: number, reason?: string) => {
        const s = get();
        const add = Math.max(0, Math.floor(amount));
        const cur = s.suppliesByNation?.[nation] ?? 0;
        const next = cur + add;

        set({ suppliesByNation: { ...s.suppliesByNation, [nation]: next } });

        if (Array.isArray(s.turnLog) && add > 0) {
          set({
            turnLog: [
              {
                ts: Date.now(),
                type: "SUPPLY",
                text: `${nation} gained ${add} supplies${reason ? ` (${reason})` : ""} (now ${next})`,
                id: uid(),
              },
              ...s.turnLog,
            ],
          });
        }
      },

      // -------- Resource points (upgrades) --------
      ensureResourcePoints: () => {
        const s = get();
        const m = { ...(s.resourcePointsByNation ?? {}) };

        for (const nation of Object.values(NATION_BY_ID)) {
          if (m[nation.id] == null) m[nation.id] = 15;
        }

        for (const c of s.customNations ?? []) {
          if (m[c.id] == null) m[c.id] = 15;
        }

        set({ resourcePointsByNation: m });
      },

      getResourcePoints: (nation: NationKey) => {
        const s = get();
        return (s.resourcePointsByNation?.[nation] ?? 0) | 0;
      },

      spendResourcePoints: (
        nation: NationKey,
        amount: number,
        reason?: string,
      ) => {
        const s = get();
        const cur = s.resourcePointsByNation?.[nation] ?? 0;
        const cost = Math.max(0, Math.floor(amount));
        if (cur < cost) return false;

        const next = cur - cost;
        set({
          resourcePointsByNation: {
            ...s.resourcePointsByNation,
            [nation]: next,
          },
        });

        if (Array.isArray(s.turnLog) && cost > 0) {
          set({
            turnLog: [
              {
                ts: Date.now(),
                type: "SUPPLY",
                text: `${nation} spent ${cost} resource points${reason ? ` (${reason})` : ""} (now ${next})`,
                id: uid(),
              },
              ...s.turnLog,
            ],
          });
        }

        return true;
      },

      addResourcePoints: (
        nation: NationKey,
        amount: number,
        reason?: string,
      ) => {
        const s = get();
        const add = Math.max(0, Math.floor(amount));
        const cur = s.resourcePointsByNation?.[nation] ?? 0;
        const next = cur + add;

        set({
          resourcePointsByNation: {
            ...s.resourcePointsByNation,
            [nation]: next,
          },
        });

        if (Array.isArray(s.turnLog) && add > 0) {
          set({
            turnLog: [
              {
                ts: Date.now(),
                type: "SUPPLY",
                text: `${nation} gained ${add} resource points${reason ? ` (${reason})` : ""} (now ${next})`,
                id: uid(),
              },
              ...s.turnLog,
            ],
          });
        }
      },

      // -------- Research --------
      startResearch: (nation, nodeId) =>
        set((s) => {
          if (!playerCanActAsNation(s, nation)) return s;
          const node = RESEARCH_NODES_BY_ID[nodeId];
          if (!node) return s;

          const current =
            s.nationResearchState[nation] ?? defaultResearchState();
          if (current.activeResearchId) return s;
          if (current.completedResearch.includes(nodeId)) return s;
          const hasPrereqs = node.prerequisites.every((id) =>
            current.completedResearch.includes(id),
          );
          if (!hasPrereqs) return s;

          return {
            nationResearchState: {
              ...s.nationResearchState,
              [nation]: {
                activeResearchId: nodeId,
                startedTurn: s.turnNumber,
                progressTurns: 0,
                completedResearch: current.completedResearch,
              },
            },
            turnLog: [
              logNote(`Research started: ${nation} began ${node.name}.`),
              ...s.turnLog,
            ],
          };
        }),
      cancelResearch: (nation) =>
        set((s) => {
          if (!playerCanActAsNation(s, nation)) return s;
          const current = s.nationResearchState[nation];
          if (!current?.activeResearchId) return s;
          const node = RESEARCH_NODES_BY_ID[current.activeResearchId];
          if (!node) return s;
          if (node.tier >= 2 && current.progressTurns >= 1) return s;

          return {
            nationResearchState: {
              ...s.nationResearchState,
              [nation]: {
                progressTurns: 0,
                completedResearch: current.completedResearch,
              },
            },
            turnLog: [
              logNote(`Research cancelled: ${nation} halted ${node.name}.`),
              ...s.turnLog,
            ],
          };
        }),
      getResearchRecommendations: (nationId) => {
        return buildResearchRecommendations(get(), nationId);
      },

      // -------- Doctrine --------
      switchDoctrineStance: (nation, stanceId) =>
        set((s) => {
          if (!playerCanActAsNation(s, nation)) return s;
          if (!canManageDoctrine(s.phase)) return s;

          const stance = DOCTRINE_STANCES_BY_ID[stanceId];
          if (!stance) return s;

          const doctrineState =
            s.nationDoctrineState[nation] ?? defaultDoctrineState();
          if (doctrineState.activeStanceId === stanceId) return s;
          if (
            doctrineState.stanceLockedUntilTurn &&
            s.turnNumber < doctrineState.stanceLockedUntilTurn
          ) {
            return s;
          }

          const researchState =
            s.nationResearchState[nation] ?? defaultResearchState();
          if (!hasResearchRequirements(researchState, stance.requiredResearch))
            return s;

          const nextDoctrine: NationDoctrineState = {
            ...doctrineState,
            activeStanceId: stanceId,
            stanceLockedUntilTurn: s.turnNumber + stance.switchCooldownTurns,
          };
          const penaltyEntry = stance.switchPenalty
            ? { penalty: stance.switchPenalty, appliedTurn: s.turnNumber }
            : undefined;

          return {
            nationDoctrineState: {
              ...s.nationDoctrineState,
              [nation]: nextDoctrine,
            },
            doctrinePenaltyByNation: penaltyEntry
              ? {
                  ...s.doctrinePenaltyByNation,
                  [nation]: penaltyEntry,
                }
              : s.doctrinePenaltyByNation,
            turnLog: [
              logNote(`Doctrine switched: ${nation} → ${stance.name}.`),
              ...(stance.switchPenalty
                ? [
                    logNote(
                      `Doctrine penalty applied: ${nation} ${stance.switchPenalty.type} (${stance.switchPenalty.value}).`,
                    ),
                  ]
                : []),
              ...s.turnLog,
            ],
          };
        }),
      equipDoctrineTrait: (nation, traitId) =>
        set((s) => {
          if (!playerCanActAsNation(s, nation)) return s;
          if (!canManageDoctrine(s.phase)) return s;

          const trait = DOCTRINE_TRAITS_BY_ID[traitId];
          if (!trait) return s;

          const doctrineState =
            s.nationDoctrineState[nation] ?? defaultDoctrineState();
          if (doctrineState.equippedTraitIds.includes(traitId)) return s;

          const researchState =
            s.nationResearchState[nation] ?? defaultResearchState();
          if (!hasResearchRequirements(researchState, trait.requiredResearch))
            return s;

          if (
            trait.prerequisitesTraits?.some(
              (required) => !doctrineState.equippedTraitIds.includes(required),
            )
          )
            return s;

          const usedSlots = doctrineState.equippedTraitIds.reduce(
            (sum, id) => sum + (DOCTRINE_TRAITS_BY_ID[id]?.slotCost ?? 0),
            0,
          );
          if (usedSlots + trait.slotCost > doctrineState.traitSlots) return s;

          return {
            nationDoctrineState: {
              ...s.nationDoctrineState,
              [nation]: {
                ...doctrineState,
                equippedTraitIds: [...doctrineState.equippedTraitIds, traitId],
              },
            },
            turnLog: [
              logNote(`Doctrine trait equipped: ${nation} → ${trait.name}.`),
              ...s.turnLog,
            ],
          };
        }),
      unequipDoctrineTrait: (nation, traitId) =>
        set((s) => {
          if (!playerCanActAsNation(s, nation)) return s;
          if (!canManageDoctrine(s.phase)) return s;

          const doctrineState =
            s.nationDoctrineState[nation] ?? defaultDoctrineState();
          if (!doctrineState.equippedTraitIds.includes(traitId)) return s;

          const traitName = DOCTRINE_TRAITS_BY_ID[traitId]?.name ?? traitId;

          return {
            nationDoctrineState: {
              ...s.nationDoctrineState,
              [nation]: {
                ...doctrineState,
                equippedTraitIds: doctrineState.equippedTraitIds.filter(
                  (id) => id !== traitId,
                ),
              },
            },
            turnLog: [
              logNote(`Doctrine trait unequipped: ${nation} → ${traitName}.`),
              ...s.turnLog,
            ],
          };
        }),

      // -------- Upgrades --------
      applyUpgrade: ({ nation, upgradeId, territoryId, platoonId }) =>
        set((s) => {
          if (!playerCanActAsNation(s, nation)) return s;
          const upgrade = UPGRADES_BY_ID[upgradeId];
          if (!upgrade) return s;

          const current =
            s.nationUpgradesState[nation] ?? defaultUpgradesState();
          const researchState =
            s.nationResearchState[nation] ?? defaultResearchState();
          const doctrineState =
            s.nationDoctrineState[nation] ?? defaultDoctrineState();
          const resourcePoints = s.resourcePointsByNation?.[nation] ?? 0;
          const eligibility = getUpgradeEligibility({
            upgrade,
            doctrineState,
            researchState,
            upgradesState: current,
            resourcePoints,
            territoryId,
            platoonId,
          });
          if (!eligibility.eligible) return s;

          const appliedId = uid();
          const applied =
            upgrade.scope === "NATION"
              ? { id: appliedId, defId: upgrade.id, scope: "NATION" as const }
              : upgrade.scope === "TERRITORY" && territoryId
                ? {
                    id: appliedId,
                    defId: upgrade.id,
                    scope: "TERRITORY" as const,
                    territoryId,
                  }
                : upgrade.scope === "FORCE" && platoonId
                  ? {
                      id: appliedId,
                      defId: upgrade.id,
                      scope: "FORCE" as const,
                      platoonId,
                    }
                  : null;

          if (!applied) return s;

          const nextPoints = resourcePoints - upgrade.cost.points;

          return {
            nationUpgradesState: {
              ...s.nationUpgradesState,
              [nation]: {
                ...current,
                applied: [...current.applied, applied],
              },
            },
            resourcePointsByNation: {
              ...s.resourcePointsByNation,
              [nation]: nextPoints,
            },
            turnLog: [
              logNote(
                `Upgrade applied: ${nation} → ${upgrade.name} (-${upgrade.cost.points} RP).`,
              ),
              ...s.turnLog,
            ],
          };
        }),

      removeUpgrade: (nation, upgradeInstanceId) =>
        set((s) => {
          if (!requireGM(s)) return s;
          const current =
            s.nationUpgradesState[nation] ?? defaultUpgradesState();
          if (
            !current.applied.some((entry) => entry.id === upgradeInstanceId)
          ) {
            return s;
          }

          return {
            nationUpgradesState: {
              ...s.nationUpgradesState,
              [nation]: {
                ...current,
                applied: current.applied.filter(
                  (entry) => entry.id !== upgradeInstanceId,
                ),
              },
            },
            turnLog: [
              logNote(
                `Upgrade removed (admin): ${nation} → ${upgradeInstanceId}.`,
              ),
              ...s.turnLog,
            ],
          };
        }),

      clearLocksAndContests: () =>
        set((s) => {
          if (!requireGM(s)) return s;

          return {
            locksByTerritory: {},
            contestsByTerritory: {},
            ownerByTerritory: Object.fromEntries(
              Object.entries(s.ownerByTerritory).map(([tid, o]) => [
                tid,
                o === "contested" ? "neutral" : o,
              ]),
            ),
            turnLog: [
              logNote("Cleared locks/contests (dev helper)"),
              ...s.turnLog,
            ],
          };
        }),
    }),
    { name: "war_campaign_zustand_v2" },
  ),
);
