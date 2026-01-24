// src/store/useCampaignStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { VisibilityLevel } from "../data/visibility";
import { NATION_BY_ID, type NationKey } from "../setup/NationDefinitions";

import type {
  Phase,
  PlatoonOrder,
  TerritoryLock,
  Contest,
  Platoon,
  BattleOutcome,
} from "../domain/types";
import { resolveTurn } from "../domain/resolveTurn";
import { resolveBattles as resolveBattlesFn } from "../domain/resolveBattles";

export type BaseFactionKey = "allies" | "axis" | "ussr";
export type FactionKey = BaseFactionKey | `custom:${string}`;
export type OwnerKey = FactionKey | "neutral" | "contested";
export type SuppliesByFaction = Record<string, number>;

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

export type TurnLogEntry = {
  id: string;
  ts: number;
  type: TurnLogType;
  text: string;
};

type IntelByTerritory = Record<
  string,
  Partial<Record<FactionKey, VisibilityLevel>>
>;

export type CustomFaction = { id: string; name: string; color: string };

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

  baseEnabled: Record<BaseFactionKey, boolean>;

  // Nations
  nationsEnabled: Record<NationKey, boolean>;
  selectedSetupNation: NationKey | null;
  selectSetupNation: (n: NationKey | null) => void;

  homelandsByNation: Partial<Record<NationKey, string>>;
  setNationHomeland: (nation: NationKey, territoryId: string) => void;

  // Existing faction/custom system (kept for now)
  customs: CustomFaction[];
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
  ownerByTerritory: Record<string, OwnerKey>;
  intelByTerritory: IntelByTerritory;

  selectedTerritoryId: string | null;
  turnLog: TurnLogEntry[];
  selectedPlatoonId: string | null;
  setMode: (m: Mode) => void;
  setPlayMode: (m: PlayMode) => void;
  setCommandHubExpanded: (expanded: boolean) => void;
  toggleTheatre: (id: "WE" | "EE" | "NA" | "PA") => void;

  selectSetupFaction: (f: BaseFactionKey | "custom" | null) => void;
  createCustomFaction: (name: string, color: string) => void;
  selectCustomFaction: (id: string | null) => void;

  setViewerFaction: (f: FactionKey) => void;
  setViewerNation: (nation: NationKey) => void;
  setPlayerFactionId: (faction: FactionKey | null) => void;
  setSelectedTerritory: (id: string | null) => void;
  setSelectedPlatoonId: (id: string | null) => void;
  // v1
  setHomeland: (factionKey: FactionKey, territoryId: string) => void;
  applyHomeland: (factionKey: FactionKey) => void;

  // GM-only mutators
  setOwner: (territoryId: string, ownerKey: OwnerKey) => void;
  setIntelLevel: (
    territoryId: string,
    faction: FactionKey,
    level: VisibilityLevel,
  ) => void;
  bulkSetIntelLevel: (
    territoryIds: string[],
    faction: FactionKey,
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
  submitFactionOrders: (turn: number, faction: FactionKey) => void;

  resolveCurrentTurn: (isAdjacent: (a: string, b: string) => boolean) => void;
  resolveBattles: (outcomes: BattleOutcome[]) => void;
  setAdjacencyByTerritory: (adjacency: Record<string, string[]>) => void;
  setPhase: (p: Phase) => void;
  nextPhase: (isAdjacent: (a: string, b: string) => boolean) => void;

  clearLocksAndContests: () => void;

  // Supplies
  suppliesByFaction: SuppliesByFaction;
  ensureSupplies: () => void;
  getSupplies: (faction: string) => number;
  spendSupplies: (faction: string, amount: number, reason?: string) => boolean;
  addSupplies: (faction: string, amount: number, reason?: string) => void;
};

const uid = () => Math.random().toString(16).slice(2) + Date.now().toString(16);

function logNote(text: string, type: TurnLogType = "NOTE"): TurnLogEntry {
  return { ts: Date.now(), type, text, id: uid() };
}

function requireGM(s: CampaignState) {
  return s.viewerMode === "GM";
}

function playerCanActAs(s: CampaignState, faction: FactionKey) {
  return requireGM(s) || s.viewerFaction === faction;
}

const initialState: Omit<
  CampaignState,
  | "setMode"
  | "setPlayMode"
  | "setCommandHubExpanded"
  | "toggleTheatre"
  | "selectSetupFaction"
  | "setSelectedPlatoonId"
  | "createCustomFaction"
  | "selectCustomFaction"
  | "setViewerFaction"
  | "setSelectedTerritory"
  | "setHomeland"
  | "applyHomeland"
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
  | "setAdjacencyByTerritory"
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
  viewerMode: "PLAYER",

  homelands: {},
  ownerByTerritory: {},
  intelByTerritory: {},

  selectedTerritoryId: null,
  selectedPlatoonId: null,
  turnLog: [],

  phase: "SETUP",
  turnNumber: 1,

  platoonsById: {},
  ordersByTurn: {},
  locksByTerritory: {},
  contestsByTerritory: {},
  adjacencyByTerritory: {},

  suppliesByFaction: {
    allies: 100,
    axis: 100,
    ussr: 100,
  },
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

      selectCustomFaction: (id) =>
        set({ selectedSetupFaction: "custom", selectedCustomId: id }),
      setViewerNation: (nation) =>
        set({
          viewerNation: nation,
          viewerFaction: NATION_BY_ID[nation]?.defaultFaction ?? "allies",
        }),

      // GM can swap faction; PLAYER cannot
      setViewerFaction: (f) => set({ viewerFaction: f }),
      setPlayerFactionId: (faction) => set({ playerFactionId: faction }),

      setSelectedTerritory: (id) => set({ selectedTerritoryId: id }),
      setSelectedPlatoonId: (id) => set({ selectedPlatoonId: id }),

      setRegions: (regions) => set({ regions }),
      setSelectedRegion: (id) => set({ selectedRegionId: id }),

      // v1 homelands (bridge)
      setHomeland: (factionKey, territoryId) =>
        set((s) => ({
          homelands: { ...s.homelands, [factionKey]: territoryId },
        })),

      applyHomeland: (factionKey) =>
        set((s) => {
          const homelandTid = s.homelands[factionKey];
          if (!homelandTid) return s;

          const allTerritoryIds = new Set<string>();
          for (const r of s.regions)
            for (const id of r.territories) allTerritoryIds.add(id);

          const nextIntel: IntelByTerritory = { ...s.intelByTerritory };

          for (const tid of allTerritoryIds) {
            const prev = nextIntel[tid] ?? {};
            nextIntel[tid] = { ...prev, [factionKey]: "NONE" };
          }

          {
            const prev = nextIntel[homelandTid] ?? {};
            nextIntel[homelandTid] = { ...prev, [factionKey]: "FULL" };
          }

          return {
            viewerFaction: factionKey,
            ownerByTerritory: {
              ...s.ownerByTerritory,
              [homelandTid]: factionKey,
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

      setIntelLevel: (territoryId, faction, level) =>
        set((s) => {
          if (!requireGM(s)) return s;
          const prev = s.intelByTerritory[territoryId] || {};
          return {
            intelByTerritory: {
              ...s.intelByTerritory,
              [territoryId]: { ...prev, [faction]: level },
            },
          };
        }),

      bulkSetIntelLevel: (territoryIds, faction, level) =>
        set((s) => {
          if (!requireGM(s)) return s;
          const next = { ...s.intelByTerritory };
          for (const id of territoryIds) {
            const prev = next[id] || {};
            next[id] = { ...prev, [faction]: level };
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

          const factions: FactionKey[] = [
            "allies",
            "axis",
            "ussr",
            ...s.customs.map((c) => `custom:${c.id}` as const),
          ];

          const allTerritories = new Set<string>();
          for (const r of s.regions)
            for (const t of r.territories) allTerritories.add(t);

          const nextIntel: IntelByTerritory = {};
          const nextOwners: Record<string, OwnerKey> = {
            ...s.ownerByTerritory,
          };

          for (const tid of allTerritories) nextIntel[tid] = {};

          for (const f of factions) {
            for (const tid of allTerritories) nextIntel[tid][f] = "NONE";

            const homeland = s.homelands[f];
            if (!homeland) continue;

            nextOwners[homeland] = f;
            nextIntel[homeland][f] = "FULL";
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

      // -------- mechanics (players can only act as their own faction) --------
      createPlatoon: (faction, territoryId, name) =>
        set((s) => {
          if (!playerCanActAs(s, faction)) return s;

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

      setPlatoonOrderMove: (turn, faction, platoonId, path, forcedMarch) =>
        set((s) => {
          if (!playerCanActAs(s, faction)) return s;

          const platoon = s.platoonsById[platoonId];
          if (!platoon) return s;
          if (platoon.faction !== faction) return s;

          const byTurn: Record<string, PlatoonOrder[]> = {
            ...(s.ordersByTurn[turn] ?? {}),
          };
          const list: PlatoonOrder[] = [...(byTurn[faction] ?? [])];

          const from = platoon.territoryId;

          const existingIdx = list.findIndex((o) => o.platoonId === platoonId);
          const next: PlatoonOrder = {
            id: existingIdx >= 0 ? list[existingIdx].id : uid(),
            turn,
            faction,
            platoonId,
            type: "MOVE",
            from,
            path,
            forcedMarch: !!forcedMarch,
            submittedAt: list[existingIdx]?.submittedAt,
          };

          if (existingIdx >= 0) list[existingIdx] = next;
          else list.push(next);

          byTurn[faction] = list;
          return { ordersByTurn: { ...s.ordersByTurn, [turn]: byTurn } };
        }),
      setPlatoonOrderHold: (turn, faction, platoonId) =>
        set((s) => {
          if (!playerCanActAs(s, faction)) return s;

          const platoon = s.platoonsById[platoonId];
          if (!platoon) return s;
          if (platoon.faction !== faction) return s;

          const byTurn: Record<string, PlatoonOrder[]> = {
            ...(s.ordersByTurn[turn] ?? {}),
          };
          const list: PlatoonOrder[] = [...(byTurn[faction] ?? [])];
          const existingIdx = list.findIndex((o) => o.platoonId === platoonId);

          const next: PlatoonOrder = {
            id: existingIdx >= 0 ? list[existingIdx].id : uid(),
            turn,
            faction,
            platoonId,
            type: "HOLD",
            from: platoon.territoryId,
            submittedAt: list[existingIdx]?.submittedAt,
          };

          if (existingIdx >= 0) list[existingIdx] = next;
          else list.push(next);

          byTurn[faction] = list;
          return { ordersByTurn: { ...s.ordersByTurn, [turn]: byTurn } };
        }),

      submitFactionOrders: (turn, faction) =>
        set((s) => {
          if (!playerCanActAs(s, faction)) return s;

          const byTurn: Record<string, PlatoonOrder[]> = {
            ...(s.ordersByTurn[turn] ?? {}),
          };
          const list: PlatoonOrder[] = (byTurn[faction] ?? []).map((o) => ({
            ...o,
            submittedAt: Date.now(),
          }));
          byTurn[faction] = list;

          return {
            ordersByTurn: { ...s.ordersByTurn, [turn]: byTurn },
            turnLog: [
              logNote(`Orders submitted: ${faction} (Turn ${turn})`, "ORDERS"),
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
            ordersByTurn: consumeSubmittedOrdersForTurn(
              s.ordersByTurn,
              s.turnNumber,
            ),
            turnLog: [...log.map((t) => logNote(t)), ...s.turnLog],
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
              phase: "BATTLES" as const,
              viewerFaction: rotatedFaction,
              platoonsById: nextPlatoons,
              ownerByTerritory: nextOwners,
              locksByTerritory: nextLocks,
              contestsByTerritory: nextContests,
              ordersByTurn: consumeSubmittedOrdersForTurn(
                s.ordersByTurn,
                s.turnNumber,
              ),
              turnLog: [...log.map((t) => logNote(t)), ...s.turnLog],
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
        const m = { ...(s.suppliesByFaction ?? {}) };

        if (m.allies == null) m.allies = 100;
        if (m.axis == null) m.axis = 100;
        if (m.ussr == null) m.ussr = 100;

        for (const c of s.customs ?? []) {
          const k = `custom:${c.id}`;
          if (m[k] == null) m[k] = 100;
        }

        set({ suppliesByFaction: m });
      },

      getSupplies: (faction: string) => {
        const s = get();
        return (s.suppliesByFaction?.[faction] ?? 0) | 0;
      },

      spendSupplies: (faction: string, amount: number, reason?: string) => {
        const s = get();
        const cur = s.suppliesByFaction?.[faction] ?? 0;
        const cost = Math.max(0, Math.floor(amount));
        if (cur < cost) return false;

        const next = cur - cost;
        set({ suppliesByFaction: { ...s.suppliesByFaction, [faction]: next } });

        if (Array.isArray(s.turnLog) && cost > 0) {
          set({
            turnLog: [
              {
                ts: Date.now(),
                type: "SUPPLY",
                text: `${faction} spent ${cost} supplies${reason ? ` (${reason})` : ""} (now ${next})`,
                id: uid(),
              },
              ...s.turnLog,
            ],
          });
        }

        return true;
      },

      addSupplies: (faction: string, amount: number, reason?: string) => {
        const s = get();
        const add = Math.max(0, Math.floor(amount));
        const cur = s.suppliesByFaction?.[faction] ?? 0;
        const next = cur + add;

        set({ suppliesByFaction: { ...s.suppliesByFaction, [faction]: next } });

        if (Array.isArray(s.turnLog) && add > 0) {
          set({
            turnLog: [
              {
                ts: Date.now(),
                type: "SUPPLY",
                text: `${faction} gained ${add} supplies${reason ? ` (${reason})` : ""} (now ${next})`,
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
