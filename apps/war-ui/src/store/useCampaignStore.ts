// src/store/useCampaignStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { visibilityOrder, type VisibilityLevel } from "../data/visibility";
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
  | "FACTION_COMMAND"
  | "NATION_COMMAND"
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
};

const uid = () => Math.random().toString(16).slice(2) + Date.now().toString(16);

function logNote(text: string, type: TurnLogType = "NOTE"): TurnLogEntry {
  return { ts: Date.now(), type, text, id: uid() };
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
  | "setViewerNation"
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
        const next: CustomFaction = {
          id,
          name: (name || "Custom Faction").trim(),
          color,
        };
        set((s) => ({
          customs: [...s.customs, next],
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

      setPlatoonOrderMove: (turn, faction, platoonId, path, forcedMarch) =>
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
      setPlatoonOrderHold: (turn, faction, platoonId) =>
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
      setPlatoonOrderRecon: (turn, faction, platoonId, targets) =>
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
      setPlatoonOrderIntel: (turn, faction, platoonId, target) =>
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
              return {
                phase: "ORDERS" as const,
                turnNumber: s.turnNumber + 1,
                viewerFaction: nextViewerFaction,
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
                  logNote(
                    `Skipped Battles phase (no pending contests; ${contestCount} contests, ${lockCount} locks).`,
                    "BATTLE",
                  ),
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
          return {
            phase: "ORDERS" as const,
            turnNumber: s.turnNumber + 1,
            viewerFaction: rotatedFaction,
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
