// src/data/theatres.ts
export type TheatreId = "WE" | "EE" | "NA" | "PA";

export type TheatreData = {
  schemaVersion: string;
  theatres: Array<{
    theatreId: TheatreId;
    title: string;
    territories: Array<{
      id: string;
      name: string;
      shapeRefs: string[];
      adj?: string[];
    }>;
  }>;
};

export type Territory = {
  id: string;
  name: string;
  theatreId: TheatreId;
  theatreTitle: string;
  shapeRefs: string[];
  adj: string[];
};

export type NormalizedData = {
  raw: TheatreData;
  territories: Territory[];
  territoryById: Map<string, Territory>;
  shapeToTerritoryId: Map<string, string>; // svg path id -> territoryId
  theatreToTerritories: Map<TheatreId, string[]>; // theatreId -> territoryIds
};

export async function loadTheatresData(url = "/theatres_all.json"): Promise<NormalizedData> {
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
        adj: t.adj ?? [],
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

  return { raw, territories, territoryById, shapeToTerritoryId, theatreToTerritories };
}
