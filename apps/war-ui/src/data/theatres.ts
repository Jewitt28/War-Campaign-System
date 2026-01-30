// src/data/theatres.ts
export type TheatreId = "WE" | "EE" | "NA" | "PA";

export type TerritoryGroupDef = {
  id: string;
  name: string;
  theatreId: TheatreId;
  territories: string[];
  bonus?: string;
};

export type TheatreData = {
  schemaVersion: string;
  theatres: Array<{
    theatreId: TheatreId;
    title: string;
    territories: Array<{
      id: string;
      name: string;
      shapeRefs?: string[];
      traits?: string[];
    }>;
    adjacency?: Record<string, { land: string[]; sea: string[] }>;
  }>;

  // ✅ single source of truth (these are your “territory groups”)
  regions?: TerritoryGroupDef[];
};

export type Territory = {
  id: string;
  name: string;
  theatreId: TheatreId;
  theatreTitle: string;
  shapeRefs: string[];
  adj: string[];
  traits: string[];
};

export type NormalizedData = {
  raw: TheatreData;

  territories: Territory[];
  territoryById: Map<string, Territory>;
  shapeToTerritoryId: Map<string, string>;
  theatreToTerritories: Map<TheatreId, string[]>;

  // ✅ territory groups
  territoryGroups: TerritoryGroupDef[];
  territoryGroupById: Map<string, TerritoryGroupDef>;
};

export const withBase = (p: string) =>
  `${import.meta.env.BASE_URL || "/"}${p}`.replace(/\/{2,}/g, "/");

export async function loadTheatresData(url = withBase("theatres_all.json")): Promise<NormalizedData> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load theatres_all.json (${res.status})`);

  const raw = (await res.json()) as TheatreData;

  const territories: Territory[] = [];
  const territoryById = new Map<string, Territory>();
  const shapeToTerritoryId = new Map<string, string>();
  const theatreToTerritories = new Map<TheatreId, string[]>();

  for (const th of raw.theatres) {
    const list: string[] = [];

    for (const t of th.territories) {
      const terr: Territory = {
        id: t.id,
        name: t.name,
        theatreId: th.theatreId,
        theatreTitle: th.title,
        shapeRefs: t.shapeRefs ?? [],
        adj: Object.values(th.adjacency?.[t.id] ?? { land: [], sea: [] }).flat(),
        traits: t.traits ?? [],
      };

      territories.push(terr);
      territoryById.set(terr.id, terr);
      list.push(terr.id);

      for (const shapeId of terr.shapeRefs) {
        shapeToTerritoryId.set(shapeId, terr.id);
      }
    }

    theatreToTerritories.set(th.theatreId, list);
  }

  // ✅ normalize territory groups from raw.regions
  const territoryGroups = (raw.regions ?? []) as TerritoryGroupDef[];
  const territoryGroupById = new Map<string, TerritoryGroupDef>();
  for (const g of territoryGroups) territoryGroupById.set(g.id, g);

  return {
    raw,
    territories,
    territoryById,
    shapeToTerritoryId,
    theatreToTerritories,
    territoryGroups,
    territoryGroupById,
  };
}
