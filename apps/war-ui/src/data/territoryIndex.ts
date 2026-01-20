import { loadTheatresData } from "./theatres";

export type TerritoryIndexEntry = { id: string; name: string; theatreId: string; theatreTitle: string };

let cache: Map<string, TerritoryIndexEntry> | null = null;

export async function loadTerritoryIndex() {
  if (cache) return cache;

  const td = await loadTheatresData();
  const map = new Map<string, TerritoryIndexEntry>();

  for (const th of td.raw.theatres) {
    for (const t of th.territories) {
      map.set(t.id, { id: t.id, name: t.name, theatreId: th.theatreId, theatreTitle: th.title });
    }
  }

  cache = map;
  return map;
}
