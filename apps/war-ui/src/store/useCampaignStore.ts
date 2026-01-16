// src/store/useCampaignStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TheatreId } from "../data/theatres";

export type BaseFactionKey = "allies" | "axis" | "ussr";
export type FactionKey = BaseFactionKey | `custom:${string}`;
export type OwnerKey = FactionKey | "neutral" | "contested";

export type CustomFaction = {
  id: string;
  name: string;
  color: string; // "#RRGGBB"
};

export type CampaignMode = "SETUP" | "PLAY";

export type CampaignState = {
  // meta
  mode: CampaignMode;
  activeTheatres: Record<TheatreId, boolean>;

  // factions
  baseEnabled: Record<BaseFactionKey, boolean>;
  customs: CustomFaction[];

  // setup selections
  selectedSetupFaction: BaseFactionKey | "custom" | null;
  selectedCustomId: string | null;
  homelands: Partial<Record<FactionKey, string>>; // faction -> territoryId

  // map state
  ownerByTerritory: Record<string, OwnerKey>;
  visibilityByTerritory: Record<string, Record<FactionKey, boolean>>;

  // selection + movement helper
  selectedTerritoryId: string | null;
  moveFrom: string | null;

  // turn log
  turnLog: Array<{ ts: number; type: "MOVE" | "NOTE"; text: string }>;

  // actions
  setMode: (mode: CampaignMode) => void;
  toggleTheatre: (id: TheatreId) => void;

  selectSetupFaction: (f: BaseFactionKey | "custom" | null) => void;
  createCustomFaction: (name: string, color: string) => void;
  selectCustomFaction: (id: string | null) => void;

  setSelectedTerritory: (id: string | null) => void;

  setHomeland: (faction: FactionKey, territoryId: string) => void;

  setOwner: (territoryId: string, owner: OwnerKey) => void;

  setVisibility: (territoryId: string, faction: FactionKey, visible: boolean) => void;
  bulkSetVisibility: (territoryIds: string[], faction: FactionKey, visible: boolean) => void;

  startMoveFrom: (territoryId: string | null) => void;
  confirmMoveTo: (toTerritoryId: string, isAdjacent: (a: string, b: string) => boolean) => void;

  addNote: (text: string) => void;
  resetAll: () => void;
};

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

const defaultState = {
  mode: "SETUP" as CampaignMode,
  activeTheatres: { WE: true, EE: true, NA: true, PA: true } as Record<TheatreId, boolean>,

  baseEnabled: { allies: true, axis: true, ussr: true } as Record<BaseFactionKey, boolean>,
  customs: [] as CustomFaction[],

  selectedSetupFaction: null as BaseFactionKey | "custom" | null,
  selectedCustomId: null as string | null,
  homelands: {} as Partial<Record<FactionKey, string>>,

  ownerByTerritory: {} as Record<string, OwnerKey>,
  visibilityByTerritory: {} as Record<string, Record<FactionKey, boolean>>,

  selectedTerritoryId: null as string | null,
  moveFrom: null as string | null,

  turnLog: [] as Array<{ ts: number; type: "MOVE" | "NOTE"; text: string }>,
};

export const useCampaignStore = create<CampaignState>()(
  persist(
    (set, get) => ({
      ...defaultState,

      setMode: (mode) => set({ mode }),
      toggleTheatre: (id) =>
        set((s) => ({ activeTheatres: { ...s.activeTheatres, [id]: !s.activeTheatres[id] } })),

      selectSetupFaction: (f) =>
        set((s) => ({
          selectedSetupFaction: f,
          selectedCustomId: f === "custom" ? s.selectedCustomId : null,
        })),

      createCustomFaction: (name, color) => {
        const id = uid();
        const c: CustomFaction = { id, name: (name || "Custom Faction").trim(), color };
        set((s) => ({
          customs: [...s.customs, c],
          selectedSetupFaction: "custom",
          selectedCustomId: id,
        }));
      },

      selectCustomFaction: (id) => set({ selectedSetupFaction: "custom", selectedCustomId: id }),

      setSelectedTerritory: (id) => set({ selectedTerritoryId: id }),

      setHomeland: (faction, territoryId) =>
        set((s) => ({
          homelands: { ...s.homelands, [faction]: territoryId },
        })),

      setOwner: (territoryId, owner) =>
        set((s) => ({
          ownerByTerritory: { ...s.ownerByTerritory, [territoryId]: owner },
        })),

      setVisibility: (territoryId, faction, visible) =>
        set((s) => {
          const prev = s.visibilityByTerritory[territoryId] || ({} as Record<FactionKey, boolean>);
          return {
            visibilityByTerritory: {
              ...s.visibilityByTerritory,
              [territoryId]: { ...prev, [faction]: visible },
            },
          };
        }),

      bulkSetVisibility: (territoryIds, faction, visible) =>
        set((s) => {
          const next = { ...s.visibilityByTerritory };
          for (const tid of territoryIds) {
            const prev = next[tid] || ({} as Record<FactionKey, boolean>);
            next[tid] = { ...prev, [faction]: visible };
          }
          return { visibilityByTerritory: next };
        }),

      startMoveFrom: (territoryId) => set({ moveFrom: territoryId }),

      confirmMoveTo: (toTerritoryId, isAdjacent) => {
        const from = get().moveFrom;
        if (!from) return;

        if (!isAdjacent(from, toTerritoryId)) {
          // keep state but log note
          set((s) => ({
            turnLog: [{ ts: Date.now(), type: "NOTE", text: `Invalid move: ${from} -> ${toTerritoryId} (not adjacent)` }, ...s.turnLog],
          }));
          return;
        }

        set((s) => ({
          moveFrom: null,
          turnLog: [{ ts: Date.now(), type: "MOVE", text: `Move: ${from} -> ${toTerritoryId}` }, ...s.turnLog],
        }));
      },

      addNote: (text) =>
        set((s) => ({
          turnLog: [{ ts: Date.now(), type: "NOTE", text }, ...s.turnLog],
        })),

      resetAll: () => set({ ...defaultState }),
    }),
    { name: "war_campaign_zustand_v1" }
  )
);
